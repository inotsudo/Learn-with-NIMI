"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotionPreferences } from "@/hooks/useReducedMotionPreferences";
import { CONFETTI_BURST, type BurstConfig } from "@/lib/design-system/delight";
import { EASE } from "@/lib/design-system/motion";

interface Particle {
  id: number;
  x: number;       // percent: initial left position
  y: number;       // percent: initial top/bottom position
  dx: number;      // percent: radial x offset (radial only)
  dy: number;      // percent: radial y offset (radial only)
  delay: number;
  color: string;
  shape: string;
  size: number;
}

interface Props {
  active: boolean;
  config?: BurstConfig;
  className?: string;
  onComplete?: () => void;
}

export default function RewardBurst({ active, config = CONFETTI_BURST, className, onComplete }: Props) {
  const reduced = useReducedMotionPreferences();

  // Deterministic particle generation — no Math.random() in render path.
  const particles = useMemo<Particle[]>(() => {
    const { count, colors, shapes, sizeRange } = config;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i * (360 / count)) * (Math.PI / 180);
      const dist  = 25 + (i % 4) * 8;
      return {
        id:    i,
        x:     (i * 37 + 8) % 88 + 6,
        y:     (i * 53 + 12) % 80 + 10,
        dx:    Math.cos(angle) * dist,
        dy:    Math.sin(angle) * dist,
        delay: (i * 0.07) % 0.7,
        color: colors[i % colors.length],
        shape: shapes[i % shapes.length],
        size:  sizeRange[0] + (i % 5) * (sizeRange[1] - sizeRange[0]) / 5,
      };
    });
  }, [config]);

  if (reduced) {
    return (
      <AnimatePresence onExitComplete={onComplete}>
        {active && (
          <motion.div key="burst-reduced"
            initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
            className={`absolute inset-0 pointer-events-none ${className}`}
          />
        )}
      </AnimatePresence>
    );
  }

  const { spread, duration } = config;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {active && (
        <div key="burst" className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
          {particles.map(p => {
            if (spread === "rain") {
              return (
                <motion.div key={p.id}
                  className="absolute rounded-full"
                  style={{ left: `${p.x}%`, width: p.size, height: p.size, backgroundColor: p.color }}
                  initial={{ top: "-5%", opacity: 1, rotate: 0 }}
                  animate={{ top: "110%", opacity: [1, 1, 0], rotate: 360 }}
                  transition={{ duration, delay: p.delay, ease: EASE.exit }}
                />
              );
            }
            if (spread === "up") {
              return (
                <motion.span key={p.id}
                  className="absolute select-none"
                  style={{ left: `${p.x}%`, bottom: "10%", fontSize: p.size }}
                  initial={{ opacity: 0, scale: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.3, 1, 0.6], y: -80 - p.delay * 30 }}
                  transition={{ duration, delay: p.delay, ease: EASE.enter }}
                >
                  {p.shape}
                </motion.span>
              );
            }
            // radial
            return (
              <motion.span key={p.id}
                className="absolute select-none"
                style={{ left: "50%", top: "50%", fontSize: p.size }}
                initial={{ x: "-50%", y: "-50%", opacity: 0, scale: 0 }}
                animate={{
                  x: `calc(-50% + ${p.dx}%)`,
                  y: `calc(-50% + ${p.dy}%)`,
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.4, 1, 0.5],
                }}
                transition={{ duration, delay: p.delay, ease: EASE.enter }}
              >
                {p.shape}
              </motion.span>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
