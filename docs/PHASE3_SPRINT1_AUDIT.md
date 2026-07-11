# Phase 3 Sprint 1 — Design Audit Report

> **Audit date:** 2026-07-01
> **Scope:** All authenticated app pages + 23 shared components
> **Method:** Read-only. No files were modified during this audit.
> **Next step:** Sprint 2 will address Critical and High issues in priority order.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 5     |
| High     | 14    |
| Medium   | 17    |
| Low      | 11    |
| **Total**| **47**|

- Pages audited: 20
- Components audited: 23
- Files with no issues: 7

---

## Issue List

### CRITICAL

Issues that break the theme system — visually wrong output when switching HP ↔ Ocean.

---

#### C-001 — SVG progress ring hardcodes `#16A34A` in DailyAdventureSidebar
- **File:** `components/missions/DailyAdventureSidebar.tsx`
- **Line:** 33
- **Pattern:** `stroke="#16A34A"`
- **Problem:** Progress ring renders green in Ocean theme instead of sky-blue. `--ds-progress-fill` exists for this.
- **Fix:** `stroke="var(--ds-progress-fill)"`

---

#### C-002 — SVG progress ring hardcodes `#16A34A` in TodaysProgressCard
- **File:** `components/profile/TodaysProgressCard.tsx`
- **Line:** 32
- **Pattern:** `stroke="#16A34A"`
- **Problem:** Same as C-001.
- **Fix:** `stroke="var(--ds-progress-fill)"`

---

#### C-003 — Progress bar fills hardcode `bg-green-600` / `bg-green-500` in LanguageJourneyCard
- **File:** `components/parents/LanguageJourneyCard.tsx`
- **Lines:** 41, 62
- **Pattern:** `className="h-full bg-green-600 rounded-full"` and `className="h-full bg-green-500 rounded-full"`
- **Problem:** Both progress bars stay green in Ocean theme.
- **Fix:** `className="h-full bg-ds-progress-fill rounded-full"` (both lines)

---

#### C-004 — MissionShell page background `bg-white` diverges from `bg-gray-50` baseline
- **File:** `components/missions/MissionShell.tsx`
- **Line:** 42
- **Pattern:** `<div className="min-h-screen bg-white flex flex-col">`
- **Problem:** Every other page uses `bg-gray-50`. Mission content shell uses raw white, creating a visible flash on every mission page in HP theme.
- **Fix:** Replace `bg-white` with `bg-ds-page`

---

#### C-005 — MissionCard isolated from design system (`bg-green-500`, `rounded-full` CTA, `animate-bounce`)
- **File:** `components/MissionCard.tsx`
- **Lines:** 26, 36, 80
- **Pattern:** `bg-green-500 animate-bounce` on icon; CTA button uses `rounded-full` instead of `rounded-2xl`; badge hardcodes `bg-green-100 text-green-700`
- **Problem:** Component is completely outside the design system. Verify if it is still in active use before prioritising.
- **Fix:** Icon bg → `bg-ds-action`; CTA `rounded-full` → `rounded-2xl`; remove `animate-bounce`; badge → `cv.badgeStyle.*`

---

### HIGH

Issues that are visually noticeable — wrong radius, wrong colour, wrong component.

---

#### H-001 — Auth pages missing theme provider context (`/loginpage`, `/signuppage`, `/forgot-password`, `/reset-password`)
- **Files:** `app/loginpage/page.tsx`, `app/signuppage/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`
- **Pattern:** Each wraps content in a bare `<div className="min-h-screen bg-gray-50 ...">` — no shell, no theme
- **Problem:** Theme switching elsewhere has no effect on auth pages. They are always HP green. A child with Ocean active sees a jarring style mismatch if they reach auth.
- **Fix:** Create a lightweight `AuthShell` component that provides the theme providers without BottomNavBar or sidebar. Wrap all four pages in it.

---

