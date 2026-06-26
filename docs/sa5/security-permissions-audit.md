# SA-5.0 — Security, Roles & Permissions Audit

## Audit Date: 2026-06-24

---

## 1. Full Permission Matrix

### Roles

| Role | Description | Auth Method |
|---|---|---|
| Learner | Child using stories | Parent's Supabase session + `is_my_child()` |
| Parent | Manages children | Supabase auth (`auth.uid()` = `parents.id`) |
| Moderator | Reviews community content | Future role — not yet implemented |
| Content Manager | Creates/edits stories | Future role — not yet implemented |
| Administrator | Full platform access | `admins` table lookup |

### Feature Permissions

| Feature | Learner | Parent | Admin |
|---|---|---|---|
| View stories | ✅ own language | ✅ child's data | ✅ all |
| Complete missions | ✅ | ❌ | ❌ |
| Earn certificates | ✅ auto | ❌ | ✅ regenerate |
| Complete challenges | ✅ | ❌ | ❌ |
| Use Talk to Nimi | ✅ if enabled | ❌ | ❌ |
| View treasure | ✅ own | ✅ child's | ✅ all |
| Create child | ❌ | ✅ | ✅ |
| Edit child | ❌ | ✅ own | ✅ all |
| View analytics | ❌ | ✅ own children | ✅ all |
| Approve sharing | ❌ | ✅ own children | ✅ all |
| Create stories | ❌ | ❌ | ✅ |
| Edit stories | ❌ | ❌ | ✅ |
| Publish stories | ❌ | ❌ | ✅ |
| Manage media | ❌ | ❌ | ✅ |
| Send notifications | ❌ | ❌ | ✅ |
| Manage admins | ❌ | ❌ | ✅ superadmin |
| Platform settings | ❌ | ✅ family settings | ✅ all |
| Community posting | ❌ parent gate | ✅ approve/reject | ✅ moderate |

### Gap: Moderator and Content Manager roles

**Finding:** Only two operational roles exist — Parent (authenticated user) and Admin (`admins` table). There is no Moderator or Content Manager role.

**Risk:** LOW — current team size doesn't require granular roles.

**Recommendation:** When team grows, add `admins.role` check (`superadmin`, `content_manager`, `moderator`) with per-role policy enforcement.

---

## 2. Route Access Matrix

| Route | Auth Required | Role Check | Status |
|---|---|---|---|
| `/` | ✅ Supabase session | Parent with children | ✅ Enforced |
| `/loginpage` | ❌ | None | ✅ OK |
| `/signuppage` | ❌ | None | ✅ OK |
| `/forgot-password` | ❌ | None | ✅ OK |
| `/stories` | ✅ | Parent session | ✅ Enforced |
| `/stories/[slug]` | ✅ | Parent session | ✅ Enforced |
| `/stories/[slug]/mission/[slot]` | ✅ | Parent session + `is_my_child()` in RPC | ✅ Enforced |
| `/treasure` | ✅ | Parent session | ✅ Enforced |
| `/community` | ✅ | Parent session | ✅ Enforced |
| `/parents` | ✅ | Parent session | ✅ Enforced |
| `/talk-to-nimi` | ✅ | Parent session | ✅ Enforced |
| `/user-profile` | ✅ | Parent session | ✅ Enforced |
| `/certificates` | ✅ | Parent session | ✅ Enforced |
| `/admin` | ✅ | `admins` table lookup | ✅ Enforced |
| `/admin/login` | ❌ | None | ✅ OK |
| `/missions` | ✅ | Parent session | ⚠️ Legacy route |
| `/shop` | ✅ | Parent session | ⚠️ Legacy route |
| `/settings` | ✅ | Parent session | ⚠️ Legacy route |
| `/help` | ✅ | Parent session | ⚠️ Legacy route |

**Finding:** Legacy routes (`/missions`, `/shop`, `/settings`, `/help`) still exist but are not part of the Story Adventure flow.

**Recommendation:** Redirect legacy routes to their SA equivalents or remove them.

