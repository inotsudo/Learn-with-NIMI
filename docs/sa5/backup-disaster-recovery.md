# SA-5.3 — Backup, Disaster Recovery & Business Continuity

## Audit Date: 2026-06-24

---

## Asset Classification

### Tier 1 — Mission Critical (zero tolerance for loss)

| Asset | Table/Location | RPO | RTO |
|---|---|---|---|
| Children profiles | `children` | 0 min | 1 hour |
| Parent accounts | `parents` + `auth.users` | 0 min | 1 hour |
| Child progress | `child_progress` | 0 min | 1 hour |
| Achievements | `child_achievements` | 0 min | 1 hour |
| Stories | `stories`, `story_versions` | 5 min | 2 hours |
| Story pages | `story_pages`, `story_page_versions` | 5 min | 2 hours |
| Mission content | `missions`, `mission_versions` | 5 min | 2 hours |
| Story slots | `story_slots` | 5 min | 2 hours |
| Weekly challenges | `weekly_challenges`, versions, progress | 15 min | 4 hours |

### Tier 2 — Important (brief loss acceptable)

| Asset | Table/Location | RPO | RTO |
|---|---|---|---|
| Community posts | `creations` | 30 min | 8 hours |
| Notifications | `notifications` | 1 hour | 8 hours |
| Parental settings | `parental_settings` | 1 hour | 8 hours |
| Likes | `likes` | 1 hour | 24 hours |

### Tier 3 — Recoverable (can regenerate)

| Asset | Location | RPO | RTO |
|---|---|---|---|
| Language switch logs | `language_switch_log` | 24 hours | N/A |
| Coloring saves | `coloring_saves` | 24 hours | N/A |
| Push subscriptions | `push_subscriptions` | 24 hours | 24 hours |
| Admin sessions | Browser/Supabase | N/A | Immediate (re-login) |

---

## Current Backup State

### Supabase Database Backups

| Feature | Free Plan | Pro Plan | Status |
|---|---|---|---|
| Daily backups | ✅ 7 days | ✅ 7 days | ✅ Active |
| Point-in-time recovery | ❌ | ✅ (7 days) | ⚠️ Need Pro |
| Custom backup schedule | ❌ | ❌ | ❌ Not available |
| Cross-region replication | ❌ | ❌ | ❌ Not available |
| Manual backup export | ✅ `pg_dump` | ✅ `pg_dump` | ⚠️ Not automated |

### Supabase Storage Backups

| Feature | Status |
|---|---|
| Automatic backup | ❌ None |
| Versioning | ❌ Not enabled |
| Cross-region replication | ❌ Not available |
| Manual backup | ⚠️ Must download files manually |

**Critical gap:** Storage (images, audio, video) has NO backup. If a bucket is accidentally cleared or corrupted, all media is lost.

### Code/Configuration Backups

| Asset | Backup Location | Status |
|---|---|---|
| Application code | Git repository | ✅ |
| Migrations | `supabase/migrations/` in repo | ✅ |
| Environment variables | `.env.local` (local only) | ⚠️ Not in version control |
| Supabase config | `supabase/config.toml` | ✅ |

---

## Failure Scenarios & Recovery

### Scenario 1: Database Failure

**Detection:** Supabase dashboard alerts, application errors, RPC timeouts.

**Recovery:**

| Step | Action | Time |
|---|---|---|
| 1 | Confirm failure via Supabase dashboard | 5 min |
| 2 | Check Supabase status page for outage | 2 min |
| 3a | If Supabase outage: wait for resolution | Variable |
| 3b | If data corruption: initiate point-in-time recovery | 30-60 min |
| 4 | Verify data integrity: run row counts on Tier 1 tables | 15 min |
| 5 | Test critical RPCs: `get_story_library`, `complete_story_slot` | 10 min |
| 6 | Resume service | 5 min |

**Total RTO: 1-2 hours** (depends on Supabase restore time)

**Prevention:**
- Upgrade to Pro for point-in-time recovery
- Weekly `pg_dump` to external storage (S3 or Google Cloud)

### Scenario 2: Storage Failure

**Detection:** Broken images on learner pages, 404 errors on media URLs.

**Recovery:**

| Step | Action | Time |
|---|---|---|
| 1 | Identify which bucket is affected | 10 min |
| 2 | Check if files exist but are inaccessible vs deleted | 15 min |
| 3a | If bucket misconfigured: fix bucket policies | 10 min |
| 3b | If files deleted: restore from backup (if exists) | 1-4 hours |
| 3c | If no backup: re-upload from content team's source files | 1-7 days |
| 4 | Verify media loads on learner pages | 30 min |

**Total RTO: 10 min (config) to 7 days (full re-upload)**

**Prevention:**
- Weekly storage backup script (download all buckets to external storage)
- Enable Supabase Storage versioning (when available)
- Content team maintains source files locally

### Scenario 3: Accidental Story Deletion

**Detection:** Story disappears from library, admin reports deletion.

**Recovery:**

