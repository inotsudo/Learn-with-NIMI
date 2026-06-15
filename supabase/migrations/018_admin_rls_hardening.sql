-- ============================================================
--  NIMIPIKO — Admin Portal: RLS hardening for `admins`
--  Closes a privilege-escalation hole left by migration 013:
--    - "admin: update own profile" had no WITH CHECK, so any
--      admin could set their own role to 'superadmin'.
--    - "admin: insert admins" / "admin: delete admins" used
--      is_admin(), so any admin (not just a superadmin) could
--      add or remove admin accounts via a direct API call,
--      even though the UI hides those actions from non-superadmins.
--  Also adds a DB-level guard so the last superadmin can never be
--  demoted or removed, even by another superadmin.
-- ============================================================


-- ── 1. admin_role() helper ───────────────────────────────────
-- security definer so it bypasses RLS — lets the self-update
-- policy below compare against the caller's CURRENT role.
create or replace function admin_role()
returns text language sql security definer stable as $$
  select role from admins where id = auth.uid();
$$;


-- ── 2. Self-update: name/email may change, role may not ──────
-- (superadmins editing their own row also have the policy from
-- migration 015, "admin: superadmin update any profile")
drop policy if exists "admin: update own profile" on admins;

create policy "admin: update own profile" on admins
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = admin_role());


-- ── 3. Add/remove admin accounts: superadmin-only ─────────────
drop policy if exists "admin: insert admins" on admins;
drop policy if exists "admin: delete admins" on admins;

create policy "admin: insert admins" on admins
  for insert with check (is_superadmin());

create policy "admin: delete admins" on admins
  for delete using (is_superadmin());


-- ── 4. Never allow the last superadmin to be demoted/removed ──
create or replace function admins_protect_last_superadmin()
returns trigger language plpgsql security definer as $$
begin
  if old.role = 'superadmin' and (tg_op = 'DELETE' or new.role <> 'superadmin') then
    if (select count(*) from admins where role = 'superadmin' and id <> old.id) = 0 then
      raise exception 'Cannot remove or demote the last superadmin.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_last_superadmin on admins;

create trigger protect_last_superadmin
  before update or delete on admins
  for each row execute function admins_protect_last_superadmin();
