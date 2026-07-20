-- ============================================================
-- 110: Grant story access to teacher-enrolled students
-- ============================================================
-- _sa_parent_has_subscription joined children on parent_id, so
-- teacher-only students (parent_id = NULL) always returned false,
-- locking every premium story for the entire classroom.
-- Teacher-enrolled students get full content access — the school/
-- teacher account is the paying entity for classroom use.

create or replace function _sa_parent_has_subscription(p_child_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    -- Parent has an active subscription
    select 1
    from nimipiko_subscriptions ns
    join children c on c.parent_id = ns.parent_id
    where c.id = p_child_id
      and ns.status = 'active'
  )
  or exists (
    -- Child is enrolled in a teacher's class — school/classroom access
    select 1 from children
    where id = p_child_id
      and teacher_id is not null
  );
$$;
