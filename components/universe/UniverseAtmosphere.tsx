"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { UNIVERSE_ATMOSPHERE_OPACITY } from "@/lib/design-system/universe";

interface UniverseAtmosphereProps {
  /** Number of drifting particles (kept tiny — world feels alive, not noisy). */
  density?: "sparse" | "normal";
  clouds?: boolean;
  stars?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Deterministic pseudo-random positions so SSR and client match. */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * UniverseAtmosphere — subtle floating particles / clouds / stars.
 * Loops are silenced automatically under prefers-reduced-motion via useMotion().
 * Pure CSS radial dots + blurred cloud puffs: zero image cost.
 */
export default function UniverseAtmosphere({
  density = "sparse",
  clouds = true,
  stars = true,
  className = "",
  style,
}: UniverseAtmosphereProps) {
  const m = useMotion();
  const count = density === "sparse" ? 8 : 14;

  return (
    <div
      className={`universe-atmosphere pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={style}
      aria-hidden="true"
    >
      {/* Stars */}
      {stars &&
        Array.from({ length: count }).map((_, i) => {
          const left = `${seeded(i, 1) * 100}%`;
          const top = `${seeded(i, 2) * 55}%`;
          const size = 2 + Math.floor(seeded(i, 3) * 3);
          const delay = seeded(i, 4) * 2;
          const loop = m.starPulse(delay);
          return (
            <motion.span
              key={`star-${i}`}
              className="absolute rounded-full bg-[#F0E8D4]"
              style={{
                left,
                top,
                width: size,
                height: size,
                opacity: UNIVERSE_ATMOSPHERE_OPACITY.stars,
              }}
              animate={loop.animate}
              transition={loop.transition}
            />
          );
        })}
      {/* Drifting motes */}
      {Array.from({ length: count }).map((_, i) => {
        const left = `${seeded(i, 5) * 100}%`;
        const top = `${30 + seeded(i, 6) * 60}%`;
        const delay = seeded(i, 7) * 3;
        const loop = m.floatSoft;
        return (
          <motion.span
            key={`mote-${i}`}
            className="absolute rounded-full"
            style={{
              left,
              top,
              width: 5,
              height: 5,
              background: "radial-gradient(circle, rgba(245,200,66,0.9) 0%, transparent 70%)",
              opacity: UNIVERSE_ATMOSPHERE_OPACITY.particles,
            }}
            animate={loop.animate}
            transition={{ ...loop.transition, delay }}
          />
        );
      })}
      {/* Golden mist clouds drifting at the horizon — warm, soft, low.
          (Replaces the old high white blur-blobs that read as stray lights.) */}
      {clouds &&
        [0, 1, 2].map((i) => {
          const loop = m.floatMd;
          const preset = [
            { left: "6%", top: "50%", width: 240, height: 64 },
            { left: "54%", top: "46%", width: 280, height: 72 },
            { left: "30%", top: "56%", width: 200, height: 54 },
          ][i];
          return (
            <motion.span
              key={`cloud-${i}`}
              className="absolute block rounded-full"
              style={{
                left: preset.left,
                top: preset.top,
                width: preset.width,
                height: preset.height,
                background:
                  "radial-gradient(ellipse at center, rgba(255,214,140,0.55) 0%, rgba(245,200,66,0.20) 55%, rgba(245,200,66,0) 78%)",
                filter: "blur(16px)",
                opacity: UNIVERSE_ATMOSPHERE_OPACITY.clouds * 0.7,
              }}
              animate={loop.animate}
              transition={{ ...loop.transition, delay: i * 1.2 }}
            />
          );
        })}
    </div>
  );
}
