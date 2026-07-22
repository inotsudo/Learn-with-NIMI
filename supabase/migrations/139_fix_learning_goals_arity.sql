-- ============================================================
-- 139: Fix generate_learning_goals — wrong arity on profile lookup
--
-- BUG (migration 119, line 112): generate_learning_goals called
-- get_child_learning_profile(p_child_id, p_language) with 2 args.
-- That function (migration 116) only accepts (p_child_id uuid).
-- The extra argument caused a "function does not exist" Postgres error
-- on every invocation, so the goalsBlock in all Nimi prompts was
-- always empty and no learning goals were ever generated.
--
-- Must DROP first because create or replace cannot change the ownership
-- check from is_my_child → is_child_owner while keeping return type.
-- ============================================================

drop function if exists generate_learning_goals(uuid, text);

create or replace function generate_learning_goals(
  p_child_id uuid,
  p_language  text default 'en'
)
returns jsonb
language plpgsql security definer as $$
declare
  v_profile        jsonb;
  v_reading_level  text;
  v_daily_exists   boolean;
  v_weekly_exists  boolean;
  v_daily_expires  timestamptz;
  v_weekly_expires timestamptz;
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
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

  -- Expiry windows
  v_daily_expires  := date_trunc('day',  now()) + interval '1 day';
  v_weekly_expires := date_trunc('week', now()) + interval '1 week';

  -- FIX: call with 1 argument (was incorrectly called with 2)
  select get_child_learning_profile(p_child_id) into v_profile;
  v_reading_level := coalesce(v_profile ->>'reading_level', 'emerging');

  -- ── Daily goals ──────────────────────────────────────────────────
  if not v_daily_exists then
    case v_reading_level

      when 'emerging', 'beginning' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'daily', 'chat_exchanges',
           'Chat with Nimi', 'Have a conversation with Nimi today',
           1, 5, v_daily_expires),
          (p_child_id, p_language, 'daily', 'vocab_encounters',
           'Learn 3 new words', 'Discover 3 vocabulary words in your stories today',
           3, 8, v_daily_expires);

      when 'developing' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'daily', 'chat_exchanges',
           'Chat with Nimi', 'Have 2 conversations with Nimi today',
           2, 8, v_daily_expires),
          (p_child_id, p_language, 'daily', 'slot_completions',
           'Complete a story activity', 'Finish 1 story activity today',
           1, 10, v_daily_expires);

      when 'expanding' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'daily', 'chat_exchanges',
           'Chat with Nimi', 'Have 3 conversations with Nimi today',
           3, 10, v_daily_expires),
          (p_child_id, p_language, 'daily', 'slot_completions',
           'Complete 2 story activities', 'Finish 2 story activities today',
           2, 12, v_daily_expires);

      else -- fluent
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'daily', 'chat_exchanges',
           'Chat with Nimi', 'Have 4 conversations with Nimi today',
           4, 12, v_daily_expires),
          (p_child_id, p_language, 'daily', 'slot_completions',
           'Complete 3 story activities', 'Finish 3 story activities today',
           3, 15, v_daily_expires);

    end case;
  end if;

  -- ── Weekly goals ─────────────────────────────────────────────────
  if not v_weekly_exists then
    case v_reading_level

      when 'emerging', 'beginning' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'weekly', 'slot_completions',
           'Complete 2 story activities', 'Finish 2 story activities this week',
           2, 25, v_weekly_expires);

      when 'developing' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'weekly', 'vocab_encounters',
           'Learn 10 new words', 'Discover 10 vocabulary words this week',
           10, 30, v_weekly_expires),
          (p_child_id, p_language, 'weekly', 'quiz_correct',
           'Answer 3 quiz questions correctly', 'Get 3 quiz answers right this week',
           3, 20, v_weekly_expires);

      when 'expanding' then
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'weekly', 'vocab_encounters',
           'Learn 15 new words', 'Discover 15 vocabulary words this week',
           15, 35, v_weekly_expires),
          (p_child_id, p_language, 'weekly', 'quiz_correct',
           'Answer 5 quiz questions correctly', 'Get 5 quiz answers right this week',
           5, 25, v_weekly_expires);

      else -- fluent
        insert into child_learning_goals
          (child_id, language, period, goal_type, title, description, target_value, stars_reward, expires_at)
        values
          (p_child_id, p_language, 'weekly', 'story_completions',
           'Complete a full story', 'Finish an entire story this week',
           1, 40, v_weekly_expires),
          (p_child_id, p_language, 'weekly', 'quiz_correct',
           'Answer 7 quiz questions correctly', 'Get 7 quiz answers right this week',
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