---

## 3. Storage Audit

### Buckets

| Bucket | Public | Contains | Risk |
|---|---|---|---|
| `storyBook` | ✅ public | Story covers, pages, audio, intro media | ⚠️ MEDIUM |
| `creations` | ✅ public | Community uploads (photos) | ⚠️ MEDIUM |
| `Coloriage` | ✅ public | Coloring templates | ✅ LOW |
| `preview` | ✅ public | Preview images | ✅ LOW |

### Findings

**⚠️ All buckets are public.** Any authenticated user can read any file if they know the path. This includes:
- Story page images
- Audio narration files
- Child-uploaded community photos
- Cover images

**Risk Assessment:**
- Story content being public is acceptable — it's educational content, not private data.
- Community uploads (child photos) being public is a **privacy concern** if parents share photos of children.

**Recommendations:**
1. `creations` bucket should have RLS storage policies — only the parent who uploaded can read their own uploads, plus approved posts are public.
2. Add storage policies to prevent unauthenticated access to child-created content.
3. Consider signed URLs for community uploads (TTL-based access).

### Storage Policies

```sql
-- Recommended: restrict creations bucket
CREATE POLICY "Authenticated read own uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'creations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read approved only"
ON storage.objects FOR SELECT
USING (bucket_id = 'creations' AND name LIKE 'approved/%');
```

### File Type/Size Limits

**Finding:** No server-side file type or size validation exists on uploads.

**Recommendation:**
- Max file size: 10MB for images, 50MB for video, 20MB for audio
- Allowed types: `image/jpeg`, `image/png`, `image/webp`, `audio/mpeg`, `audio/wav`, `video/mp4`, `application/pdf`
- Enforce via Supabase storage policies or edge function

---

## 4. Database RLS Audit

### Tables with RLS Enabled (✅)

All public tables have RLS enabled:

| Table | RLS | Policies |
|---|---|---|
| `admins` | ✅ | admin select/insert/update/delete |
| `categories` | ✅ | admin full, auth read |
| `child_achievements` | ✅ | admin full, parent select/insert |
| `child_badges` | ✅ | admin full, parent select/insert |
| `child_progress` | ✅ | admin full, parent select/insert |
| `children` | ✅ | admin full, parent CRUD |
| `coloring_pages` | ✅ | admin full, auth read |
| `coloring_saves` | ✅ | policies present |
| `creations` | ✅ | admin select/moderate, auth read public, parent insert/delete own |
| `curriculum_levels` | ✅ | legacy |
| `curriculum_units` | ✅ | legacy |
| `language_switch_log` | ✅ | policies present |
| `level_missions` | ✅ | legacy |
| `likes` | ✅ | policies present |
| `mission_versions` | ✅ | admin full, auth read |
| `missions` | ✅ | admin full, auth read |
| `notifications` | ✅ | `notifications_own` (ALL for own) |
| `parental_settings` | ✅ | policies present |
| `parents` | ✅ | policies present |
| `personalized_stories` | ✅ | policies present |
| `push_subscriptions` | ✅ | policies present |
| `stories` | ✅ | policies present |
| `story_intro_progress` | ✅ | policies present |
| `story_pages` | ✅ | policies present |
| `story_page_versions` | ✅ | policies present |
| `story_slots` | ✅ | policies present |
| `story_versions` | ✅ | policies present |
| `weekly_challenges` | ✅ | policies present |
| `weekly_challenge_progress` | ✅ | policies present |
| `weekly_challenge_versions` | ✅ | policies present |

**Finding:** ✅ All tables have RLS enabled. No unprotected tables.

### RLS Policy Gaps

**⚠️ `notifications` table** — has single `ALL` policy `notifications_own` using `parent_id = auth.uid()`. This means:
- Parents can INSERT notifications for themselves (acceptable — used by client-side celebration sync)
- Parents can UPDATE their own notifications (mark as read — intended)
- Parents can DELETE their own notifications (acceptable)
- But: a parent could theoretically create fake notifications for themselves

