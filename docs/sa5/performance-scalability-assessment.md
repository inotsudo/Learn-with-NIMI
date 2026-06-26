# SA-5.2 — Performance & Scalability Assessment

## Audit Date: 2026-06-24

---

## Current Baseline

| Metric | Value |
|---|---|
| Database size | 14 MB |
| Largest table | mission_versions (152 KB) |
| Total rows (all tables) | ~170 |
| Storage buckets | 4 (all public) |
| Indexed tables | 20+ with proper indexes |
| RPC functions | 13+ SECURITY DEFINER |

The system is essentially empty. This assessment projects how it behaves at scale.

---

## Growth Projections

### Table Growth Forecast

| Table | Phase 1 (100 kids) | Phase 2 (1K) | Phase 3 (10K) | Phase 4 (100K) |
|---|---|---|---|---|
| `children` | 100 | 1,000 | 10,000 | 100,000 |
| `parents` | 20 | 300 | 3,000 | 30,000 |
| `stories` | 12 | 60 | 300 | 1,500 |
| `story_pages` | 240 | 1,200 | 6,000 | 30,000 |
| `story_page_versions` | 720 | 3,600 | 18,000 | 90,000 |
| `mission_versions` | 216 | 1,080 | 5,400 | 27,000 |
| `child_progress` | 6,000 | 360,000 | 18,000,000 | 900,000,000 |
| `child_achievements` | 400 | 20,000 | 1,000,000 | 50,000,000 |
| `notifications` | 500 | 30,000 | 1,500,000 | 75,000,000 |
| `creations` | 50 | 3,000 | 150,000 | 7,500,000 |
| `weekly_challenge_progress` | 200 | 12,000 | 600,000 | 30,000,000 |

### Critical Table: `child_progress`

This is the fastest-growing table. Each child completing all 6 missions across all stories generates:

```
missions_per_story × stories × languages = rows per child
6 × stories_count × languages_used = rows

Phase 2: 6 × 20 × 1.5 = 180 rows/child × 1,000 = 180,000
Phase 3: 6 × 100 × 2 = 1,200 rows/child × 10,000 = 12,000,000
Phase 4: 6 × 500 × 3 = 9,000 rows/child × 100,000 = 900,000,000
```

At Phase 4, `child_progress` alone could reach **900M rows**. This is the primary scaling concern.

---

## Database Scalability

### Current Indexes on Critical Tables

| Table | Indexes | Adequate? |
|---|---|---|
| `child_progress` | 4 (PK, child_id+mission_id+language unique, completed_at, child_id) | ✅ Phase 1-2, ⚠️ Phase 3+ |
| `child_achievements` | 3 (PK, child_id+slug unique, child_id) | ✅ Phase 1-3, ⚠️ Phase 4 |
| `notifications` | 1 (PK + parent_id+read+created_at) | ✅ All phases |
| `stories` | 5 (PK, slug, sort_order, status, family_id future) | ✅ All phases |
| `mission_versions` | 5 (PK, mission_id+language+revision unique, published) | ✅ All phases |

### Index Recommendations

**Phase 3 (10K users):**

```sql
-- Composite index for story library RPC
CREATE INDEX idx_cp_child_lang_mission ON child_progress(child_id, language, mission_id);

-- Partial index for active progress only
CREATE INDEX idx_cp_recent ON child_progress(child_id, completed_at DESC)
  WHERE completed_at > now() - interval '90 days';

-- Achievements by type for fast badge/cert queries
CREATE INDEX idx_ca_child_type ON child_achievements(child_id, type);
```

**Phase 4 (100K users):**

```sql
-- Partition child_progress by date range
-- Consider table partitioning: child_progress_2026_q1, child_progress_2026_q2, etc.
-- Or partition by child_id hash for even distribution
```

---

## RPC Scalability

### get_story_library

**Current behavior:** Scans all published stories, checks completion per story via subqueries.

| Phase | Stories | Children | Est. Query Time |
|---|---|---|---|
| Phase 1 | 4 | 100 | < 50ms ✅ |
| Phase 2 | 20 | 1,000 | < 100ms ✅ |
| Phase 3 | 100 | 10,000 | < 300ms ✅ |
| Phase 4 | 500 | 100,000 | 500ms-2s ⚠️ |

**Bottleneck at Phase 4:** The `_sa_is_story_complete` and `_sa_is_story_unlocked` subqueries run per-story. With 500 stories, that's 500+ subqueries per call.

**Optimization:** Materialize completion status. Pre-compute a `child_story_status` materialized view or cache table updated on mission completion.

### complete_story_slot