| Step | Action | Time |
|---|---|---|
| 1 | Identify deleted story ID from admin logs | 10 min |
| 2 | Check if cascade deleted pages, slots, versions | 10 min |
| 3a | If within PITR window: restore specific tables | 30-60 min |
| 3b | If outside window: recreate from content team assets | 2-4 hours |
| 4 | Re-link story_slots to missions | 15 min |
| 5 | Verify learner access | 10 min |

**Prevention:**
- Add `archived` status instead of allowing DELETE
- Soft-delete pattern: `deleted_at` timestamp, filter in queries
- Admin confirmation dialog (already exists)

### Scenario 4: Child Progress Corruption

**Detection:** Parents report missing progress, children see wrong completion status.

**Recovery:**

| Step | Action | Time |
|---|---|---|
| 1 | Identify affected children via parent reports | 30 min |
| 2 | Check `child_progress` and `child_achievements` tables | 15 min |
| 3 | Restore from point-in-time backup | 30-60 min |
| 4 | Verify restored data matches parent expectations | 30 min |
| 5 | Communicate with affected parents | 30 min |

**RPO: 0 minutes** — progress data must never be lost. This is the most sensitive data.

**Prevention:**
- All progress writes go through SECURITY DEFINER RPCs (single entry point)
- RPCs use `ON CONFLICT` upsert (idempotent, prevents duplicates)
- Consider write-ahead logging to external service for Tier 1 data

### Scenario 5: AI Provider Outage (Talk to Nimi)

**Detection:** Talk to Nimi returns errors, timeout, or empty responses.

**Recovery:**

```
AI unavailable
  ↓
Show friendly fallback message:
  "Nimi is taking a nap right now! 😴
   Try again later, or continue your story adventure!"
  ↓
Hide "Talk to Nimi" from navigation temporarily
  ↓
All other features continue working normally
```

**Impact:** LOW — Talk to Nimi is non-critical. Stories, missions, certificates, challenges all work without AI.

**Prevention:**
- Timeout: 10 seconds max per request
- Retry: 1 retry with exponential backoff
- Circuit breaker: after 3 failures, disable for 5 minutes

### Scenario 6: Authentication Failure

**Detection:** Users can't login, "Session expired" errors.

**Recovery:**

| Step | Action | Time |
|---|---|---|
| 1 | Check Supabase Auth status | 5 min |
| 2 | If Supabase outage: wait for resolution | Variable |
| 3 | If config issue: verify auth settings in Supabase dashboard | 10 min |
| 4 | Clear service worker cache (may hold stale auth tokens) | 5 min |

**Impact:** HIGH — no feature works without auth.

**Prevention:**
- Monitor Supabase status page
- Store auth tokens in httpOnly cookies (if using SSR)
- Graceful "Service temporarily unavailable" page

### Scenario 7: Accidental Admin Error

**Detection:** Admin publishes incomplete story, sends wrong notification, deletes wrong content.

**Recovery per error type:**

| Error | Recovery | Time |
|---|---|---|
| Published incomplete story | Unpublish via Publishing Center | 1 min |
| Wrong notification sent | Cannot unsend push; update in-app text | 5 min |
| Deleted story | Restore from backup or recreate | 1-4 hours |
| Wrong moderation decision | Re-approve/reject in Community Manager | 1 min |
| Wrong challenge published | Edit or delete challenge | 2 min |

**Prevention:**
- Readiness gate prevents publishing incomplete stories (SA-3.2)
- Confirmation dialogs on destructive actions
- Admin audit log (future: log all admin actions with timestamp and user)

---

## Business Continuity

### Service Dependency Map

```
Core Services (must work):
  ├── Supabase Database → stories, progress, auth
  ├── Supabase Auth → login, session
  └── Next.js App → all UI rendering

Non-Core Services (can be offline):
  ├── Supabase Storage → media delivery (graceful fallbacks)
  ├── AI Provider → Talk to Nimi (fallback message)
  ├── Push Service → push notifications (in-app still works)
  └── Community Feed → creations listing (cached or empty)
```

### Degradation Matrix

| Outage | Stories | Missions | Certificates | Challenges | Community | Talk to Nimi |
|---|---|---|---|---|---|---|
| Database down | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Storage down | ⚠️ text only | ⚠️ text only | ✅ | ✅ | ⚠️ no images | ✅ |
| Auth down | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI down | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ fallback |
| Push down | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CDN down | ⚠️ slow | ⚠️ slow | ✅ | ✅ | ⚠️ slow | ✅ |

**Key insight:** Database and Auth are single points of failure. Both are Supabase-managed with 99.9% SLA on Pro plan.

---

## RTO/RPO Matrix

| Asset | RPO (max data loss) | RTO (max downtime) | Backup Method |
|---|---|---|---|
| Child progress | 0 min | 1 hour | Supabase PITR |
| Achievements | 0 min | 1 hour | Supabase PITR |
| Children/Parents | 0 min | 1 hour | Supabase PITR |
| Stories | 5 min | 2 hours | Supabase PITR + repo |
| Story pages | 5 min | 2 hours | Supabase PITR |
| Mission content | 5 min | 2 hours | Supabase PITR + repo |
| Media files | 24 hours | 24 hours | Weekly storage backup |
| Community posts | 30 min | 8 hours | Supabase PITR |
| Notifications | 1 hour | 8 hours | Supabase PITR |
| Settings | 1 hour | 8 hours | Supabase PITR |
| Talk to Nimi | N/A | 5 min (fallback) | No data to backup |
| Admin CMS | N/A | Immediate (redeploy) | Git repository |

