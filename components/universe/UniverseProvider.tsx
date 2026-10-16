"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useReducedMotionPreferences } from "@/hooks/useReducedMotionPreferences";
import type { UniverseStage } from "@/lib/design-system/universe";
import { UNIVERSE_STAGES } from "@/lib/design-system/universe";

interface UniverseContextValue {
  /** Current named journey stage (Intro experience language). */
  stage: UniverseStage;
  /** Advance one stage forward (clamped at "next"). */
  goToStage: (stage: UniverseStage) => void;
  /** OS-level reduced-motion preference (reactive). */
  reducedMotion: boolean;
  /** True while a stage transition overlay is showing. */
  transitioning: boolean;
  /** Run `fn` inside the transition window so callers can chain navigation. */
  withTransition: (fn: () => void) => void;
}

const UniverseContext = createContext<UniverseContextValue | null>(null);

export function useUniverse(): UniverseContextValue {
  const ctx = useContext(UniverseContext);
  if (!ctx) throw new Error("useUniverse must be used inside <UniverseProvider>");
  return ctx;
}

/**
 * UniverseProvider — opt-in journey-stage state + reduced-motion flag.
 * Invisible until a Phase 2+ surface mounts it; existing pages are untouched.
 */
export default function UniverseProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotionPreferences();
  const [stage, setStage] = useState<UniverseStage>("world");
  const [transitioning, setTransitioning] = useState(false);

  const goToStage = useCallback((next: UniverseStage) => {
    if (UNIVERSE_STAGES.includes(next)) setStage(next);
  }, []);

  const withTransition = useCallback(
    (fn: () => void) => {
      if (reducedMotion) {
        fn();
        return;
      }
      setTransitioning(true);
      // Matches UNIVERSE_TRANSITION.stage (DURATION.slow = 600ms) — token-derived.
      window.setTimeout(() => {
        fn();
        setTransitioning(false);
      }, 600);
    },
    [reducedMotion],
  );

  const value = useMemo(
    () => ({ stage, goToStage, reducedMotion, transitioning, withTransition }),
    [stage, goToStage, reducedMotion, transitioning, withTransition],
  );

  return <UniverseContext.Provider value={value}>{children}</UniverseContext.Provider>;
}
