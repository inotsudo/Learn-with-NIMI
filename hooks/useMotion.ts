"use client";

import { useReducedMotionPreferences } from "./useReducedMotionPreferences";
import {
  MOTION,
  STATIC,
  INSTANT,
  type EntrancePreset,
  type LoopPreset,
} from "@/lib/design-system/motion";

/**
 * Returns the full motion preset catalog, with continuous-loop animations
 * automatically disabled when the user prefers reduced motion.
 *
 * RULES:
 *  - Loop animations  (float, pulse, spin, glow)  → silenced to `STATIC`
 *  - Entrance animations (fade, modal, card)       → instant when reduced
 *  - Interactive (buttonHover, buttonPress, etc.)  → always active (essential UX feedback)
 *
 * @example
 * const m = useMotion();
 *
 * // Entrance — full object spread:
 * <motion.div {...m.cardEntrance} />
 *
 * // Loop — individual props:
 * <motion.div animate={m.floatSoft.animate} transition={m.floatSoft.transition} />
 *
 * // Interactive — whileHover target:
 * <motion.button whileHover={m.buttonHover} whileTap={m.buttonPress} />
 *
 * // Stagger helper:
 * {items.map((item, i) => <motion.div key={i} {...m.listItem(i)} />)}
 */
export function useMotion() {
  const reduced = useReducedMotionPreferences();

  // Instant versions of entrance presets (keep opacity, skip transform + spring)
  const instant: EntrancePreset = INSTANT;
  const none:    LoopPreset     = STATIC;

  return {
    /** Whether prefers-reduced-motion is active. */
    reduced,

    // ── Utilities ────────────────────────────────────────────────────────────
    static:  STATIC,
    instant: INSTANT,

    // ── Page ─────────────────────────────────────────────────────────────────
    pageTransition: MOTION.pageTransition,

    // ── Entrance / Exit ───────────────────────────────────────────────────────
    fadeUp:      reduced ? instant : MOTION.fadeUp,
    fadeDown:    reduced ? instant : MOTION.fadeDown,
    scaleIn:     reduced ? instant : MOTION.scaleIn,
    scaleOut:    reduced ? instant : MOTION.scaleOut,
    heroEntrance: reduced ? instant : MOTION.heroEntrance,
    cardEntrance: reduced ? instant : MOTION.cardEntrance,

    // ── Modal / Dialog / Drawer ───────────────────────────────────────────────
    overlayFade:    reduced ? instant : MOTION.overlayFade,
    modalAnimation: reduced ? instant : MOTION.modalAnimation,
    dialogAnimation: reduced ? instant : MOTION.dialogAnimation,
    drawerAnimation: reduced ? instant : MOTION.drawerAnimation,
    tooltipAnimation: reduced ? instant : MOTION.tooltipAnimation,

    // ── Achievement ───────────────────────────────────────────────────────────
    badgeUnlock: reduced ? instant : MOTION.badgeUnlock,

    // ── Stagger helpers ───────────────────────────────────────────────────────
    listItem: reduced
      ? (_index: number) => instant
      : MOTION.listItem,

    // ── Loop animations — disabled when reduced ───────────────────────────────
    floatSoft:   reduced ? none : MOTION.floatSoft,
    floatMd:     reduced ? none : MOTION.floatMd,
    floatLg:     reduced ? none : MOTION.floatLg,
    floatBounce: reduced ? none : MOTION.floatBounce,

    floatRotate: reduced
      ? (_rotateMax?: number, _delay?: number) => none
      : MOTION.floatRotate,

    starPulse: reduced
      ? (_delay?: number) => none
      : MOTION.starPulse,

    scalePulse:  reduced ? none : MOTION.scalePulse,
    glowPulse:   reduced ? none : MOTION.glowPulse,
    spinLoop:    reduced ? none : MOTION.spinLoop,

    progressDots: reduced
      ? (_index: number) => none
      : MOTION.progressDots,

    // ── Interactive targets — always active (essential touch/click feedback) ──
    buttonHover:  MOTION.buttonHover,
    buttonPress:  MOTION.buttonPress,
    cardHover:    MOTION.cardHover,
    cardHoverSm:  MOTION.cardHoverSm,
    dangerPress:  MOTION.dangerPress,
  };
}