#### H-002 — Nested `AppShell` — `MissionShell` wraps its own `AppShell` internally
- **File:** `components/missions/MissionShell.tsx`
- **Line:** 41
- **Pattern:** `MissionShell` renders `<AppShell>` internally; `app/missions/[category]/page.tsx` renders `<MissionShell>` directly
- **Problem:** Double `AppShell` wrapping — the shell initialises twice, BottomNavBar likely renders twice on mobile.
- **Fix:** Remove `<AppShell>` from inside `MissionShell.tsx`. Let `app/missions/[category]/page.tsx` own the shell at the page level.

---

#### H-003 — Parents page cards use `rounded-[20px]` instead of design system `rounded-3xl`
- **File:** `app/parents/page.tsx`
- **Lines:** 123, 191, 202, 268, 311, 353, 446 (7 occurrences)
- **Pattern:** `rounded-[20px]`
- **Problem:** HP baseline is `rounded-3xl` (24px). Parents page uses 20px throughout — visually shorter radius than the rest of the app.
- **Fix:** Replace all `rounded-[20px]` with `rounded-3xl`

---

#### H-004 — Story library cards use `rounded-[20px]`
- **File:** `app/stories/page.tsx`
- **Lines:** 213, 262
- **Pattern:** `rounded-[20px]`
- **Problem:** Same as H-003.
- **Fix:** Replace `rounded-[20px]` with `rounded-3xl`

---

#### H-005 — Primary buttons bypass `MagicButton` across auth and content pages
- **Files:** `app/loginpage/page.tsx:154`, `app/signuppage/page.tsx:215`, `app/forgot-password/page.tsx:122`, `app/reset-password/page.tsx:153`, `app/certificates/page.tsx:64,82`, `app/missions/page.tsx:61`, `app/parents/page.tsx:83`, `components/shop/ShopItemCard.tsx:44`
- **Pattern:** `bg-green-600 hover:bg-green-700 text-white ... rounded-2xl` raw inline
- **Problem:** HP `cv.buttonStyle.primary` is a gradient (`from-green-500 to-emerald-600`). Flat `bg-green-600` looks duller and ignores Ocean theme entirely.
- **Fix:** Replace each with `<MagicButton variant="primary">` or apply `${cv.buttonStyle.primary} ${cv.buttonStyle.radius}` class strings

---

#### H-006 — `DailyAdventureGrid` activity start button uses `rounded-full` (chip radius) instead of button radius
- **File:** `components/missions/DailyAdventureGrid.tsx`
- **Line:** 52
- **Pattern:** `rounded-full` on the "Start" CTA div
- **Problem:** `rounded-full` is reserved for chips/pills per `cv.chipStyle.radius`. Button CTAs must use `cv.buttonStyle.radius` (`rounded-2xl`).
- **Fix:** Change `rounded-full` to `rounded-xl` or `rounded-2xl`

---

#### H-007 — WhatsNext "START NOW" button hardcodes `bg-green-600`, `rounded-full`, `text-[9px]`
- **File:** `components/home/WhatsNext.tsx`
- **Line:** 50
- **Pattern:** `<div className="bg-green-600 text-white text-[9px] font-black rounded-full py-1.5 ...">▶ START NOW</div>`
- **Problem:** Three violations in one element: hardcoded green, chip radius on a CTA, sub-10px font size.
- **Fix:** `bg-ds-action text-ds-text-inverse rounded-xl text-[10px]`

---

#### H-008 — ShopBanner, StatsSidebar, DailyAdventureSidebar accent blocks use raw `bg-green-600`
- **Files:** `components/shop/ShopBanner.tsx:33`, `components/home/StatsSidebar.tsx:83`, `components/missions/DailyAdventureSidebar.tsx:69`
- **Pattern:** `bg-green-600 rounded-2xl` colored CTA/accent block
- **Problem:** Ocean theme should render these in sky-600. They remain green.
- **Fix:** Replace `bg-green-600` with `bg-ds-action` (resolves to `var(--ds-brand-primary)`)

---

