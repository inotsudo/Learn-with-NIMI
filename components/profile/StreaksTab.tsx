"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { computeStreaks } from "@/lib/parentInsights";
import WeekStreakCard from "./WeekStreakCard";

interface Props {
  activityDates: Set<string>;
  weekStreak: boolean[];
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildCalendar(dates: Set<string>): { active: boolean; future: boolean; today: boolean }[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const start = new Date(monday);
  start.setDate(monday.getDate() - 28);

  const weeks: { active: boolean; future: boolean; today: boolean }[][] = [];
  for (let w = 0; w < 5; w++) {
    const week: { active: boolean; future: boolean; today: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const str = localDateStr(day);
      week.push({ active: dates.has(str), future: day.getTime() > today.getTime(), today: str === todayStr });
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

export default function StreaksTab({ activityDates, weekStreak }: Props) {
  const { t } = useLanguage();
  const { current, longest } = computeStreaks(activityDates);
  const weeks = buildCalendar(activityDates);
  const dayKeys = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"] as const;

  return (
    <div className="space-y-4 mt-4">
      <div>
        <p className="font-black text-white text-lg">{t("streaksPageTitle")}</p>
        <p className="text-purple-300 text-sm">{t("streaksPageSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4 text-center"
        >
          <p className="font-black text-4xl">
            <span className={`${current > 0 ? "drop-shadow-[0_0_12px_rgba(249,115,22,0.5)]" : ""}`}>🔥</span>
            <span className="text-orange-400 ml-1">{current}</span>
          </p>
          <p className="text-purple-300 text-xs font-bold mt-1">{t("currentStreakLabel")}</p>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4 text-center"
        >
          <p className="font-black text-4xl">
            <span>🏆</span>
            <span className="text-purple-200 ml-1">{longest}</span>
          </p>
          <p className="text-purple-300 text-xs font-bold mt-1">{t("longestStreakLabel")}</p>
        </motion.div>
      </div>

      {/* Milestone badges */}
      <div className="flex gap-2 justify-center">
        {MILESTONES.map(m => {
          const earned = longest >= m.days;
          return (
            <motion.div
              key={m.days}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                earned
                  ? "bg-yellow-400/20 border-yellow-300/40 text-yellow-200"
                  : "bg-white/5 border-white/10 text-purple-400"
              }`}
            >
              <span className={earned ? "" : "grayscale opacity-50"}>{m.emoji}</span>
              <span>{t(m.key)}</span>
            </motion.div>
          );
        })}
      </div>

      <WeekStreakCard weekStreak={weekStreak} activityDates={activityDates} />

      {/* Activity calendar */}
      <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
        <p className="font-black text-white mb-3">{t("activityCalendarTitle")}</p>
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {dayKeys.map((key, i) => (
            <span key={i} className="text-[10px] font-bold text-purple-300 text-center">{t(key)}</span>
          ))}
        </div>
        <div className="space-y-1.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`aspect-square rounded-md relative ${
                    day.future
                      ? "bg-white/5"
                      : day.active
                        ? "bg-gradient-to-br from-green-400 to-green-600 shadow-[0_0_6px_rgba(34,197,94,0.3)]"
                        : "bg-white/10"
                  } ${day.today ? "ring-2 ring-purple-400 ring-offset-1 ring-offset-transparent" : ""}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-green-400 to-green-600" />
            <span className="text-[10px] text-purple-300 font-semibold">{t("streakKeepItUp")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-white/10" />
            <span className="text-[10px] text-purple-300 font-semibold">—</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm ring-2 ring-purple-400" />
            <span className="text-[10px] text-purple-300 font-semibold">{t("todayLabel")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
