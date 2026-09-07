"use client";

import { motion } from "framer-motion";

interface Props {
  totalStars:        number;
  consecutiveStreak: number;
}

const MAX_STARS = 100;

function streakMessage(streak: number, totalStars: number): string {
  if (streak >= 7)  return "On fire! 🔥 Keep flying!";
  if (streak >= 5)  return "Incredible streak! 🌟";
  if (streak >= 3)  return "Great job! Keep going!";
  if (streak >= 1)  return "Good start! Keep it up!";
  return totalStars > 0 ? "Play today to start a new streak!" : "Start your journey today!";
}

export default function HomeTodayStarsCard({ totalStars, consecutiveStreak }: Props) {
  const pct = Math.min(100, Math.round((totalStars / MAX_STARS) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.14 }}
      className="relative rounded-3xl overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(160deg,#FFFDF4 0%,#FEF9E0 60%,#FEF3C0 100%)", border: "1.5px solid #F0D080", boxShadow: "0 8px 32px rgba(200,160,60,0.13)" }}
    >
      {/* Sparkle accents */}
      {[{top:"10%",left:"10%"},{top:"18%",right:"10%"},{top:"58%",right:"8%"}].map((pos,i)=>(
        <span key={i} aria-hidden className="pointer-events-none absolute select-none" style={{ ...pos, color:"#F5C842", fontSize: i===0?18:12, opacity:0.70 }}>✦</span>
      ))}

      {/* Green plant bottom-left decoration */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 select-none" style={{ fontSize: 28, lineHeight: 1, opacity: 0.55, transform: "scaleX(-1)" }}>🌿</div>
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 select-none" style={{ fontSize: 22, lineHeight: 1, opacity: 0.45 }}>🌱</div>

      {/* Title row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="font-baloo font-black text-base" style={{ color: "#0D1E3A" }}>Today&apos;s Stars</span>
        {/* Small ✦ accent top-right */}
        <span className="text-xs" style={{ color: "#F5C842" }}>✦</span>
      </div>

      {/* Big 3D star + count */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 gap-1">
        <motion.div
          animate={{ scale: [1, 1.10, 1], rotate: [0, 4, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="leading-none select-none"
          style={{ fontSize: 64 }}
          aria-hidden
        >⭐</motion.div>

        <p className="font-baloo font-black leading-none" style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", color: "#E8A820" }}>
          {totalStars}
          <span className="font-bold text-base" style={{ color: "rgba(13,30,58,0.38)" }}> /{MAX_STARS}</span>
        </p>

        <p className="font-baloo text-xs text-center" style={{ color: "rgba(13,30,58,0.52)" }}>
          {streakMessage(consecutiveStreak, totalStars)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4 pt-1">
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(13,30,58,0.08)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#F9C932,#E8A820)" }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
