-- 124_classroom_review_words.sql
--
-- get_classroom_review_words(p_teacher_id uuid) → jsonb
--
-- Returns vocabulary words that are currently flagged needs_review = true
-- for students in this teacher's class, sorted by the number of students
-- who have each word flagged (most widespread struggles first).
--
-- Capped at 15 words — enough to pre-populate the homework generator
-- textarea without overwhelming a teacher who just wants a quick list.
--
-- Auth: caller must be p_teacher_id (same pattern as migration 122).

drop function if exists get_classroom_review_words(uuid);

create or replace function get_classroom_review_words(p_teacher_id uuid)
returns jsonb
language plpgsql security definer stable as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null or v_caller != p_teacher_id then
    raise exception 'not authorized';
  end if;

  return (
    with

    -- All children who belong to this teacher
    class_children as (
      select id, language
      from children
      where teacher_id = p_teacher_id
    ),

    -- Words flagged needs_review across the class.
    -- Count distinct students per word (a word appears once even if the same
    -- child saw it in multiple stories).
    flagged as (
      select
        cv.word,
        count(distinct cv.child_id)          as student_count,
        max(cv.last_seen_at)                 as last_flagged_at
      from child_vocabulary cv
      join class_children cc on cc.id = cv.child_id
      where cv.needs_review = true
      group by cv.word
      order by student_count desc, last_flagged_at desc
      limit 15
    )

    select coalesce(
      jsonb_build_object(
        'review_words', jsonb_agg(
          jsonb_build_object(
            'word',          f.word,
            'student_count', f.student_count
          )
          order by f.student_count desc
        ),
        'total_flagged_words', (
          select count(distinct cv2.word)
          from child_vocabulary cv2
          join class_children cc2 on cc2.id = cv2.child_id
          where cv2.needs_review = true
        )
      ),
      jsonb_build_object(
        'review_words',        '[]'::jsonb,
        'total_flagged_words', 0
      )
    )
    from flagged f
  );
end;
$$;
