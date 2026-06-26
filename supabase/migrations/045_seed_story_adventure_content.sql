-- ============================================================
--  NIMIPIKO — Seed Story Adventure Content (SA Step 6)
--
--  Wires existing Story 1 into the Story Adventure model.
--  Creates Stories 2-4 with placeholder missions.
--  All stories get story_versions (English) and story_slots.
-- ============================================================

-- Drop BK-era constraint that blocks multiple missions per category
alter table missions drop constraint if exists missions_category_slug_sequence_key;

-- ── STORY 1: "Hello, Friend!" (already exists) ──────────────

-- Update existing story metadata
update stories set
  title = 'The Talking Faces',
  slug = 'the-talking-faces',
  theme_emoji = '😊',
  theme_title = 'Emotions & Feelings',
  age_min = 2,
  age_max = 6
where id = '8b47e35f-dcf8-4eb8-b130-c638ffd1acd0';

-- Create English story_version
insert into story_versions (story_id, language, title, status)
values (
  '8b47e35f-dcf8-4eb8-b130-c638ffd1acd0',
  'en',
  'The Talking Faces',
  'published'
) on conflict (story_id, language) do nothing;

-- Wire 5 existing BK missions to Story 1 (flipflop already linked)
update missions set story_id = '8b47e35f-dcf8-4eb8-b130-c638ffd1acd0'
  where id = '1deb73c4-97aa-42e2-bd9f-3dca0f9535e6'; -- coloring

update missions set story_id = '8b47e35f-dcf8-4eb8-b130-c638ffd1acd0'
  where id = '63475a84-e360-4571-a568-3ab70053c8cc'; -- movement

update missions set story_id = '8b47e35f-dcf8-4eb8-b130-c638ffd1acd0'
  where id = 'f8495c5e-281c-49ff-93ae-ac4a86aaaddb'; -- morning/sing

update missions set story_id = '8b47e35f-dcf8-4eb8-b130-c638ffd1acd0'
  where id = 'c1265275-1e14-40a6-9d05-123e652e0960'; -- zoom/watch

update missions set story_id = '8b47e35f-dcf8-4eb8-b130-c638ffd1acd0'
  where id = 'a85643a1-11ae-46ee-aba0-57219a96ecfd'; -- histoire/read

-- Create story_slots for Story 1
insert into story_slots (story_id, slot_key, mission_id, sort_order) values
  ('8b47e35f-dcf8-4eb8-b130-c638ffd1acd0', 'flipflop_audio', '53208e04-9c98-4520-a086-6b2d6178da42', 1),
  ('8b47e35f-dcf8-4eb8-b130-c638ffd1acd0', 'story_pdf',      'a85643a1-11ae-46ee-aba0-57219a96ecfd', 2),
  ('8b47e35f-dcf8-4eb8-b130-c638ffd1acd0', 'coloring',       '1deb73c4-97aa-42e2-bd9f-3dca0f9535e6', 3),
  ('8b47e35f-dcf8-4eb8-b130-c638ffd1acd0', 'move_explore',   '63475a84-e360-4571-a568-3ab70053c8cc', 4),
  ('8b47e35f-dcf8-4eb8-b130-c638ffd1acd0', 'sing_along',     'f8495c5e-281c-49ff-93ae-ac4a86aaaddb', 5),
  ('8b47e35f-dcf8-4eb8-b130-c638ffd1acd0', 'bonus_video',    'c1265275-1e14-40a6-9d05-123e652e0960', 6)
on conflict do nothing;


-- ── STORY 2: "Funny Animals" ─────────────────────────────────

insert into stories (slug, title, sort_order, status, theme_emoji, theme_title, age_min, age_max)
values ('funny-animals', 'Funny Animals', 2, 'draft', '🦁', 'Animals & Nature', 2, 6)
on conflict (slug) do nothing;

do $$
declare
  v_story_id uuid;
  v_m1 uuid; v_m2 uuid; v_m3 uuid; v_m4 uuid; v_m5 uuid; v_m6 uuid;
