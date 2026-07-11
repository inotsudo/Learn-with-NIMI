# NIMIPIKO Design System — Phase 2 Regression Checklist

> **Purpose:** Run this checklist whenever you add a new theme, migrate a component,
> or touch `AppThemeProvider`. Every item that was green when the checklist was
> written must stay green. New items must be added before a feature ships.
>
> **Last verified:** 2026-07-01 (Sprints 4–8 complete, HP + Ocean installed)
>
> **Legend:** ✅ Pass · ⚠️ Partial · ❌ Fail · 🔲 Not yet run this cycle

---

## Part A — Per-theme verification (run once per theme added or changed)

When adding or modifying any theme, work through this section for **every installed theme**.
Mark the theme name in the header so you know which run this covers.

```
Theme under test: _______________   Date: _______________   Tester: _______________
```

---

### A1 — Persistence

| # | Check | Status |
|---|-------|--------|
| A1.1 | Switch to this theme. Refresh the browser. Theme is still active. | ✅ |
| A1.2 | Navigate between 5+ pages (Home → Missions → Stories → Shop → Settings). Theme does not reset. | ✅ |
| A1.3 | Close the browser tab. Open a new tab. Theme is restored from `localStorage`. | ✅ |
| A1.4 | Open DevTools → Application → Local Storage → confirm `nimipiko_app_theme` is set to the correct ID. | ✅ |

**How it works:** `AppThemeProvider` writes to `localStorage` on every `setThemeId` call and reads
on mount. Any new theme whose ID is in `APP_THEMES` is restored correctly.

---

### A2 — Runtime switching (no reload)

| # | Check | Status |
|---|-------|--------|
| A2.1 | Switch themes 5 times in rapid succession. No white flash between switches. | ✅ |
| A2.2 | Open React DevTools Profiler while switching. `AppThemeProvider` re-renders once per switch. No child component remounts. | ✅ |
| A2.3 | Switch theme while a modal is open. Modal stays open; only visual style updates. | ✅ |
| A2.4 | Switch theme while a video/audio is playing. Playback is not interrupted. | ✅ |

**How it works:** `setThemeId` updates two `useState` values. `applyThemeVars` writes directly to
`document.documentElement.style` — pure DOM writes, no React remount.

---

### A3 — Semantic tokens update on switch

| # | Check | Status |
|---|-------|--------|
| A3.1 | Switch theme. Open DevTools → Elements → `<html>`. Confirm `--ds-brand-primary` changes. | ✅ |
| A3.2 | Confirm `--ds-surface-card`, `--ds-text-primary`, `--ds-surface-page` all change. | ✅ |
| A3.3 | Confirm `--ds-nav-active-bg`, `--ds-nav-active-text`, `--ds-progress-fill` all change. | ✅ |
| A3.4 | Grep `components/` for `color:#16A34A` or `bg-green-600` in **shared layout components**. Zero results. | ✅ |
| A3.5 | Grep `components/` for `color:#16A34A` or `bg-green-600` in **feature components** (missions, modals, banners). | ⚠️ **73 instances remain in 48 files — Sprint 9 target** |

> ⚠️ **Known gap (A3.5):** Sprint 6 migrated the shared layout shell. Feature-specific
> components (`SingAlongContent`, `ColoringStudio`, `DailyAdventureBanner`, modal headers,
> shop banners, etc.) still use hardcoded `bg-green-600`. These are functional but will not
> respond to App Theme switching. Tracked in `docs/backlog.md` as Sprint 9.

**Shared components confirmed clean (Sprint 6):**
`MagicCard` · `MagicDialog` · `MagicButton` · `BottomNavBar` · `SidebarNavItem` ·
`LanguageSwitchDialog` · `NotificationPanel` · `CelebrationModal` · `NimiEncouragement` ·
`LogoutModal` · `QuickReplyChips` · `AppShell` · `DashboardHero`

---

### A4 — Theme assets swap correctly

