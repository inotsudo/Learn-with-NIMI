# Phase BK — Performance Baseline

**Date:** 2026-06-14

Scope: a snapshot of build output and known code-splitting/indexing
optimizations, to give future phases (including the deferred
[BN — Analytics Scaling](./backlog.md)) a reference point for "did this get
slower."

---

## 1. Build configuration

- Next.js `16.2.2` with Turbopack (`next build` uses `▲ Next.js 16.2.2
  (Turbopack)`).
- `next.config.js` is effectively empty (1 byte) — no bundle analyzer, no
  custom webpack/turbopack config, no image-domain restrictions configured.
  Defaults are in effect.
- Node `v20.20.2`.

## 2. Build output (post dead-code-removal)

`npm run build` (with migration 033 applied):

```
✓ Compiled successfully in 8.5s
  Running TypeScript ...
  Finished TypeScript in 17.3s ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (32/32) ...
```

**32 routes** total, e.g.:

```
○ /                              (static)
○ /admin                         (static — client-side gated, code-split)
○ /missions                      (static)
ƒ /missions/[category]           (dynamic)
ƒ /api/create-checkout-session    (dynamic)
ƒ /api/cron/daily-reminder         (dynamic)
ƒ /api/health                      (dynamic)
ƒ /api/nimi                         (dynamic, streaming)
ƒ /api/webhooks/stripe              (dynamic)
... (28 more)
```

`○` = prerendered static, `ƒ` = server-rendered on demand. No route failed
to build after removing the 13 dead files (`app/api/{mission_completions,
courses,courses/missions,enrollments,submissions,student_reflections,
students,Resources,pikopals,missions.ts,manual-payment.ts,stripe-session}`,
`app/test`, `app/test-student-form`) — confirms zero live references existed
(also verified by grep, see security audit §5).

- Total `.next/` output: **46 MB**.
- Largest individual JS chunks: two at ~400 KB, then 228 KB, 212 KB, 136 KB,
  120 KB, 112 KB, 84 KB, 68 KB, 56 KB — consistent with a feature-rich app
  using `react-pdf`, `framer-motion`, `recharts`, `xlsx`, `fabric` (coloring
  canvas), and media-player libraries.

> Note: this build required temporary placeholder `STRIPE_*` env vars in the
> local `.env.local` (not committed) — see
> [phase-bk-operational-readiness.md](./phase-bk-operational-readiness.md)
> §2 for why, and `.env.example` for the full reference.

## 3. Existing optimizations (unchanged, confirmed still in place)

- **Admin portal code-splitting**: `app/admin/page.tsx` defines a
  `dynamicView()` helper (`next/dynamic` + `{ ssr: false }`) and wraps all
  **17 managers** (TableView, BucketsView, DashboardHome, MissionManager,
  StoryManager, ColoringManager, LanguagesManager, ChildrenManager,
  ParentsManager, CertificatesManager, RewardsManager, AnalyticsManager,
  SettingsManager, AdministratorsManager, NotificationsManager,
  CurriculumManager, AdminProfile) — each only loads its JS when that
  sidebar section is opened.
- **Migration 033 indexes** (this phase) — `mission_versions.mission_id` and
  `story_page_versions.story_page_id` now have dedicated indexes, addressing
  the only identified query-level performance gap (these are the two
  highest-traffic joins in `get_curriculum_missions`/
  `complete_curriculum_mission`/the FlipFlop reader).

## 4. Live-aggregation analytics (context for Phase BN)

Phase BI's `lib/adminAnalytics.ts` computes all 6 admin Analytics tabs by
querying raw `child_progress`/`child_achievements`/`mission_versions`/
`level_missions`/`language_switch_log` on each page load — no rollup tables.
At today's scale (10 missions, a handful of learners) this is fast. This
baseline (32 routes, 46 MB build, no analytics-specific slow queries
observed) is the "before" reference for [BN — Analytics
Scaling](./backlog.md), whose trigger conditions include "analytics query
performance degradation."

---

## Summary

| Check | Result |
|---|---|
| `npm run build` | Succeeds, 32 routes, 46 MB `.next/` |
| Dead-code removal broke no route | Confirmed (32/32 routes built) |
| Admin code-splitting (17 managers via `next/dynamic`) | Confirmed in place |
| New indexes (migration 033) | Applied + verified |
| Baseline recorded for future Phase BN comparison | Yes |