#### H-009 — Talk-to-Nimi chat header and send button hardcode `bg-green-600`
- **File:** `app/talk-to-nimi/page.tsx`
- **Lines:** 192, 295
- **Pattern:** Chat header `bg-green-600`, send button `bg-green-600 hover:bg-green-700`
- **Problem:** High-visibility persistent UI elements that break theme switching.
- **Fix:** Both → `bg-ds-action`; send button hover → `hover:opacity-90`

---

#### H-010 — 17 unique one-off shadow values — none map to design system tokens
- **Files:** Multiple
- **Pattern (from grep):** `shadow-[0_0_12px_rgba(249,115,22,0.5)]`, `shadow-[0_6px_24px_rgba(34,197,94,0.35)]`, `shadow-[0_4px_24px_rgba(245,158,11,0.3)]`, `shadow-[0_0_30px_rgba(59,130,246,0.3)]`, 13 more
- **Problem:** Design system defines 4 shadow tokens: `shadow-ds-card`, `shadow-ds-nav`, `shadow-ds-hover`, `shadow-ds-cta`. None of the 17 custom shadows are used.
- **Fix:** Structural shadows → `shadow-ds-card` / `shadow-ds-hover`. Decorative image glows (trophy, badge) may remain as one-offs.

---

#### H-011 — Community gallery cards use hardcoded `rounded-[24px]` instead of design token
- **File:** `app/community/page.tsx`
- **Line:** 174
- **Pattern:** `rounded-[24px]`
- **Problem:** Hardcoded pixel value instead of `cv.cardStyle.radius`. Ocean variant should be `rounded-[28px]`.
- **Fix:** Wrap in `<MagicCard>` or replace with `${cv.cardStyle.radius}`

---

#### H-012 — Pricing page payment modal hardcodes dialog bottom-sheet radius
- **File:** `app/pricing/page.tsx`
- **Line:** 397
- **Pattern:** `rounded-t-[32px] sm:rounded-[28px]`
- **Problem:** `sm:rounded-[28px]` is the Ocean variant. HP should be `sm:rounded-3xl`. `cv.dialogStyle.containerRadius` already encodes the correct per-theme responsive value.
- **Fix:** Replace `rounded-t-[32px] sm:rounded-[28px]` with `${cv.dialogStyle.containerRadius}`

---

#### H-013 — Community report modal hardcodes dialog bottom-sheet radius
- **File:** `app/community/page.tsx`
- **Line:** 258
- **Pattern:** `rounded-t-[32px] sm:rounded-[28px]`
- **Problem:** Same as H-012.
- **Fix:** Replace `rounded-t-[32px] sm:rounded-[28px]` with `${cv.dialogStyle.containerRadius}`

---

#### H-014 — Settings theme picker card uses hardcoded `rounded-[24px]`
- **File:** `app/settings/page.tsx`
- **Line:** 23
- **Pattern:** `rounded-[24px]`
- **Problem:** Should derive from `cv.panelStyle.radius` or `cv.cardStyle.radius`.
- **Fix:** Replace with `rounded-3xl` (card context) or `rounded-2xl` (panel context)

---

### MEDIUM

Issues that affect polish and consistency but do not break functionality.

---

#### M-001 — 976 instances of px-based font sizes instead of Tailwind typographic scale
- **Files:** Codebase-wide
- **Pattern:** `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[14px]`, `text-[16px]`, `text-[18px]`
- **Problem:** Arbitrary px sizes bypass Tailwind's paired line-heights and responsive type scale.
- **Mapping:**
  - `text-[12px]` (144 uses) → `text-xs`
  - `text-[14px]` (98 uses) → `text-sm`
  - `text-[16px]` (58 uses) → `text-base`
  - `text-[18px]` (38 uses) → `text-lg`
  - `text-[10px]` (234 uses) → add `text-2xs` utility (see fix)
  - `text-[9px]`, `text-[11px]`, `text-[13px]` → round up to nearest scale step
- **Fix:** Add to `globals.css`:
  ```css
  @layer utilities {
    .text-2xs { font-size: 0.625rem; line-height: 0.875rem; }
  }
  ```
  Then migrate `text-[12px]` → `text-xs`, `text-[14px]` → `text-sm`, etc. across the codebase.

