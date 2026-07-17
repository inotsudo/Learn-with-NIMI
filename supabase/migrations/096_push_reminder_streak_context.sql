-- ============================================================
--  NIMIPIKO — Push Reminder: Streak Context
--  Upgrades get_push_reminder_targets() to return per-child
--  streak information so the daily-reminder cron can send
--  personalised messages (streak-at-risk vs streak-broke vs
--  generic reminder) instead of one generic text for everyone.
-- ============================================================

drop function if exists get_push_reminder_targets();

create or replace function get_push_reminder_targets()
returns table(
  parent_id    uuid,
  child_id     uuid,
  child_name   text,
  language     text,
  had_activity_yesterday bool,
  streak_broke           bool
)
language sql security definer as $$
  with
  -- Children who completed at least one mission today (UTC date)
  today as (
    select distinct child_id
    from child_progress
    where completed_at::date = (now() at time zone 'utc')::date
  ),
  -- Children who completed at least one mission yesterday
  yesterday as (
    select distinct child_id
    from child_progress
    where completed_at::date = (now() at time zone 'utc')::date - 1
  ),
  -- Children who completed at least one mission two days ago
  two_days_ago as (
    select distinct child_id
    from child_progress
    where completed_at::date = (now() at time zone 'utc')::date - 2
  )
  select
    c.parent_id,
    c.id                                                  as child_id,
    c.name                                                as child_name,
    c.language,
    exists(select 1 from yesterday   y where y.child_id = c.id) as had_activity_yesterday,
    -- streak_broke: was active 2 days ago, missed yesterday, hasn't done today
    (
      exists(select 1 from two_days_ago t where t.child_id = c.id)
      and not exists(select 1 from yesterday y where y.child_id = c.id)
    )                                                     as streak_broke
  from children c
  join push_subscriptions ps on ps.parent_id = c.parent_id
  left join parental_settings pset
         on pset.parent_id = c.parent_id
        and pset.child_id  = c.id
  -- Only children who haven't done today's mission yet
  where not exists (select 1 from today t where t.child_id = c.id)
    and coalesce(pset.notifications_enabled, true) = true;
$$;

grant execute on function get_push_reminder_targets() to anon, authenticated;
