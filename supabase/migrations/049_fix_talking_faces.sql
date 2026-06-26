-- Create 6 missions + slots + versions for Talking Faces
DO $$
DECLARE
  sid uuid := '8faea423-1542-4c10-b3c0-90e34e3d8528';
  mid uuid;
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM (VALUES
      ('story',1,'flipflop_audio','FlipFlop Audio','flipflop'),
      ('read',2,'story_pdf','Story PDF','discovery'),
      ('color',3,'coloring','Coloring Activity','coloring'),
      ('move',4,'move_explore','Move & Explore','movement'),
      ('sing',5,'sing_along','Sing Along','morning'),
      ('watch',6,'bonus_video','Bonus Video','zoom')
    ) AS t(mtype, seq, skey, mtitle, catslug)
  LOOP
    INSERT INTO missions (story_id, type, sequence, stars, duration_minutes, category_slug)
    VALUES (sid, rec.mtype, rec.seq, 10, 10, rec.catslug)
    RETURNING id INTO mid;

    INSERT INTO story_slots (story_id, slot_key, mission_id, sort_order)
    VALUES (sid, rec.skey, mid, rec.seq);

    INSERT INTO mission_versions (mission_id, language, title, revision_number, status, published, is_current)
    VALUES (mid, 'en', rec.mtitle, 1, 'draft', false, true);
  END LOOP;
END $$;
