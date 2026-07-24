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
  const hasActivity = total > 0;

  return (
    <div className="bg-ds-card border border-ds-border shadow-ds-card p-5" style={{ borderRadius: "var(--leaf-r)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="font-baloo font-black text-ds-text text-[15px]">{t("weeklyActivityTitle")}</p>
        {hasActivity && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[11px] font-black text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] px-2.5 py-1 rounded-full border border-[var(--ds-border-brand)]/30"
          >
            🔥 {total} {t("thisWeekLabel")}
          </motion.span>
        )}
      </div>

      {/* Empty state — ghost bars + overlay nudge */}
      {!hasActivity && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          <div className="flex items-end justify-between gap-1.5 h-32 mb-2 select-none pointer-events-none">
            {[30, 55, 20, 70, 40, 85, 15].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="h-5" />
                <motion.div
                  className="w-full rounded-t-lg rounded-b-sm bg-ds-border/60"
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: [0.34, 1.1, 0.64, 1] }}
                />
                <span className="text-[10px] font-bold text-ds-muted">{t(dayKeys[i])}</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
            <div className="bg-ds-card/92 backdrop-blur-sm border border-ds-border rounded-2xl px-4 py-3 text-center shadow-sm">
              <p className="text-[28px] leading-none mb-1">📚</p>
              <p className="font-baloo font-black text-ds-text text-[13px]">No activity yet this week</p>
              <p className="text-ds-muted text-[10px] font-semibold mt-0.5">Read a story to light up the chart!</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Real bar chart */}
      {hasActivity && (
        <div className="flex items-end justify-between gap-1.5 h-32">
          {weekCounts.map((count, i) => {
            const heightPct = count > 0 ? Math.max((count / max) * 100, 12) : 4;
            const isBest = count > 0 && i === best;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="h-5 flex items-end">
                  {count > 0 && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 + 0.2 }}
                      className={`text-[11px] font-black tabular-nums leading-none ${
                        isBest ? "text-[var(--ds-brand-primary)]" : "text-ds-muted"
                      }`}
                    >
                      {count}
                    </motion.span>
                  )}
                </div>
                <motion.div
                  className={`w-full rounded-t-lg rounded-b-sm ${
                    count > 0
                      ? isBest
                        ? "bg-gradient-to-t from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)]"
                        : "bg-gradient-to-t from-[var(--ds-brand-primary)]/55 to-[var(--ds-brand-primary)]/35"
                      : "bg-ds-border/50"
                  }`}
                  style={{ minHeight: count > 0 ? 6 : 2 }}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.55, delay: i * 0.06, ease: [0.34, 1.1, 0.64, 1] }}
                />
                <span className={`text-[10px] font-bold ${isBest ? "text-[var(--ds-brand-primary)]" : "text-ds-muted"}`}>
                  {t(dayKeys[i])}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Best day callout */}
      {hasActivity && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-3 pt-3 border-t border-ds-border flex items-center justify-between"
        >
          <span className="text-ds-muted text-[11px]">
            {t("bestDayLabel")}: <span className="font-bold text-ds-text">{t(dayKeys[best])}</span>
          </span>
          <span className="text-[11px] font-black text-[var(--ds-brand-primary)]">
            {weekCounts[best]} {t("activitiesLabel")}
          </span>
        </motion.div>
      )}
    </div>
  );
}
