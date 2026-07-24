-- ============================================================
-- 163: Creations storage ownership + gift email idempotency
-- ============================================================

-- ── 1. Creations storage bucket: path-based ownership (#27) ──────────────────
-- The previous policy allowed any authenticated user to INSERT/UPDATE/DELETE
-- any object in the creations bucket. Enforce path-based ownership so a
-- parent can only write to their own prefix: {parent_id}/*.
--
-- Upload path convention: creations/{parent_id}/{filename}
-- (matches the upload logic in the client — never trust the client to
-- enforce this alone).

-- Remove the overly-broad policies if they exist
drop policy if exists "Authenticated users can upload creations" on storage.objects;
drop policy if exists "Authenticated users can delete own creations" on storage.objects;
drop policy if exists "Anyone can view creations" on storage.objects;

-- Public read (artwork is shared to community feed)
create policy "creations: public read"
  on storage.objects for select
  using (bucket_id = 'creations');

-- Owner-only insert: the first path segment must equal auth.uid()
create policy "creations: owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'creations'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Owner-only update
create policy "creations: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'creations'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Owner-only delete
create policy "creations: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'creations'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- ── 2. gift_subscriptions: ensure email_sent_at exists for CAS (#28) ─────────
-- The cron and redeem flow use email_sent_at IS NULL as the claim condition.
-- This column may already exist; this is a safe no-op if so.

alter table gift_subscriptions
  add column if not exists email_sent_at timestamptz default null;

-- Index to make the cron's IS NULL filter fast
create index if not exists gift_subscriptions_unsent_idx
  on gift_subscriptions (send_at)
  where email_sent_at is null;
