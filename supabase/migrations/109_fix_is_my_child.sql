-- ============================================================
-- 109: Fix is_my_child() to include teacher-owned students
-- ============================================================
-- Migration 106 made parent_id nullable and added teacher_id.
-- Teacher-only students (parent_id = NULL) failed every RLS check
-- and every SECURITY DEFINER RPC that calls is_my_child(), silently
-- blocking all story slot progress, badges, and completion for
-- students created directly by a teacher with no parent account.
-- The function is called in 40+ places; patching it here fixes all of them.

create or replace function is_my_child(p_child_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from children
    where id = p_child_id
      and (parent_id = auth.uid() or teacher_id = auth.uid())
  );
$$;