begin
  select id into v_story_id from stories where slug = 'funny-animals';
  if v_story_id is null then return; end if;

  insert into story_versions (story_id, language, title, status)
  values (v_story_id, 'en', 'Funny Animals', 'published')
  on conflict (story_id, language) do nothing;

  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('flipflop', 1, 'story', 10, v_story_id, false) returning id into v_m1;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('discovery', 1, 'read', 10, v_story_id, false) returning id into v_m2;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('coloring', 1, 'color', 10, v_story_id, false) returning id into v_m3;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('movement', 1, 'move', 10, v_story_id, false) returning id into v_m4;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('morning', 1, 'sing', 10, v_story_id, false) returning id into v_m5;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('zoom', 1, 'watch', 10, v_story_id, false) returning id into v_m6;

  insert into mission_versions (mission_id, language, title, subtitle, published, status, is_current, revision_number) values
    (v_m1, 'en', 'Listen to Funny Animals', 'Listen to the story page by page', false, 'draft', true, 1),
    (v_m2, 'en', 'Read Funny Animals', 'Read along with your family', false, 'draft', true, 1),
    (v_m3, 'en', 'Color the Animals', 'Color the story illustrations', false, 'draft', true, 1),
    (v_m4, 'en', 'Move Like Animals', 'Jump, stomp and roar with Nimi!', false, 'draft', true, 1),
    (v_m5, 'en', 'Sing the Animal Song', 'Sing along with Nimi', false, 'draft', true, 1),
    (v_m6, 'en', 'Watch Funny Animals', 'Watch the animated story', false, 'draft', true, 1);

  insert into story_slots (story_id, slot_key, mission_id, sort_order) values
    (v_story_id, 'flipflop_audio', v_m1, 1),
    (v_story_id, 'story_pdf',      v_m2, 2),
    (v_story_id, 'coloring',       v_m3, 3),
    (v_story_id, 'move_explore',   v_m4, 4),
    (v_story_id, 'sing_along',     v_m5, 5),
    (v_story_id, 'bonus_video',    v_m6, 6);
end;
$$;


-- ── STORY 3: "Rainbow Colors" ────────────────────────────────

insert into stories (slug, title, sort_order, status, theme_emoji, theme_title, age_min, age_max)
values ('rainbow-colors', 'Rainbow Colors', 3, 'draft', '🌈', 'Colors & Creativity', 2, 6)
on conflict (slug) do nothing;

do $$
declare
  v_story_id uuid;
  v_m1 uuid; v_m2 uuid; v_m3 uuid; v_m4 uuid; v_m5 uuid; v_m6 uuid;
begin
  select id into v_story_id from stories where slug = 'rainbow-colors';
  if v_story_id is null then return; end if;

  insert into story_versions (story_id, language, title, status)
  values (v_story_id, 'en', 'Rainbow Colors', 'published')
  on conflict (story_id, language) do nothing;

  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('flipflop', 1, 'story', 10, v_story_id, false) returning id into v_m1;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('discovery', 1, 'read', 10, v_story_id, false) returning id into v_m2;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('coloring', 1, 'color', 10, v_story_id, false) returning id into v_m3;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('movement', 1, 'move', 10, v_story_id, false) returning id into v_m4;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('morning', 1, 'sing', 10, v_story_id, false) returning id into v_m5;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('zoom', 1, 'watch', 10, v_story_id, false) returning id into v_m6;

  insert into mission_versions (mission_id, language, title, subtitle, published, status, is_current, revision_number) values
    (v_m1, 'en', 'Listen to Rainbow Colors', 'Listen to the story page by page', false, 'draft', true, 1),
    (v_m2, 'en', 'Read Rainbow Colors', 'Read along with your family', false, 'draft', true, 1),
    (v_m3, 'en', 'Color the Rainbow', 'Color the story illustrations', false, 'draft', true, 1),
    (v_m4, 'en', 'Dance the Rainbow', 'Move and groove with colors!', false, 'draft', true, 1),
    (v_m5, 'en', 'Sing Rainbow Song', 'Sing along with Nimi', false, 'draft', true, 1),
    (v_m6, 'en', 'Watch Rainbow Colors', 'Watch the animated story', false, 'draft', true, 1);

  insert into story_slots (story_id, slot_key, mission_id, sort_order) values
    (v_story_id, 'flipflop_audio', v_m1, 1),
    (v_story_id, 'story_pdf',      v_m2, 2),
    (v_story_id, 'coloring',       v_m3, 3),
    (v_story_id, 'move_explore',   v_m4, 4),
    (v_story_id, 'sing_along',     v_m5, 5),
    (v_story_id, 'bonus_video',    v_m6, 6);
