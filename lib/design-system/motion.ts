/**
 * Centralized Motion Design System for Nimipiko.
 *
 * USAGE — direct import (static, no reduced-motion awareness):
 *   import { MOTION, DURATION, EASE, SPRING } from "@/lib/design-system/motion";
 *
 * USAGE — via hook (auto-disables loops when prefers-reduced-motion):
 *   import { useMotion } from "@/hooks/useMotion";
 *   const m = useMotion();
 *   <motion.div {...m.cardEntrance} />
 *
 * FORBIDDEN inside components:
 *   transition={{ duration: 0.42 }}           ← hardcoded
 *
 * ALLOWED:
 *   transition={MOTION.cardEntrance.transition} ← token
 *   transition={m.cardEntrance.transition}       ← hook (reduced-motion safe)
 */

import type { TargetAndTransition, Transition } from "framer-motion";

// ─── Duration Tokens ──────────────────────────────────────────────────────────
// Every timing value in the app must resolve to one of these.

export const DURATION = {
  /** Micro feedback — 150ms */
  fast:    0.15,
  /** Standard UI transition — 250ms */
  base:    0.25,
  /** Emphasis entrance — 400ms */
  moderate: 0.4,
  /** Slow / deliberate reveal — 600ms */
  slow:    0.6,
  /** Loading progress bars — 1200ms */
  progress: 1.2,

  // Loop durations (Infinity repeat)
  /** Tight loader bounce — 800ms */
  loopBounce:  0.8,
  /** Sparkle / glow pulse — 1000ms */
  loopSpark:   1.0,
  /** Dot progress pulse — 1000ms */
  loopDot:     1.0,
  /** Loading shimmer — 1200ms */
  loopShimmer: 1.2,
  /** Loader float variant — 1500ms */
  loopFast:    1.5,
  /** Scale / book pulse — 2000ms */
  loopBase:    2.0,
  /** Star glow / sparkle — 2500ms */
  loopSlow:    2.5,
  /** Standard mascot float — 3000ms */
  loopFloat:   3.0,
  /** Soft mascot drift — 3500ms */
  loopDrift:   3.5,
} as const;

// ─── Easing Tokens ────────────────────────────────────────────────────────────

export const EASE = {
  /** General purpose in-out */
  standard:  "easeInOut",
  /** Entrance — decelerates in */
  enter:     "easeOut",
  /** Exit — accelerates out */
  exit:      "easeIn",
  /** Constant-speed spin, progress fills */
  linear:    "linear",
} as const;

// ─── Spring Config Tokens ─────────────────────────────────────────────────────

export const SPRING = {
  /** Modal / sheet pop-in — responsive */
  modal:   { type: "spring" as const, stiffness: 300, damping: 25 },
  /** Dialog entrance — slightly softer */
  dialog:  { type: "spring" as const, stiffness: 250, damping: 25 },
  /** Gentle card bounce */
  gentle:  { type: "spring" as const, stiffness: 260, damping: 18 },
  /** Light interactive bounce */
  bounce:  { type: "spring" as const, stiffness: 200, damping: 20 },
  /** Very soft entrance */
  soft:    { type: "spring" as const, stiffness: 120, damping: 20 },
  /** Stiff — list items */
  card:    { type: "spring" as const, stiffness: 150, damping: 20 },
  /** Week-streak tight pop */
  tight:   { type: "spring" as const, stiffness: 400, damping: 12 },
} as const;

// ─── Shared State Types ───────────────────────────────────────────────────────

export interface EntrancePreset {
  initial:    TargetAndTransition;
  animate:    TargetAndTransition;
  exit?:      TargetAndTransition;
  transition: Transition;
}

export interface LoopPreset {
  animate:    TargetAndTransition;
  transition: Transition;
}

// ─── Static / Instant Utilities ───────────────────────────────────────────────

/** No animation — used to silence loops when reduced-motion is active. */
export const STATIC: LoopPreset = { animate: {}, transition: {} };

/** Instant entrance — used to silence structural animations when reduced-motion is active. */
export const INSTANT: EntrancePreset = {
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  exit:       { opacity: 0 },
  transition: { duration: DURATION.fast },
};

// ─── Page Transitions ─────────────────────────────────────────────────────────

/** Full-page route entrance. */
export const pageTransition: EntrancePreset = {
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  transition: { duration: DURATION.moderate, ease: EASE.enter },
};

// ─── Entrance / Exit Presets ──────────────────────────────────────────────────

