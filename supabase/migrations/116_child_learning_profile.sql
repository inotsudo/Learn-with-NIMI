-- 116_child_learning_profile.sql
-- Persistent learning profile infrastructure.
-- Adds two tracking tables (child_vocabulary, child_quiz_results) and an RPC
-- that computes the full profile on demand. No existing tables are altered.
--
-- Tables
--   child_vocabulary    — vocabulary words a child has encountered / practiced
--   child_quiz_results  — per-question results from Nimi comprehension sessions
--
-- RPCs
--   record_vocab_encounter    — upsert + encounter-counter increment
--   record_quiz_result        — append a quiz attempt
--   get_child_learning_profile — compute full profile as JSONB

-- ── 1. child_vocabulary ───────────────────────────────────────────────────────

create table if not exists child_vocabulary (
  id              uuid        primary key default gen_random_uuid(),
  child_id        uuid        not null references children(id) on delete cascade,
  language        text        not null check (language in ('en','fr','rw')),
  word            text        not null,
  story_id        uuid        references stories(id) on delete set null,
  mission_id      uuid        references missions(id) on delete set null,
  -- lifecycle: encountered → practiced → mastered
  status          text        not null default 'encountered'
                              check (status in ('encountered','practiced','mastered')),
  encounter_count integer     not null default 1,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  unique (child_id, language, word)
);

create index if not exists child_vocabulary_child_lang_idx
  on child_vocabulary (child_id, language);

alter table child_vocabulary enable row level security;

drop policy if exists "parent: read vocab" on child_vocabulary;
create policy "parent: read vocab" on child_vocabulary
  for select using (is_my_child(child_id));

-- ── 2. child_quiz_results ─────────────────────────────────────────────────────

create table if not exists child_quiz_results (
  id                 uuid        primary key default gen_random_uuid(),
  child_id           uuid        not null references children(id) on delete cascade,
  language           text        not null check (language in ('en','fr','rw')),
  story_id           uuid        references stories(id) on delete set null,
  question_text      text        not null,
  question_type      text        not null default 'comprehension'
                                 check (question_type in ('comprehension','vocabulary','recall')),
  difficulty         text        not null default 'medium'
                                 check (difficulty in ('easy','medium','hard')),
  answered_correctly boolean     not null,
  response_summary   text,       -- brief AI note on quality, optional
  asked_at           timestamptz not null default now()
);

create index if not exists child_quiz_results_child_lang_idx
  on child_quiz_results (child_id, language, asked_at desc);

alter table child_quiz_results enable row level security;

drop policy if exists "parent: read quiz results" on child_quiz_results;
create policy "parent: read quiz results" on child_quiz_results
  for select using (is_my_child(child_id));

-- ── 3. record_vocab_encounter ────────────────────────────────────────────────
-- Upserts a vocabulary encounter for a child.
-- Increments encounter_count and updates last_seen_at on repeat encounters.
-- Elevates status from encountered → practiced when encounter_count reaches 3,
-- and practiced → mastered when it reaches 8.

drop function if exists record_vocab_encounter(uuid,text,text,uuid,uuid);

create or replace function record_vocab_encounter(
  p_child_id   uuid,
  p_language   text,
  p_word       text,
  p_story_id   uuid default null,
  p_mission_id uuid default null
) returns void
language plpgsql security definer as $$
declare
  v_new_count integer;
  v_new_status text;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  insert into child_vocabulary
    (child_id, language, word, story_id, mission_id, status, encounter_count,
     first_seen_at, last_seen_at)
  values
    (p_child_id, p_language, lower(trim(p_word)), p_story_id, p_mission_id,
     'encountered', 1, now(), now())
  on conflict (child_id, language, word) do update
    set encounter_count = child_vocabulary.encounter_count + 1,
        last_seen_at    = now(),
        -- keep most recent story/mission reference
        story_id        = coalesce(excluded.story_id,   child_vocabulary.story_id),
        mission_id      = coalesce(excluded.mission_id, child_vocabulary.mission_id)
  returning encounter_count into v_new_count;

  -- Promote status based on encounter depth
  v_new_status := case
    when v_new_count >= 8 then 'mastered'
    when v_new_count >= 3 then 'practiced'
    else 'encountered'
  end;

  update child_vocabulary
  set status = v_new_status
  where child_id = p_child_id and language = p_language and word = lower(trim(p_word))
    and status != v_new_status; -- skip no-op writes
end;
$$;

-- ── 4. record_quiz_result ────────────────────────────────────────────────────

drop function if exists record_quiz_result(uuid,text,uuid,text,text,text,boolean,text);

create or replace function record_quiz_result(
  p_child_id          uuid,
  p_language          text,
  p_story_id          uuid,
  p_question_text     text,
  p_question_type     text,
  p_difficulty        text,
  p_answered_correctly boolean,
  p_response_summary  text default null
) returns uuid
language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  insert into child_quiz_results
    (child_id, language, story_id, question_text, question_type,
     difficulty, answered_correctly, response_summary)
  values
    (p_child_id, p_language, p_story_id, p_question_text,
     coalesce(p_question_type, 'comprehension'),
     coalesce(p_difficulty, 'medium'),
     p_answered_correctly, p_response_summary)
  returning id into v_id;

  return v_id;
