# NIMIPIKO Universe — Phase 1 Foundation

Invisible-by-design technical foundation for the Intro-video experience language
(WORLD → HOME → JOURNEY → DESTINATION → STORY → BOOK → MISSIONS → REWARDS →
CHAMPION → NEXT ADVENTURE). No existing route mounts it yet.

## Primitives

| Export | Kind | Purpose |
|---|---|---|
| `UniverseProvider` / `useUniverse` | client | Opt-in stage state (`world…next`), `withTransition`, reactive `reducedMotion` |
| `UniverseScene` | server | World container: background + caller layers |
| `UniverseBackground` | server | Sky → horizon → ground gradients (no `background-attachment: fixed`) |
| `UniverseAtmosphere` | client | Sparse stars / motes / clouds; loops silenced under reduced motion |
| `UniverseLayer` | server | Depth wrapper (`UNIVERSE_DEPTH` z tokens) |
| `UniverseObject` | client | Interaction language: tap/open/discover/enter/complete/reward + `playTap` hook |
| `UniverseCharacter` | client | Nimi (live art) / Piko (circle fallback) / Zilo (initial disc) |
| `UniversePortal` | client | Destination beacon; glow halo until beacon art lands |
| `UniversePath` | server | Journey stops (`done/current/locked`), screen-reader list |
| `UniverseTransition` | client | Opt-in stage wrapper; never touches Next.js routing |

## Tokens (`lib/design-system/universe.ts`)

`UNIVERSE_SKY/GROUND/HORIZON/PATH/ENVIRONMENT/GLOW/ATMOSPHERE_OPACITY/DEPTH/
PARALLAX/TRANSITION + UniverseStage`. All durations derive from
`lib/design-system/motion.ts` (`DURATION/EASE/SPRING`).

## Assets (`assetRegistry.ts` → `UniverseAssets`, all `string | null`)

Pending art renders token fallbacks: gradients, `UniversePath` dots,
book glow, `RewardBurst`, registry trophy. `resolveUniverseCharacter`
(`lib/universe/characters.ts`, server-safe) maps character+state → src.

## Rules for Phase 2

- Import from `@/components/universe`; wrap — never fork — existing players.
- Keep atmosphere `sparse` on mobile; one glow per scene.
- `next/image` for raster; lazy except hero character (`priority`).
- Verify 375px, reduced-motion, keyboard (44px targets, `aria-label`s).