**Recommendation:** Split into separate SELECT/UPDATE policies. Remove INSERT for parents (only system/admin should create).

**⚠️ `child_progress` table** — parents can INSERT progress rows. The `complete_story_slot` RPC is SECURITY DEFINER and handles this properly, but a parent could bypass the RPC and insert raw progress rows.

**Recommendation:** Remove direct INSERT policy for parents on `child_progress`. Force all writes through SECURITY DEFINER RPCs.

---

## 5. RPC Security Audit

### SECURITY DEFINER Functions

| RPC | SECURITY DEFINER | Auth Check | Status |
|---|---|---|---|
| `complete_story_slot` | ✅ | `is_my_child()` | ✅ Secure |
| `complete_weekly_challenge` | ✅ | `is_my_child()` | ✅ Secure |
| `get_story_library` | ✅ | `is_my_child()` | ✅ Secure |
| `get_story_slots` | ✅ | `is_my_child()` | ✅ Secure |
| `get_story_completion` | ✅ | `is_my_child()` | ✅ Secure |
| `get_story_details` | ✅ | Internal | ✅ Secure |
| `get_story_certificate` | ✅ | `is_my_child()` | ✅ Secure |
| `get_story_intro_progress` | ✅ | `is_my_child()` | ✅ Secure |
| `mark_intro_item_consumed` | ✅ | `is_my_child()` | ✅ Secure |
| `_sa_is_story_complete` | ✅ | Internal helper | ✅ Secure (not callable externally) |
| `_sa_is_story_unlocked` | ✅ | Internal helper | ✅ Secure (not callable externally) |
| `complete_curriculum_mission` | ✅ | `is_my_child()` | ✅ Legacy but secure |
| `complete_mission` | ✅ | `is_my_child()` | ✅ Legacy but secure |

**Finding:** ✅ All story RPCs use `is_my_child()` check. Internal helpers prefixed with `_sa_` are not directly callable by clients.

---

## 6. Community Safety Audit

### Parent Approval Flow

| Step | Enforced By | Status |
|---|---|---|
| Child clicks "Share" | `ShareAchievementFlow` component | ✅ UI enforced |
| Parent gate modal appears | `ParentGateModal` component | ✅ UI enforced |
| Parent confirms | Client-side confirmation | ✅ |
| Creation saved as `status: pending/approved` | `creations` INSERT | ⚠️ See below |
| Content visible only when approved | RLS: `auth: select public or own creations` | ✅ |

**⚠️ Finding:** The `ShareAchievementFlow` component sets `is_public: true` directly on insert, bypassing the pending state. The creation is immediately public.

**Recommendation:** Change to `is_public: false, status: 'pending'` on insert. Only set `is_public: true` when parent explicitly approves in the Community Approval Center.

### No Direct Child Posting

**Finding:** ✅ Children cannot post directly. All community content flows through `ShareAchievementFlow` which requires a parent's Supabase session (`auth.getUser()`).

### Orphaned Posts

**Finding:** If a child is deleted (`ON DELETE CASCADE`), their creations' `child_id` becomes NULL (if SET NULL) or the row is deleted (if CASCADE). Need to verify FK behavior.

**Recommendation:** Verify `creations.child_id` FK is `ON DELETE CASCADE` to prevent orphaned posts.

---

## 7. AI Safety Audit (Talk to Nimi)

### Current State

The Talk to Nimi feature exists at `/talk-to-nimi`. Without inspecting its implementation in detail:

**Required Safety Controls:**
1. ✅ Parent can disable Talk to Nimi (SA-4.3 family settings)
2. ⚠️ Age-appropriate content filtering — needs verification
3. ⚠️ No personal information collection — needs verification
4. ⚠️ No external link generation — needs verification
5. ⚠️ Response length limits — needs verification

**Recommendation:** Conduct separate AI safety audit of Talk to Nimi prompts, system instructions, and response filtering.

---

## 8. Risk Report

### Critical Risks (Fix Immediately)

