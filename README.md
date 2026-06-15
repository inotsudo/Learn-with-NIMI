# NIMIPIKO

NIMIPIKO is a Next.js + Supabase learning platform for young children,
offering daily curriculum missions (songs, movement, stories, coloring,
discovery) across English, French, and Kinyarwanda, with a parent dashboard
and an admin CMS.

## Prerequisites

- Node.js 20.x
- A Supabase project (Postgres + Auth + Storage)
- [Supabase CLI](https://supabase.com/docs/guides/cli) for running migrations

## Setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local with real values — see .env.example for what each var is for
```

## Development

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run start    # run a production build
npm run lint     # lint
```

## Supabase / Database

All schema changes live as numbered SQL files in `supabase/migrations/`
(currently 001-033), applied in order. Each migration is self-contained and
includes its own RLS policies.

Apply a migration to the linked project:

```bash
npx supabase db query --linked --file supabase/migrations/0XX_name.sql
```

**Before running `supabase db push`**, always run `npx supabase migration
list` first. The CLI's local migration history can drift out of sync with
the remote project (this happened once, 2026-06-12, and required `supabase
migration repair` before `db push` would work cleanly).

Read-only SQL test suites live in `supabase/tests/` — they assert against
existing data/schema and make no writes, so they're safe to run anytime:

```bash
npx supabase db query --linked --file supabase/tests/<suite>.sql
```

## Deployment

The app deploys to Vercel. `vercel.json` defines one scheduled job:

| Cron | Schedule | Purpose |
|---|---|---|
| `/api/cron/daily-reminder` | `0 17 * * *` (17:00 UTC daily) | Sends push reminders to parents whose children haven't completed today's missions (`CRON_SECRET`-protected). |

## Backup & Recovery

- **Schema**: fully reproducible by replaying `supabase/migrations/001`
  through the latest numbered file, in order, against a fresh Supabase
  project.
- **Data**: Supabase manages automated backups and point-in-time recovery
  (PITR) at the project level (Dashboard → Database → Backups). This repo
  does not need its own backup tooling — only the schema/migrations are
  version-controlled here.
- Restoring data (not just schema) requires restoring from a Supabase
  backup/PITR snapshot via the Supabase Dashboard.

## Documentation

- [`docs/`](docs/) — architecture and verification reports for each
  development phase (`phase-bX-*.md`), plus durable references like
  [`docs/curriculum-framework.md`](docs/curriculum-framework.md) and
  [`docs/backlog.md`](docs/backlog.md) for deferred work.
- [`docs/phase-bk-security-audit.md`](docs/phase-bk-security-audit.md),
  [`docs/phase-bk-data-integrity-audit.md`](docs/phase-bk-data-integrity-audit.md),
  [`docs/phase-bk-performance-baseline.md`](docs/phase-bk-performance-baseline.md),
  [`docs/phase-bk-backup-recovery.md`](docs/phase-bk-backup-recovery.md), and
  [`docs/phase-bk-operational-readiness.md`](docs/phase-bk-operational-readiness.md) —
  production hardening / launch readiness audit (2026-06-14).