end;
$$;

-- ── 5. get_child_learning_profile ────────────────────────────────────────────
-- Returns a JSONB document with every computed profile dimension.
-- Designed to be called server-side; the caller's auth must satisfy is_my_child.

drop function if exists get_child_learning_profile(uuid);

create or replace function get_child_learning_profile(p_child_id uuid)
returns jsonb
language plpgsql security definer stable as $$
declare
  v_lang              text;
  v_age               integer;
  v_name              text;
  v_completed_stories integer;
  v_reading_level     text;
  v_missions_done     integer;
  v_last_active       timestamptz;

  v_vocab_encountered integer;
  v_vocab_practiced   integer;
  v_vocab_mastered    integer;

  v_quiz_total        integer;
  v_quiz_correct      integer;

  r_type              record;
  v_strengths         text[] := '{}';
  v_weaknesses        text[] := '{}';
  v_by_difficulty     jsonb  := '{}';
  r_diff              record;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  -- ── child basics ──────────────────────────────────────────────────────────
  select coalesce(language,'en'), coalesce(age,0), name
  into v_lang, v_age, v_name
  from children where id = p_child_id;

  -- ── mission completion ────────────────────────────────────────────────────
  select count(*), max(completed_at)
  into v_missions_done, v_last_active
  from child_progress
  where child_id = p_child_id and language = v_lang;

  -- ── completed stories (every slot in the story is done) ──────────────────
  select count(distinct s.id)
  into v_completed_stories
  from stories s
  where s.status = 'published'
    and exists (select 1 from story_slots ss where ss.story_id = s.id)
    and not exists (
      select 1 from story_slots ss2
      where ss2.story_id = s.id
        and not exists (
          select 1 from child_progress cp
          where cp.child_id = p_child_id
            and cp.mission_id = ss2.mission_id
            and cp.language = v_lang
        )
    );

  -- ── reading level (story-completion ladder) ───────────────────────────────
  v_reading_level := case
    when v_completed_stories = 0 then 'emerging'
    when v_completed_stories <= 2 then 'beginning'
    when v_completed_stories <= 5 then 'developing'
    when v_completed_stories <= 10 then 'expanding'
    else 'fluent'
  end;

  -- ── vocabulary stats ──────────────────────────────────────────────────────
  select
    count(*) filter (where status = 'encountered'),
    count(*) filter (where status = 'practiced'),
    count(*) filter (where status = 'mastered')
  into v_vocab_encountered, v_vocab_practiced, v_vocab_mastered
  from child_vocabulary
  where child_id = p_child_id and language = v_lang;

  -- ── quiz stats ────────────────────────────────────────────────────────────
  select
    count(*),
    count(*) filter (where answered_correctly)
  into v_quiz_total, v_quiz_correct
  from child_quiz_results
  where child_id = p_child_id and language = v_lang;

  -- strengths / weaknesses by question type (minimum 3 attempts to qualify)
  for r_type in
    select
      question_type,
      count(*)                                     as total,
      count(*) filter (where answered_correctly)   as correct,
      round(count(*) filter (where answered_correctly) * 100.0 / count(*)) as pct
    from child_quiz_results
    where child_id = p_child_id and language = v_lang
    group by question_type
    having count(*) >= 3
  loop
    if r_type.pct >= 70 then
      v_strengths := array_append(v_strengths, r_type.question_type);
    elsif r_type.pct <= 40 then
      v_weaknesses := array_append(v_weaknesses, r_type.question_type);
    end if;
  end loop;

  -- quiz breakdown by difficulty
  for r_diff in
    select
      difficulty,
      count(*)                                    as total,
      count(*) filter (where answered_correctly)  as correct
    from child_quiz_results
    where child_id = p_child_id and language = v_lang
    group by difficulty
  loop
    v_by_difficulty := v_by_difficulty || jsonb_build_object(
      r_diff.difficulty,
      jsonb_build_object('total', r_diff.total, 'correct', r_diff.correct)
    );
  end loop;

  return jsonb_build_object(
    'child_id',              p_child_id,
    'name',                  v_name,
    'language',              v_lang,
    'age',                   v_age,
    'reading_level',         v_reading_level,
    'completed_story_count', v_completed_stories,
    'total_missions_done',   v_missions_done,
    'last_active_at',        v_last_active,
    'vocabulary', jsonb_build_object(
      'total_encountered', coalesce(v_vocab_encountered, 0),
      'total_practiced',   coalesce(v_vocab_practiced,   0),
      'total_mastered',    coalesce(v_vocab_mastered,    0)
    ),
    'quiz', jsonb_build_object(
      'total_questions', coalesce(v_quiz_total,   0),
      'correct',         coalesce(v_quiz_correct, 0),
      'accuracy_pct',    case when v_quiz_total > 0
                           then round(v_quiz_correct * 100.0 / v_quiz_total)
                           else null end,
      'by_difficulty',   v_by_difficulty
    ),
    'strengths',  to_jsonb(v_strengths),
    'weaknesses', to_jsonb(v_weaknesses)
  );
end;
$$;
