-- ── Migration 098: Book 1 Challenge Content ──────────────────────────────────
-- Seeds 3 creative challenges for "the-talking-faces" (Nimi and the Talking Faces)
-- EN: Magic Mirror Game, Smile Maker, Draw the Funny Face
-- FR: Jeu du Miroir Magique, Changeur de Visage, Dessin du Bonhomme Rigolo
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure story columns exist (added by migration 012, but remote may predate it)
alter table stories add column if not exists theme_title text;
alter table stories add column if not exists theme_emoji text;

-- Ensure the story row exists (idempotent)
insert into stories (slug, title, sort_order, is_active, theme_title, theme_emoji)
values ('the-talking-faces', 'Nimi and the Talking Faces', 1, true, 'Emotions & Feelings', '🎭')
on conflict (slug) do update
  set theme_title = coalesce(stories.theme_title, excluded.theme_title),
      theme_emoji = coalesce(stories.theme_emoji, excluded.theme_emoji);

do $$
declare
  v_story_id  uuid;
  v_ch1_id    uuid;
  v_ch2_id    uuid;
  v_ch3_id    uuid;
begin
  select id into v_story_id from stories where slug = 'the-talking-faces';

  -- ── Challenge 1: Magic Mirror Game ──────────────────────────────────────────
  insert into weekly_challenges (story_id, sort_order, type, stars, difficulty, estimated_minutes)
  values (v_story_id, 1, 'creative', 15, 'easy', 5)
  returning id into v_ch1_id;

  insert into weekly_challenge_versions (challenge_id, language, title, description, status, published)
  values
    (v_ch1_id, 'en', 'Magic Mirror Game',
     'Stand in front of a mirror and copy each face from the story! Make happy, sad, surprised, and funny faces just like the characters.',
     'published', true),
    (v_ch1_id, 'fr', 'Jeu du Miroir Magique',
     'Mets-toi devant un miroir et copie chaque visage de l''histoire ! Fais des visages heureux, tristes, surpris et rigolos comme les personnages.',
     'published', true),
    (v_ch1_id, 'rw', 'Umukino w''Indorerwamo Idasanzwe',
     'Ima imbere y''indorerwamo maze wigane amaso y''ibivugwa mu nkuru! Kora amaso y''umunezero, agahinda, gutekereza n''akagari nk''ababyeyi b''inkuru.',
     'draft', false);

  -- ── Challenge 2: Smile Maker ─────────────────────────────────────────────────
  insert into weekly_challenges (story_id, sort_order, type, stars, difficulty, estimated_minutes)
  values (v_story_id, 2, 'creative', 15, 'easy', 5)
  returning id into v_ch2_id;

  insert into weekly_challenge_versions (challenge_id, language, title, description, status, published)
  values
    (v_ch2_id, 'en', 'Smile Maker',
     'Make someone in your family smile today! Draw a funny face for them, do a silly dance, or share your favourite joke.',
     'published', true),
    (v_ch2_id, 'fr', 'Changeur de Visage',
     'Fais sourire quelqu''un de ta famille aujourd''hui ! Dessine un visage rigolo, fais une danse amusante ou partage ta blague préférée.',
     'published', true),
    (v_ch2_id, 'rw', 'Gukora Umuntu Arangarire',
     'Kora umuntu wo mu muryango wawe ararangarire uyu munsi! Musorezere amaso mashya, kina intambwe y''akagari, cyangwa bwira akajokijoki kawe.',
     'draft', false);

  -- ── Challenge 3: Draw the Funny Face ─────────────────────────────────────────
  insert into weekly_challenges (story_id, sort_order, type, stars, difficulty, estimated_minutes)
  values (v_story_id, 3, 'creative', 20, 'easy', 10)
  returning id into v_ch3_id;

  insert into weekly_challenge_versions (challenge_id, language, title, description, status, published)
  values
    (v_ch3_id, 'en', 'Draw the Funny Face',
     'Draw your favourite funny face character from the story. Give it a big smile, wild eyes, silly ears — make it as hilarious as you can!',
     'published', true),
    (v_ch3_id, 'fr', 'Dessin du Bonhomme Rigolo',
     'Dessine le personnage au visage le plus rigolo de l''histoire. Donne-lui un grand sourire, des yeux fous, des oreilles saugrenues — rends-le aussi drôle que possible !',
     'published', true),
    (v_ch3_id, 'rw', 'Desenga Umaso Mushya w''Akagari',
     'Desenga umuntu w''inkuru ufite amaso y''akagari kuruta abandi. Muhe inzara nkuru, amaso asangabana, amatwi mashya — mukorere neza !',
     'draft', false);

end $$;
