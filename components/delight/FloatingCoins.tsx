"use client";

import { motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { DURATION, EASE } from "@/lib/design-system/motion";

// Pre-computed pool — deterministic, no Math.random() during render.
const POOL = Array.from({ length: 8 }, (_, i) => ({
  id:    i,
  x:     (i * 43 + 8) % 85 + 7,
  delay: i * 0.28,
  size:  14 + (i % 3) * 3,
}));

interface Props {
  count?: number;
  className?: string;
}

export default function FloatingCoins({ count = 6, className }: Props) {
  const m = useMotion();
  const coins = POOL.slice(0, Math.min(count, POOL.length));

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className ?? ""}`}>
      {coins.map(c => (
        <motion.span
          key={c.id}
          className="absolute select-none"
          style={{ left: `${c.x}%`, bottom: "5%", fontSize: c.size }}
          animate={m.reduced ? {} : { y: [0, -50, -100], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.8] }}
          transition={{ duration: DURATION.loopBase, delay: c.delay, repeat: Infinity, ease: EASE.enter }}
        >
          ⭐
        </motion.span>
      ))}
    </div>
  );
}
