-- 127_creative_studio.sql — Phase 7 Creative AI
--
-- Tables:
--   creative_sessions      — records each completed creative activity (coloring,
--                            drawing, story, challenge) for a child; used for
--                            achievement integration and progress history.
--   daily_creative_challenges — one row per child/language/date/type; holds the
--                            generated prompt and whether the child completed it.
--
-- RPCs:
--   save_creative_session        — writes a session row; auth.uid() must be parent
--   get_creative_sessions        — child's history; auth.uid() must be parent
--   get_daily_creative_challenges — fetches or initialises today's 3 challenges
--   complete_creative_challenge  — marks one challenge done, returns stars awarded
-- ---------------------------------------------------------------------------

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists creative_sessions (
  id            uuid        primary key default gen_random_uuid(),
  child_id      uuid        not null references children(id) on delete cascade,
  type          text        not null check (type in ('coloring','drawing','story','challenge')),
  language      text        not null default 'en',
  subtype       text,        -- drawing subject, challenge type, etc.
  title         text,
  content       jsonb       not null default '{}',
  stars_awarded int         not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists daily_creative_challenges (
  id          uuid   primary key default gen_random_uuid(),
  child_id    uuid   not null references children(id) on delete cascade,
  language    text   not null default 'en',
  date        date   not null default current_date,
  type        text   not null check (type in ('coloring','drawing','writing')),
  prompt      text   not null,
  completed   bool   not null default false,
  stars       int    not null default 5,
  completed_at timestamptz,
  unique (child_id, language, date, type)
);

create index if not exists creative_sessions_child_idx
  on creative_sessions (child_id, created_at desc);
create index if not exists daily_challenges_child_date_idx
  on daily_creative_challenges (child_id, language, date);

-- RLS
alter table creative_sessions         enable row level security;
alter table daily_creative_challenges enable row level security;

-- Parents can see their children's rows; children can see their own.
-- Security-definer RPCs handle all writes, so row-level policies only gate reads.

create policy "parent read creative_sessions"
  on creative_sessions for select
  using (
    exists (
      select 1 from children c
      where c.id = creative_sessions.child_id
        and c.parent_id = auth.uid()
    )
  );

create policy "parent read daily_creative_challenges"
  on daily_creative_challenges for select
  using (
    exists (
      select 1 from children c
      where c.id = daily_creative_challenges.child_id
        and c.parent_id = auth.uid()
    )
  );

-- ── RPC: save_creative_session ──────────────────────────────────────────────

create or replace function save_creative_session(
  p_child_id    uuid,
  p_type        text,
  p_language    text,
  p_subtype     text    default null,
  p_title       text    default null,
  p_content     jsonb   default '{}',
  p_stars       int     default 0
) returns uuid
language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  insert into creative_sessions (child_id, type, language, subtype, title, content, stars_awarded)
  values (p_child_id, p_type, p_language, p_subtype, p_title, p_content, p_stars)
  returning id into v_id;

  -- Award stars via challenge_bonus_stars (deduped by slug)
  if p_stars > 0 then
    insert into challenge_bonus_stars (child_id, language, challenge_slug, stars)
    values (
      p_child_id,
      p_language,
      'creative-' || p_type || '-' || to_char(now(), 'YYYY-MM-DD-HH24MI'),
      p_stars
    )
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

-- ── RPC: get_creative_sessions ──────────────────────────────────────────────

create or replace function get_creative_sessions(
  p_child_id uuid,
  p_language text,
  p_limit    int default 20
) returns jsonb
language plpgsql security definer stable as $$
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  return (
    select coalesce(json_agg(row_to_json(s) order by s.created_at desc), '[]')
    from (
      select id, type, subtype, title, stars_awarded, created_at
      from creative_sessions
      where child_id = p_child_id
        and language = p_language
      order by created_at desc
      limit p_limit
    ) s
  );
end;
$$;

-- ── RPC: get_daily_creative_challenges ─────────────────────────────────────
--
-- Returns today's 3 challenges for a child. The prompts are seeded from the
-- child's active story theme; if no prompts exist yet the caller is expected
-- to POST to /api/creativity-challenges to generate them and call
-- complete_creative_challenge to mark them seeded.
-- This RPC only reads — generation happens client-side + API route.

create or replace function get_daily_creative_challenges(
  p_child_id uuid,
  p_language text
) returns jsonb
language plpgsql security definer stable as $$
declare
  v_today date := current_date;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  return (
    select coalesce(
      json_agg(
        json_build_object(
          'id',           d.id,
          'type',         d.type,
          'prompt',       d.prompt,
          'completed',    d.completed,
          'stars',        d.stars,
          'completed_at', d.completed_at
        )
        order by
          case d.type when 'drawing' then 1 when 'coloring' then 2 else 3 end
      ),
      '[]'
    )
    from daily_creative_challenges d
    where d.child_id = p_child_id
      and d.language = p_language
      and d.date     = v_today
  );
end;
$$;

-- ── RPC: seed_daily_creative_challenges ────────────────────────────────────
--
-- Called once per day per child when the challenges view loads and no rows
-- exist. Inserts the 3 prompts provided by the API route.

create or replace function seed_daily_creative_challenges(
  p_child_id uuid,
  p_language text,
  p_challenges jsonb   -- [{type, prompt}]
) returns void
language plpgsql security definer as $$
declare
  v_today date := current_date;
  v_item  jsonb;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  for v_item in select * from jsonb_array_elements(p_challenges)
  loop
    insert into daily_creative_challenges
      (child_id, language, date, type, prompt, stars)
    values (
      p_child_id,
      p_language,
      v_today,
      v_item ->> 'type',
      v_item ->> 'prompt',
      coalesce((v_item ->> 'stars')::int, 5)
    )
    on conflict (child_id, language, date, type) do nothing;
  end loop;
end;
$$;

-- ── RPC: complete_creative_challenge ───────────────────────────────────────

create or replace function complete_creative_challenge(
  p_challenge_id uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_child_id uuid;
  v_language text;
  v_stars    int;
  v_slug     text;
  v_date     date;
begin
  -- Fetch the challenge and verify ownership
  select d.child_id, d.language, d.stars, d.date
  into   v_child_id, v_language, v_stars, v_date
  from   daily_creative_challenges d
  where  d.id = p_challenge_id;

  if not found then
    raise exception 'challenge not found';
  end if;

  if not is_my_child(v_child_id) then
    raise exception 'not authorized';
  end if;

  -- Mark done
  update daily_creative_challenges
  set    completed = true, completed_at = now()
  where  id = p_challenge_id and not completed;

  -- Award stars (idempotent via conflict)
  v_slug := 'daily-creative-' || p_challenge_id;
  insert into challenge_bonus_stars (child_id, language, challenge_slug, stars)
  values (v_child_id, v_language, v_slug, v_stars)
  on conflict do nothing;

  return json_build_object('stars', v_stars, 'slug', v_slug);
end;
$$;