| # | Check | Status |
|---|-------|--------|
| A4.1 | Switch theme on the Home page. Hero image changes (or shows placeholder if artwork is pending). | ⚠️ Ocean artwork files not yet on disk — placeholders expected |
| A4.2 | Switch theme on `/community`. Community header image updates. | ⚠️ Ocean artwork files not yet on disk |
| A4.3 | Mascot avatars (`nimiCircle`, `pikoCircle`) resolve without 404 for both themes. | ✅ Both themes share the same mascot files |
| A4.4 | Auth page Nimi illustration resolves for both themes. | ✅ |
| A4.5 | No `<Image>` component in `app/` or `components/` builds paths with string concatenation. All use `getThemeAssets(themeId)`. | ✅ Sprint 4 Phase 2 complete |
| A4.6 | Disabling `/themes/<id>/` folder in the server. App does not crash — falls back to HP assets. | ✅ `getThemeAssets` falls back to `assetRegistry.hp` for unknown IDs |

> ⚠️ **Known gap (A4.1, A4.2):** Ocean theme has correct asset paths in the registry but the
> actual `.png` files are not yet delivered to `/public/themes/ocean/`. Add artwork to unblock.

---

### A5 — Component variants differ between themes

| # | Check | Status |
|---|-------|--------|
| A5.1 | Card `border-radius` visibly differs between HP (`rounded-3xl`) and Ocean (`rounded-[28px]`). | ✅ |
| A5.2 | Card `box-shadow` color differs (warm gold tint vs cool blue tint). | ✅ |
| A5.3 | Primary button gradient differs (green→emerald vs cyan→sky). | ✅ |
| A5.4 | Bottom nav bar active item background differs (green-50 vs sky-50). | ✅ |
| A5.5 | Modal overlay differs (black/50 blur vs sky-900/30 blur). | ✅ |
| A5.6 | Dialog container border-radius differs (`rounded-3xl` vs `rounded-[28px]`). | ✅ |
| A5.7 | No `if (themeId === "hp")` branch exists inside any UI component. Grep confirms zero results. | ✅ |

---

### A6 — Decorative effects are theme-specific

| # | Check | Status |
|---|-------|--------|
| A6.1 | HP — `FloatingParticles` renders gold/green sparkle shapes (`✦ ★ ✶ ✧`) in `DashboardHero`. | ✅ Wired 2026-07-01 |
| A6.2 | Ocean — `FloatingParticles` renders bubble shapes (`○ ◦ ∘ °`) in `DashboardHero`. | ✅ Wired 2026-07-01 |
| A6.3 | HP — `HeroDecoration` renders scale+rotate sparkles behind hero content. | ✅ Wired 2026-07-01 |
| A6.4 | Ocean — `HeroDecoration` renders diagonal translucent light rays. | ✅ Wired 2026-07-01 |
| A6.5 | `ThemeBackground` gradient mesh is visible behind page content in AppShell. | ✅ Wired 2026-07-01 |
| A6.6 | `DecorativeOverlay` inset glow renders inside `DashboardHero` card. | ✅ Wired 2026-07-01 |
| A6.7 | Switch themes — old effects disappear, new effects appear without page reload. | ✅ |
| A6.8 | Enable "Reduce Motion" in OS accessibility settings. All particle/sparkle/ray animations stop. Cards and layout are unaffected. | ✅ `@media (prefers-reduced-motion)` in all effect components |

---

### A7 — No theme branches in UI components

| # | Check | Status |
|---|-------|--------|
| A7.1 | `grep -r 'if.*themeId.*==\|themeId.*===' components/` returns zero results inside render functions. | ✅ |
| A7.2 | `grep -r 'if.*theme.*hp\|if.*theme.*ocean' components/` returns zero results. | ✅ |
| A7.3 | Every component that reads theme data calls `getComponentVariant(themeId)` or `getThemeAssets(themeId)` or `getThemeEffects(themeId)` — never accesses theme state directly for visual decisions. | ✅ |

---

### A8 — Asset registry fails gracefully

| # | Check | Status |
|---|-------|--------|
| A8.1 | Temporarily rename `/public/themes/ocean/` to `_ocean_bak/`. Switch to Ocean. App does not crash or throw. | ✅ `next/image` shows broken placeholder; no JS error |
| A8.2 | Pass an unknown theme ID string to `getThemeAssets("nonexistent")`. Returns HP assets, not undefined. | ✅ `?? assetRegistry.hp` fallback |
| A8.3 | Pass an unknown theme ID to `getComponentVariant`. Returns HP variant, not undefined. | ✅ `?? hpVariant` fallback |
| A8.4 | Pass an unknown theme ID to `getThemeEffects`. Returns HP effects, not undefined. | ✅ `?? hpEffects` fallback |

---

### A9 — New theme requires only config files (the extensibility test)