---

#### M-002 — Typography weight inconsistency on card titles and labels
- **Files:** Multiple
- **Pattern:** Card titles mix `font-bold`, `font-semibold`, `font-black` with no documented rule
- **Examples:**
  - `GalleryCard.tsx:73` — `font-black` for card title
  - `LanguageJourneyCard.tsx:33` — `font-bold` for secondary text
  - `DailyAdventureSidebar.tsx:47` — `font-black` for label
  - `StatsSidebar.tsx:33` — `font-black` for section header
- **Fix:** Establish and document: section titles = `font-black`, card content titles = `font-semibold`, labels/captions = `font-bold`

---

#### M-003 — Icon sizing inconsistency across interactive controls
- **Files:** Multiple
- **Pattern:**
  - BottomNavBar icons: `w-[22px] h-[22px]`
  - MissionShell back/action icons: `w-4 h-4`
  - TalkToNimi send/mic icons: `w-4 h-4`
- **Problem:** Primary nav icons are 22px; primary action button icons are 16px. Both are top-level controls with no documented size rule.
- **Fix:** Standardise: nav icons → `w-5 h-5` (20px); icons inside `h-9`/`h-10` buttons → `w-4 h-4`; icons inside `h-12` buttons → `w-5 h-5`

---

#### M-004 — Card padding inconsistency: `p-3`, `p-4`, `p-5`, `p-6` used with no documented rule
- **Files:** Multiple
- **Pattern:**
  - `ShopItemCard.tsx:34` — `p-3`
  - `WhatsNext.tsx:24`, `StatsSidebar.tsx:31` — `p-4`
  - `parents/page.tsx:202`, `parents/page.tsx:446` — `p-5`
  - `DailyAdventureBanner.tsx:29` — `p-4 sm:p-6`
- **Fix:** Document and apply: small list-item card = `p-3`; standard card = `p-4`; featured/primary card = `p-6`

---

#### M-005 — Home page section spacing inconsistent (`mb-6`, `mt-4`, `mt-5`, `space-y-4` mixed)
- **File:** `app/page.tsx`
- **Lines:** 133, 141, 155, 164
- **Problem:** Three different margin values for section separation with no rhythm.
- **Fix:** Standardise vertical section gaps to `mt-6` throughout the page

---

#### M-006 — Pages use `bg-gray-50` directly instead of `bg-ds-page`
- **Files:** `app/page.tsx:125`, `app/missions/page.tsx:71`, `app/parents/page.tsx:101`, `app/community/page.tsx:110`, `app/talk-to-nimi/page.tsx:157`, `app/help/page.tsx:13`
- **Problem:** Ocean theme defines `surface.page = #F0F9FF` (sky-50). Hardcoded `bg-gray-50` renders the wrong background in Ocean.
- **Fix:** Replace `bg-gray-50` with `bg-ds-page` on all page root divs

---

#### M-007 — `text-gray-500` used as secondary text instead of `text-ds-muted`
- **Files:** `app/page.tsx:137`, `app/stories/page.tsx:117`, `app/community/page.tsx:121`, `app/parents/page.tsx:111`, `components/missions/DailyAdventureBanner.tsx:85`, and ~50 more
- **Problem:** Ocean theme `text.secondary = #475569` (slate-600), not `#6B7280` (gray-500). Hardcoded class ignores the token.
- **Fix:** Replace `text-gray-500` with `text-ds-muted` in subtitle/caption contexts

---

#### M-008 — Home page greeting uses arbitrary px font sizes instead of Tailwind scale
- **File:** `app/page.tsx`
- **Lines:** 134–135
- **Pattern:** `text-[36px] sm:text-[42px] lg:text-[48px]` for h1; `text-[14px] sm:text-[16px]` for subtitle
- **Fix:** `text-4xl sm:text-5xl lg:text-6xl` for h1; `text-sm sm:text-base` for subtitle

---

