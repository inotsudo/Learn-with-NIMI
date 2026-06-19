"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { computeStreaks } from "@/lib/parentInsights";

interface Props {
  weekStreak: boolean[];
  activityDates: Set<string>;
}

const STREAK_DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function WeekStreakCard({ weekStreak, activityDates }: Props) {
  const { t } = useLanguage();
  const days = computeStreaks(activityDates).current;

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4 text-center">
      <p className="font-black text-3xl text-orange-500">🔥 {days}</p>
      <p className="font-black text-white text-sm mt-1">
        {t("dayStreak").replace("{count}", String(days))}
      </p>
      <p className="text-purple-300 text-xs mt-1">{t("streakKeepItUp")}</p>

      <div className="flex items-center justify-between mt-4">
        {STREAK_DAY_LABELS.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-purple-300">{label}</span>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              weekStreak[i] ? "bg-green-500" : "bg-white/10"
            }`}>
              {weekStreak[i] && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
