-- 118_vocab_progress_tracking.sql
-- Vocabulary progress tracking: lifecycle, review flagging, and bulk recording.
--
-- Schema changes (child_vocabulary):
--   needs_review    boolean  — explicitly flagged when child struggles with a word
--   last_correct_at timestamptz — last time child answered correctly about this word
--
-- New RPCs:
--   record_slot_vocab_encounters — bulk-upsert vocab from a completed mission slot
--   mark_vocab_needs_review      — flag a word for extra practice
--   mark_vocab_reviewed          — clear flag after successful quiz answer
--   get_vocab_progress           — aggregate progress stats + review word list

-- ── 1. Extend child_vocabulary ────────────────────────────────────────────────

alter table child_vocabulary
  add column if not exists needs_review    boolean     not null default false,
  add column if not exists last_correct_at timestamptz;

-- Index for fast "words needing review" queries
create index if not exists child_vocabulary_needs_review_idx
  on child_vocabulary (child_id, language, needs_review)
  where needs_review = true;

-- ── 2. record_slot_vocab_encounters ──────────────────────────────────────────
-- Called after a story slot is completed. Reads the published vocabulary list
-- from mission_versions and bulk-upserts every word into child_vocabulary.
-- Uses the child's current learning language; cross-language entries are
-- recorded independently per language by the storyKnowledge engine elsewhere.
-- Non-fatal: if a word entry is malformed, it is silently skipped.

drop function if exists record_slot_vocab_encounters(uuid, uuid);

create or replace function record_slot_vocab_encounters(
  p_child_id   uuid,
  p_mission_id uuid
) returns integer   -- returns the number of words upserted
language plpgsql security definer as $$
declare
  v_lang     text;
  v_story_id uuid;
  v_count    integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  -- Resolve child's current language
  select coalesce(language, 'en') into v_lang
  from children where id = p_child_id;

  -- Resolve the story this mission belongs to
  select story_id into v_story_id
  from missions where id = p_mission_id;

  -- Bulk upsert: one row per vocabulary entry in the mission's published version.
  -- On conflict (same child + language + word already exists):
  --   increment encounter_count, bump last_seen_at, keep most-specific story/mission ref,
  --   auto-promote status (encountered → practiced at 3, practiced → mastered at 8).
  -- Malformed entries (null/empty word) are filtered by the WHERE clause.
  insert into child_vocabulary
    (child_id, language, word, story_id, mission_id, status,
     encounter_count, first_seen_at, last_seen_at)
  select
    p_child_id,
    v_lang,
    lower(trim(elem ->> 'word')),
    v_story_id,
    p_mission_id,
    'encountered',
    1,
    now(),
    now()
  from mission_versions mv,
       jsonb_array_elements(mv.content_json -> 'vocabulary') as elem
  where mv.mission_id = p_mission_id
    and mv.language   = v_lang
    and mv.published  = true
    and jsonb_typeof(mv.content_json -> 'vocabulary') = 'array'
    and trim(elem ->> 'word') <> ''
    and elem ->> 'word' is not null
  on conflict (child_id, language, word) do update
    set encounter_count = child_vocabulary.encounter_count + 1,
        last_seen_at    = now(),
        story_id        = coalesce(excluded.story_id,   child_vocabulary.story_id),
        mission_id      = coalesce(excluded.mission_id, child_vocabulary.mission_id),
        status = case
          when child_vocabulary.encounter_count + 1 >= 8 then 'mastered'
          when child_vocabulary.encounter_count + 1 >= 3 then 'practiced'
          else child_vocabulary.status
        end;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── 3. mark_vocab_needs_review ────────────────────────────────────────────────
-- Flags a word for extra practice. Called when a child answers a quiz question
-- incorrectly about that word. Does not change the status (a mastered word
-- can still be flagged for review — it just needs a refresh).
-- No-op if the word isn't yet in the child's vocabulary list.

drop function if exists mark_vocab_needs_review(uuid, text, text);

create or replace function mark_vocab_needs_review(
  p_child_id uuid,
  p_language  text,
  p_word      text
) returns void
language plpgsql security definer as $$
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  update child_vocabulary
  set needs_review = true,
      last_seen_at = now()
  where child_id = p_child_id
    and language  = p_language
    and word      = lower(trim(p_word));
end;
$$;

-- ── 4. mark_vocab_reviewed ────────────────────────────────────────────────────
-- Clears the review flag and records a correct answer.
-- Also increments encounter_count and promotes status — a correct quiz answer
-- counts as meaningful practice.

drop function if exists mark_vocab_reviewed(uuid, text, text);

create or replace function mark_vocab_reviewed(
  p_child_id uuid,
  p_language  text,
  p_word      text
) returns void
language plpgsql security definer as $$
declare
  v_new_count integer;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  update child_vocabulary
  set needs_review    = false,
      last_correct_at = now(),
      last_seen_at    = now(),
      encounter_count = encounter_count + 1,
      status = case
        when encounter_count + 1 >= 8 then 'mastered'
        when encounter_count + 1 >= 3 then 'practiced'
        else status
      end
  where child_id = p_child_id
    and language  = p_language
    and word      = lower(trim(p_word))
  returning encounter_count into v_new_count;
end;
$$;

-- ── 5. get_vocab_progress ─────────────────────────────────────────────────────
-- Returns aggregate vocabulary statistics and a list of words flagged for
-- review. Designed to feed both the parent dashboard and Nimi's system prompt.

drop function if exists get_vocab_progress(uuid, text);

create or replace function get_vocab_progress(
  p_child_id uuid,
  p_language  text
) returns jsonb
language plpgsql security definer stable as $$
declare
  v_total       integer;
  v_encountered integer;
  v_practiced   integer;
  v_mastered    integer;
  v_needs_review integer;
  v_review_words jsonb;
begin
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  -- Aggregate counts by status
  select
    count(*)                                       as total,
    count(*) filter (where status = 'encountered') as encountered,
    count(*) filter (where status = 'practiced')   as practiced,
    count(*) filter (where status = 'mastered')    as mastered,
    count(*) filter (where needs_review)           as needs_review
  into v_total, v_encountered, v_practiced, v_mastered, v_needs_review
  from child_vocabulary
  where child_id = p_child_id and language = p_language;

  -- Words needing review (most recently flagged first, cap at 20)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'word',          cv.word,
      'status',        cv.status,
      'story_id',      cv.story_id,
      'encounter_count', cv.encounter_count,
      'last_seen_at',  cv.last_seen_at
    ) order by cv.last_seen_at desc
  ), '[]'::jsonb)
  into v_review_words
  from (
    select * from child_vocabulary
    where child_id   = p_child_id
      and language   = p_language
      and needs_review = true
    limit 20
  ) cv;

  return jsonb_build_object(
    'total_words',      coalesce(v_total,        0),
    'encountered',      coalesce(v_encountered,  0),
    'practiced',        coalesce(v_practiced,    0),
    'mastered',         coalesce(v_mastered,     0),
    'needs_review',     coalesce(v_needs_review, 0),
    'mastery_pct',      case when coalesce(v_total, 0) > 0
                          then round(coalesce(v_mastered, 0) * 100.0 / v_total)
                          else 0 end,
    'review_words',     v_review_words
  );
end;
$$;
