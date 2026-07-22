-- 119_learning_goals.sql
-- Personalized daily and weekly learning goals, generated from the child's
-- reading level profile. Goals are measurable, expire automatically, and
-- reward stars through the existing challenge_bonus_stars system.
--
-- Table: child_learning_goals
-- RPCs:
--   generate_learning_goals   — idempotent: creates goals for today/this week
--   get_active_goals          — returns all non-expired goals for a child
--   increment_goal_progress   — advances current_value for a given goal type
--   claim_goal_reward         — marks a completed goal claimed + credits stars

-- ── 1. Table ──────────────────────────────────────────────────────────────────

create table if not exists child_learning_goals (
  id             uuid        primary key default gen_random_uuid(),
  child_id       uuid        not null references children(id) on delete cascade,
  language       text        not null check (language in ('en','fr','rw')),
  period         text        not null check (period in ('daily','weekly')),
  goal_type      text        not null check (goal_type in (
    'chat_exchanges',    -- conversations with Nimi
    'slot_completions',  -- story activity slots finished
    'vocab_encounters',  -- new vocabulary words discovered
    'quiz_correct',      -- quiz questions answered correctly
    'story_completions'  -- full stories completed
  )),
  title          text        not null,
  description    text        not null,
  target_value   integer     not null check (target_value > 0),
  current_value  integer     not null default 0,
  completed      boolean     not null default false,
  reward_claimed boolean     not null default false,
  stars_reward   integer     not null check (stars_reward > 0),
  expires_at     timestamptz not null,
  generated_at   timestamptz not null default now()
);

-- Fast look-up of active (non-expired) goals per child
create index if not exists child_learning_goals_active_idx
  on child_learning_goals (child_id, language, expires_at);

-- Fast increment path: only active+incomplete goals of a given type need updating
create index if not exists child_learning_goals_type_idx
  on child_learning_goals (child_id, language, goal_type, expires_at)
  where not completed;

-- ── 2. generate_learning_goals ────────────────────────────────────────────────
-- Idempotent: purges expired goals, then creates new daily (2 goals) and
-- weekly (1-2 goals) entries only when none exist for the current period.
-- Goal targets are calibrated to the child's reading level from migration 116.
-- Returns the full active goal list as a JSONB array.

drop function if exists generate_learning_goals(uuid, text);

create or replace function generate_learning_goals(
  p_child_id uuid,
  p_language  text
) returns jsonb
language plpgsql security definer as $$
declare
  v_profile        jsonb;
  v_reading_level  text;
  v_daily_exists   boolean;
  v_weekly_exists  boolean;
  v_daily_expires  timestamptz;
  v_weekly_expires timestamptz;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  -- Purge goals whose window has closed
  delete from child_learning_goals
  where child_id = p_child_id and language = p_language
    and expires_at <= now();

  -- Check whether goals already exist for today / this week
  select exists(
    select 1 from child_learning_goals
    where child_id = p_child_id and language = p_language and period = 'daily'
  ) into v_daily_exists;

  select exists(
    select 1 from child_learning_goals
    where child_id = p_child_id and language = p_language and period = 'weekly'
  ) into v_weekly_exists;

  if v_daily_exists and v_weekly_exists then
    -- Nothing to generate; return existing goals
    return (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', g.id, 'child_id', g.child_id, 'language', g.language,
          'period', g.period, 'goal_type', g.goal_type,
          'title', g.title, 'description', g.description,
          'target_value', g.target_value, 'current_value', g.current_value,
          'completed', g.completed, 'reward_claimed', g.reward_claimed,
          'stars_reward', g.stars_reward,
          'expires_at', g.expires_at, 'generated_at', g.generated_at
        ) order by g.period desc, g.generated_at
      ), '[]'::jsonb)
      from child_learning_goals g
      where g.child_id = p_child_id and g.language = p_language
    );
  end if;

  -- Expiry windows: end of today / end of this ISO week (Sunday night UTC)
  v_daily_expires  := date_trunc('day',  now()) + interval '1 day';
  v_weekly_expires := date_trunc('week', now()) + interval '1 week';

  -- Resolve reading level from the existing learning profile RPC
  select get_child_learning_profile(p_child_id, p_language) into v_profile;
  v_reading_level := coalesce(v_profile ->>'reading_level', 'emerging');

  -- ── Daily goals ─────────────────────────────────────────────────────────────
  if not v_daily_exists then
    case v_reading_level

      when 'emerging', 'beginning' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'daily', 'chat_exchanges',
           'Chat with Nimi',
           'Have a conversation with Nimi today',
           1, 5, v_daily_expires),
          (p_child_id, p_language, 'daily', 'vocab_encounters',
           'Learn 3 new words',
           'Discover 3 vocabulary words in your stories today',
           3, 8, v_daily_expires);

      when 'developing' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'daily', 'chat_exchanges',
           'Chat with Nimi',
           'Have 2 conversations with Nimi today',
           2, 8, v_daily_expires),
          (p_child_id, p_language, 'daily', 'slot_completions',
           'Complete a story activity',
           'Finish 1 story activity today',
           1, 10, v_daily_expires);

      when 'expanding' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'daily', 'chat_exchanges',
           'Chat with Nimi',
           'Have 3 conversations with Nimi today',
           3, 10, v_daily_expires),
          (p_child_id, p_language, 'daily', 'slot_completions',
           'Complete 2 story activities',
           'Finish 2 story activities today',
           2, 12, v_daily_expires);

      else -- fluent
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'daily', 'chat_exchanges',
           'Chat with Nimi',
           'Have 4 conversations with Nimi today',
           4, 12, v_daily_expires),
          (p_child_id, p_language, 'daily', 'slot_completions',
           'Complete 3 story activities',
           'Finish 3 story activities today',
           3, 15, v_daily_expires);

    end case;
  end if;

  -- ── Weekly goals ─────────────────────────────────────────────────────────────
  if not v_weekly_exists then
    case v_reading_level

      when 'emerging', 'beginning' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'weekly', 'slot_completions',
           'Complete 2 story activities',
           'Finish 2 story activities this week',
           2, 25, v_weekly_expires);

      when 'developing' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'weekly', 'vocab_encounters',
           'Learn 10 new words',
           'Discover 10 vocabulary words this week',
           10, 30, v_weekly_expires),
          (p_child_id, p_language, 'weekly', 'quiz_correct',
           'Answer 3 quiz questions correctly',
           'Get 3 quiz answers right this week',
           3, 20, v_weekly_expires);

      when 'expanding' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'weekly', 'vocab_encounters',
           'Learn 15 new words',
           'Discover 15 vocabulary words this week',
           15, 35, v_weekly_expires),
          (p_child_id, p_language, 'weekly', 'quiz_correct',
           'Answer 5 quiz questions correctly',
           'Get 5 quiz answers right this week',
           5, 25, v_weekly_expires);

      else -- fluent
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'weekly', 'story_completions',
           'Complete a full story',
           'Finish an entire story this week',
           1, 40, v_weekly_expires),
          (p_child_id, p_language, 'weekly', 'quiz_correct',
           'Answer 7 quiz questions correctly',
           'Get 7 quiz answers right this week',
           7, 30, v_weekly_expires);

    end case;
  end if;

  -- Return full active goal list
  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', g.id, 'child_id', g.child_id, 'language', g.language,
        'period', g.period, 'goal_type', g.goal_type,
        'title', g.title, 'description', g.description,
        'target_value', g.target_value, 'current_value', g.current_value,
        'completed', g.completed, 'reward_claimed', g.reward_claimed,
        'stars_reward', g.stars_reward,
        'expires_at', g.expires_at, 'generated_at', g.generated_at
      ) order by g.period desc, g.generated_at
    ), '[]'::jsonb)
    from child_learning_goals g
    where g.child_id = p_child_id and g.language = p_language
  );
