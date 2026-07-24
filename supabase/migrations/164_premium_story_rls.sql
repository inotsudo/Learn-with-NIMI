-- ============================================================
-- 164: Premium story content RLS (#4)
-- ============================================================
-- Previous state: `"auth: read stories/story_pages/story_slots"` used
-- `using (auth.uid() is not null)`, meaning any authenticated user could
-- directly query the stories, story_pages, story_slots, and
-- story_page_versions tables and read ALL content — including premium stories
-- — without a subscription.
--
-- The app gates access correctly through security-definer RPCs
-- (get_story_slots, get_story_library_progress, _sa_check_story_access), but
-- those checks are app-layer only. Anyone who calls supabase.from('story_pages')
-- directly bypasses them entirely.
--
-- This migration closes that gap at the database layer:
--   • stories          → only published rows visible to regular users
--   • story_pages      → free stories: any authenticated user
--                         premium stories: active subscription required
--   • story_slots      → same
--   • story_page_versions → same
--
-- Admins always see everything (is_admin() helper, security definer).
-- Service-role key (used by API routes + RPCs) bypasses RLS — no change needed.
-- ============================================================

-- ── 1. stories — restrict direct reads to published + subscription check ──────

drop policy if exists "auth: read stories" on stories;

-- Free (is_free = true) and premium stories are both visible in the catalogue
-- so non-subscribers can see what's available (shown as locked in the UI).
-- The content lock is enforced on story_pages / story_slots below.
-- Drafts (status != 'published') are hidden from regular users.
create policy "stories: read published"
  on stories for select
  to authenticated
  using (
    status = 'published'        -- non-subscribers see the full published catalogue
    or is_admin()               -- admins see all statuses (including drafts)
  );

-- ── 2. story_pages — gate actual story content behind subscription ─────────────

drop policy if exists "auth: read story_pages" on story_pages;

create policy "story_pages: read"
  on story_pages for select
  to authenticated
  using (
    -- Free stories: any authenticated user can read the pages
    exists (
      select 1 from stories s
      where s.id    = story_pages.story_id
        and s.is_free = true
        and s.status  = 'published'
    )
    -- Premium stories: active subscription required
    or has_active_subscription(auth.uid())
    -- Admins always have full access
    or is_admin()
  );

-- ── 3. story_slots — same gating as story_pages ───────────────────────────────

drop policy if exists "auth: read story_slots" on story_slots;

create policy "story_slots: read"
  on story_slots for select
  to authenticated
  using (
    exists (
      select 1 from stories s
      where s.id    = story_slots.story_id
        and s.is_free = true
        and s.status  = 'published'
    )
    or has_active_subscription(auth.uid())
    or is_admin()
  );

-- ── 4. story_page_versions — same gating ─────────────────────────────────────

drop policy if exists "auth: read story_page_versions" on story_page_versions;

create policy "story_page_versions: read"
  on story_page_versions for select
  to authenticated
  using (
    exists (
      select 1 from story_pages sp
      join stories s on s.id = sp.story_id
      where sp.id    = story_page_versions.story_page_id
        and s.is_free = true
        and s.status  = 'published'
    )
    or has_active_subscription(auth.uid())
    or is_admin()
  );

-- ── 5. admin write policies on stories ───────────────────────────────────────
-- Admin CMS uses the service-role key (bypasses RLS), so no explicit write
-- policy is needed. These are added only for completeness and to allow future
-- row-level admin mutations that go through the session client.

create policy "stories: admin write"
  on stories for all
  to authenticated
  using    (is_admin())
  with check (is_admin());

create policy "story_pages: admin write"
  on story_pages for all
  to authenticated
  using    (is_admin())
  with check (is_admin());

create policy "story_slots: admin write"
  on story_slots for all
  to authenticated
  using    (is_admin())
  with check (is_admin());
