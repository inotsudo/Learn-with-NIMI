"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES } from "@/app/_activityData";

const WEEKLY_PROGRESS = [
  { completed: 5, stars: 70 },
  { completed: 6, stars: 85 },
  { completed: 4, stars: 60 },
  { completed: 5, stars: 75 },
  { completed: 6, stars: 80 },
  { completed: 5, stars: 70 },
  { completed: 4, stars: 60 },
  { completed: 5, stars: 70 },
];

const WEEK_TOTAL = 7;

export default function ActivityDetailsList() {
  const { t } = useLanguage();

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      {ACTIVITIES.map((activity, i) => {
        const { completed, stars } = WEEKLY_PROGRESS[i];
        const pct = (completed / WEEK_TOTAL) * 100;

        return (
          <div key={activity.number} className="flex items-center gap-3 py-3 border-b border-white/15 last:border-0">
            <div className={`w-10 h-10 ${activity.numBgGlass} backdrop-blur border border-white/20 rounded-full flex items-center justify-center text-lg shrink-0`}>
              {activity.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-sm truncate">{t(activity.titleKey)}</p>
              <p className="text-purple-300 text-xs truncate">{t(activity.subtitleKey)}</p>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-1.5 max-w-xs">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${activity.gradient}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-purple-100 text-sm">{completed}/{WEEK_TOTAL}</p>
              <p className="text-yellow-500 text-xs font-bold">⭐ {stars}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
