"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { UNIVERSE_GLOW } from "@/lib/design-system/universe";

interface UniversePortalProps {
  /** Destination artwork — null renders the destination-glow CSS halo. */
  beaconSrc?: string | null;
  active?: boolean;
  label: string;
  onEnter?: () => void;
  children?: ReactNode;
  size?: number;
  className?: string;
}

/**
 * UniversePortal — destination beacon / journey gate.
 * Glow-only until artist beacon art lands. Keyboard-operable, 44px+.
 */
export default function UniversePortal({
  beaconSrc = null,
  active = true,
  label,
  onEnter,
  children,
  size = 120,
  className = "",
}: UniversePortalProps) {
  const m = useMotion();
  const glowLoop = m.glowPulse;

  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={!active}
      onClick={() => onEnter?.()}
      whileHover={active ? m.buttonHover : undefined}
      whileTap={active ? m.buttonPress : undefined}
      className={`universe-touch relative rounded-full ${active ? "cursor-pointer" : "cursor-default"} ${className}`}
      style={{ width: Math.max(size, 44), height: Math.max(size, 44) }}
    >
      {/* Halo */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(245,200,66,0.45) 0%, rgba(201,168,76,0.15) 55%, transparent 72%)",
          boxShadow: UNIVERSE_GLOW.destination,
        }}
        animate={glowLoop.animate}
        transition={glowLoop.transition}
      />
      {/* Ring */}
      <span
        aria-hidden="true"
        className="absolute inset-2 rounded-full border-2 border-dashed border-[#C9A84C]"
        style={{ opacity: 0.8 }}
      />
      <span className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-full">
        {beaconSrc ? (
          <img src={beaconSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          children ?? (
            <span aria-hidden="true" className="text-3xl">
              📖
            </span>
          )
        )}
      </span>
    </motion.button>
  );
}

/** Re-export AnimatePresence for portal-driven stage swaps. */
export { AnimatePresence };