end;
$$;

-- ── 3. get_active_goals ───────────────────────────────────────────────────────
-- Lightweight read: returns non-expired goals without triggering generation.
-- Use this when you just need to display progress, not generate new goals.

drop function if exists get_active_goals(uuid, text);

create or replace function get_active_goals(
  p_child_id uuid,
  p_language  text
) returns jsonb
language plpgsql security definer stable as $$
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', g.id, 'child_id', g.child_id, 'language', g.language,
        'period', g.period, 'goal_type', g.goal_type,
        'title', g.title, 'description', g.description,
        'target_value', g.target_value, 'current_value', g.current_value,
        'completed', g.completed, 'reward_claimed', g.reward_claimed,
        'stars_reward', g.stars_reward,
        'expires_at', g.expires_at, 'generated_at', g.generated_at
      ) order by g.period desc, g.generated_at
    )
    from child_learning_goals g
    where g.child_id = p_child_id
      and g.language  = p_language
      and g.expires_at > now()
  ), '[]'::jsonb);
end;
$$;

-- ── 4. increment_goal_progress ────────────────────────────────────────────────
-- Advances current_value for all active, incomplete goals of the given type.
-- Caps at target_value and auto-sets completed = true when reached.
-- Safe to call fire-and-forget — no-op when no matching goals exist.

drop function if exists increment_goal_progress(uuid, text, text, integer);

create or replace function increment_goal_progress(
  p_child_id  uuid,
  p_language  text,
  p_goal_type text,
  p_increment integer default 1
) returns void
language plpgsql security definer as $$
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  update child_learning_goals
  set
    current_value = least(current_value + p_increment, target_value),
    completed     = (current_value + p_increment >= target_value)
  where child_id  = p_child_id
    and language  = p_language
    and goal_type = p_goal_type
    and expires_at > now()
    and not completed;
end;
$$;

-- ── 5. claim_goal_reward ──────────────────────────────────────────────────────
-- Marks a completed goal as claimed and credits its stars via
-- challenge_bonus_stars (unique slug = 'goal-{goal_id}' prevents double-credit).
-- Returns true when stars are newly credited, false when already claimed or
-- the goal is not yet complete.

drop function if exists claim_goal_reward(uuid, uuid);

create or replace function claim_goal_reward(
  p_child_id uuid,
  p_goal_id  uuid
) returns boolean
language plpgsql security definer as $$
declare
  v_stars    integer;
  v_language text;
  v_completed boolean;
  v_claimed   boolean;
  v_updated   integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  select stars_reward, language, completed, reward_claimed
  into   v_stars, v_language, v_completed, v_claimed
  from   child_learning_goals
  where  id = p_goal_id and child_id = p_child_id;

  if not found       then raise exception 'goal not found';        end if;
  if not v_completed then return false;                            end if;
  if v_claimed       then return false;                            end if;

  -- Mark claimed (guard against concurrent calls via the conditional update)
  update child_learning_goals
  set    reward_claimed = true
  where  id = p_goal_id and child_id = p_child_id and not reward_claimed;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then return false; end if;   -- race: another call won

  -- Credit stars using the same table as weekly/daily challenges
  insert into challenge_bonus_stars (child_id, language, challenge_slug, stars)
  values (p_child_id, v_language, 'goal-' || p_goal_id::text, v_stars)
  on conflict (child_id, language, challenge_slug) do nothing;

  return true;
end;
$$;
