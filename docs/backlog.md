# NIMIPIKO Backlog

Future phases that are deliberately deferred — not started, scoped here so
the trigger conditions and intended scope aren't lost.

---

## BN — Analytics Scaling

**Status:** Deferred (not started)
**Decided:** 2026-06-14, during Phase BI follow-up

### Reason for deferral

Phase BI (Educational Analytics & Platform Insights) shipped 5 live-computed
analytics dashboards (Learner/Curriculum/Language/Achievement/Content) plus
CSV/XLSX export, built directly on `child_progress`/`child_achievements`/
`mission_versions`/`level_missions`/`language_switch_log`. At current
platform scale (10 missions, a handful of learners), live computation on
page load is fast and the added complexity of an event-tracking pipeline and
rollup tables is not justified.

### Scope (when triggered)

- **`analytics_events`** — general-purpose append-only event log (mission
  starts, session opens, etc.), beyond the single-purpose
  `language_switch_log` (migration 031) added in Phase BI.
- **`daily_rollups`** — daily-aggregated tables/materialized views for the 5
  Phase BI analytics domains, so `AnalyticsManager.tsx` reads pre-aggregated
  rows instead of scanning raw `child_progress`/`child_achievements` on every
  load.
- **Aggregation jobs** — a cron (Vercel `crons`, alongside the existing
  `/api/cron/daily-reminder`) that computes and writes the daily rollups.
- **Historical trend optimization** — longer-range trend charts (e.g. 90-day/
  yearly) that would be infeasible to compute live from raw rows once volume
  grows.

### Trigger conditions (any one of)

- 500+ active learners
- Analytics query performance degradation observed (e.g. `AnalyticsManager`
  bulk fetch becomes slow)
- Reporting latency concerns raised by admins/educators

---