---

## Incident Response Playbooks

### Template

```
INCIDENT: [Name]
SEVERITY: Critical / High / Medium / Low
DETECTED BY: [Monitoring / User report / Admin]

1. DETECTION
   - What triggered the alert?
   - Who detected it?

2. ASSESSMENT (5 min)
   - What's affected?
   - How many users impacted?
   - Is data at risk?

3. ESCALATION
   - Severity Critical/High: Notify team lead immediately
   - Severity Medium: Notify within 1 hour
   - Severity Low: Log and address next business day

4. RECOVERY
   - Follow specific recovery procedure
   - Document all actions taken

5. VERIFICATION
   - Test affected features
   - Verify data integrity
   - Confirm with reporting user

6. COMMUNICATION
   - Internal: Post in team channel
   - Parents: In-app notification if data affected
   - Public: Status page update if widespread

7. POSTMORTEM (within 48 hours)
   - Root cause
   - Timeline
   - Impact assessment
   - Prevention measures
```

### Playbook 1: Database Unavailable

```
SEVERITY: Critical
DETECTION: Application errors, RPC timeouts
IMPACT: All features unavailable

1. Check Supabase status page
2. If Supabase outage → monitor status, ETA from Supabase
3. If our issue → check recent migrations, revert if needed
4. Enable maintenance page if downtime > 15 minutes
5. Restore from PITR if data corruption detected
6. Verify all RPCs working
7. Remove maintenance page
8. Notify parents if progress may be affected
```

### Playbook 2: Media Assets Missing

```
SEVERITY: High
DETECTION: Broken images/audio on learner pages
IMPACT: Stories functional (text) but degraded experience

1. Identify which bucket/folder affected
2. Check Supabase Storage dashboard for deletions
3. If accidental deletion → restore from weekly backup
4. If bucket policy change → revert policy
5. If no backup → contact content team for source files
6. Verify media loads on affected stories
```

### Playbook 3: Wrong Content Published

```
SEVERITY: Medium
DETECTION: Admin or parent reports incorrect content
IMPACT: Children see wrong/incomplete story

1. Identify the affected story in Admin CMS
2. Unpublish immediately via Publishing Center
3. Fix the content issue in Story Editor
4. Re-validate via Readiness Check (SA-3.2)
5. Re-publish when readiness = 100%
6. Verify on learner-facing pages
```

---

## Backup Implementation Plan

### Immediate (Before Launch)

| Action | Effort | Priority |
|---|---|---|
| Upgrade to Supabase Pro (enables PITR) | Config | Critical |
| Document env vars in secure vault (not .env.local) | 1 hour | Critical |
| Create emergency maintenance page | 2 hours | High |
| Write backup verification script | 2 hours | High |

### Weekly Automated Backups

```bash
#!/bin/bash
# Weekly backup script — run via cron or CI

# Database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
gzip backup_$(date +%Y%m%d).sql
# Upload to S3/GCS

# Storage (download all buckets)
for bucket in storyBook creations Coloriage preview; do
  supabase storage ls $bucket --recursive > /tmp/${bucket}_manifest.txt
  # Download changed files since last backup
done
```

**Schedule:** Every Sunday at 2 AM UTC

### Backup Verification (Monthly)

| Check | Procedure |
|---|---|
| Database backup exists | Verify latest backup file in external storage |
| Database restorable | Restore to test environment, run row counts |
| Storage backup exists | Verify file manifest matches bucket contents |
| Media accessible | Spot-check 10 random media URLs |
| RPCs working | Run `get_story_library` on restored database |

---

## Launch Readiness Checklist

| Item | Status | Owner |
|---|---|---|
| Supabase Pro plan active | ⚠️ Pending | Admin |
| PITR enabled | ⚠️ Pending (needs Pro) | Admin |
| Weekly backup script written | ❌ Not done | Developer |
| Backup verified by restore test | ❌ Not done | Developer |
| Maintenance page created | ❌ Not done | Developer |
| Incident response owners assigned | ❌ Not done | Team lead |
| Monitoring connected (Sentry) | ❌ Not done | Developer |
| Env vars in secure vault | ❌ Not done | Developer |
| Recovery procedures documented | ✅ This document | — |
| Team trained on recovery procedures | ❌ Not done | Team lead |

### Status: 2/10 items complete — NOT READY for launch.

---

## Implementation Estimate

| Task | Effort |
|---|---|
| Upgrade to Supabase Pro + enable PITR | 0.5 hour |
| Write weekly backup script | 2 hours |
| Create maintenance page | 2 hours |
| Set up Sentry error monitoring | 2 hours |
| Move env vars to secure vault | 1 hour |
| Write backup verification script | 2 hours |
| Run first backup + restore test | 3 hours |
| Document + train team | 2 hours |
| **Total** | **~14.5 hours (2 days)** |
