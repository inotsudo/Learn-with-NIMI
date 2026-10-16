/**
 * NIMIPIKO Universe — Design Tokens (Phase 1 Foundation)
 *
 * Extends the existing design system; does NOT replace it.
 * All timing reuses lib/design-system/motion.ts tokens (DURATION / EASE / SPRING).
 * Colors reuse Airways + HP ground truths so the universe stays on-brand.
 *
 * The Intro video is the experience reference (WORLD → HOME → JOURNEY →
 * DESTINATION → STORY → BOOK → MISSIONS → REWARDS → CHAMPION → NEXT),
 * translated into reusable, theme-agnostic tokens — not frame-for-frame art.
 */

import { DURATION, EASE, SPRING } from "./motion";

// ─── Sky / Ground / Horizon ─────────────────────────────────────────────
// Daybreak gradient family: deep navy (Airways) → warm horizon glow.
// Future artist packs replace stops without changing token names.
export const UNIVERSE_SKY = {
  /** Top of sky — deep world navy. */
  zenith: "#06101F",
  /** Mid sky — Airways mid-navy. */
  mid: "#0D1E3A",
  /** Violet band — magic-hour navy → gold transition (Intro.mp4). */
  violet: "#241A44",
  /** Horizon wash — warm gold haze where path meets destination. */
  horizon: "#F5C842",
  /** Horizon glow with alpha for layering over imagery. */
  horizonGlow: "rgba(245,200,66,0.28)",
  /** Night-sky text/particle tint. */
  starlight: "#F0E8D4",
} as const;

export const UNIVERSE_GROUND = {
  /** Near-ground surface. */
  base: "#0A1830",
  /** Path-adjacent meadow wash (subtle, low saturation). */
  meadow: "rgba(34,197,94,0.14)",
  /** Soft vignette for grounding characters/objects. */
  vignette: "rgba(3,12,23,0.55)",
} as const;

export const UNIVERSE_HORIZON = {
  /** Height of horizon blend band. */
  blendHeight: "22%",
  /** Divider line between sky and ground layers. */
  lineColor: "rgba(201,168,76,0.35)",
} as const;

// ─── Path ───────────────────────────────────────────────────────────────
export const UNIVERSE_PATH = {
  /** Journey path stroke (gold, matches Airways brand). */
  stroke: "#C9A84C",
  /** Completed portion of path. */
  strokeComplete: "#F5C842",
  /** Path glow halo. */
  glow: "rgba(201,168,76,0.35)",
  /** Dotted-path dash pattern for SVG. */
  dash: "1 10",
  /** Path node ring. */
  nodeRing: "rgba(201,168,76,0.5)",
} as const;

// ─── Environment ────────────────────────────────────────────────────────
export const UNIVERSE_ENVIRONMENT = {
  /** Distant silhouette opacity (mountains / castle / reef). */
  distantOpacity: 0.45,
  /** Middle-ground opacity. */
  middleOpacity: 0.7,
  /** Foreground full opacity. */
  foregroundOpacity: 1,
  /** Ambient wash over whole scene (keeps text contrast). */
  scrim: "rgba(6,16,31,0.35)",
  /** Light scrim for cards floating over world art. */
  scrimSoft: "rgba(6,16,31,0.18)",
} as const;

// ─── Magical glows ──────────────────────────────────────────────────────
// Box-shadow / radial-gradient values. Use sparingly — one glow per scene.
export const UNIVERSE_GLOW = {
  /** General magical aura (gold). */
  magic: "0 0 32px rgba(245,200,66,0.35), 0 0 80px rgba(201,168,76,0.18)",
  /** Destination beacon — stronger, draws the eye down the path. */
  destination: "0 0 48px rgba(245,200,66,0.55), 0 0 120px rgba(245,200,66,0.25)",
  /** Giant-book summon glow (warm amber, matches story detail candlelight). */
  book: "0 0 40px rgba(220,160,50,0.40), 0 8px 60px rgba(180,100,20,0.22)",
  /** Reward burst halo. */
  reward: "0 0 56px rgba(255,215,0,0.55), 0 0 120px rgba(255,152,0,0.30)",
} as const;

// ─── Atmospheric opacity ────────────────────────────────────────────────
export const UNIVERSE_ATMOSPHERE_OPACITY = {
  particles: 0.7,
  clouds: 0.85,
  stars: 0.8,
  glowLayer: 0.5,
} as const;

// ─── Layer depth (z) ────────────────────────────────────────────────────
// Maps onto Tailwind z-scale intent; numeric so server components can inline.
export const UNIVERSE_DEPTH = {
  background: 0,
  sky: 1,
  distant: 2,
  middle: 3,
  foreground: 4,
  characters: 5,
  objects: 6,
  particles: 7,
  ui: 10,
} as const;

export type UniverseLayerName = keyof typeof UNIVERSE_DEPTH;

// ─── Parallax depth ─────────────────────────────────────────────────────
// Static multipliers for translate on scroll/drag. Future phases animate
// these; Phase 1 only exposes the scale so layers stay consistent.
export const UNIVERSE_PARALLAX = {
  sky: 0.05,
  distant: 0.12,
  middle: 0.22,
  foreground: 0.35,
  characters: 0.45,
  objects: 0.5,
} as const;

// ─── Transition timing (token-backed, never hardcoded) ──────────────────
// Named journey stages from the Intro experience language.
export type UniverseStage =
  | "world"
  | "home"
  | "journey"
  | "destination"
  | "story"
  | "book"
  | "mission"
  | "reward"
  | "champion"
  | "next";

export const UNIVERSE_TRANSITION = {
  /** Stage fade/slide — deliberate reveal. */
  stage: { duration: DURATION.slow, ease: EASE.enter },
  /** Portal enter — celebratory spring. */
  portal: { ...SPRING.gentle },
  /** Book open — slow emphasis. */
  bookOpen: { duration: DURATION.slow, ease: EASE.standard },
  /** Reward pop — badge spring (matches DELIGHT.storyComplete). */
  reward: { ...SPRING.bounce },
  /** Ambient drift for atmosphere loops. */
  drift: { duration: DURATION.loopDrift, ease: EASE.standard },
} as const;

export const UNIVERSE_STAGES: UniverseStage[] = [
  "world",
  "home",
  "journey",
  "destination",
  "story",
  "book",
  "mission",
  "reward",
  "champion",
  "next",
];
