"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";

interface Props {
  categoryProgress: Record<ActivityCategory, { completed: number; total: number }>;
}

export default function ActivityProgressTab({ categoryProgress }: Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-white text-lg">{t("activityProgressTitle")}</p>
          <p className="theme-text text-sm">{t("activityProgressSubtitle")}</p>
        </div>
        <Link href="/user-profile/activity-details" className="text-sm font-bold theme-text hover:text-white hover:underline shrink-0 mt-1">
          {t("viewAll")}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACTIVITIES.map(activity => {
          const { completed, total } = categoryProgress[activity.category];
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <div key={activity.number} className={`bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 ${activity.numBgGlass} backdrop-blur border border-white/20 rounded-full flex items-center justify-center text-lg shrink-0`}>
                  {activity.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm truncate">{t(activity.titleKey)}</p>
                  <p className="theme-text-muted text-xs">
                    {total > 0 ? `${completed}/${total} ${t("progressDaysCompleted")}` : t("notStartedYet")}
                  </p>
                </div>
                <span className="font-black theme-text text-sm shrink-0">{pct}%</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${activity.gradient}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
