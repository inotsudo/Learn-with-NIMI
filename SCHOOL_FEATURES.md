# Nimipiko — School Features

Everything built to support teachers, classrooms, and the teacher → student → parent loop.

---

## Architecture overview

Nimipiko has three distinct roles:

| Role | Auth | Profile table |
|---|---|---|
| Parent | Supabase Auth | `parents` |
| Teacher | Supabase Auth | `teacher_profiles` |
| Admin | Supabase Auth | `admins` |

Children belong to **both** a parent and a teacher, independently, via two separate nullable columns on the `children` table. A parent's child joining a class does not make the parent a teacher — the columns never overlap.

```
children
  ├── parent_id  → auth user (parent, nullable)
  └── teacher_id → teacher_profiles (nullable)
```

---

## Database migrations

### 104 — Teacher profiles

Creates the `teacher_profiles` table.

```sql
teacher_profiles (
  id         uuid primary key,  -- same as auth.uid()
  name       text not null,
  email      text not null,
  school_name text,
  class_name  text,
  class_code  text unique        -- added in 105
)
```

RLS: teachers can only read/write their own row.

---

### 105 — Teacher features

Adds the class infrastructure:

- `class_code text` column on `teacher_profiles`
- DB trigger `_teacher_gen_class_code()` — auto-generates a unique 6-character alphanumeric code on insert
- `class_announcements` table:
  ```sql
  class_announcements (
    id          uuid primary key,
    teacher_id  uuid references teacher_profiles,
    title       text,
    body        text not null,
    created_at  timestamptz
  )
  ```
  RLS: teacher manages own rows; public can select (for the join page).
- `get_class_by_code(p_code text)` RPC — returns teacher name, school, class name, class code, teacher_id for a given code. Used by the public join page.

---

### 106 — Separate teacher / parent roles

Fixes the architecture: previously students created by teachers were inserted with `parent_id = teacher.uid`, making teachers masquerade as parents.

Changes:
- `ALTER TABLE children ADD COLUMN teacher_id uuid REFERENCES teacher_profiles(id) ON DELETE SET NULL`
- `ALTER TABLE children ALTER COLUMN parent_id DROP NOT NULL`
- Backfill: rows where `parent_id` matched a teacher profile had their data moved to `teacher_id` and `parent_id` set null
- Four new RLS policies on `children` for the teacher role (select / insert / update / delete where `teacher_id = auth.uid()`)
- Updated `get_teacher_class_summary()` and `get_teacher_story_breakdown()` RPCs to use `teacher_id = auth.uid()` instead of `parent_id`

---

### 107 — Assignments system

Creates the full assignments system.

**Tables:**

```sql
assignments (
  id           uuid primary key,
  teacher_id   uuid references teacher_profiles not null,
  title        text not null,
  instructions text,
  story_id     uuid references stories,   -- optional linked story
  due_date     date,
  created_at   timestamptz
)

assignment_students (
  id            uuid primary key,
  assignment_id uuid references assignments,
  child_id      uuid references children,
  completed_at  timestamptz,
  seen_at       timestamptz,
  unique (assignment_id, child_id)
)
```

RLS:
- Teacher: full access to their own assignments and all rows in `assignment_students` linked to their assignments
- Parent: select + update on `assignment_students` rows where the child is theirs

**RPCs (all `security definer`):**

| RPC | Used by |
|---|---|
| `get_teacher_assignments()` | Teacher dashboard assignments view |
| `get_assignment_detail(p_assignment_id)` | Per-assignment student completion grid |
| `get_student_assignments(p_child_id)` | Student home panel |
| `mark_assignment_complete(p_assignment_id, p_child_id)` | Student "Done" button |
| `assign_to_class(p_assignment_id)` | Auto-assigns to all students with `teacher_id = auth.uid()` on create |

---

## App pages & components

### `/teacher` — Teacher dashboard

**File:** `app/teacher/page.tsx`

Single-page dashboard with a green sidebar and six views:

| View | Key feature |
|---|---|
| Overview | KPI cards (students, stars, missions, active today), weekly activity bar chart, shortcuts |
| Students | Student roster with last-active status, stars, missions; add single / bulk CSV import; printable progress cards |
| **Assignments** | Create assignments, link to a story, set due date; auto-assigns to all class students; per-assignment completion grid |
| Stories | Story completion breakdown per title |
| Announcements | Post class announcements; shown publicly on the join page |
| Reports | Detailed per-student table; language breakdown |
| Settings | Teacher profile editor |