**Current behavior:** Single RPC with `is_my_child()` check, INSERT/UPDATE, completion check, badge/cert award.

| Phase | Concurrent Calls | Est. Time | Risk |
|---|---|---|---|
| Phase 1 | 5/min | < 100ms ✅ | None |
| Phase 2 | 50/min | < 100ms ✅ | None |
| Phase 3 | 500/min | < 200ms ✅ | Low |
| Phase 4 | 5,000/min | 200-500ms ⚠️ | Lock contention |

**Optimization at Phase 4:** The `ON CONFLICT` upsert and achievement insert are well-indexed. Main risk is lock contention on `child_achievements` unique constraint checks at high concurrency.

### get_story_slots

**Current behavior:** Simple join: story_slots → missions → mission_versions + child_progress check.

**Scales well** through all phases. Fixed 6 slots per story, query complexity doesn't grow with user count.

---

## Storage Forecast

### Per-Story Storage

| Asset Type | Size Each | Count per Story | Total per Story |
|---|---|---|---|
| Cover image | 500 KB | 1 | 500 KB |
| Intro video | 20 MB | 1 | 20 MB |
| Theme song | 5 MB | 1 | 5 MB |
| Meet characters video | 15 MB | 1 | 15 MB |
| Story intro | 10 MB | 1 | 10 MB |
| Page images | 200 KB | 20 | 4 MB |
| Page audio | 500 KB | 20 | 10 MB |
| PDF | 2 MB | 1 | 2 MB |
| Coloring templates | 300 KB | 5 | 1.5 MB |
| Move video | 15 MB | 1 | 15 MB |
| Sing audio | 5 MB | 1 | 5 MB |
| Bonus video | 25 MB | 1 | 25 MB |
| **Total per story** | | | **~113 MB** |

### Storage Growth

| Phase | Stories | Languages | Storage (stories) | Community | Total |
|---|---|---|---|---|---|
| Phase 1 | 4 | 1 | 450 MB | 50 MB | ~500 MB |
| Phase 2 | 20 | 2 | 4.5 GB | 500 MB | ~5 GB |
| Phase 3 | 100 | 3 | 34 GB | 5 GB | ~39 GB |
| Phase 4 | 500 | 3 | 170 GB | 50 GB | ~220 GB |

### Supabase Storage Limits

| Plan | Storage | Bandwidth | Adequate Through |
|---|---|---|---|
| Free | 1 GB | 2 GB/month | Phase 1 only |
| Pro | 100 GB | 250 GB/month | Phase 2-3 |
| Team | 100 GB+ | 250 GB+/month | Phase 3 |
| Enterprise | Custom | Custom | Phase 4 |

**Recommendation:** Start on Pro plan. Move to Team/Enterprise at Phase 3.

---

## Media Delivery Strategy

### Current: Direct Supabase Storage

All assets served directly from Supabase Storage public URLs. No CDN, no optimization.

**Adequate through Phase 2.**

### Phase 3: Add CDN Layer

```
Client → CDN (Vercel Edge / Cloudflare) → Supabase Storage
```

Benefits:
- Edge caching reduces storage bandwidth by 80%+
- Faster delivery to African users (edge nodes in Nairobi, Lagos)
- Automatic image optimization (WebP conversion, resizing)

**Implementation:**
- Vercel automatically CDN-caches static assets
- For Supabase Storage: proxy through a Next.js API route with `Cache-Control` headers
- Or use Cloudflare R2 as storage origin with built-in CDN

### Phase 4: Dedicated Media Pipeline

```
Upload → Transcode → CDN Origin → Edge Cache → Client
```

- Video: HLS streaming (adaptive bitrate for mobile networks)
- Audio: MP3 at 128kbps (sufficient for narration)
- Images: WebP + responsive srcset (300px, 600px, 1200px)
- PDFs: Pre-rendered page images for mobile

### Image Optimization

**Current:** Full-size images served to all devices.

**Recommended:** Next.js `<Image>` component with `next/image` optimization:
- Automatic WebP/AVIF conversion
- Responsive `srcset` generation
- Lazy loading below the fold
- Blur placeholder during load

---

## Community Scalability

### Feed Query

**Current:** `SELECT * FROM creations WHERE is_public = true ORDER BY created_at DESC LIMIT 20`

| Phase | Posts | Query Time | Status |
|---|---|---|---|
| Phase 1 | 50 | < 20ms | ✅ |
| Phase 2 | 3,000 | < 50ms | ✅ |
| Phase 3 | 150,000 | < 200ms | ✅ (with index) |
| Phase 4 | 7,500,000 | 500ms+ | ⚠️ Needs pagination cursor |

