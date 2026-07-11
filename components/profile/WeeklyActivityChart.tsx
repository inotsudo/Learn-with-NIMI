"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  weekCounts: number[];
}

export default function WeeklyActivityChart({ weekCounts }: Props) {
  const { t } = useLanguage();
  const dayKeys = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"] as const;
  const max = Math.max(...weekCounts, 1);
  const total = weekCounts.reduce((a, b) => a + b, 0);
  const best = weekCounts.indexOf(Math.max(...weekCounts));

  return (
    <div className="bg-ds-card border border-ds-border shadow-ds-card p-5" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-baloo font-black text-ds-text text-[15px]">{t("weeklyActivityTitle")}</p>
        {total > 0 && (
          <span className="text-[11px] font-bold text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] px-2.5 py-1 rounded-full border border-[var(--ds-border-brand)]/30">
            🔥 {total}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-1.5 h-20">
        {weekCounts.map((count, i) => {
          const pct = Math.max((count / max) * 100, count > 0 ? 8 : 3);
          const isBest = count > 0 && i === best;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              {count > 0 && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`text-[11px] font-black tabular-nums ${isBest ? "text-[var(--ds-brand-primary)]" : "text-ds-muted"}`}
                >
                  {count}
                </motion.span>
              )}
              <motion.div
                className={`w-full rounded-t-lg ${
                  count > 0
                    ? isBest
                      ? "bg-gradient-to-t from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)]"
                      : "bg-gradient-to-t from-[var(--ds-brand-primary)]/60 to-[var(--ds-brand-primary)]/40"
                    : "bg-ds-border"
                }`}
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
              />
              <span className={`text-[10px] font-bold ${isBest ? "text-[var(--ds-brand-primary)]" : "text-ds-muted"}`}>
                {t(dayKeys[i])}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
