-- ============================================================
-- Migration 041: Level 1, Unit 1 — Hello, World! Bootstrap
--
-- Populates the first production curriculum unit:
--   • 1  curriculum_units row   (metadata)
--   • 8  missions               (one per category)
--   • 24 mission_versions       (8 × EN/FR/RW, status=published)
--   • 8  level_missions         (level=1, unit=1 slot links)
--   • 1  stories row            (FlipFlop picture book)
--   • 5  story_pages
--   • 15 story_page_versions    (5 pages × EN/FR/RW)
--
-- Guard: if (level=1, unit=1, category=morning) already exists in
-- level_missions the block exits immediately (idempotent).
--
-- trg_sync_mission_version_published fires on each mission_versions
-- INSERT and sets published = (status = 'published') automatically.
-- missions.active is set to true explicitly after versions are created.
-- ============================================================

DO $$
DECLARE
  v_morning_id    uuid;
  v_movement_id   uuid;
  v_artistic_id   uuid;
  v_histoire_id   uuid;
  v_zoom_id       uuid;
  v_discovery_id  uuid;
  v_flipflop_id   uuid;
  v_coloring_id   uuid;
  v_story_id      uuid;
  v_page1_id      uuid;
  v_page2_id      uuid;
  v_page3_id      uuid;
  v_page4_id      uuid;
  v_page5_id      uuid;
