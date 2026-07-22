-- ============================================================
-- 130: Nimi Intelligence Layer
--   • learner_memories  — persistent per-child AI memory
--   • learner_events    — append-only event log
--   • is_child_owner()  — ownership helper
--   • RPCs: upsert_learner_memory, get_learner_memories,
--           get_learner_context, log_learner_event,
--           get_recommendation_candidates, decay_stale_memories
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────────

create table if not exists learner_memories (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  memory_type  text not null check (memory_type in (
                 'skill', 'preference', 'achievement', 'struggle', 'personality'
               )),
  key          text not null,
  value        jsonb not null default '{}',
  confidence   float not null default 1.0 check (confidence between 0 and 1),
  source       text not null default 'system'
                 check (source in ('system', 'ai_inferred', 'explicit')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (child_id, memory_type, key)
);

create index if not exists learner_memories_child_type
  on learner_memories(child_id, memory_type);

create table if not exists learner_events (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children(id) on delete cascade,
  event_type  text not null,
  payload     jsonb not null default '{}',
  created_at  timestamptz default now()
);

create index if not exists learner_events_child_recent
  on learner_events(child_id, created_at desc);

create index if not exists learner_events_child_type
  on learner_events(child_id, event_type);

-- ── RLS ───────────────────────────────────────────────────────────

alter table learner_memories enable row level security;
alter table learner_events   enable row level security;

-- Children are owned by their parent (auth user via children.parent_id).
-- RLS is a last-resort safety net; security-definer RPCs do the real auth.
create policy "owner_read_memories"  on learner_memories for select
  using (exists (select 1 from children c where c.id = child_id and c.parent_id = auth.uid()));

create policy "owner_write_memories" on learner_memories for all
  using (exists (select 1 from children c where c.id = child_id and c.parent_id = auth.uid()));

create policy "owner_read_events"    on learner_events for select
  using (exists (select 1 from children c where c.id = child_id and c.parent_id = auth.uid()));

create policy "owner_write_events"   on learner_events for insert
  with check (exists (select 1 from children c where c.id = child_id and c.parent_id = auth.uid()));

-- ── Helper ────────────────────────────────────────────────────────

create or replace function is_child_owner(p_child_id uuid)
returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from children c
    where c.id = p_child_id
      and c.parent_id = auth.uid()
  );
$$;

-- ── RPC: upsert_learner_memory ────────────────────────────────────

create or replace function upsert_learner_memory(
  p_child_id   uuid,
  p_type       text,
  p_key        text,
  p_value      jsonb,
  p_confidence float   default 1.0,
  p_source     text    default 'system'
)
returns void
language plpgsql security definer as $$
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  insert into learner_memories
    (child_id, memory_type, key, value, confidence, source, updated_at)
  values
    (p_child_id, p_type, p_key, p_value, p_confidence, p_source, now())
  on conflict (child_id, memory_type, key) do update set
    value      = excluded.value,
    confidence = excluded.confidence,
    source     = excluded.source,
    updated_at = now();
end;
$$;

-- ── RPC: get_learner_memories ─────────────────────────────────────

create or replace function get_learner_memories(
  p_child_id uuid,
  p_types    text[] default null
)
returns jsonb
language plpgsql security definer as $$
declare v_rows jsonb;
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.updated_at desc), '[]')
  into v_rows
  from learner_memories m
  where m.child_id   = p_child_id
    and m.confidence >= 0.2
    and (p_types is null or m.memory_type = any(p_types));

  return coalesce(v_rows, '[]');
end;
$$;

-- ── RPC: log_learner_event ────────────────────────────────────────

