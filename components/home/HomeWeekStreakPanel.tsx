"use client";

import { motion } from "framer-motion";
import { Star, Flame } from "lucide-react";

interface Props {
  weekStreak: boolean[];
  consecutiveStreak: number;
  totalStars: number;
}

const DAYS = ["M","T","W","T","F","S","S"];

export default function HomeWeekStreakPanel({ weekStreak, consecutiveStreak, totalStars }: Props) {
  const todayRaw   = new Date().getDay();
  const todayIdx   = todayRaw === 0 ? 6 : todayRaw - 1;
  const message    =
    consecutiveStreak >= 7 ? "Unstoppable! 🏆" :
    consecutiveStreak >= 3 ? "You're on fire! 🔥" :
    consecutiveStreak > 0  ? "Keep it up! 💪"   : "Start your streak! ✨";

  return (
    <div className="overflow-hidden leaf-lg border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)]">

      {/* Flat header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shadow-sm shrink-0">
            <Flame className="w-5 h-5 fill-orange-500 text-orange-500" />
          </div>
          <div>
            <p className="font-nunito text-orange-500 text-[10px] uppercase tracking-widest leading-none mb-0.5">
              {message}
            </p>
            <h3 className="font-baloo font-black text-gray-900 text-[17px] leading-tight">
              {consecutiveStreak} {consecutiveStreak === 1 ? "day" : "days"}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1.5">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-baloo font-black text-amber-700 text-[13px]">{totalStars}</span>
        </div>
      </div>
      <div className="h-px bg-gray-100 mx-4" />

      {/* Week grid */}
      <div className="px-4 pt-3.5 pb-4">
        <div className="flex justify-between gap-1">
          {DAYS.map((day, i) => {
            const done    = weekStreak[i] ?? false;
            const isToday = i === todayIdx;
            const future  = i > todayIdx;
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-full aspect-square max-w-[34px] rounded-full flex items-center justify-center text-[13px] transition-all duration-200 ${
                  done    ? "bg-orange-500 shadow-md shadow-orange-200/60" :
                  isToday ? "bg-orange-50 border-2 border-orange-400" :
                  future  ? "bg-gray-50 border border-gray-100 opacity-50" :
                             "bg-gray-100 border border-gray-100"
                }`}>
                  {done ? <Flame className="w-3.5 h-3.5 fill-white text-white" /> :
                   isToday ? <span className="text-orange-400 font-black text-[10px]">•</span> : null}
                </div>
                <span className={`font-nunito font-bold text-[9px] ${
                  isToday ? "text-orange-500" : done ? "text-orange-400" : "text-gray-300"
                }`}>{day}</span>
              </div>
            );
          })}
        </div>
        {consecutiveStreak === 0 && (
          <p className="text-center font-nunito text-gray-400 text-[11px] mt-3">
            Complete a story to light your first flame 🔥
          </p>
        )}
      </div>
    </div>
  );
}