end;
$$;


-- ── STORY 4: "My Family" ────────────────────────────────────

insert into stories (slug, title, sort_order, status, theme_emoji, theme_title, age_min, age_max)
values ('my-family', 'My Family', 4, 'draft', '👨‍👩‍👧‍👦', 'Family & Love', 2, 6)
on conflict (slug) do nothing;

do $$
declare
  v_story_id uuid;
  v_m1 uuid; v_m2 uuid; v_m3 uuid; v_m4 uuid; v_m5 uuid; v_m6 uuid;
begin
  select id into v_story_id from stories where slug = 'my-family';
  if v_story_id is null then return; end if;

  insert into story_versions (story_id, language, title, status)
  values (v_story_id, 'en', 'My Family', 'published')
  on conflict (story_id, language) do nothing;

  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('flipflop', 1, 'story', 10, v_story_id, false) returning id into v_m1;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('discovery', 1, 'read', 10, v_story_id, false) returning id into v_m2;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('coloring', 1, 'color', 10, v_story_id, false) returning id into v_m3;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('movement', 1, 'move', 10, v_story_id, false) returning id into v_m4;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('morning', 1, 'sing', 10, v_story_id, false) returning id into v_m5;
  insert into missions (category_slug, sequence, type, stars, story_id, active) values
    ('zoom', 1, 'watch', 10, v_story_id, false) returning id into v_m6;

  insert into mission_versions (mission_id, language, title, subtitle, published, status, is_current, revision_number) values
    (v_m1, 'en', 'Listen to My Family', 'Listen to the story page by page', false, 'draft', true, 1),
    (v_m2, 'en', 'Read My Family', 'Read along with your family', false, 'draft', true, 1),
    (v_m3, 'en', 'Color My Family', 'Color the story illustrations', false, 'draft', true, 1),
    (v_m4, 'en', 'Family Moves', 'Dance and move with your family!', false, 'draft', true, 1),
    (v_m5, 'en', 'Sing Family Song', 'Sing along with Nimi', false, 'draft', true, 1),
    (v_m6, 'en', 'Watch My Family', 'Watch the animated story', false, 'draft', true, 1);

  insert into story_slots (story_id, slot_key, mission_id, sort_order) values
    (v_story_id, 'flipflop_audio', v_m1, 1),
    (v_story_id, 'story_pdf',      v_m2, 2),
    (v_story_id, 'coloring',       v_m3, 3),
    (v_story_id, 'move_explore',   v_m4, 4),
    (v_story_id, 'sing_along',     v_m5, 5),
    (v_story_id, 'bonus_video',    v_m6, 6);
end;
$$;


-- ============================================================
--  END: 4 stories seeded
--  Story 1: "The Talking Faces" — PUBLISHED, 6 slots wired to existing missions
--  Story 2: "Funny Animals" — DRAFT, 6 placeholder missions
--  Story 3: "Rainbow Colors" — DRAFT, 6 placeholder missions
--  Story 4: "My Family" — DRAFT, 6 placeholder missions
--
--  Stories 2-4 are draft. Admin uploads content via CMS,
--  then publishes each story when ready.
-- ============================================================