/** Fade + slight rise — generic content reveal. */
export const fadeUp: EntrancePreset = {
  initial:    { opacity: 0, y: 8 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -8 },
  transition: { duration: DURATION.base, ease: EASE.enter },
};

/** Fade + slight drop — notification / tooltip. */
export const fadeDown: EntrancePreset = {
  initial:    { opacity: 0, y: -8 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -8 },
  transition: { duration: DURATION.base, ease: EASE.enter },
};

/** Pop in from 85% scale — badge / chip. */
export const scaleIn: EntrancePreset = {
  initial:    { opacity: 0, scale: 0.85 },
  animate:    { opacity: 1, scale: 1 },
  exit:       { opacity: 0, scale: 0.85 },
  transition: SPRING.bounce,
};

/** Pop out to 85% scale. */
export const scaleOut: EntrancePreset = {
  initial:    { opacity: 1, scale: 1 },
  animate:    { opacity: 0, scale: 0.85 },
  transition: { duration: DURATION.base, ease: EASE.exit },
};

/** Hero entrance — slides up with opacity. */
export const heroEntrance: EntrancePreset = {
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: DURATION.slow, ease: EASE.enter },
};

/** Card entrance — spring bounce up from 15px offset. */
export const cardEntrance: EntrancePreset = {
  initial:    { opacity: 0, y: 15 },
  animate:    { opacity: 1, y: 0 },
  transition: SPRING.soft,
};

// ─── Modal / Dialog / Drawer ──────────────────────────────────────────────────

/** Dim overlay fade. */
export const overlayFade: EntrancePreset = {
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  exit:       { opacity: 0 },
  transition: { duration: DURATION.base },
};

/** Modal sheet — rises from below and pops. */
export const modalAnimation: EntrancePreset = {
  initial:    { opacity: 0, y: 50, scale: 0.95 },
  animate:    { opacity: 1, y: 0, scale: 1 },
  exit:       { opacity: 0, y: 50, scale: 0.95 },
  transition: SPRING.modal,
};

/** Dialog sheet — softer spring than modal. */
export const dialogAnimation: EntrancePreset = {
  initial:    { opacity: 0, y: 50, scale: 0.95 },
  animate:    { opacity: 1, y: 0, scale: 1 },
  exit:       { opacity: 0, y: 50, scale: 0.95 },
  transition: SPRING.dialog,
};

/** Bottom drawer / notification panel — drops from above. */
export const drawerAnimation: EntrancePreset = {
  initial:    { opacity: 0, y: -10, scale: 0.95 },
  animate:    { opacity: 1, y: 0,   scale: 1 },
  exit:       { opacity: 0, y: -10, scale: 0.95 },
  transition: { duration: DURATION.fast },
};

/** Tooltip — fast fade + tiny rise. */
export const tooltipAnimation: EntrancePreset = {
  initial:    { opacity: 0, y: 4 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: 4 },
  transition: { duration: DURATION.fast, ease: EASE.enter },
};

// ─── Achievement / Reward ─────────────────────────────────────────────────────

/** Badge / achievement unlock — celebratory spring pop. */
export const badgeUnlock: EntrancePreset = {
  initial:    { opacity: 0, scale: 0.3, rotate: -15 },
  animate:    { opacity: 1, scale: 1,   rotate: 0 },
  exit:       { opacity: 0, scale: 0.3 },
  transition: SPRING.bounce,
};

// ─── List Stagger ─────────────────────────────────────────────────────────────

/**
 * Per-item entrance for staggered lists.
 *
 * @example
 * items.map((item, i) => (
 *   <motion.div key={i} {...listItem(i)} />
 * ))
 */
export function listItem(index: number, baseDelay = 0.08): EntrancePreset {
  return {
    initial:    { opacity: 0, y: 20 },
    animate:    { opacity: 1, y: 0 },
    transition: { ...SPRING.card, delay: index * baseDelay },
  };
}

// ─── Continuous Loop Presets ──────────────────────────────────────────────────
// Used for decorative / ambient animations.
// Components must check prefers-reduced-motion before using these.
// Prefer the useMotion() hook which handles this automatically.

/** Mascot / character gentle float — 5px rise, 3s cycle. */
export const floatSoft: LoopPreset = {
  animate:    { y: [0, -5, 0] },
  transition: { duration: DURATION.loopFloat, repeat: Infinity, ease: EASE.standard },
};

