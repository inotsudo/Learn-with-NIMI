"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Returns `true` when the user's OS/browser has requested reduced motion
 * (`prefers-reduced-motion: reduce`), `false` otherwise.
 *
 * Uses Framer Motion's `useReducedMotion` internally, which reads the
 * CSS media query reactively (updates live when the user toggles the setting).
 * Returns `false` during SSR (null → false) so the default experience is full motion.
 *
 * @example
 * const prefersReducedMotion = useReducedMotionPreferences();
 * <motion.div animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }} />
 */
export function useReducedMotionPreferences(): boolean {
  // null during SSR — treat as "no preference" (full motion)
  return useReducedMotion() ?? false;
}
