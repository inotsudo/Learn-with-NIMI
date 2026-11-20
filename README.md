# NIMIPIKO

NIMIPIKO is a Next.js + Supabase learning app for children aged 2–12 in
English, French and Kinyarwanda, built around the NIMIPIKO Airways journey
from the brand intro video: the airport world (`/home`), story adventures
with six missions each, the Défi des Champions, Mon Trésor, badges and
certificates, personalised Airways printables (passport, stamps, kit, badge,
boarding pass, book, song), Talk to Nimi, a parent area and an admin CMS.

The original 4-minute intro video is kept out of git in `media-source/`; the
app streams the web cut in `public/now/videos/`.

## Prerequisites

- Node.js 22.x (see `.nvmrc`)
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
npm test         # unit tests (vitest)
```

## Supabase / Database

All schema changes live as numbered SQL files in `supabase/migrations/`
(001 through the latest number), applied in order. Each migration is self-contained and
includes its own RLS policies.

Apply a migration to the linked project:

```bash
npx supabase db query --linked --file supabase/migrations/0XX_name.sql
```

**Before running `supabase db push`**, always run `npx supabase migration
list` first. The CLI's local migration history can drift out of sync with
the remote project (this happened once, 2026-06-12, and required `supabase
migration repair` before `db push` would work cleanly).

## Deployment

The app deploys to Vercel. Scheduled jobs (all `CRON_SECRET`-protected):

| Cron | Schedule | Purpose |
|---|---|---|
| `/api/cron/daily` | `0 8 * * *` (`vercel.json`) | Runs subscription renewals, MoMo renewal checks, gift emails, referral rewards, checkout expiry, and the Monday weekly digest. |
| `/api/cron/daily-reminder` | `0 17 * * *` (`vercel.json`) | Push reminders to parents whose children haven't played today. |

`.github/workflows/cron-scheduler.yml` calls the same routes from GitHub Actions as a backup scheduler.

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

- [`STORY_ARCHITECTURE.md`](STORY_ARCHITECTURE.md) — how stories, slots,
  challenges and certificates fit together.
- [`docs/`](docs/) — story-adventure specs (`sa0`–`sa5`), the brand world
  bible, Talk to Nimi audits, and [`docs/backlog.md`](docs/backlog.md) for
  deferred work.
- [`docs/phase-bk-security-audit.md`](docs/phase-bk-security-audit.md),
  [`docs/phase-bk-data-integrity-audit.md`](docs/phase-bk-data-integrity-audit.md),
  [`docs/phase-bk-performance-baseline.md`](docs/phase-bk-performance-baseline.md),
  [`docs/phase-bk-backup-recovery.md`](docs/phase-bk-backup-recovery.md), and
  [`docs/phase-bk-operational-readiness.md`](docs/phase-bk-operational-readiness.md) —
  production hardening / launch readiness audit (2026-06-14).