| # | Check | Status |
|---|-------|--------|
| A9.1 | Add new `AppThemeId` string to union in `theme.ts`. | Must do — 1 line |
| A9.2 | Add `Theme` token object and register in `APP_THEMES` in `theme.ts`. | Must do — config only |
| A9.3 | Add asset entry in `assetRegistry.ts`. | Must do — config only |
| A9.4 | Add `ComponentVariant` object in `componentVariants.ts`. | Must do — config only |
| A9.5 | Add `ThemeEffects` object in `themeEffects.ts`. | Must do — config only |
| A9.6 | Add `ThemeMetadata` entry in `themeMetadata.ts`. | Must do — config only |
| A9.7 | **Zero page files edited.** `app/page.tsx`, `app/missions/page.tsx`, `app/stories/[slug]/page.tsx`, etc. untouched. | ✅ Architecture verified |
| A9.8 | **Zero business logic edited.** `lib/queries.ts`, auth, DB schemas untouched. | ✅ Architecture verified |
| A9.9 | New theme appears in `ThemeGallery` automatically via `getAllThemes()`. | ✅ |
| A9.10 | New theme appears in `ThemeSwitcher` if `isInstalled: true`. | ✅ |
| A9.11 | Preview mode works for new theme — `startPreview(id)` + `cancelPreview()` + `applyPreview()` all function correctly. | ✅ |
| A9.12 | `tsc --noEmit` passes after adding new theme. | Must verify each time |

---

### A10 — App Theme and Child Theme are independent

| # | Check | Status |
|---|-------|--------|
| A10.1 | Switch App Theme. Active child's avatar, name, and progress stats do not change. | ✅ |
| A10.2 | Switch App Theme. Child's preferred KidTheme (galaxy, ocean, etc.) does not reset. | ✅ |
| A10.3 | Switch active child. App chrome (nav bar, card radius, page background, hero images) reflects App Theme, not the child's KidTheme. | ✅ |
| A10.4 | When no child is active, `KidThemeProvider` does NOT override `--ds-*` vars. `AppThemeProvider` owns them. | ✅ `if (!activeChildId) return` guard in `ThemeProvider.tsx:87` |
| A10.5 | When a child IS active, `KidThemeProvider` overrides `--ds-*` CSS vars with kid-specific colors. App Theme Tailwind class variants (`cardStyle.radius`, `navigationStyle.background`, etc.) remain App-level. | ✅ |
| A10.6 | `--theme-accent`, `--theme-bg`, `--theme-card` (KidTheme vars) are distinct from `--ds-brand-primary`, `--ds-surface-page`, `--ds-surface-card` (AppTheme vars). No namespace collision. | ✅ |

---

### A11 — Performance: no memory leak or remount storm

| # | Check | Status |
|---|-------|--------|
| A11.1 | Open Chrome Performance tab → Record → switch themes 20 times → Stop. JS heap does not trend upward. | ✅ `applyThemeVars` is pure DOM writes; no closures retained |
| A11.2 | React DevTools Profiler: each theme switch causes one `AppThemeProvider` render commit. No sibling provider remounts. | ✅ Single context, two state vars |
| A11.3 | `FloatingParticles` instances do not accumulate. Each instance owns a single scoped CSS keyframe injected via `dangerouslySetInnerHTML`. | ✅ `useId()` ensures unique keyframe names per instance |
| A11.4 | Effect components (`FloatingParticles`, `HeroDecoration`, `ThemeBackground`) do not start new animation timers on App Theme switch — CSS animations are stateless and re-use the keyframe from the updated `<style>` tag. | ✅ |

---

### A12 — Lighthouse scores stable after theme switch

| # | Check | Status |
|---|-------|--------|
| A12.1 | Run Lighthouse on HP. Record Accessibility score. | 🔲 Run manually |
| A12.2 | Switch to Ocean. Run Lighthouse. Accessibility score is within 2 points of HP baseline. | 🔲 Run manually |
| A12.3 | Performance score does not drop by more than 3 points after theme switch. | 🔲 Run manually |
| A12.4 | No new Lighthouse warnings introduced by effect components (`FloatingParticles`, `ThemeBackground`, etc.) — all are `aria-hidden`, `pointer-events-none`. | ✅ Verified in code |
| A12.5 | Color contrast: active nav items, button text, card headings pass WCAG AA in both themes. | 🔲 Run manually with axe DevTools |