BEGIN

  -- ── GUARD ────────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM level_missions
    WHERE level_number = 1 AND unit_number = 1 AND category_slug = 'morning'
  ) THEN
    RAISE NOTICE 'Migration 041: Level 1 Unit 1 already bootstrapped — skipping.';
    RETURN;
  END IF;


  -- ── 0. CURRICULUM UNIT METADATA ──────────────────────────────
  INSERT INTO curriculum_units (level_number, unit_number, title, theme_emoji)
  VALUES (1, 1, 'Hello, World!', '👋')
  ON CONFLICT (level_number, unit_number) DO UPDATE
    SET title = EXCLUDED.title, theme_emoji = EXCLUDED.theme_emoji;


  -- ── 1. MORNING SONG ──────────────────────────────────────────
  INSERT INTO missions (category_slug, sequence, type, stars, duration_minutes, active)
  SELECT 'morning', coalesce(max(sequence), 0) + 1, 'sing', 10, 10, false
  FROM missions WHERE category_slug = 'morning'
  RETURNING id INTO v_morning_id;

  INSERT INTO mission_versions
    (mission_id, language, title, subtitle, tip_text, content_json, status, revision_number, is_current)
  VALUES
  (v_morning_id, 'en',
   'Hello, Hello!',
   'A call-and-response greeting song with waves and smiles',
   'Sing this every morning this week! Use your child''s real name in the chorus each time — hearing their own name in a song helps them recognize it and builds identity.',
   '{"lyrics":["Hello, hello! (wave your hand)","Hello, hello, hello!","Wave your hand up high, (wave)","And say: hello! Hello!","","(Chorus — use child''s name)","[NAME], hello!","[NAME], hello!","I''m so glad to see you,","[NAME], hello!"]}'::jsonb,
   'published', 1, true),
  (v_morning_id, 'fr',
   'Bonjour, Bonjour !',
   'Une chanson d''accueil en appel-réponse avec gestes',
   'Chantez cette chanson chaque matin cette semaine ! Utilisez le prénom de votre enfant dans le refrain — entendre son propre prénom dans une chanson l''aide à le reconnaître et renforce son identité.',
   '{"lyrics":["Bonjour, bonjour ! (agite ta main)","Bonjour, bonjour, bonjour !","Agite ta main bien haut, (agite)","Et dis : bonjour ! Bonjour !","","(Refrain — utilise le prénom de l''enfant)","[PRÉNOM], bonjour !","[PRÉNOM], bonjour !","Je suis content(e) de te voir,","[PRÉNOM], bonjour !"]}'::jsonb,
   'published', 1, true),
  (v_morning_id, 'rw',
   'Muraho, Muraho!',
   'Indirimbo yo kwakirana n''imigenamwimvo',
   'Imbiriza indirimbo iyi buri mataha muri icyumweru! Koresha izina ry''umwana wawe mu isabukuru — kumva izina rye mu ndirimbo bimumarira gurina no kwishimira umutungo we bwite.',
   '{"lyrics":["Muraho, muraho! (ninkunira ukuboko)","Muraho, muraho, muraho!","Inura ukuboko hejuru, (ninkunira)","Uvuge: muraho! Muraho!","","(Isabukuru — koresha izina ry''umwana)","[IZINA], muraho!","[IZINA], muraho!","Nishimiye kukubona,","[IZINA], muraho!"]}'::jsonb,
   'published', 1, true);

  UPDATE missions SET active = true WHERE id = v_morning_id;

  INSERT INTO level_missions (level_number, unit_number, category_slug, mission_id)
  VALUES (1, 1, 'morning', v_morning_id);


  -- ── 2. MOVEMENT MISSION ──────────────────────────────────────
  INSERT INTO missions (category_slug, sequence, type, stars, duration_minutes, active)
  SELECT 'movement', coalesce(max(sequence), 0) + 1, 'move', 10, 10, false
  FROM missions WHERE category_slug = 'movement'
  RETURNING id INTO v_movement_id;

  INSERT INTO mission_versions
    (mission_id, language, title, subtitle, tip_text, content_json, status, revision_number, is_current)
  VALUES
  (v_movement_id, 'en',
   'Come to Me!',
   'A walk-and-wave greeting game',
   'Say "wave" and wave yourself first — toddlers learn by copying! Play this game as a daily hello ritual at drop-off, pick-up, or wake-up time to build the greeting habit.',
   '{"prompts":[{"emoji":"👋","label":"Wave your hand and say: Hello!"},{"emoji":"🚶","label":"Walk toward your grown-up!"},{"emoji":"😊","label":"Give the biggest smile!"},{"emoji":"🤗","label":"Celebrate with a hug!"}]}'::jsonb,
   'published', 1, true),
  (v_movement_id, 'fr',
   'Viens vers moi !',
   'Un jeu de marche et de geste d''accueil',
   'Dites « agite » en agitant vous-même la main d''abord — les tout-petits apprennent par imitation ! Jouez à ce jeu chaque jour au moment du bonjour pour créer un rituel d''accueil.',
   '{"prompts":[{"emoji":"👋","label":"Agite ta main et dis : Bonjour !"},{"emoji":"🚶","label":"Marche vers ton grand !"},{"emoji":"😊","label":"Fais le plus grand sourire !"},{"emoji":"🤗","label":"Fête ça avec un câlin !"}]}'::jsonb,
   'published', 1, true),
  (v_movement_id, 'rw',
   'Nzana ino!',
   'Umukino wo gutembera no kwakirana',
   'Vuga "ninkunira" ukunira ukuboko kwawe mbere — inzirakarengane ziga gusubiramo! Kina uyu mukino buri gihe ko mushaka guhanuka kugirango bishingike neza.',
   '{"prompts":[{"emoji":"👋","label":"Ninkunira ukuboko uvuge: Muraho!"},{"emoji":"🚶","label":"Tembera ujye ku mubyeyi wawe!"},{"emoji":"😊","label":"Seka akanyamuneza!"},{"emoji":"🤗","label":"Ishimire mucumbika!"}]}'::jsonb,
   'published', 1, true);

  UPDATE missions SET active = true WHERE id = v_movement_id;

  INSERT INTO level_missions (level_number, unit_number, category_slug, mission_id)
  VALUES (1, 1, 'movement', v_movement_id);


  -- ── 3. MISSION ARTISTIQUE ────────────────────────────────────
  INSERT INTO missions (category_slug, sequence, type, stars, duration_minutes, active)
  SELECT 'artistic', coalesce(max(sequence), 0) + 1, 'color', 10, 10, false
  FROM missions WHERE category_slug = 'artistic'
  RETURNING id INTO v_artistic_id;

  INSERT INTO mission_versions
    (mission_id, language, title, subtitle, tip_text, content_json, status, revision_number, is_current)
  VALUES
  (v_artistic_id, 'en',
   'My Hello Hand',
   'Stamp your hand and send a greeting!',
   'Use ONE bold colour for a clean, beautiful print. While stamping, count "one, two, three — stamp!" every time — the counting rhythm is calming for toddlers and builds early number sense at the same time.',
   '{"instructions":"Dip your hand in the paint. Press it onto the paper. Lift it up slowly — there''s your hello hand! Point to each finger and say: hello, hello, hello, hello, hello! One hello for every finger!"}'::jsonb,
   'published', 1, true),
  (v_artistic_id, 'fr',
   'Ma Main Bonjour',
   'Tamponne ta main et envoie un bonjour !',
   'Utilisez UNE seule couleur vive pour une belle empreinte nette. En tamponnant, comptez « un, deux, trois — hop ! » à chaque fois — le rythme du comptage est apaisant et développe la conscience des chiffres.',
   '{"instructions":"Plonge ta main dans la peinture. Appuie-la sur le papier. Soulève-la doucement — voilà ta main bonjour ! Pointe chaque doigt et dis : bonjour, bonjour, bonjour, bonjour, bonjour ! Un bonjour pour chaque doigt !"}'::jsonb,
   'published', 1, true),
  (v_artistic_id, 'rw',
   'Ukuboko Kwanjye kwa Muraho',
   'Shira akaboko mu mafuta uhereze abantu muraho!',
   'Koresha UBURURU bumwe gusa kugirango uruzinduko ruhere neza. Mugihe ushira mu mafuta, baza "imwe, ebyiri, eshatu — shira!" buri gihe — urugero rwo kubara rurakura inzirakarengane kandi rugaca ibibazo.',
   '{"instructions":"Shira ukuboko kwanyu mu mafuta. Bigurumisha ku mpapuro. Bikuraho bugufi — hari ukuboko kwawe kwa muraho! Reba urutoki urebe, uvuge: muraho, muraho, muraho, muraho, muraho! Muraho umwe ku rutoki rwa buri kimwe!"}'::jsonb,
   'published', 1, true);

  UPDATE missions SET active = true WHERE id = v_artistic_id;

  INSERT INTO level_missions (level_number, unit_number, category_slug, mission_id)
  VALUES (1, 1, 'artistic', v_artistic_id);


  -- ── 4. MISSION HISTORIQUE ────────────────────────────────────
  INSERT INTO missions (category_slug, sequence, type, stars, duration_minutes, active)
  SELECT 'histoire', coalesce(max(sequence), 0) + 1, 'read', 10, 10, false
  FROM missions WHERE category_slug = 'histoire'
  RETURNING id INTO v_histoire_id;

  INSERT INTO mission_versions
    (mission_id, language, title, subtitle, tip_text, content_json, status, revision_number, is_current)
  VALUES
  (v_histoire_id, 'en',
   'Baby Amara''s Morning',
   'A story about a baby''s first hello',
   'Read this story slowly and act out the wave! After a few days your child will wave along before you even get to that part — that''s early comprehension. Use the same warm, happy voice every time to make this a cozy read-aloud ritual.',
   '{"text":"This is Amara. She is a baby in Rwanda. She wakes up in the morning. The sun is shining. She sees Mama. Amara waves her hand. Hello, Mama! Mama smiles big. Hello, Amara! I love you! Amara is happy. She waves again. Hello, world!"}'::jsonb,
   'published', 1, true),
  (v_histoire_id, 'fr',
   'Le Matin de Bébé Amara',
   'Une histoire sur le premier bonjour d''un bébé',
   'Lisez cette histoire lentement et mimez le geste de salut ! Après quelques jours, votre enfant agite la main avant que vous arriviez à cette partie — c''est une compréhension précoce. Utilisez la même voix chaleureuse et heureuse à chaque fois.',
   '{"text":"Voici Amara. C''est un bébé au Rwanda. Elle se réveille le matin. Le soleil brille. Elle voit Maman. Amara agite la main. Bonjour, Maman ! Maman sourit fort. Bonjour, Amara ! Je t''aime ! Amara est heureuse. Elle agite encore la main. Bonjour, le monde !"}'::jsonb,
   'published', 1, true),
  (v_histoire_id, 'rw',
   'Mu Gitondo cya Amara Mwana',
   'Inkuru y''indoto ya mbere ya mwana muto',
   'Soma inkuru iyi bugufi ukunira ukuboko! Nyuma y''iminsi mike, umwana wawe azakunira ukuboko mbere y''aho ugera ku gice icyo — ni intwali yo gusobanukirwa. Koresha ijwi rinini kandi ryishimye buri gihe.',
   '{"text":"Uyu ni Amara. Ni umwana muto mu Rwanda. Azuka mu gitondo. Izuba rirashe. Abona Mama. Amara akunira ukuboko. Muraho, Mama! Mama aseka cyane. Muraho, Amara! Ndagukunda! Amara aranyurwa. Akunira ukuboko nanone. Muraho, isi yose!"}'::jsonb,
   'published', 1, true);

  UPDATE missions SET active = true WHERE id = v_histoire_id;

  INSERT INTO level_missions (level_number, unit_number, category_slug, mission_id)
  VALUES (1, 1, 'histoire', v_histoire_id);


  -- ── 5. MISSION ZOOM ──────────────────────────────────────────
  INSERT INTO missions (category_slug, sequence, type, stars, duration_minutes, active)
  SELECT 'zoom', coalesce(max(sequence), 0) + 1, 'watch', 10, 10, false
  FROM missions WHERE category_slug = 'zoom'
  RETURNING id INTO v_zoom_id;

  INSERT INTO mission_versions
    (mission_id, language, title, subtitle, tip_text, content_json, status, revision_number, is_current)
  VALUES
  (v_zoom_id, 'en',
   'Hello, Rwanda!',
   'Watch friendly faces say hello in three languages',
   'Pause the video and wave along every time! Say all three greetings out loud: "Hello! Bonjour! Muraho!" — your child learning all three is the goal, even if it takes many sessions.',
   '{"instructions":"Watch the friendly faces! See them wave and smile. Can you wave too? Hello! Bonjour! Muraho! Wave every time you see someone smile. Say it with them: Hello! Bonjour! Muraho!"}'::jsonb,
   'published', 1, true),
  (v_zoom_id, 'fr',
   'Bonjour, Rwanda !',
   'Regarde des visages sympas dire bonjour en trois langues',
   'Mettez en pause et agitez la main à chaque fois ! Dites les trois salutations à voix haute : « Hello ! Bonjour ! Muraho ! » — l''objectif est que votre enfant apprenne les trois, même si cela prend plusieurs séances.',
   '{"instructions":"Regarde les visages sympas ! Tu les vois agiter la main et sourire. Tu peux agiter toi aussi ? Hello ! Bonjour ! Muraho ! Agite à chaque fois que tu vois quelqu''un sourire. Dis-le avec eux : Hello ! Bonjour ! Muraho !"}'::jsonb,
   'published', 1, true),
  (v_zoom_id, 'rw',
   'Muraho, Rwanda!',
   'Reba inzira zishimye zivuga muraho mu ndimi eshatu',
   'Simamisha vidiyo ukunire ukuboko buri gihe! Vuga indimi eshatu hejuru: "Hello! Bonjour! Muraho!" — intego ni uko umwana wawe yiga zose eshatu, nubwo birashobora gufata ibihe byinshi.',
   '{"instructions":"Reba inzira zishimye! Urabona bakunira ukuboko kandi baseka. Nawe wakora gutyo? Hello! Bonjour! Muraho! Ninkunira buri gihe ubona umuntu aseka. Vuga pamwe nabo: Hello! Bonjour! Muraho!"}'::jsonb,
   'published', 1, true);

  UPDATE missions SET active = true WHERE id = v_zoom_id;

  INSERT INTO level_missions (level_number, unit_number, category_slug, mission_id)
  VALUES (1, 1, 'zoom', v_zoom_id);


  -- ── 6. MISSION DISCOVERY ─────────────────────────────────────
  INSERT INTO missions (category_slug, sequence, type, stars, duration_minutes, active)
  SELECT 'discovery', coalesce(max(sequence), 0) + 1, 'watch', 10, 10, false
  FROM missions WHERE category_slug = 'discovery'
  RETURNING id INTO v_discovery_id;

  INSERT INTO mission_versions
    (mission_id, language, title, subtitle, tip_text, content_json, status, revision_number, is_current)
  VALUES
  (v_discovery_id, 'en',
   'Who Is That?',
   'Look in the mirror and say hello to YOU!',
   'Self-recognition in a mirror develops around 18–24 months. If your child tries to look behind the mirror, that is totally normal! Keep naming their features warmly: "eyes, nose, mouth, YOU!" — it all builds up over weeks.',
   '{"instructions":"Look in the mirror! Who is that? It''s YOU! Wave hello to yourself. Say: Hello, me! Point to your eyes. Point to your nose. Point to your big smile! That is your hello face!"}'::jsonb,
   'published', 1, true),
  (v_discovery_id, 'fr',
   'C''est qui, ça ?',
   'Regarde dans le miroir et dis bonjour à TOI !',
   'La reconnaissance de soi dans un miroir se développe vers 18–24 mois. Si votre enfant cherche derrière le miroir, c''est tout à fait normal ! Continuez à nommer ses traits chaleureusement : « yeux, nez, bouche, TOI ! » — tout cela se construit au fil des semaines.',
   '{"instructions":"Regarde dans le miroir ! C''est qui, ça ? C''est TOI ! Agite la main pour te dire bonjour. Dis : Bonjour, moi ! Montre tes yeux. Montre ton nez. Montre ton grand sourire ! C''est ton visage bonjour !"}'::jsonb,
   'published', 1, true),
  (v_discovery_id, 'rw',
   'Ni Nde Uwo?',
   'Reba mu kioo uvuge muraho WEWE UBWAWE!',
   'Kwibona mu kioo biterwa n''imyaka ingana na 18–24. Niba umwana wawe ashaka inyuma y''ikioo, ni bisanzwe! Komeza kuvuga ibice by''umubiri we neza: "amaso, izuru, umunwa, WEWE!" — byose biboneka buhoro buhoro.',
   '{"instructions":"Reba mu kioo! Ni nde uwo? Ni WEWE! Ninkunira ukuboko wivuge muraho. Vuga: Muraho, njye! Reba amaso yawe. Reba izuru ryawe. Reba akanyamuneza kawe gakomeye! Ni isura yawe yo kuvuga muraho!"}'::jsonb,
   'published', 1, true);

  UPDATE missions SET active = true WHERE id = v_discovery_id;

  INSERT INTO level_missions (level_number, unit_number, category_slug, mission_id)
  VALUES (1, 1, 'discovery', v_discovery_id);


  -- ── 7. FLIPFLOP BOOK ─────────────────────────────────────────

  -- Story record (slug unique — ON CONFLICT safe for re-run)
  INSERT INTO stories (slug, title, theme_title, theme_emoji, sort_order, is_active)
  VALUES ('hello-friend-l1u1', 'Hello, Friend!', 'Hello, World!', '👋', 1, false)
  ON CONFLICT (slug) DO UPDATE
    SET title       = EXCLUDED.title,
        theme_title = EXCLUDED.theme_title,
        theme_emoji = EXCLUDED.theme_emoji
  RETURNING id INTO v_story_id;

  -- Story pages (5 pages; image_url null — illustrations added in BK.4C)
  INSERT INTO story_pages (story_id, page_number, image_url)
  VALUES (v_story_id, 1, null)
  ON CONFLICT (story_id, page_number) DO UPDATE SET image_url = EXCLUDED.image_url
  RETURNING id INTO v_page1_id;

  INSERT INTO story_pages (story_id, page_number, image_url)
  VALUES (v_story_id, 2, null)
  ON CONFLICT (story_id, page_number) DO UPDATE SET image_url = EXCLUDED.image_url
  RETURNING id INTO v_page2_id;

  INSERT INTO story_pages (story_id, page_number, image_url)
  VALUES (v_story_id, 3, null)
  ON CONFLICT (story_id, page_number) DO UPDATE SET image_url = EXCLUDED.image_url
  RETURNING id INTO v_page3_id;

  INSERT INTO story_pages (story_id, page_number, image_url)
  VALUES (v_story_id, 4, null)
  ON CONFLICT (story_id, page_number) DO UPDATE SET image_url = EXCLUDED.image_url
  RETURNING id INTO v_page4_id;

  INSERT INTO story_pages (story_id, page_number, image_url)
  VALUES (v_story_id, 5, null)
  ON CONFLICT (story_id, page_number) DO UPDATE SET image_url = EXCLUDED.image_url
  RETURNING id INTO v_page5_id;

  -- Story page versions (15 rows: 5 pages × EN / FR / RW)
  INSERT INTO story_page_versions (story_page_id, language, text, audio_url, published) VALUES
    (v_page1_id, 'en', 'Hello! Hello! This is Zara.',                    null, true),
    (v_page1_id, 'fr', 'Bonjour ! Bonjour ! Voici Zara.',                null, true),
    (v_page1_id, 'rw', 'Muraho! Muraho! Uyu ni Zara.',                   null, true),
    (v_page2_id, 'en', 'Hello, Mama! Zara waves her hand.',               null, true),
    (v_page2_id, 'fr', 'Bonjour, Maman ! Zara agite la main.',            null, true),
    (v_page2_id, 'rw', 'Muraho, Mama! Zara akunira ukuboko.',             null, true),
    (v_page3_id, 'en', 'Hello, Baba! Zara smiles big.',                   null, true),
    (v_page3_id, 'fr', 'Bonjour, Papa ! Zara sourit fort.',               null, true),
    (v_page3_id, 'rw', 'Muraho, Papa! Zara aseka cyane.',                 null, true),
    (v_page4_id, 'en', 'Hello, friend! They wave together.',              null, true),
    (v_page4_id, 'fr', 'Bonjour, ami ! Ils agitent ensemble.',            null, true),
    (v_page4_id, 'rw', 'Muraho, incuti! Bakunira hamwe.',                 null, true),
    (v_page5_id, 'en', 'Hello, world! Zara loves everyone!',              null, true),
    (v_page5_id, 'fr', 'Bonjour, monde ! Zara aime tout le monde !',      null, true),
    (v_page5_id, 'rw', 'Muraho, isi! Zara akunda bose!',                  null, true)
  ON CONFLICT (story_page_id, language) DO UPDATE
    SET text = EXCLUDED.text, published = EXCLUDED.published;

  -- Activate story now that all pages are published
  UPDATE stories SET is_active = true WHERE id = v_story_id;

  -- FlipFlop mission (links to story via story_id)
  INSERT INTO missions (category_slug, sequence, type, stars, duration_minutes, story_id, active)
  SELECT 'flipflop', coalesce(max(sequence), 0) + 1, 'story', 10, 10, v_story_id, false
  FROM missions WHERE category_slug = 'flipflop'
  RETURNING id INTO v_flipflop_id;

  -- mission_versions: content_json is empty — pages served from story_page_versions
  INSERT INTO mission_versions
    (mission_id, language, title, subtitle, tip_text, content_json, status, revision_number, is_current)
  VALUES
  (v_flipflop_id, 'en',
   'Hello, Friend!',
   'A flip-book story about saying hello in Rwanda',
   'Read this book every day this week! By the third reading, point and ask "Where''s Zara?" before reading the word — pointing comprehension develops faster than speaking at this age.',
   '{}'::jsonb,
   'published', 1, true),
  (v_flipflop_id, 'fr',
   'Bonjour, Mon Ami !',
   'Une histoire en images sur les bonjours au Rwanda',
   'Lisez ce livre tous les jours cette semaine ! À la troisième lecture, pointez et demandez « Où est Zara ? » avant de lire le mot — la compréhension par pointage se développe plus vite que la parole à cet âge.',
   '{}'::jsonb,
   'published', 1, true),
  (v_flipflop_id, 'rw',
   'Muraho, Incuti!',
   'Inkuru y''amashusho yo kwakirana mu Rwanda',
   'Soma igitabo ibi buri munsi muri icyumweru! Ku isomwa rya gatatu, reba ubaze "Ni he Zara?" mbere yo gusoma ijambo — gusobanukirwa no kwerekana bigaragara vuba kurusha no kuvuga mu myaka iyi.',
   '{}'::jsonb,
   'published', 1, true);

  UPDATE missions SET active = true WHERE id = v_flipflop_id;

  INSERT INTO level_missions (level_number, unit_number, category_slug, mission_id)
  VALUES (1, 1, 'flipflop', v_flipflop_id);


  -- ── 8. COLORING BOOK ─────────────────────────────────────────
  INSERT INTO missions (category_slug, sequence, type, stars, duration_minutes, active)
  SELECT 'coloring', coalesce(max(sequence), 0) + 1, 'color', 10, 10, false
  FROM missions WHERE category_slug = 'coloring'
  RETURNING id INTO v_coloring_id;

  INSERT INTO mission_versions
    (mission_id, language, title, subtitle, tip_text, content_json, status, revision_number, is_current)
  VALUES
  (v_coloring_id, 'en',
   'My Smiley Face',
   'Color a big happy face that says hello!',
   'Scribbling outside the lines is PERFECT at this age — it means they''re engaged! While they color, keep naming the features: "eyes, nose, mouth, smile" — that vocabulary-while-doing is the real learning happening here.',
   '{"instructions":"Color the big smiley face! Choose your favorite bright color. Give it happy eyes. Give it a big smile. This face is saying: HELLO! When you are done, wave at your picture. Hello, smiley face!"}'::jsonb,
   'published', 1, true),
  (v_coloring_id, 'fr',
   'Mon Visage Souriant',
   'Colorie un grand visage heureux qui dit bonjour !',
   'Colorier en dehors des lignes est PARFAIT à cet âge — cela signifie qu''ils sont engagés ! Pendant qu''ils colorient, continuez à nommer les traits : « yeux, nez, bouche, sourire » — c''est ce vocabulaire en action qui constitue le vrai apprentissage.',
   '{"instructions":"Colorie le grand visage souriant ! Choisis ta couleur vive préférée. Donne-lui des yeux joyeux. Donne-lui un grand sourire. Ce visage dit : BONJOUR ! Quand tu as fini, agite la main à ton dessin. Bonjour, visage souriant !"}'::jsonb,
   'published', 1, true),
  (v_coloring_id, 'rw',
   'Isura Yanjye Ishimye',
   'Sura isura nini ishimye ivuga muraho!',
   'Gusura hanze y''imirongo ni BYIZA mu myaka iyi — bisobanura ko bamaze! Mugihe basura, komeza kuvuga ibice by''umubiri: "amaso, izuru, umunwa, akanyamuneza" — ijambo ry''ikirangwa ni ryo somo rya nyakuri rishoboka.',
   '{"instructions":"Sura isura nini ishimye! Hitamo ibara ryawe ryiza. Ipe amaso mashimye. Ipe akanyamuneza gakomeye. Isura iyi ivuga: MURAHO! Iyo urangije, ninkunira isura yawe. Muraho, isura ishimye!"}'::jsonb,
   'published', 1, true);

  UPDATE missions SET active = true WHERE id = v_coloring_id;

  INSERT INTO level_missions (level_number, unit_number, category_slug, mission_id)
  VALUES (1, 1, 'coloring', v_coloring_id);


  RAISE NOTICE 'Migration 041: Level 1 Unit 1 bootstrapped successfully — 8 missions, 24 versions, 8 slots, 1 story, 5 pages, 15 page versions.';

END $$;
