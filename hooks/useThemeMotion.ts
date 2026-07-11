"use client";

/**
 * useThemeMotion — drop-in replacement for useMotion that layers per-theme
 * interaction feel on top of the static preset catalog.
 *
 * HP  → bouncy/snappy: hoverScale 1.04, hoverLift -4px, stiff spring (260/18)
 * Ocean → fluid/smooth: hoverScale 1.02, hoverLift -2px, soft spring (160/22)
 *
 * USAGE:
 *   const m = useThemeMotion();
 *   <motion.div whileHover={m.cardHover} whileTap={m.buttonPress} />
 *   <div className={`... ${m.transitionSlow}`} />
 *
 * Every other preset from useMotion is available unchanged on the returned object.
 */

import { useAppTheme } from "@/contexts/AppThemeProvider";
import { useMotion } from "./useMotion";
import { getThemeEffects } from "@/lib/design-system/themeEffects";
import type { AppThemeId } from "@/lib/design-system/theme";
import type { TargetAndTransition, Transition } from "framer-motion";

export function useThemeMotion() {
  const { themeId, theme } = useAppTheme();
  const m = useMotion();
  const tm = theme.motion;
  const fx = getThemeEffects(themeId as AppThemeId).motion;

  // ── Interactive Framer targets — theme-specific feel ──────────────────────

  const cardHover:   TargetAndTransition = { scale: tm.hoverScale, y: tm.hoverLift };
  const buttonHover: TargetAndTransition = { scale: Math.min(tm.hoverScale, 1.03), y: -1 };
  const buttonPress: TargetAndTransition = { scale: tm.tapScale };
  const dangerPress: TargetAndTransition = { scale: Math.max(tm.tapScale - 0.01, 0.94) };
  const cardHoverSm: TargetAndTransition = {
    y:     Math.round(tm.hoverLift * 0.65),
    scale: Math.min(tm.hoverScale, 1.015),
  };

  // ── Spring transition config — drives modal / card entrances ──────────────

  const spring: Transition = {
    type:      "spring",
    stiffness: tm.springStiffness,
    damping:   tm.springDamping,
  };

  // ── Composite loop presets (reduced-motion safe) ──────────────────────────

  const floating = m.reduced
    ? m.static
    : {
        animate:    { y: [0, tm.hoverLift, 0] },
        transition: { duration: fx.floatDuration, repeat: Infinity, ease: "easeInOut" as const },
      };

  const celebration = m.reduced
    ? m.instant
    : {
        initial:    { scale: 0, opacity: 0 },
        animate:    { scale: 1, opacity: 1 },
        transition: { type: "spring" as const, stiffness: tm.springStiffness, damping: tm.springDamping },
      };

  return {
    // ── All static presets from useMotion ─────────────────────────────────
    ...m,

    // ── Theme-aware overrides ─────────────────────────────────────────────
    cardHover,
    buttonHover,
    buttonPress,
    dangerPress,
    cardHoverSm,

    // ── Composite theme presets ───────────────────────────────────────────
    floating,
    celebration,
    spring,

    // ── Tailwind class bundles — drop into className ──────────────────────
    transitionFast:   tm.transitionFast,
    transitionNormal: tm.transitionNormal,
    transitionSlow:   tm.transitionSlow,

    // ── Raw tokens — for inline framer-motion / style values ─────────────
    hoverScale:    tm.hoverScale,
    hoverLift:     tm.hoverLift,
    tapScale:      tm.tapScale,
    glowIntensity: tm.glowIntensity,
  };
}
