-- ============================================================
--  NIMIPIKO — Admin Portal: Administrators management
--  Adds the pieces needed for a superadmin to manage other admin
--  accounts from /admin:
--    - is_superadmin() helper
--    - an additive UPDATE policy so superadmins can edit ANY
--      admins row (role/name) — previously admins could only
--      update their own row
--    - admin_lookup_user_by_email() RPC, so "Add Administrator by
--      email" can resolve an existing auth.users.id client-side
--      (admins.id is an FK to auth.users(id), which the client
--      can't query directly)
-- ============================================================


-- ── 1. is_superadmin() helper ────────────────────────────────
create or replace function is_superadmin()
returns boolean language sql security definer as $$
  select exists (select 1 from admins where id = auth.uid() and role = 'superadmin');
$$;


-- ── 2. Superadmins can update any admins row ─────────────────
drop policy if exists "admin: superadmin update any profile" on admins;

create policy "admin: superadmin update any profile" on admins
  for update using (is_superadmin()) with check (is_superadmin());


-- ── 3. Resolve auth.users.id by email (admin-only) ───────────
create or replace function admin_lookup_user_by_email(p_email text)
returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  select id into v_id from auth.users where email = p_email limit 1;
  return v_id;
end;
$$;

grant execute on function admin_lookup_user_by_email(text) to authenticated;