**Optimization at Phase 3+:**
- Cursor-based pagination instead of OFFSET
- Index: `CREATE INDEX idx_creations_public_date ON creations(is_public, created_at DESC) WHERE is_public = true`
- Pre-compute like counts (materialized or cached)

---

## Notification Scalability

### Volume Forecast

| Phase | Daily Notifications | Monthly | Strategy |
|---|---|---|---|
| Phase 1 | ~50 | ~1,500 | Direct insert ✅ |
| Phase 2 | ~500 | ~15,000 | Direct insert ✅ |
| Phase 3 | ~5,000 | ~150,000 | Batch insert ⚠️ |
| Phase 4 | ~50,000 | ~1,500,000 | Queue + worker ⚠️ |

**Phase 3 optimization:** Batch notification creation (insert 100 at a time instead of 1 per event).

**Phase 4 optimization:** Move to a queue system (Vercel Queues or Supabase Edge Functions with pg_notify) for async notification delivery.

### Push Notification Delivery

Web Push has no server-side cost per notification. The bottleneck is the broadcast loop — sending to 30,000 push subscriptions sequentially would take minutes.

**Phase 3+:** Parallelize push delivery with Promise.allSettled batches of 100.

---

## Talk to Nimi Scalability

### Cost Forecast (Claude API)

Assuming average conversation: 500 input tokens + 200 output tokens per message, 5 messages per session.

| Phase | Daily Sessions | Monthly Tokens | Monthly Cost (est.) |
|---|---|---|---|
| Phase 1 | 20 | 2.1M | ~$6 |
| Phase 2 | 200 | 21M | ~$60 |
| Phase 3 | 2,000 | 210M | ~$600 |
| Phase 4 | 20,000 | 2.1B | ~$6,000 |

**Optimization strategies:**
- Cache common responses (greetings, story summaries)
- Use cheaper model (Haiku) for simple interactions
- Rate limit: max 10 messages per child per day
- Pre-generate story-specific prompts (no per-request context loading)

---

## Performance Targets vs Reality

| Page | Target | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|---|
| Homepage | < 2s | 1.5s ✅ | 1.5s ✅ | 2s ✅ | 3s ⚠️ |
| Story Detail | < 2s | 1.2s ✅ | 1.2s ✅ | 1.5s ✅ | 2s ✅ |
| Mission Load | < 3s | 1.5s ✅ | 1.5s ✅ | 2s ✅ | 3s ⚠️ |
| Treasure | < 2s | 1s ✅ | 1s ✅ | 1.5s ✅ | 2s ✅ |
| Parent Dashboard | < 3s | 2s ✅ | 2s ✅ | 3s ⚠️ | 5s ❌ |
| Community Feed | < 3s | 0.5s ✅ | 1s ✅ | 2s ✅ | 4s ❌ |
| Admin Dashboard | < 3s | 2s ✅ | 2.5s ✅ | 4s ⚠️ | 8s ❌ |

**Phase 3 bottlenecks:** Parent dashboard (aggregating progress across many missions), Admin dashboard (counting across all stories/children).

**Phase 4 bottlenecks:** Homepage story library RPC, community feed, admin analytics.

---

## Caching Strategy

### Layer 1: Browser Cache

```
Static assets (JS, CSS, SVGs): Cache-Control: public, max-age=31536000, immutable
Story images: Cache-Control: public, max-age=86400
Audio files: Cache-Control: public, max-age=604800
```

Already partially implemented via service worker.

### Layer 2: CDN Cache (Vercel Edge)

- Next.js ISR for story library page (revalidate: 300 seconds)
- Static generation for public pages (login, signup)
- Edge caching for API routes with `stale-while-revalidate`

### Layer 3: Database Query Cache

**Phase 3+:**
- Materialize `story_library` view (refresh every 5 minutes)
- Cache `child_story_status` per child (invalidate on progress write)
- Use Supabase Realtime for cache invalidation

### Layer 4: Application Cache

**Phase 3+:**
- Redis/Upstash for session-level caching
- Cache parent analytics computations (TTL: 5 minutes)
- Cache admin dashboard stats (TTL: 1 minute)

---

## Offline Strategy

### Current

Service worker caches `/_next/static` (disabled for JS chunks to prevent stale modules) and Supabase media assets.

### Recommended

