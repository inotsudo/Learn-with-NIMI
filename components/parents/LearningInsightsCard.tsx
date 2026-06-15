"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGE_META } from "@/app/_achievementData";
import { ACTIVITIES } from "@/app/_activityData";
import type { LearningInsights } from "@/lib/parentInsights";

interface Props {
  insights: LearningInsights;
}

const TREND_KEY: Record<LearningInsights["recentTrend"], string> = {
  up: "trendUp",
  steady: "trendSteady",
  down: "trendDown",
};

export default function LearningInsightsCard({ insights }: Props) {
  const { t } = useLanguage();
  const strongest = insights.strongestCategory
    ? ACTIVITIES.find(a => a.category === insights.strongestCategory!.category)
    : null;

  return (
    <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-md p-4">
      <p className="font-black text-gray-800 mb-3">{t("learningInsightsTitle")}</p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 text-sm font-bold">{t("strongestCategoryLabel")}</span>
          {strongest && insights.strongestCategory ? (
            <span className="font-black text-gray-800 text-sm text-right">
              {strongest.emoji} {t(strongest.titleKey)} · {insights.strongestCategory.completionPct}%
            </span>
          ) : (
            <span className="text-gray-400 text-sm font-bold">{t("noDataYetLabel")}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 text-sm font-bold">{t("mostActiveLanguageLabel")}</span>
          {insights.mostActiveLanguage ? (
            <span className="font-black text-gray-800 text-sm">
              {LANGUAGE_META[insights.mostActiveLanguage].flag} {LANGUAGE_META[insights.mostActiveLanguage].label}
            </span>
          ) : (
            <span className="text-gray-400 text-sm font-bold">{t("noDataYetLabel")}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 text-sm font-bold">{t("longestStreakLabel")}</span>
          <span className="font-black text-gray-800 text-sm">🔥 {insights.longestStreak} {t("dayStreakLabel")}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 text-sm font-bold">{t("recentTrendLabel")}</span>
          <span className="font-black text-gray-800 text-sm">{t(TREND_KEY[insights.recentTrend])}</span>
        </div>
      </div>
    </div>
  );
}
