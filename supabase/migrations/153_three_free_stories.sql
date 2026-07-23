-- 153: Mark the first 3 published stories (by sort_order) as is_free = true.
-- Migration 073 only seeded 1 free story. Admins can adjust is_free per story
-- at any time via the Story Studio toggle.

update stories
set is_free = true
where id in (
  select id from stories
  where status = 'published'
  order by sort_order asc
  limit 3
);
