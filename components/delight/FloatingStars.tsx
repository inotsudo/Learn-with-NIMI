"use client";

import { motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";

// Pre-computed pool — deterministic, no Math.random() during render.
const POOL = Array.from({ length: 12 }, (_, i) => ({
  id:     i,
  x:      (i * 41 + 5) % 90 + 5,
  y:      (i * 57 + 8) % 80 + 8,
  size:   10 + (i % 4) * 3,
  shape:  (["✦", "★", "✶", "⭐"] as const)[i % 4],
  delay:  i * 0.22,
}));

interface Props {
  count?: number;
  className?: string;
}

export default function FloatingStars({ count = 8, className }: Props) {
  const m = useMotion();
  const stars = POOL.slice(0, Math.min(count, POOL.length));

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className ?? ""}`}>
      {stars.map(s => {
        const pulse = m.starPulse(s.delay);
        return (
          <motion.span
            key={s.id}
            className="absolute text-yellow-400/50 select-none"
            style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size }}
            animate={pulse.animate}
            transition={pulse.transition}
          >
            {s.shape}
          </motion.span>
        );
      })}
    </div>
  );
}
