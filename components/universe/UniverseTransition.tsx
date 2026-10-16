"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import type { UniverseStage } from "@/lib/design-system/universe";

interface UniverseTransitionProps {
  /** Key that identifies the current stage view — change triggers transition. */
  stageKey: UniverseStage | string;
  children: ReactNode;
  className?: string;
}

/**
 * UniverseTransition — reusable stage-transition wrapper.
 * Wraps FUTURE transitions (Home → Journey → Destination → …) without
 * touching Next.js routing. Inherits reduced-motion behavior from useMotion().
 * Pages opt in by wrapping content; unwrapped pages render exactly as today.
 */
export default function UniverseTransition({ stageKey, children, className = "" }: UniverseTransitionProps) {
  const m = useMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stageKey}
        initial={m.pageTransition.initial}
        animate={m.pageTransition.animate}
        exit={m.pageTransition.exit ?? { opacity: 0 }}
        transition={m.pageTransition.transition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