---

## Part B — Architecture invariants (run on every PR that touches the design system)

These are code-level checks that do not require a browser. Run them in CI or before merging.

```bash
# B1 — TypeScript passes
npx tsc --noEmit

# B2 — No if(theme) branch in UI components
grep -rn "if.*themeId.*==\|if.*theme.*hp\|if.*theme.*ocean" components/ --include="*.tsx" \
  | grep -v "admin/" | grep -v "// "

# B3 — No hardcoded HP brand colors in shared layout components
grep -rn "#16a34a\|#16A34A\|#15803d\|#15803D" \
  components/layout/ components/magic/ components/home/DashboardHero.tsx \
  --include="*.tsx"

# B4 — Every getThemeAssets caller uses the hook result, not a string literal
grep -rn 'getThemeAssets("hp")\|getThemeAssets("ocean")' components/ app/ --include="*.tsx"

# B5 — No direct import of hpVariant or oceanVariant outside componentVariants.ts
grep -rn "hpVariant\|oceanVariant" components/ app/ --include="*.tsx"

# B6 — No direct import of hpEffects or oceanEffects outside themeEffects.ts
grep -rn "hpEffects\|oceanEffects" components/ app/ --include="*.tsx"
```

All six commands must return **zero lines** for a clean build.

---

## Part C — "Adding a new theme" step-by-step (the canonical procedure)

Follow these steps in order. Check off each one. Run Part B commands after step 6.

- [ ] **C1.** Add `"<id>"` to `AppThemeId` union in `lib/design-system/theme.ts`
- [ ] **C2.** Add a `Theme` token object and register it in `APP_THEMES` in the same file
- [ ] **C3.** Add an asset entry in `lib/design-system/assetRegistry.ts` (use HP paths as placeholders if artwork is pending)
- [ ] **C4.** Add a `ComponentVariant` object and register in `COMPONENT_VARIANTS` in `lib/design-system/componentVariants.ts`
- [ ] **C5.** Add a `ThemeEffects` object and register in `THEME_EFFECTS` in `lib/design-system/themeEffects.ts`
- [ ] **C6.** Add a `ThemeMetadata` entry in `lib/design-system/themeMetadata.ts` (set `isInstalled: false` if artwork is pending, `comingSoon: true`)
- [ ] **C7.** Run `npx tsc --noEmit` — zero errors
- [ ] **C8.** Run all six Part B shell commands — zero lines output
- [ ] **C9.** Open the app locally. Switch to the new theme. Verify CSS vars updated in DevTools.
- [ ] **C10.** Run Part A checklist for the new theme (mark baseline as the date of addition)
- [ ] **C11.** Set `isInstalled: true` in metadata when final artwork lands in `/public/themes/<id>/`
- [ ] **C12.** Update `lastVerified` date at the top of this document

---

## Appendix — Current theme registry

| ID | Name | Installed | Status | Art ready |
|----|------|-----------|--------|-----------|
| `hp` | Happy Place | ✅ | Current default | ✅ |
| `ocean` | Ocean Dream | ✅ | Installed, selectable | ⚠️ Placeholder paths |
| `galactic` | Galactic Explorer | ❌ | Coming soon — Premium | ❌ |
| `forest_magic` | Forest Magic | ❌ | Coming soon — 500⭐ | ❌ |
| `sunshine_valley` | Sunshine Valley | ❌ | Coming soon — Seasonal | ❌ |
| `night_sky` | Night Sky | ❌ | Coming soon — 50💎 | ❌ |

---

## Appendix — Known gaps tracked for Sprint 9

| Gap | Location | Count | Notes |
|-----|----------|-------|-------|
| Hardcoded `bg-green-600` / `#16a34a` in feature components | 48 files | 73 instances | These components work but ignore App Theme switching. Sprint 9 will replace with `var(--ds-brand-primary)`. |
| Ocean artwork files missing from `/public/themes/ocean/` | `/public/` | 6 files | `hero.png`, `hero-mobile.png`, `community-header.png`, `background.png`, `badge.png`, `confetti.png` |
| Lighthouse scores not baselined | Manual | — | Run axe + Lighthouse once per theme before marking A12 items ✅ |
| Effect components wired to only 2 locations | `DashboardHero`, `AppShell` | — | `HeroDecoration` and `FloatingParticles` could also be added to `/missions` hero, `/stories` hero, `/shop` hero |