#### M-009 — Treasure page badge cards use `border-[3px]` (non-standard width)
- **File:** `app/treasure/page.tsx`
- **Line:** 108
- **Pattern:** `border-[3px]`
- **Problem:** Tailwind has `border-2` (2px) and `border-4` (4px). `border-[3px]` is arbitrary.
- **Fix:** Standardise to `border-2` (matches HP `badgeStyle.border` = `border-2 border-yellow-300`)

---

#### M-010 — Story continue hero card uses hardcoded `rounded-[24px]`
- **File:** `app/stories/page.tsx`
- **Line:** 131
- **Pattern:** `rounded-[24px]`
- **Fix:** Replace with `${cv.cardStyle.radius}` from `getComponentVariant(themeId)`

---

#### M-011 — CertificatePanel uses Shadcn `<Button>` with `rounded-full h-9` overrides instead of MagicButton
- **File:** `components/home/CertificatePanel.tsx`
- **Lines:** 162, 293, 302
- **Pattern:** `<Button className="w-full bg-green-600 hover:bg-green-700 text-white font-black rounded-full text-xs h-9 ...">` — 3 instances
- **Problem:** Mixes Shadcn button primitives with manual overrides. `rounded-full` violates button radius rule; `h-9` is a fixed height.
- **Fix:** Replace all three with `<MagicButton variant="primary" size="sm">` and remove className overrides

---

#### M-012 — BottomNavBar container uses arbitrary `rounded-t-[22px]`
- **File:** `components/home/BottomNavBar.tsx`
- **Line:** 54
- **Pattern:** `rounded-t-[22px]`
- **Problem:** 22px exists in no design system token. Nearest design system values are 24px (`rounded-3xl`) or 32px (`rounded-t-[32px]`).
- **Fix:** Replace with `rounded-t-[28px]` (between panel and dialog) or `rounded-t-3xl`

---

#### M-013 — Inconsistent max-width containers across pages (6 different values)
- **Files:** Multiple pages
- **Pattern:**
  - `app/page.tsx:126` — `max-w-6xl`
  - `app/missions/page.tsx:72` — `max-w-7xl`
  - `app/stories/page.tsx:107` — `max-w-5xl`
  - `app/community/page.tsx:111` — `max-w-3xl`
  - `app/talk-to-nimi/page.tsx:158` — `max-w-7xl`
  - `app/pricing/page.tsx:65` — `max-w-4xl`
- **Fix:** Document: single-column content = `max-w-3xl`; standard = `max-w-5xl`; wide dashboard = `max-w-6xl`; full-width = `max-w-7xl`. Apply consistently.

---

#### M-014 — Story pagination active state uses `bg-green-500` instead of `bg-ds-action`
- **File:** `app/stories/page.tsx`
- **Line:** 303
- **Pattern:** `bg-green-500` on active pagination dot
- **Fix:** Replace `bg-green-500` with `bg-ds-action`

---

#### M-015 — Home page greeting hardcodes `text-green-600` on child name
- **File:** `app/page.tsx`
- **Line:** 135
- **Pattern:** `<span className="text-green-600">{activeChild.name}</span>`
- **Fix:** Replace `text-green-600` with `text-ds-brand`

---

#### M-016 — Auth pages hardcode `text-green-600` on brand links and highlights
- **Files:** `app/loginpage/page.tsx:69,164`, `app/signuppage/page.tsx:87,115,222`
- **Pattern:** `<span className="text-green-600">`, `<Link className="text-green-600 font-bold">`
- **Fix:** Replace `text-green-600` with `text-ds-brand`

---

#### M-017 — Story detail page uses `pb-28` where all other pages use `pb-24`
- **File:** `app/stories/[slug]/page.tsx`
- **Line:** 303
- **Pattern:** `pb-28` (112px)
- **Problem:** Standard is `pb-24` (96px) — gives ~26px clear of BottomNavBar. `pb-28` adds unnecessary empty space.
- **Fix:** Standardise to `pb-24`

---

### LOW

Minor polish — no user-facing breakage.

