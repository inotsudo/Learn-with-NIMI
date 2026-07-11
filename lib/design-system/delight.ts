/**
 * Delight & Micro-Interaction System for NIMIPIKO.
 *
 * This module exports typed specs consumed by delight components and hooks.
 * It builds on motion.ts tokens — no raw numbers or hardcoded colors here.
 *
 * USAGE — components:
 *   import { CONFETTI_BURST, DELIGHT } from "@/lib/design-system/delight";
 *   <RewardBurst active={done} config={CONFETTI_BURST} />
 *
 * USAGE — hooks:
 *   const { show, hide, visible, options } = useCelebration();
 *   show({ spec: DELIGHT.storyComplete, title: "Story done!" });
 *
 * RULE: Never trigger automatically. Business logic calls the hook;
 *       hooks drive the component props.
 */

import type { TargetAndTransition, Transition } from "framer-motion";
import { DURATION, EASE, SPRING } from "./motion";

// ─── Burst Particle Config ─────────────────────────────────────────────────────
// One-shot particle emission — confetti, stars, coins.
// Used by RewardBurst, FloatingStars, FloatingCoins.

export interface BurstConfig {
  count: number;
  shapes: string[];
  colors: string[];
  sizeRange: [number, number];
  spread: "rain" | "up" | "radial";
  duration: number;
}

/** Coloured confetti rain falling from top to bottom. */
export const CONFETTI_BURST: BurstConfig = {
  count: 24,
  shapes: ["•"],
  colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#FF9800", "#E91E63", "#9C27B0"],
  sizeRange: [5, 10],
  spread: "rain",
  duration: DURATION.loopFast,
};

/** Gold star burst exploding radially outward. */
export const STAR_BURST: BurstConfig = {
  count: 12,
  shapes: ["⭐", "✦", "★", "✶"],
  colors: ["#FFD700", "#FFC107", "#FF9800", "#FFEB3B"],
  sizeRange: [12, 22],
  spread: "radial",
  duration: DURATION.loopBase,
};

/** Coin pop — small number of coins rising up. */
export const COIN_POP: BurstConfig = {
  count: 8,
  shapes: ["⭐", "💫"],
  colors: ["#FFD700", "#FFC107"],
  sizeRange: [14, 20],
  spread: "up",
  duration: DURATION.progress,
};

// ─── Ripple Spec ──────────────────────────────────────────────────────────────

export interface RippleSpec {
  color: string;
  duration: number;
  maxScale: number;
}

export const BUTTON_RIPPLE: RippleSpec = {
  color: "rgba(255,255,255,0.35)",
  duration: DURATION.moderate,
  maxScale: 4,
};

export const CARD_RIPPLE: RippleSpec = {
  color: "rgba(34,197,94,0.1)",
  duration: DURATION.slow,
  maxScale: 6,
};

// ─── Checkmark Spec ───────────────────────────────────────────────────────────

export interface CheckmarkSpec {
  size: number;
  strokeWidth: number;
  colorVar: string;
  duration: number;
}

export const CHECKMARK_SUCCESS: CheckmarkSpec = {
  size: 48,
  strokeWidth: 3,
  colorVar: "var(--ds-progress-fill)",
  duration: DURATION.moderate,
};

export const CHECKMARK_LARGE: CheckmarkSpec = {
  size: 72,
  strokeWidth: 4,
  colorVar: "var(--ds-progress-fill)",
  duration: DURATION.slow,
};

// ─── Hero Reaction Spec ───────────────────────────────────────────────────────

export type HeroReactionType = "wave" | "bounce" | "celebrate" | "spin" | "idle";

export interface HeroReactionSpec {
  animate: TargetAndTransition;
  transition: Transition;
  /** How long to hold before returning to idle (ms). 0 = loop forever. */
  duration: number;
}

export const HERO_REACTIONS: Record<HeroReactionType, HeroReactionSpec> = {
  idle: {
    animate:    { y: [0, -4, 0] },
    transition: { duration: DURATION.loopFloat, repeat: Infinity, ease: EASE.standard },
    duration:   0,
  },
  wave: {
    animate:    { rotate: [0, -15, 15, -10, 10, 0] },
    transition: { duration: DURATION.slow, ease: EASE.standard },
    duration:   DURATION.slow * 1000,
  },
  bounce: {
    animate:    { y: [0, -16, 0, -10, 0, -6, 0] },
    transition: { ...SPRING.bounce },
    duration:   800,
  },
  celebrate: {
    animate:    { scale: [1, 1.2, 0.9, 1.15, 1], rotate: [0, -8, 8, -5, 0] },
    transition: { duration: DURATION.slow, ease: EASE.standard },
    duration:   DURATION.slow * 1000,
  },
  spin: {
    animate:    { rotate: [0, 360] },
    transition: { duration: DURATION.moderate, ease: EASE.linear },
    duration:   DURATION.moderate * 1000,
  },
};

