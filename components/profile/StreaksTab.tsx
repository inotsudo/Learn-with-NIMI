"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { computeStreaks } from "@/lib/parentInsights";
import WeekStreakCard from "./WeekStreakCard";

interface Props {
  activityDates: Set<string>;
  weekStreak: boolean[];
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 5 weeks (35 days), Monday-first rows, ending with the current week.
function buildCalendar(dates: Set<string>): { active: boolean; future: boolean }[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const start = new Date(monday);
  start.setDate(monday.getDate() - 28);

  const weeks: { active: boolean; future: boolean }[][] = [];
  for (let w = 0; w < 5; w++) {
    const week: { active: boolean; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      week.push({ active: dates.has(localDateStr(day)), future: day.getTime() > today.getTime() });
    }
    weeks.push(week);
  }
  return weeks;
}

export default function StreaksTab({ activityDates, weekStreak }: Props) {
  const { t } = useLanguage();
  const { current, longest } = computeStreaks(activityDates);
  const weeks = buildCalendar(activityDates);

  return (
    <div className="space-y-4 mt-4">
      <div>
        <p className="font-black text-gray-800 text-lg">{t("streaksPageTitle")}</p>
        <p className="text-gray-500 text-sm">{t("streaksPageSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border-2 border-orange-200 rounded-2xl shadow-sm p-4 text-center">
          <p className="font-black text-3xl text-orange-500">🔥 {current}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">{t("currentStreakLabel")}</p>
        </div>
        <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-sm p-4 text-center">
          <p className="font-black text-3xl text-purple-600">🏆 {longest}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">{t("longestStreakLabel")}</p>
        </div>
      </div>

      <WeekStreakCard weekStreak={weekStreak} activityDates={activityDates} />

      <div className="bg-white border-2 border-indigo-100 rounded-2xl shadow-sm p-4">
        <p className="font-black text-gray-800 mb-3">{t("activityCalendarTitle")}</p>
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DAY_LABELS.map((label, i) => (
            <span key={i} className="text-[10px] font-bold text-gray-400 text-center">{label}</span>
          ))}
        </div>
        <div className="space-y-1.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`aspect-square rounded-md ${
                    day.future ? "bg-gray-50" : day.active ? "bg-green-500" : "bg-gray-100"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