create or replace function log_learner_event(
  p_child_id   uuid,
  p_event_type text,
  p_payload    jsonb default '{}'
)
returns uuid
language plpgsql security definer as $$
declare v_id uuid;
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  insert into learner_events (child_id, event_type, payload)
  values (p_child_id, p_event_type, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;

-- ── RPC: get_recommendation_candidates ───────────────────────────
-- Returns up to p_limit stories scored by engagement status.
-- in_progress (started but not finished) > not_started > reinforcement.

create or replace function get_recommendation_candidates(
  p_child_id uuid,
  p_limit    int default 5
)
returns jsonb
language plpgsql security definer as $$
declare v_rows jsonb;
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  select coalesce(jsonb_agg(r), '[]') into v_rows
  from (
    select jsonb_build_object(
      'story_id',        s.id,
      'story_title',     s.title,
      'story_emoji',     coalesce(s.theme_emoji, '📖'),
      'total_missions',  count(m.id),
      'missions_done',   count(cp.id),
      'reason',          case
        when count(cp.id) > 0 and count(cp.id) < count(m.id) then 'in_progress'
        when count(cp.id) = 0                                  then 'not_started'
        else                                                        'reinforcement'
      end,
      'score',           case
        when count(cp.id) > 0 and count(cp.id) < count(m.id) then
          100.0 + (count(cp.id) * 50.0 / greatest(count(m.id), 1))
        when count(cp.id) = 0 then 50.0
        else 8.0
      end,
      'next_mission_id', (
        select m2.id
        from missions m2
        where m2.story_id = s.id
          and not exists (
            select 1 from child_progress cp2
            where cp2.child_id = p_child_id and cp2.mission_id = m2.id
          )
        order by m2.sort_order
        limit 1
      ),
      'mission_types',   (
        select coalesce(jsonb_agg(distinct m3.type), '[]')
        from missions m3 where m3.story_id = s.id
      )
    ) as r
    from stories s
    join missions m on m.story_id = s.id
    left join child_progress cp
      on cp.mission_id = m.id and cp.child_id = p_child_id
    where s.is_active = true
    group by s.id, s.title, s.theme_emoji
    order by
      case
        when count(cp.id) > 0 and count(cp.id) < count(m.id) then 0
        when count(cp.id) = 0                                  then 1
        else                                                        2
      end,
      s.sort_order
    limit p_limit
  ) sub;

  return coalesce(v_rows, '[]');
end;
$$;

-- ── RPC: get_learner_context ──────────────────────────────────────
-- Comprehensive context snapshot for AI prompt construction.

create or replace function get_learner_context(p_child_id uuid)
returns jsonb
language plpgsql security definer as $$
declare
  v_child   jsonb;
  v_stats   jsonb;
  v_recent  jsonb;
  v_memories jsonb;
  v_recs    jsonb;
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  -- Child profile (exclude sensitive fields)
  select jsonb_build_object(
    'id',       c.id,
    'name',     c.name,
    'language', c.language,
    'age',      c.age
  ) into v_child
  from children c where c.id = p_child_id;

  if not found then
    raise exception 'Child not found';
  end if;

  -- Lifetime stats
  select jsonb_build_object(
    'total_missions',  count(distinct cp.id),
    'total_stars',     coalesce(sum(m.stars), 0),
    'stories_started', count(distinct m.story_id),
    'streak_days',     (
      -- count consecutive days with activity ending today
      select count(*) from (
        select generate_series(0, 29) as d
      ) days
      where exists (
        select 1 from child_progress cp3
        where cp3.child_id = p_child_id
          and cp3.completed_at::date = (current_date - days.d)
      )
    )
  ) into v_stats
  from child_progress cp
  join missions m on m.id = cp.mission_id
  where cp.child_id = p_child_id;

  -- Last 10 activities
  select coalesce(jsonb_agg(r order by r->>'completed_at' desc), '[]') into v_recent
  from (
    select jsonb_build_object(
      'mission_type', m.type,
      'story_title',  s.title,
      'completed_at', cp.completed_at,
      'stars',        coalesce(m.stars, 0)
    ) as r
    from child_progress cp
    join missions m on m.id = cp.mission_id
    join stories  s on s.id = m.story_id
    where cp.child_id = p_child_id
    order by cp.completed_at desc
    limit 10
  ) sub;

  -- Memories (confidence ≥ 0.2)
  select coalesce(jsonb_agg(jsonb_build_object(
    'memory_type', lm.memory_type,
    'key',         lm.key,
    'value',       lm.value,
    'confidence',  lm.confidence
  ) order by lm.updated_at desc), '[]') into v_memories
  from learner_memories lm
  where lm.child_id   = p_child_id
    and lm.confidence >= 0.2;

  -- Top 5 recommendations
  v_recs := get_recommendation_candidates(p_child_id, 5);

  return jsonb_build_object(
    'child',           coalesce(v_child,    '{}'),
    'stats',           coalesce(v_stats,    '{}'),
    'recent_activity', coalesce(v_recent,   '[]'),
    'memories',        coalesce(v_memories, '[]'),
    'recommendations', coalesce(v_recs,     '[]')
  );
end;
$$;

-- ── RPC: decay_stale_memories ─────────────────────────────────────
-- Scheduled via Vercel cron or pg_cron: slowly erodes old memories.
-- confidence decays 5% per week of inactivity, removed at < 0.05.

create or replace function decay_stale_memories()
returns int
language plpgsql security definer as $$
declare v_count int;
begin
  with decayed as (
    update learner_memories
    set confidence = confidence * 0.95,
        updated_at = now()
    where source     = 'ai_inferred'
      and updated_at < now() - interval '7 days'
    returning id, confidence
  ),
  cleaned as (
    delete from learner_memories
    where id in (select id from decayed where confidence < 0.05)
    returning id
  )
  select count(*) into v_count from cleaned;

  return v_count;
end;
$$;
