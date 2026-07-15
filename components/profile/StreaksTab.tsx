"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { computeStreaks } from "@/lib/parentInsights";
import { resolveShields } from "@/lib/streakShields";
import WeekStreakCard from "./WeekStreakCard";

interface Props {
  activityDates: Set<string>;
  weekStreak: boolean[];
  childId: string;
  language: "en" | "fr" | "rw";
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildCalendar(
  dates: Set<string>,
  shielded: Set<string>
): { active: boolean; shielded: boolean; future: boolean; today: boolean }[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const start = new Date(monday);
  start.setDate(monday.getDate() - 28);

  const weeks: { active: boolean; shielded: boolean; future: boolean; today: boolean }[][] = [];
  for (let w = 0; w < 5; w++) {
    const week: { active: boolean; shielded: boolean; future: boolean; today: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const str = localDateStr(day);
      week.push({
        active: dates.has(str),
        shielded: shielded.has(str) && !dates.has(str),
        future: day.getTime() > today.getTime(),
        today: str === todayStr,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

const MILESTONES = [
  { days: 7, emoji: "🌟", key: "streakMilestone7" },
  { days: 14, emoji: "🏅", key: "streakMilestone14" },
  { days: 30, emoji: "👑", key: "streakMilestone30" },
] as const;

export default function StreaksTab({ activityDates, weekStreak, childId, language }: Props) {
  const { t } = useLanguage();
  useAppTheme();

  const [shieldsPurchased, setShieldsPurchased] = useState(0);
  const [usedShieldDates, setUsedShieldDates] = useState<Set<string>>(new Set());
  const [shieldsAvailableCount, setShieldsAvailableCount] = useState(0);

  useEffect(() => {
    void resolveShields(childId, language, activityDates).then(({ purchased, usedDates, available }) => {
      setShieldsPurchased(purchased);
      setUsedShieldDates(usedDates);
      setShieldsAvailableCount(available);
    });
  // activityDates identity changes on each render, use size as proxy dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, language, activityDates.size]);

  const shieldsAvailable = shieldsAvailableCount;
  const { current, longest } = computeStreaks(activityDates, new Date(), usedShieldDates);
  const weeks = buildCalendar(activityDates, usedShieldDates);
  const dayKeys = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"] as const;

  return (
    <div className="space-y-4 mt-4">
      <div>
        <p className="font-baloo font-black text-ds-text text-[18px]">{t("streaksPageTitle")}</p>
        <p className="text-ds-muted text-[13px] mt-0.5">{t("streaksPageSubtitle")}</p>
      </div>

      {/* Shield status */}
      {shieldsPurchased > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3 px-4 py-3 border-2 border-indigo-500/25 bg-indigo-500/8"
          style={{ borderRadius: 'var(--leaf-r)' }}
        >
          <span className="text-2xl">🛡️</span>
          <div className="flex-1">
            <p className="font-black text-ds-text text-sm">
              {t("shieldsAvailableLabel").replace("{n}", String(shieldsAvailable))}
            </p>
            <p className="text-ds-muted text-xs">{t("rewardStreakShieldDesc")}</p>
          </div>
          {shieldsAvailable > 0 && (
            <span className="font-black text-indigo-500 text-xl">{shieldsAvailable}</span>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-ds-card border border-ds-border shadow-ds-card p-4 text-center" style={{ borderRadius: 'var(--leaf-r)' }}
        >
          <p className="font-black text-4xl">
            <span className={`${current > 0 ? "drop-shadow-[0_0_12px_rgba(249,115,22,0.5)]" : ""}`}>🔥</span>
            <span className="text-orange-500 ml-1">{current}</span>
          </p>
          <p className="text-ds-muted text-xs font-bold mt-1">{t("currentStreakLabel")}</p>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-ds-card border border-ds-border shadow-ds-card p-4 text-center" style={{ borderRadius: 'var(--leaf-r)' }}
        >
          <p className="font-black text-4xl">
            <span>🏆</span>
            <span className="text-ds-text ml-1">{longest}</span>
          </p>
          <p className="text-ds-muted text-xs font-bold mt-1">{t("longestStreakLabel")}</p>
        </motion.div>
      </div>

      {/* Milestone badges */}
      <div className="flex gap-2 justify-center">
        {MILESTONES.map((m, i) => {
          const earned = longest >= m.days;
          return (
            <motion.div
              key={m.days}
              initial={{ scale: 0.8, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.1, type: "spring", stiffness: 320, damping: 22 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                earned
                  ? "bg-[var(--ds-brand-subtle)] border-[var(--ds-brand-primary)]/30 text-[var(--ds-brand-primary)]"
                  : "bg-ds-page border-ds-border text-ds-muted"
              }`}
            >
              <span className={earned ? "" : "grayscale opacity-50"}>{m.emoji}</span>
              <span>{t(m.key)}</span>
            </motion.div>
          );
        })}
      </div>

      <WeekStreakCard weekStreak={weekStreak} activityDates={activityDates} usedShieldDates={usedShieldDates} />

      {/* Activity calendar */}
      <div className="bg-ds-card border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
        <p className="font-black text-ds-text mb-3">{t("activityCalendarTitle")}</p>
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {dayKeys.map((key, i) => (
            <span key={i} className="text-[10px] font-bold text-ds-muted text-center">{t(key)}</span>
          ))}
        </div>
        <div className="space-y-1.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`aspect-square rounded-md relative flex items-center justify-center ${
                    day.future
                      ? "bg-ds-page"
                      : day.active
                        ? "bg-[var(--ds-brand-primary)]"
                        : day.shielded
                          ? "bg-indigo-500/40"
                          : "bg-ds-border/60"
                  } ${day.today ? "ring-2 ring-[var(--ds-brand-primary)] ring-offset-1" : ""}`}
                >
                  {day.shielded && (
                    <span className="text-[9px] leading-none">🛡️</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[var(--ds-brand-primary)]" />
            <span className="text-[10px] text-ds-muted font-semibold">{t("streakKeepItUp")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-indigo-500/40 flex items-center justify-center text-[7px]">🛡️</div>
            <span className="text-[10px] text-ds-muted font-semibold">{t("streakShieldedDay")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm ring-2 ring-[var(--ds-brand-primary)]" />
            <span className="text-[10px] text-ds-muted font-semibold">{t("todayLabel")}</span>
          </div>
        </div>
      </div>

      {/* Get shields CTA if none owned */}
      {shieldsPurchased === 0 && (
        <motion.a
          href="/shop"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="block border-2 border-dashed border-indigo-500/30 p-4 text-center hover:border-indigo-500/60 hover:bg-indigo-500/5 transition"
          style={{ borderRadius: 'var(--leaf-r)' }}
        >
          <p className="text-2xl mb-1">🛡️</p>
          <p className="font-black text-ds-text text-sm">{t("getStreakShieldCTA")}</p>
          <p className="text-ds-muted text-xs mt-0.5">{t("rewardStreakShieldDesc")}</p>
        </motion.a>
      )}
    </div>
  );
}
