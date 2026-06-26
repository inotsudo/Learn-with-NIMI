-- ============================================================
--  Rollback SA-1.2 — Drop all Story Adventure RPCs
--  Safe: removes only functions, no data affected
-- ============================================================

drop function if exists get_current_story(uuid, text);
drop function if exists get_unlocked_stories(uuid, text);
drop function if exists get_story_details(uuid, text);
drop function if exists get_story_slots(uuid, uuid, text);
drop function if exists complete_story_slot(uuid, uuid);
drop function if exists get_story_completion(uuid, uuid, text);
drop function if exists get_story_certificate(uuid, uuid, text);
drop function if exists get_weekly_challenges(uuid, uuid, text);
drop function if exists complete_weekly_challenge(uuid, uuid);
drop function if exists get_story_library_progress(uuid, text);
drop function if exists get_story_intro_progress(uuid, uuid, text);
drop function if exists mark_intro_item_consumed(uuid, uuid, text);
drop function if exists get_story_recommendations(uuid, text);
drop function if exists _sa_is_story_complete(uuid, uuid, text);
drop function if exists _sa_is_story_unlocked(uuid, uuid, text);
