"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface Props {
  weekStreak: boolean[];
  consecutiveStreak: number;
  totalStars: number;
}

export default function HomeWeekStreakPanel({ weekStreak, consecutiveStreak, totalStars }: Props) {
  return (
    <div className="overflow-hidden leaf-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <div className="relative px-5 pt-4 pb-3 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#f97316 0%,#ea580c 60%,#dc2626 100%)" }}>
        <div className="absolute -top-6 -right-6 w-22 h-22 rounded-full bg-white/10 pointer-events-none" />
        <div className="flex items-center gap-3">
          <motion.span className="text-[28px] leading-none"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}>🔥</motion.span>
          <div>
            <p className="font-nunito text-white/60 text-[9px] uppercase tracking-widest leading-none mb-0.5">Learning Streak</p>
            <p className="font-baloo font-black text-white text-[20px] leading-tight">
              {consecutiveStreak} {consecutiveStreak === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
            <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
            <span className="font-baloo font-black text-white text-[12px]">{totalStars}</span>
          </div>
        </div>
      </div>
      <div className="bg-white px-4 py-3">
        <div className="flex justify-between gap-1">
          {["M","T","W","T","F","S","S"].map((day, i) => {
            const todayIdx = new Date().getDay();
            const adjustedToday = todayIdx === 0 ? 6 : todayIdx - 1;
            const isFuture = i > adjustedToday;
            const done = weekStreak[i] ?? false;
            const isToday = i === adjustedToday;
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-full aspect-square max-w-[32px] rounded-full flex items-center justify-center text-[11px] transition-all ${
                  done ? "bg-orange-500 shadow-md shadow-orange-200" :
                  isToday ? "bg-orange-100 border-2 border-orange-300" :
                  isFuture ? "bg-gray-100" : "bg-gray-100"
                }`}>
                  {done ? "🔥" : isToday ? "·" : ""}
                </div>
                <span className={`font-nunito font-bold text-[9px] ${isToday ? "text-orange-500" : "text-gray-400"}`}>{day}</span>
              </div>
            );
          })}
        </div>
        {consecutiveStreak === 0 && (
          <p className="text-center font-nunito text-gray-400 text-[11px] mt-2.5">
            Complete a story activity to start your streak! 🔥
          </p>
        )}
      </div>
    </div>
  );
}