/** Medium mascot float — 6px rise, 3s cycle. */
export const floatMd: LoopPreset = {
  animate:    { y: [0, -6, 0] },
  transition: { duration: DURATION.loopFloat, repeat: Infinity, ease: EASE.standard },
};

/** Banner mascot drift — 8px rise, 3.5s cycle. */
export const floatLg: LoopPreset = {
  animate:    { y: [0, -8, 0] },
  transition: { duration: DURATION.loopDrift, repeat: Infinity, ease: EASE.standard },
};

/** Loader mascot bounce — 12px rise, 0.8s cycle. */
export const floatBounce: LoopPreset = {
  animate:    { y: [0, -12, 0], rotate: [0, 3, -3, 0] },
  transition: { duration: DURATION.loopBounce, repeat: Infinity, ease: EASE.standard },
};

/**
 * Float with added rotation — for star/trophy icons.
 * @param rotateMax  Maximum rotation degrees (default: 8).
 * @param delay      Animation delay in seconds (default: 0).
 */
export function floatRotate(rotateMax = 8, delay = 0): LoopPreset {
  return {
    animate:    { y: [0, -5, 0], rotate: [0, rotateMax, 0] },
    transition: { duration: DURATION.loopSlow, repeat: Infinity, ease: EASE.standard, delay },
  };
}

/**
 * Decorative star/sparkle glow pulse — scale + opacity.
 * @param delay  Animation delay in seconds (default: 0).
 */
export function starPulse(delay = 0): LoopPreset {
  return {
    animate:    { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] },
    transition: { duration: DURATION.loopSlow, repeat: Infinity, ease: EASE.standard, delay },
  };
}

/** Element breathing — gentle scale in/out. */
export const scalePulse: LoopPreset = {
  animate:    { scale: [1, 1.05, 1] },
  transition: { duration: DURATION.loopBase, repeat: Infinity, ease: EASE.standard },
};

/** Ambient glow / shimmer — opacity + scale. */
export const glowPulse: LoopPreset = {
  animate:    { opacity: [0.2, 0.7, 0.2], scale: [1, 1.4, 1] },
  transition: { duration: DURATION.loopSlow, repeat: Infinity, ease: EASE.standard },
};

/** Full 360° spin — loaders, spinners. */
export const spinLoop: LoopPreset = {
  animate:    { rotate: 360 },
  transition: { duration: 1, repeat: Infinity, ease: EASE.linear },
};

/**
 * Staggered loading dot pulse.
 * @param index  Dot index (0, 1, 2) — controls delay offset.
 */
export function progressDots(index: number): LoopPreset {
  return {
    animate:    { scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] },
    transition: { duration: DURATION.loopDot, repeat: Infinity, delay: index * 0.2 },
  };
}

// ─── Interactive State Targets ────────────────────────────────────────────────
// These are Framer Motion `whileHover` / `whileTap` targets — NOT full presets.
// Pass them directly to the corresponding prop.

/** Primary button hover state. */
export const buttonHover: TargetAndTransition = { scale: 1.03, y: -1 };

/** Primary button tap / press state. */
export const buttonPress: TargetAndTransition = { scale: 0.97 };

/** Card hover state — more lift than button. */
export const cardHover: TargetAndTransition = { scale: 1.04, y: -4 };

/** Small card / chip hover state. */
export const cardHoverSm: TargetAndTransition = { y: -3, scale: 1.01 };

/** Destructive / cancel tap. */
export const dangerPress: TargetAndTransition = { scale: 0.95 };

// ─── Aggregated MOTION namespace ──────────────────────────────────────────────
// Import this for component-level use. The useMotion() hook re-exports all of
// these but with loops disabled when prefers-reduced-motion is active.

export const MOTION = {
  // Utilities
  static:  STATIC,
  instant: INSTANT,

  // Page
  pageTransition,

  // Entrance / exit
  fadeUp,
  fadeDown,
  scaleIn,
  scaleOut,
  heroEntrance,
  cardEntrance,

  // Modal / dialog
  overlayFade,
  modalAnimation,
  dialogAnimation,
  drawerAnimation,
  tooltipAnimation,

  // Achievement
  badgeUnlock,

  // Stagger (function)
  listItem,

  // Loops — decorative
  floatSoft,
  floatMd,
  floatLg,
  floatBounce,
  floatRotate,   // function
  starPulse,     // function
  scalePulse,
  glowPulse,
  spinLoop,
  progressDots,  // function

  // Interactive targets
  buttonHover,
  buttonPress,
  cardHover,
  cardHoverSm,
  dangerPress,
} as const;
