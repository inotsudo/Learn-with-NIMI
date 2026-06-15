"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { fillTemplate, LANGUAGE_META } from "@/app/_achievementData";
import type { LanguageJourney } from "@/lib/parentInsights";

interface Props {
  journey: LanguageJourney;
  maxLevel: number;
  isActive: boolean;
}

export default function LanguageJourneyCard({ journey, maxLevel, isActive }: Props) {
  const { t } = useLanguage();
  const meta = LANGUAGE_META[journey.language];
  const { done, total } = journey.levelProgress;
  const levelPct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className={`bg-white rounded-2xl shadow-md p-4 border-2 ${isActive ? "border-purple-400" : "border-gray-100"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.flag}</span>
          <p className="font-black text-gray-800">{meta.label}</p>
        </div>
        {isActive && (
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 text-xs font-black shrink-0">
            {t("activeLanguageBadge")}
          </span>
        )}
      </div>

      <p className="font-bold text-gray-600 text-sm">
        {fillTemplate(t("levelOfMaxLabel"), { level: String(journey.currentLevel), max: String(maxLevel) })}
      </p>

      <div className="mt-2">
        <p className="text-xs text-gray-400 font-bold mb-1">
          {fillTemplate(t("missionsProgressLabel"), { done: String(done), total: String(total) })}
        </p>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${levelPct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-gray-600 font-bold">🔥 {journey.streak} {t("dayStreakLabel")}</span>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-gray-400 text-xs font-bold">{t("lastActivityLabel")}</span>
        <span className="text-gray-600 text-xs font-bold">
          {journey.lastActivityDate
            ? new Date(`${journey.lastActivityDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : t("journeyNotStartedYet")}
        </span>
      </div>

      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-400 font-bold mb-1">
          <span>{t("completionLabel")}</span>
          <span>{journey.completionPct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${journey.completionPct}%` }} />
        </div>
      </div>
    </div>
  );
}