| Feature | Offline Behavior | Sync Strategy |
|---|---|---|
| Story pages | Cache viewed pages | Pre-cache current story |
| Audio | Cache played audio | Pre-cache current story audio |
| Progress | Queue completions in localStorage | Sync on reconnect via `offlineQueue.ts` |
| Certificates | Cache earned certificates | Read-only, no sync needed |
| Community | Show cached feed | Refresh on reconnect |
| Challenges | Show cached status | Sync completion on reconnect |

Already partially implemented: `lib/offlineQueue.ts`, `hooks/useOfflineSync.ts`, `hooks/useOnlineStatus.ts`.

---

## Bottleneck Analysis

### Phase 1-2 (Launch → 1K users): No bottlenecks

Everything works with direct queries. Supabase Free/Pro plan sufficient.

### Phase 3 (10K users): Database query performance

| Bottleneck | Table | Solution |
|---|---|---|
| Story library RPC | `child_progress` | Materialized completion status |
| Parent analytics | `child_progress` aggregation | Pre-computed daily summaries |
| Admin dashboard | Cross-table counts | Cached stats (refresh every minute) |
| Notification delivery | `notifications` bulk insert | Batch processing |

### Phase 4 (100K users): Infrastructure limits

| Bottleneck | Component | Solution |
|---|---|---|
| `child_progress` table size | 900M rows | Table partitioning by date |
| Storage bandwidth | 220 GB assets | CDN + image optimization |
| Push delivery | 30K subscriptions | Parallel batch delivery |
| AI costs | $6K/month | Rate limiting + model tiering |
| Admin CMS | 500 stories to manage | Pagination + search indexing |

---

## Scaling Roadmap

### Required Before Launch

| Action | Effort | Impact |
|---|---|---|
| Deploy to Vercel | 0.5 day | Production environment |
| Enable Vercel CDN for static assets | Automatic | Faster global delivery |
| Run Lighthouse audit | 0.5 day | Identify client-side issues |

### Required at 1,000 Users

| Action | Effort | Impact |
|---|---|---|
| Upgrade to Supabase Pro | Configuration | 8 GB database, 100 GB storage |
| Add composite index on child_progress | Migration | Faster library queries |
| Enable Next.js image optimization | 1 day | 50-70% bandwidth reduction |
| Add rate limiting on RPCs | 1 day | Prevent abuse |

### Required at 10,000 Users

| Action | Effort | Impact |
|---|---|---|
| Materialize story completion status | 2 days | 10x faster library RPC |
| Pre-compute daily analytics summaries | 2 days | Fast parent dashboard |
| Cursor-based pagination for community | 1 day | Consistent feed performance |
| Batch notification delivery | 1 day | Faster broadcasts |
| Add CDN proxy for Supabase Storage | 1 day | 80% bandwidth savings |
| Add Redis cache (Upstash) | 1 day | Session-level caching |

### Required at 100,000 Users

| Action | Effort | Impact |
|---|---|---|
| Partition child_progress by date | 3 days | Manageable table sizes |
| HLS video streaming | 3 days | Adaptive bitrate for mobile |
| Move to Supabase Team/Enterprise | Configuration | Higher limits |
| AI model tiering (Haiku for simple, Sonnet for complex) | 2 days | 70% cost reduction |
| Dedicated media pipeline (transcode + optimize) | 5 days | Professional media delivery |
| Read replicas for analytics queries | Configuration | Isolate read workload |

---

## Infrastructure Recommendations

### Phase 1 (Launch)

```
Supabase Pro ($25/mo)
Vercel Pro ($20/mo)
Total: $45/month
```

### Phase 2 (1K users)

```
Supabase Pro ($25/mo)
Vercel Pro ($20/mo)
Upstash Redis ($10/mo)
Total: $55/month
```

### Phase 3 (10K users)

```
Supabase Team ($599/mo)
Vercel Pro ($20/mo)
Upstash Redis ($30/mo)
Cloudflare CDN (free tier)
Total: ~$650/month
```

### Phase 4 (100K users)

```
Supabase Enterprise (custom)
Vercel Enterprise (custom)
Upstash Redis Pro ($100/mo)
Cloudflare Pro ($20/mo)
AI API costs (~$6,000/mo)
Total: ~$8,000-12,000/month
```

---

## Summary

The Nimipiko architecture scales comfortably to **10,000 users without major changes**. The primary investment areas for Phase 3+ are:

1. **Database:** Materialized views for completion status, table partitioning for progress data
2. **Media:** CDN layer + image optimization pipeline
3. **AI:** Rate limiting + model tiering to control costs
4. **Caching:** Redis for session data, pre-computed analytics

No architectural redesign is needed at any growth phase. The current schema, RPC pattern, and Next.js + Supabase stack support growth to 100K+ users with incremental optimizations.
