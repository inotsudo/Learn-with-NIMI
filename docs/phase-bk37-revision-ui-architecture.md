# BK.3.7 — Revision UI Preparation Architecture

## Overview

BK.3.7 adds discoverable UI for the revision workflow in MissionEditor — without
requiring the revision system to be "fully implemented" in the CMS sense. The
underlying database machinery (RPCs, partial unique indexes) shipped in migration 037.
This phase surfaces that machinery through a polished, always-visible Revision History
section so the CMS is future-proof as revision workflows mature.

## Backend (already live — migration 037)

| Object | Purpose |
|---|---|
| `mission_versions.revision_number` | Revision counter per `(mission_id, language)` |
| `mission_versions_one_published_idx` | Partial unique index: only one `published=true` row per `(mission_id, language)` |
| `mission_versions_one_current_idx` | Partial unique index: only one `is_current=true` row per `(mission_id, language)` |
| `create_mission_version_revision(p_version_id)` RPC | Clones the published row as a new draft revision; new row gets `is_current=true`, old row gets `is_current=false` |
| `publish_mission_version_revision(p_version_id)` RPC | Demotes current published sibling → promotes target to `status='published', is_current=true`; syncs `missions.active` |

## MissionEditor changes

### Revision History section (always expanded)

Before BK.3.7, this section used `<details>/<summary>` — collapsed by default,
making the feature hard to discover. BK.3.7 removes the accordion wrapper; the section
renders inline when `revisionsByLang[activeLang].length > 0`.

### Version labels

`Rev N` → `vN` — shorter and matches conventional version notation (v1, v2, v3).

### Status badges per revision row

| Condition | Badge |
|---|---|
| `rev.published` | 🟢 Live (emerald) |
| `rev.is_current && !rev.published` | ✏️ Editing (indigo, new in BK.3.7) |
| (neither) | status badge only |

The "Editing" badge is new — it makes immediately visible which draft revision is
currently being edited, important when multiple revisions exist (e.g. v1 Published,
v2 Draft/Editing).

### "Create Revision" button (in Revision History section header)

```tsx
<button
  onClick={handleCreateRevision}
  disabled={creatingRevision || vf.status !== 'published'}
  title={vf.status !== 'published' ? 'Publish this version first to create a new revision' : undefined}
  className="... bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
>
  <GitBranch size={13} /> {creatingRevision ? 'Creating…' : 'Create Revision'}
</button>
```

Enabled only when the active language's current version is `published`. Disabled with
a tooltip otherwise. The same `handleCreateRevision` handler is also called from the
primary action button in the editor header (existing "Create Revision to Edit" CTA).

### Rollback button

Present on archived non-current revisions. Label unchanged; confirms via
`useConfirmDialog` then calls `publish_mission_version_revision(rev.id)`.

## Discoverability rationale

The revision workflow requires three steps: (1) publish a version, (2) create a
revision, (3) edit the new draft, (4) publish the revision. The old collapsed `<details>`
made step 2 invisible unless an admin already knew it existed. The always-expanded
section with a persistent (but correctly disabled-until-ready) button teaches the
workflow by showing the user what state they're in and what they need to do next.

## Non-changes (BK.4 freeze compliance)

- No new `mission_versions` rows created
- No `create_mission_version_revision` or `publish_mission_version_revision` calls
  made during BK.3.7 implementation
- No learner-facing tables touched
