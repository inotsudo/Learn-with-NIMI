"use client";

import { motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";

interface Props {
  level: number; xpIn: number; xpNeeded: number; xpPct: number;
  totalStars: number; streak: number;
}

/**
 * HomeWorldMarker — XP/level/streak as one light trail marker.
 * Same numbers Home showed (xp level, stars, streak flame).
 */
export default function HomeWorldMarker({ level, xpIn, xpNeeded, xpPct, totalStars, streak }: Props) {
  const m = useMotion();
  return (
    <motion.div {...m.fadeUp} className="h1-mk flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: "rgba(255,253,244,0.96)", border: "1.5px solid rgba(240,208,128,0.8)" }}
      role="status" aria-label={`Level ${level}, ${totalStars} stars, ${streak} day streak`}>
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-baloo text-sm font-black"
        style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F" }}>Lv{level}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-baloo text-xs font-black tabular-nums" style={{ color: "#0D1E3A" }}>⭐ {totalStars} stars</p>
          <p className="font-nunito text-[12px] font-bold tabular-nums" style={{ color: "rgba(13,30,58,0.65)" }}>{xpIn}/{xpNeeded} to Lv{level + 1}</p>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: "rgba(13,30,58,0.10)" }}>
          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#C9A84C,#E8A820)" }}
            initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.3 }} />
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1 font-baloo text-xs font-black tabular-nums" style={{ color: streak > 0 ? "#B07818" : "rgba(13,30,58,0.45)" }}>
        <span aria-hidden="true">🔥</span>{streak > 0 ? `${streak}d` : "0d"}
      </span>
    </motion.div>
  );
}