Design: full Nimipiko design system — green sidebar (`#15803D`), leaf border radius (`20px 20px 20px 5px`), DS token colours, Baloo + Nunito fonts. No dark mode.

**Key sub-components inside the file:**

- `TeacherOnboarding` — first-run form to set name, school, class name
- `ConfirmDeleteModal` — Nimipiko-styled modal replacing `window.confirm()`
- `CSVImportModal` — client-side CSV parser (`name,age,language` columns), preview with error highlighting, bulk insert
- `AddStudentModal` — single student add form
- `CopyButton` — copies class code / join link with animated feedback
- `WeekChart` — animated bar chart for 7-day activity
- `printProgressCard()` — opens a popup with a self-contained styled HTML card and calls `window.print()`
- `AssignmentsView` — full assignments CRUD: create modal (title, instructions, story picker, due date), assignment list with progress bars and due-date badges (red = overdue, amber = soon), delete, and a per-assignment student completion detail panel

**Auth flow:**

1. `auth.getUser()` → no user → redirect to `/loginpage`
2. Query `teacher_profiles` → no row → show `TeacherOnboarding` form
3. Profile found → load dashboard data

---

### `/join/[code]` — Public class join page

**Files:** `app/join/[code]/page.tsx` + `app/join/[code]/JoinClassSection.tsx`

A public page parents share with other parents (or use themselves) to link their child to a teacher's class.

**Server component** (`page.tsx`):
- Calls `get_class_by_code(code)` — 404 if not found
- Fetches `class_announcements` for that teacher (server-rendered, no auth needed)
- Renders class info card + `JoinClassSection` client island + announcement list

**Client island** (`JoinClassSection.tsx`):
- Detects auth state on mount: `guest` / `parent` / `is_teacher`
- Guest → "Sign in to join" → `/loginpage?next=/join/${code}`
- Parent with children: each child shows its status:
  - `in` — already in this class → "Leave Class" button
  - `none` — no class → "Join Class" button
  - `other` — in a different class → "Switch to This Class" button
- `joinClass(childId)` — `UPDATE children SET teacher_id = teacherId WHERE id = childId`
- `leaveClass(childId)` — `UPDATE children SET teacher_id = null WHERE id = childId`

---

### `components/home/HomeAssignmentsPanel.tsx` — Student assignments panel

Shown on the home page right aside, **only when the active child has a `teacher_id`** (is enrolled in a class).

Features:
- Collapsible panel (animated with framer-motion)
- Header shows pending count + overdue badge
- Pending assignments: due-date colour coding
  - Red — overdue
  - Amber — due within 2 days
  - Green — due later / no due date
- "Read: Story Title" button → links to `/stories/${slug}`
- "Done" button → calls `mark_assignment_complete` RPC; optimistic UI update
- Completed section shows struck-through completed assignments
- All-done state shows a celebration message

Wired in `app/home/page.tsx`:
```tsx
{activeChild?.teacher_id && (
  <HomeAssignmentsPanel childId={activeChild.id} />
)}
```

---

## Teacher authentication helper

**File:** `app/teacher/teacherAuth.ts`

```ts
export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  school_name: string | null;
  class_name: string | null;
  class_code: string | null;
}

export async function getCachedTeacher(): Promise<TeacherProfile | null>
export function clearTeacherCache(): void
```

Caches the teacher profile in memory for the session to avoid redundant DB calls.

---

## Data types

`lib/queries/types.ts` — `Child` interface updated:

```ts
export interface Child {
  id: string;
  parent_id: string;
  teacher_id: string | null;  // null when not enrolled in a class
  name: string;
  avatar_url: string | null;
  language: "en" | "fr" | "rw";
  age: number | null;
  favorite_category: FavoriteCategory | null;
  created_at: string;
}
```

---

## Security rules

- Teachers access **only their own students** via `teacher_id = auth.uid()` in every RLS policy and RPC
- Parents access **only their own children** via `parent_id = auth.uid()`
- The join page uses the anon key and only reads data covered by the public select policies (`class_announcements`, `get_class_by_code`)
- All RPCs are `security definer` with explicit auth checks inside — they are not open functions
- **No middleware auth for the admin or teacher routes** — auth is handled client-side only (per project rule)
- Service role key is never written to disk or printed to stdout

---

## Priority order (agreed with user)

1. Student reading and learning experience
2. **Teacher dashboard with assignments and progress tracking** ← current
3. Parent portal with exportable reports and push notification click-through
4. School administrator dashboard with analytics
5. School licensing and seat management
6. AI personalisation (after core workflows are proven)