---

#### L-001 — MagicCard applies KidTheme `borderColor` via inline style — potential specificity conflict with `globals.css`
- **File:** `components/magic/MagicCard.tsx`
- **Lines:** 43–44
- **Problem:** `style={{ borderColor: theme.border }}` may conflict with global `* { @apply border-border }`.
- **Fix:** Prefer `theme-border` CSS utility class over inline `borderColor`

---

#### L-002 — MagicButton size `sm` uses `rounded-xl` instead of `rounded-2xl`
- **File:** `components/magic/MagicButton.tsx`
- **Line:** 19
- **Pattern:** `sm: "px-4 py-2 text-[12px] rounded-xl"`
- **Fix:** Change to `"px-4 py-2 text-xs rounded-2xl"`

---

#### L-003 — MagicButton SIZES use px font sizes instead of Tailwind scale
- **File:** `components/magic/MagicButton.tsx`
- **Lines:** 19–21
- **Pattern:** `text-[12px]`, `text-[14px]`, `text-[16px]`
- **Fix:** `sm: text-xs`, `md: text-sm`, `lg: text-base`

---

#### L-004 — MissionShell interior reward box uses `rounded-xl` (minor)
- **File:** `components/missions/MissionShell.tsx`
- **Line:** 99
- **Pattern:** `rounded-xl` on an inset content box inside a `rounded-2xl` panel
- **Problem:** Acceptable nesting but undocumented. Inner radius should be visually smaller than container.
- **Fix:** Keep as `rounded-xl` or change to `rounded-lg`. No urgency.

---

#### L-005 — `app/talk-to-nimi/page.tsx` root div uses `bg-gray-50` — covered by M-006
- **File:** `app/talk-to-nimi/page.tsx`
- **Line:** 157
- **Fix:** See M-006

---

#### L-006 — Community page builds its own card inline instead of reusing `GalleryCard`
- **Files:** `components/community/GalleryCard.tsx`, `app/community/page.tsx:174`
- **Problem:** Two separate card implementations for the same domain. Creates two maintenance targets.
- **Fix:** Refactor `community/page.tsx` to render `<GalleryCard>` or `<MagicCard>` instead of an inline card

---

#### L-007 — Parents tip cards use hardcoded `bg-blue-50 border-blue-200` color data in config array
- **File:** `app/parents/page.tsx`
- **Lines:** 360–366
- **Pattern:** `{ bg: "bg-blue-50", border: "border-blue-200" }` per tip
- **Fix:** Replace per-tip colors with `bg-ds-action-subtle border-ds-border` for theme-agnostic rendering

---

#### L-008 — `MissionCard` uses `animate-bounce` causing continuous GPU load
- **File:** `components/MissionCard.tsx`
- **Line:** 26
- **Fix:** Remove `animate-bounce`; use Framer Motion `whileHover={{ y: -4 }}` on the card wrapper instead

---

#### L-009 — Several interactive cards missing `transition` class
- **Files:** Multiple (spot-check)
- **Problem:** Hover/state changes on some cards happen without animation.
- **Fix:** Add `transition-all` to interactive card wrappers lacking it

---

#### L-010 — Community `GalleryCard` and `LanguageJourneyCard` are otherwise clean — no additional issues
- No action required beyond C-003 (progress bar) and L-006 (community duplication)

---

#### L-011 — Pricing page uses `text-[40px]` for price display
- **File:** `app/pricing/page.tsx`
- **Lines:** 129, 192
- **Fix:** Replace `text-[40px]` with `text-4xl`

---

## Systemic Patterns

These recur across many files. Fixing them systematically will close many individual issues at once.

### P-1 — 976 instances of px-based font sizes
Every px size from `text-[7px]` to `text-[24px]` is present. The entire codebase bypasses the Tailwind typographic scale. A single global find-and-replace pass for the common values (`text-[12px]`→`text-xs`, `text-[14px]`→`text-sm`, `text-[16px]`→`text-base`, `text-[18px]`→`text-lg`) would clear ~540 of 976 instances. The remaining sub-12px labels need the `text-2xs` custom utility.

