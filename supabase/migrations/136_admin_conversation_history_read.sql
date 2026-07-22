-- migration 136: grant admin read access to conversation_summaries
-- Admins need to view AI session summaries for moderation / quality checks.
-- is_admin() is SECURITY DEFINER (defined in 013_admin_foundation.sql).
-- The parent select policy added in 135 is unchanged.

create policy conversation_summaries_admin_select
  on conversation_summaries
  for select
  using (is_admin());