// ─── Card Interaction Targets ─────────────────────────────────────────────────
// Pass directly to motion.div whileHover / whileTap.

/** 3-D tilt on hover — for premium / featured cards. */
export const CARD_TILT: TargetAndTransition = { rotateY: 4, rotateX: -2, scale: 1.02 };

/** Shadow lift on hover — for standard cards. */
export const CARD_LIFT: TargetAndTransition = { y: -8, scale: 1.02 };

// ─── One-Shot Keyframe State Specs ────────────────────────────────────────────
// animate={ERROR_SHAKE.animate} transition={ERROR_SHAKE.transition}

/** Horizontal shake for error feedback. */
export const ERROR_SHAKE = {
  animate:    { x: [0, -8, 8, -6, 6, -4, 4, 0] } as TargetAndTransition,
  transition: { duration: DURATION.slow, ease: EASE.standard } as Transition,
};

/** Success pulse for a completed element. */
export const SUCCESS_PULSE = {
  animate:    { scale: [1, 1.08, 1] } as TargetAndTransition,
  transition: { duration: DURATION.moderate, ease: EASE.enter } as Transition,
};

/** Avatar bounce for celebratory moments. */
export const AVATAR_BOUNCE = {
  animate:    { y: [0, -12, 0, -8, 0] } as TargetAndTransition,
  transition: { ...SPRING.bounce } as Transition,
};

/** Hero wave — standalone keyframe (without mascot context). */
export const HERO_WAVE = {
  animate:    { rotate: [0, -15, 15, -10, 10, 0] } as TargetAndTransition,
  transition: { duration: DURATION.slow, ease: EASE.standard } as Transition,
};

// ─── Toast Config ─────────────────────────────────────────────────────────────

export interface ToastConfig {
  icon: string;
  title: string;
  subtitle?: string;
  duration: number;
  stars?: number;
}

// ─── Composite Delight Specs ──────────────────────────────────────────────────
// High-level named interactions consumed by useCelebration() and pages.

export type DelightIntensity = "subtle" | "normal" | "epic";

export interface DelightSpec {
  burst?:          BurstConfig;
  mascotReaction?: HeroReactionType;
  checkmark?:      boolean;
  intensity?:      DelightIntensity;
  sound?:          boolean;
}

export const DELIGHT: Record<string, DelightSpec> = {
  storyComplete:       { burst: CONFETTI_BURST, mascotReaction: "celebrate", checkmark: true,  intensity: "epic",   sound: true  },
  badgeEarned:         { burst: STAR_BURST,     mascotReaction: "bounce",    checkmark: true,  intensity: "epic",   sound: true  },
  missionDone:         { burst: CONFETTI_BURST, mascotReaction: "wave",      checkmark: true,  intensity: "normal", sound: true  },
  progressCelebrate:   { burst: COIN_POP,       mascotReaction: "bounce",                      intensity: "subtle"              },
  rewardClaimed:       { burst: COIN_POP,       mascotReaction: "bounce",    checkmark: true,  intensity: "normal", sound: true  },
  themeUnlocked:       { burst: STAR_BURST,     mascotReaction: "celebrate",                   intensity: "epic",   sound: true  },
  dailyStreak:         { burst: COIN_POP,       mascotReaction: "wave",                        intensity: "normal", sound: true  },
  certificateUnlocked: { burst: CONFETTI_BURST, mascotReaction: "celebrate", checkmark: true,  intensity: "epic",   sound: true  },
  parentApproval:      { burst: STAR_BURST,     mascotReaction: "bounce",                      intensity: "normal", sound: false },
  buttonSuccess:       {                        mascotReaction: undefined,   checkmark: true,  intensity: "subtle"              },
  weeklyGoal:          { burst: CONFETTI_BURST, mascotReaction: "celebrate", checkmark: true,  intensity: "epic",   sound: true  },
};