### P-2 — `bg-green-600` as primary action colour in 30+ locations
The pattern `bg-green-600 hover:bg-green-700 text-white` appears as a manual primary button implementation throughout auth flows, banners, modals, and CTAs. Replacing with `bg-ds-action` or `<MagicButton variant="primary">` fixes all simultaneously and makes Ocean theme work everywhere.

### P-3 — 28 instances of `rounded-[20px]`
This value exists nowhere in the design system. It is a "third radius" sitting between `rounded-xl` (12px) and `rounded-3xl` (24px). Every occurrence is an ad-hoc card on parents, stories, or challenges pages. All should be `rounded-3xl`.

### P-4 — 13 instances of hardcoded `rounded-[24px]`
These are the correct HP pixel equivalent of `rounded-3xl`, but are hardcoded rather than derived from the token. In Ocean theme they render 24px instead of the correct 28px. Replace with `${cv.cardStyle.radius}`.

### P-5 — `text-gray-500` for secondary text in 50+ locations
`--ds-text-secondary` is `#6B7280` (gray-500) in HP but `#475569` (slate-600) in Ocean. The 50+ hardcoded `text-gray-500` instances will display the wrong shade in Ocean. Replace with `text-ds-muted`.

### P-6 — Primary buttons bypass `MagicButton` in auth flows and empty states
Auth pages and inline empty-state CTAs consistently re-implement the primary button as `bg-green-600 hover:bg-green-700 rounded-2xl text-white` — the HP design without the gradient. Using `<MagicButton variant="primary">` everywhere eliminates this.

### P-7 — Dialog bottom-sheet radius hardcoded as `rounded-t-[32px] sm:rounded-[28px]` in 2+ places
`cv.dialogStyle.containerRadius` already encodes the correct per-theme responsive value. The two places it is hardcoded will show the Ocean radius in HP when the user eventually switches.

---

## Files With No Issues

| File | Notes |
|------|-------|
| `components/home/DashboardHero.tsx` | Clean — uses `var(--ds-brand-primary)` inline, `shadow-ds-card`, all DS tokens. Fixed this sprint. |
| `components/home/BottomNavBar.tsx` | Mostly clean — all nav colours use `cv.navigationStyle.*`. Minor radius (M-012) and one custom shadow (H-010). |
| `components/magic/MagicButton.tsx` | Correct core logic. Minor `sm` radius and px font sizes only (L-002, L-003). |
| `components/home/NimiEncouragement.tsx` | Clean — uses `cv.backgroundStyle`, `cv.backgroundStyle.accentBorder`, `cv.cardStyle.radius`, `shadow-ds-card`. |
| `components/community/GalleryHeader.tsx` | Clean — uses `bg-ds-input`, `border-ds-border`. |
| `app/help/page.tsx` | Clean — structurally correct, only inherits M-006 `bg-gray-50`. |
| `app/certificates/page.tsx` | Structurally clean — delegates UI to sub-components. Inherits H-005 from sub-component CTAs. |

---

## Recommended Sprint 2 Priority Order

Based on severity and blast radius:

1. **C-001, C-002, C-003** — SVG stroke + progress bar tokens (3 files, 4 lines, highest visual impact per line of code)
2. **C-004** — MissionShell white background (affects every mission page)
3. **H-002** — Nested AppShell (potential runtime bug, not just visual)
4. **H-005 + H-008 + H-009** — `bg-green-600` primary button/accent sweep (auth pages, banners, chat — fixes P-2 pattern at scale)
5. **H-003, H-004, P-3** — `rounded-[20px]` sweep (parents + stories — 28 instances, one find-replace)
6. **M-006** — `bg-gray-50` → `bg-ds-page` on page roots (6 files, 1 line each)
7. **H-012, H-013** — Dialog bottom-sheet radius (2 files, P-7 pattern)
8. **M-001 / P-1** — Font size migration (largest count — batch as a dedicated pass)
