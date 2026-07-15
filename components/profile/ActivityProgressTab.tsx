"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";

interface Props {
  categoryProgress: Record<ActivityCategory, { completed: number; total: number }>;
}

export default function ActivityProgressTab({ categoryProgress }: Props) {
  const { t } = useLanguage();

  const totalDone = ACTIVITIES.reduce((acc, a) => acc + (categoryProgress[a.category].completed > 0 ? 1 : 0), 0);
  const totalActivities = ACTIVITIES.length;

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-baloo font-black text-ds-text text-[18px]">{t("activityProgressTitle")}</p>
          <p className="text-ds-muted text-[13px] mt-0.5">{t("activityProgressSubtitle")}</p>
        </div>
        <Link href="/user-profile/activity-details"
          className="text-[12px] font-bold text-[var(--ds-brand-primary)] hover:underline shrink-0 mt-1.5">
          {t("viewAll")} →
        </Link>
      </div>

      {/* Overall progress bar */}
      <div className="bg-ds-card border border-ds-border p-4 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-black text-ds-text">{t("profileOverallProgressLabel")}</span>
          <span className="text-[13px] font-black text-[var(--ds-brand-primary)]">{totalDone}/{totalActivities}</span>
        </div>
        <div className="h-3 bg-ds-border rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-cta-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${(totalDone / totalActivities) * 100}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Activity cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACTIVITIES.map((activity, i) => {
          const { completed, total } = categoryProgress[activity.category];
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const isDone = pct === 100;

          return (
            <motion.div
              key={activity.number}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`bg-ds-card border shadow-ds-card p-4 ${isDone ? "border-amber-200" : "border-ds-border"}`}
              style={{ borderRadius: 'var(--leaf-r)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 ${activity.numBg} rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                  {activity.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-baloo font-black text-ds-text text-[14px] truncate">{t(activity.titleKey)}</p>
                  <p className="text-ds-muted text-[11px]">
                    {completed > 0
                      ? `${completed}/${total} ${t("progressDaysCompleted")}`
                      : t("notStartedYet")}
                  </p>
                </div>
                <span className={`font-black text-[14px] shrink-0 tabular-nums ${isDone ? "text-amber-500" : "text-ds-text"}`}>
                  {isDone ? "🏅" : `${pct}%`}
                </span>
              </div>
              <div className="h-2 bg-ds-border rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isDone ? "bg-gradient-to-r from-amber-400 to-yellow-400" : "bg-cta-gradient"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.05 + 0.1, ease: "easeOut" }}
                  style={{ minWidth: pct > 0 ? 8 : 0 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