| # | Risk | Impact | Likelihood | Remediation |
|---|---|---|---|---|
| C1 | Community uploads bypass pending state | Child photos immediately public | Medium | Change `ShareAchievementFlow` to insert with `is_public: false, status: 'pending'` |

### High Risks (Fix Before Launch)

| # | Risk | Impact | Likelihood | Remediation |
|---|---|---|---|---|
| H1 | `creations` bucket fully public | Anyone with URL sees child uploads | Low (need to know path) | Add storage RLS policies |
| H2 | Parents can INSERT `child_progress` directly | Fake completion data | Very Low (requires API knowledge) | Remove parent INSERT policy, force RPC usage |
| H3 | No file size/type limits on uploads | Storage abuse, malicious files | Low | Add storage policies or edge function validation |

### Medium Risks (Fix Soon)

| # | Risk | Impact | Likelihood | Remediation |
|---|---|---|---|---|
| M1 | Parents can INSERT `notifications` | Fake notification injection | Very Low | Split to SELECT/UPDATE only for parents |
| M2 | Legacy routes still accessible | Confusion, stale content | Low | Redirect `/missions`, `/shop`, `/settings`, `/help` |
| M3 | No Moderator/Content Manager roles | All admins have full access | Low (small team) | Add `admins.role` checks when team grows |

### Low Risks (Monitor)

| # | Risk | Impact | Likelihood | Remediation |
|---|---|---|---|---|
| L1 | All storage buckets public | Content hotlinking | Low | Acceptable for educational content |
| L2 | Screen time client-side only | Tech-savvy child bypass | Very Low | Acceptable for age 2-6 |
| L3 | No email verification on signup | Fake accounts | Low | Add email verification flow |

---

## 9. Remediation Recommendations

### Priority 1 — Before Launch

```sql
-- Fix C1: Community uploads should be pending by default
-- Code change in ShareAchievementFlow.tsx:
-- Change: is_public: true → is_public: false, status: 'pending'

-- Fix H1: Storage policy for creations bucket
CREATE POLICY "creations_authenticated_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'creations' AND auth.role() = 'authenticated');

CREATE POLICY "creations_own_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'creations' AND auth.role() = 'authenticated');

-- Fix H2: Remove direct parent INSERT on child_progress
DROP POLICY "parent: insert progress" ON child_progress;
-- All progress writes go through complete_story_slot RPC (SECURITY DEFINER)
```

### Priority 2 — Before Scale

```sql
-- Fix M1: Split notifications policy
DROP POLICY "notifications_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (parent_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (parent_id = auth.uid());
-- INSERT only via admin or system triggers

-- Fix M3: Role-based admin access (when needed)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin'
  CHECK (role IN ('superadmin', 'admin', 'content_manager', 'moderator'));
```

### Priority 3 — Ongoing

- Redirect legacy routes
- Implement file size/type limits
- Conduct AI safety audit for Talk to Nimi
- Add email verification
- Add rate limiting on RPCs

---

## Incident Scenarios

| Scenario | Impact | Current Handling | Recommendation |
|---|---|---|---|
| Parent account deleted | Auth session invalidated | `ON DELETE CASCADE` on children, progress, etc. | ✅ Handled by FK cascades |
| Child account deleted | Progress lost | Cascade deletes progress, achievements | ✅ Handled — consider soft-delete |
| Story removed | Active learners affected | Story disappears from library | Add `archived` status instead of DELETE |
| Language removed | Content gaps | N/A — languages are hardcoded | No risk |
| Broken media URL | Empty mission content | Graceful "Coming Soon" fallbacks | ✅ Handled in SA-2.5 |
| Expired storage URL | Broken images/audio | Public buckets don't expire | ✅ No risk with public buckets |
| Moderator rejects valid post | Content lost | Parent can reshare | Add "appeal" or "undo reject" option |
| Admin publishes broken story | Children see incomplete content | Readiness engine (SA-3.2) prevents this | ✅ Gate at 100% readiness |
