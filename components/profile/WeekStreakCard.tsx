"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { computeStreaks } from "@/lib/parentInsights";

interface Props {
  weekStreak: boolean[];
  activityDates: Set<string>;
}

export default function WeekStreakCard({ weekStreak, activityDates }: Props) {
  const { t } = useLanguage();
  const { current, activeToday } = computeStreaks(activityDates);
  const dayKeys = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"] as const;

  const motivationMsg =
    current === 0 ? t("streakStartMsg")
    : current >= 7 ? t("streakOnFireMsg")
    : t("streakGoingMsg");

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4 text-center">
      <motion.p
        className="font-black text-4xl"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <span className={current > 0 ? "drop-shadow-[0_0_12px_rgba(249,115,22,0.5)]" : ""}>🔥</span>
        <span className="text-orange-400 ml-1">{current}</span>
      </motion.p>
      <p className="font-black text-white text-sm mt-1">
        {t("dayStreak").replace("{count}", String(current))}
      </p>
      <p className="text-purple-300 text-xs mt-0.5">{motivationMsg}</p>

      <div className="flex items-center justify-between mt-4 gap-1">
        {dayKeys.map((key, i) => {
          const done = weekStreak[i];
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] font-bold text-purple-300">{t(key)}</span>
              <motion.div
                initial={done ? { scale: 0 } : {}}
                animate={done ? { scale: 1 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 12, delay: i * 0.05 }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                  done
                    ? "bg-gradient-to-br from-green-400 to-green-600 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    : "bg-white/10 border border-white/15"
                }`}
              >
                {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </motion.div>
            </div>
          );
        })}
      </div>

      {activeToday && (
        <p className="text-green-300 text-[10px] font-bold mt-2">✓ {t("todayLabel")}</p>
      )}
    </div>
  );
}
