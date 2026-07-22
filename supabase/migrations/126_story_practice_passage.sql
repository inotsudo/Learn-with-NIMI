-- 126_story_practice_passage.sql
--
-- get_story_practice_passage(p_child_id uuid, p_language text) → jsonb
--
-- Returns a short readable passage for pronunciation practice, sourced from
-- the child's current active story missions.
--
-- content_json formats handled:
--   lyrics   → join non-empty lines (songs, most natural for reading aloud)
--   prompts  → join label strings from {emoji, label} objects
--   fallback → vocabulary words formatted as "word: example_sentence" pairs
--
-- Auth: caller must be the child's parent (is_my_child check via the
-- existing is_my_child security-definer function).

drop function if exists get_story_practice_passage(uuid, text);

create or replace function get_story_practice_passage(
  p_child_id uuid,
  p_language  text
) returns jsonb
language plpgsql security definer stable as $$
declare
  v_story_id    uuid;
  v_story_title text;
  v_mission_id  uuid;
  v_content     jsonb;
  v_passage     text;
  v_lyrics      text[];
  v_labels      text[];
  v_vocab       text[];
  v_line        text;
  v_elem        jsonb;
begin
  -- Auth: caller must own this child record
  if not is_my_child(p_child_id) then
    raise exception 'not authorized';
  end if;

  -- Find the child's active (in-progress) story: the one with the most
  -- recent child_progress activity that isn't fully complete yet.
  select m.story_id, s.title
  into v_story_id, v_story_title
  from child_progress cp
  join missions m      on m.id        = cp.mission_id
  join stories  s      on s.id        = m.story_id
  where cp.child_id  = p_child_id
    and cp.language  = p_language
    and s.status     = 'published'
  group by m.story_id, s.title
  order by max(cp.completed_at) desc
  limit 1;

  -- Fall back to the first published story if no progress exists
  if v_story_id is null then
    select id, title
    into v_story_id, v_story_title
    from stories
    where status = 'published'
    order by created_at
    limit 1;
  end if;

  if v_story_id is null then
    return null;
  end if;

  -- Get the content_json from the first published mission version of this story
  select mv.id, mv.content_json
  into v_mission_id, v_content
  from missions m
  join mission_versions mv
    on  mv.mission_id = m.id
    and mv.language   = p_language
    and mv.published  = true
  where m.story_id = v_story_id
    and mv.content_json is not null
    and mv.content_json <> '{}'::jsonb
  order by m.sequence nulls last, mv.revision_number desc
  limit 1;

  if v_content is null then
    -- No content found — return a vocabulary-list fallback
    select string_agg(lower(trim(e ->> 'word')), ', ' order by lower(trim(e ->> 'word')))
    into v_passage
    from missions m
    join mission_versions mv
      on  mv.mission_id = m.id
      and mv.language   = p_language
      and mv.published  = true
    cross join jsonb_array_elements(
      case jsonb_typeof(mv.content_json -> 'vocabulary')
        when 'array' then mv.content_json -> 'vocabulary'
        else '[]'::jsonb
      end
    ) as e
    where m.story_id = v_story_id
      and trim(coalesce(e ->> 'word', '')) <> ''
    limit 15;

    return jsonb_build_object(
      'story_id',    v_story_id,
      'story_title', coalesce(v_story_title, 'Story'),
      'passage',     coalesce(v_passage, 'Hello! I am reading today.'),
      'source',      'vocabulary'
    );
  end if;

  -- ── Try lyrics first (most natural for reading aloud) ─────────────────────
  if jsonb_typeof(v_content -> 'lyrics') = 'array' then
    select array_agg(line order by ord)
    into v_lyrics
    from (
      select
        trim(e::text, '"') as line,
        row_number() over () as ord
      from jsonb_array_elements_text(v_content -> 'lyrics') as e
      where trim(e::text, '"') <> ''
        and trim(e::text, '"') not like '(%'  -- skip section headers like "(Chorus)"
        and trim(e::text, '"') not like '[%'  -- skip placeholders like "[NAME]"
    ) sub
    limit 6;  -- keep it short — 3-6 lines is enough for a practice passage

    if array_length(v_lyrics, 1) >= 2 then
      v_passage := array_to_string(v_lyrics, ' ');
    end if;
  end if;

  -- ── Fall back to prompts ──────────────────────────────────────────────────
  if v_passage is null and jsonb_typeof(v_content -> 'prompts') = 'array' then
    select array_agg(trim(e ->> 'label') order by ord)
    into v_labels
    from (
      select e, row_number() over () as ord
      from jsonb_array_elements(v_content -> 'prompts') as e
      where trim(coalesce(e ->> 'label', '')) <> ''
    ) sub
    limit 5;

    if array_length(v_labels, 1) >= 1 then
      v_passage := array_to_string(v_labels, '. ') || '.';
    end if;
  end if;

  -- ── Fall back to vocabulary example sentences ─────────────────────────────
  if v_passage is null and jsonb_typeof(v_content -> 'vocabulary') = 'array' then
    select array_agg(sentence order by ord)
    into v_vocab
    from (
      select
        case
          when trim(coalesce(e ->> 'example_sentence', '')) <> ''
            then trim(e ->> 'example_sentence')
          else trim(e ->> 'word')
        end as sentence,
        row_number() over () as ord
      from jsonb_array_elements(v_content -> 'vocabulary') as e
      where trim(coalesce(e ->> 'word', '')) <> ''
    ) sub
    limit 5;

    if array_length(v_vocab, 1) >= 1 then
      v_passage := array_to_string(v_vocab, '. ') || '.';
    end if;
  end if;

  -- ── Final fallback ────────────────────────────────────────────────────────
  if v_passage is null or trim(v_passage) = '' then
    v_passage := 'Hello! I love reading stories. Every day I learn new words.';
  end if;

  -- Trim to ≤ 120 words
  select string_agg(word, ' ')
  into v_passage
  from (
    select unnest(string_to_array(trim(v_passage), ' ')) as word
    limit 120
  ) words;

  return jsonb_build_object(
    'story_id',    v_story_id,
    'story_title', coalesce(v_story_title, 'Story'),
    'passage',     v_passage,
    'source',      case
      when v_content -> 'lyrics'  is not null then 'lyrics'
      when v_content -> 'prompts' is not null then 'prompts'
      else 'vocabulary'
    end
  );
end;
$$;
