-- 122_teacher_classroom_learning.sql
-- Teacher-scoped aggregate RPC for the Classroom Learning view.
-- Returns reading level distribution, vocabulary totals, quiz stats,
-- engagement summary, and a per-student learning table — all in one call.
--
-- Reading level ladder mirrors get_child_learning_profile (migration 116):
--   0 stories → emerging | 1-2 → beginning | 3-5 → developing
--   6-10 → expanding | 11+ → fluent

drop function if exists get_classroom_learning_summary(uuid);

create or replace function get_classroom_learning_summary(p_teacher_id uuid)
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

    -- ── All children in this teacher's class ──────────────────────────────────
    class_children as (
      select c.id, c.name, c.language, c.age
      from children c
      where c.teacher_id = p_teacher_id
    ),

    -- ── Completed story count per student ─────────────────────────────────────
    -- A story is complete when the student has a child_progress row for every
    -- mission_id that appears in story_slots for that story.
    story_completion as (
      select
        cc.id       as child_id,
        cc.name,
        cc.language,
        cc.age,
        (
          select count(distinct s.id)
          from stories s
          where s.status = 'published'
            and exists (
              select 1 from story_slots ss where ss.story_id = s.id
            )
            and not exists (
              select 1 from story_slots ss2
              where ss2.story_id = s.id
                and not exists (
                  select 1 from child_progress cp
                  where cp.child_id = cc.id
                    and cp.mission_id = ss2.mission_id
                    and cp.language   = cc.language
                )
            )
        ) as completed_stories
      from class_children cc
    ),

    -- ── Reading level per student ─────────────────────────────────────────────
    student_levels as (
      select
        child_id, name, language, age,
        completed_stories::integer,
        case
          when completed_stories = 0  then 'emerging'
          when completed_stories <= 2 then 'beginning'
          when completed_stories <= 5 then 'developing'
          when completed_stories <= 10 then 'expanding'
          else                              'fluent'
        end as reading_level
      from story_completion
    ),

    -- ── Distribution counts ───────────────────────────────────────────────────
    level_dist as (
      select
        count(*) filter (where reading_level = 'emerging')   as emerging,
        count(*) filter (where reading_level = 'beginning')  as beginning_r,
        count(*) filter (where reading_level = 'developing') as developing,
        count(*) filter (where reading_level = 'expanding')  as expanding,
        count(*) filter (where reading_level = 'fluent')     as fluent,
        count(*)                                              as total_students
      from student_levels
    ),

    -- ── Per-student vocabulary totals ─────────────────────────────────────────
    student_vocab as (
      select
        cv.child_id,
        count(*) filter (where cv.status = 'mastered')    as mastered_words,
        count(*)                                           as total_words
      from child_vocabulary cv
      where cv.child_id in (select id from class_children)
      group by cv.child_id
    ),

    -- ── Class-wide vocabulary aggregates ─────────────────────────────────────
    vocab_agg as (
      select
        count(*)                                              as total_words,
        count(*) filter (where cv.status = 'encountered')    as encountered,
        count(*) filter (where cv.status = 'practiced')      as practiced,
        count(*) filter (where cv.status = 'mastered')       as mastered,
        count(*) filter (where cv.needs_review = true)       as needs_review
      from child_vocabulary cv
      where cv.child_id in (select id from class_children)
    ),

    -- ── Per-student quiz stats ────────────────────────────────────────────────
    student_quiz as (
      select
        qr.child_id,
        count(*)                                         as questions,
        count(*) filter (where qr.answered_correctly)   as correct
      from child_quiz_results qr
      where qr.child_id in (select id from class_children)
      group by qr.child_id
    ),

    -- ── Class-wide quiz aggregates ────────────────────────────────────────────
    quiz_agg as (
      select
        count(*)                                        as total_questions,
        count(*) filter (where answered_correctly)      as correct_questions
      from child_quiz_results qr
      where qr.child_id in (select id from class_children)
    ),

    -- ── Engagement this week ──────────────────────────────────────────────────
    engagement as (
      select
        count(distinct cp.child_id) filter (
          where cp.completed_at >= date_trunc('day', now() at time zone 'UTC')
        ) as active_today,
        count(distinct cp.child_id) filter (
          where cp.completed_at >= date_trunc('week', now() at time zone 'UTC')
        ) as active_this_week,
        count(*) filter (
          where cp.completed_at >= date_trunc('week', now() at time zone 'UTC')
        ) as slots_done_this_week
      from child_progress cp
      where cp.child_id in (select id from class_children)
    ),

    -- ── Per-student combined row ──────────────────────────────────────────────
    student_rows as (
      select
        sl.child_id,
        sl.name,
        sl.language,
        sl.reading_level,
        sl.completed_stories,
        coalesce(sv.mastered_words, 0)  as mastered_words,
        coalesce(sv.total_words, 0)     as total_words,
        coalesce(sq.questions, 0)       as quiz_questions,
        case when coalesce(sq.questions, 0) > 0
          then round(sq.correct * 100.0 / sq.questions)::integer
          else null end                 as quiz_accuracy_pct
      from student_levels sl
      left join student_vocab sv on sv.child_id = sl.child_id
      left join student_quiz  sq on sq.child_id = sl.child_id
      order by sl.name
    )

    -- ── Final JSONB assembly ──────────────────────────────────────────────────
    select jsonb_build_object(

      'reading_levels', jsonb_build_object(
        'emerging',   ld.emerging,
        'beginning',  ld.beginning_r,
        'developing', ld.developing,
        'expanding',  ld.expanding,
        'fluent',     ld.fluent,
        'total',      ld.total_students,
        'per_student', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'child_id',          sr.child_id,
              'name',              sr.name,
              'language',          sr.language,
              'reading_level',     sr.reading_level,
              'completed_stories', sr.completed_stories,
              'mastered_words',    sr.mastered_words,
              'total_words',       sr.total_words,
              'quiz_questions',    sr.quiz_questions,
              'quiz_accuracy_pct', sr.quiz_accuracy_pct
            )
          ), '[]'::jsonb)
          from student_rows sr
        )
      ),

      'vocabulary', jsonb_build_object(
        'total_words',  coalesce(va.total_words,  0),
        'encountered',  coalesce(va.encountered,  0),
        'practiced',    coalesce(va.practiced,    0),
        'mastered',     coalesce(va.mastered,     0),
        'needs_review', coalesce(va.needs_review, 0),
        'mastery_pct',  case when coalesce(va.total_words, 0) > 0
          then round(va.mastered * 100.0 / va.total_words)::integer
          else 0 end
      ),

      'quiz', jsonb_build_object(
        'total_questions', coalesce(qa.total_questions,   0),
        'correct',         coalesce(qa.correct_questions, 0),
        'accuracy_pct',    case when coalesce(qa.total_questions, 0) > 0
          then round(qa.correct_questions * 100.0 / qa.total_questions)::integer
          else null end
      ),

      'engagement', jsonb_build_object(
        'active_today',        coalesce(e.active_today,        0),
        'active_this_week',    coalesce(e.active_this_week,    0),
        'slots_done_this_week', coalesce(e.slots_done_this_week, 0)
      )

    )
    from level_dist ld, vocab_agg va, quiz_agg qa, engagement e
  );
end;
$$;
