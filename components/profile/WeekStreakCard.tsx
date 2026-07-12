"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { computeStreaks } from "@/lib/parentInsights";

interface Props {
  weekStreak: boolean[];
  activityDates: Set<string>;
  usedShieldDates?: Set<string>;
}

export default function WeekStreakCard({ weekStreak, activityDates, usedShieldDates }: Props) {
  const { t } = useLanguage();
  useAppTheme(); // subscribe so CSS vars are live
  const { current, activeToday } = computeStreaks(activityDates, new Date(), usedShieldDates);
  const dayKeys = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"] as const;

  const motivationMsg =
    current === 0 ? t("streakStartMsg")
    : current >= 7 ? t("streakOnFireMsg")
    : t("streakGoingMsg");

  return (
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/35 to-white p-4 text-center shadow-[0_16px_34px_rgba(15,23,42,0.08)]" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <motion.p
        className="font-black text-4xl"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <span className={current > 0 ? "drop-shadow-[0_0_12px_rgba(249,115,22,0.5)]" : ""}>🔥</span>
        <span className="text-orange-500 ml-1">{current}</span>
      </motion.p>
      <p className="font-black text-ds-text text-sm mt-1">
        {t("dayStreak").replace("{count}", String(current))}
      </p>
      <p className="text-gray-500 text-xs mt-0.5">{motivationMsg}</p>

      <div className="flex items-center justify-between mt-4 gap-1">
        {dayKeys.map((key, i) => {
          const done = weekStreak[i];
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] font-bold text-gray-500">{t(key)}</span>
              <motion.div
                initial={done ? { scale: 0 } : {}}
                animate={done ? { scale: 1 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 12, delay: i * 0.05 }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                  done
                    ? "bg-[var(--ds-brand-primary)] shadow-ds-card"
                    : "bg-gray-100 border border-gray-200"
                }`}
              >
                {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </motion.div>
            </div>
          );
        })}
      </div>

      {activeToday && (
        <p className="text-[var(--ds-brand-primary)] text-[10px] font-bold mt-2">✓ {t("todayLabel")}</p>
      )}
    </div>
  );
}
