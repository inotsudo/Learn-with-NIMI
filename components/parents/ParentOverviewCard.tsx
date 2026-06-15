"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { fillTemplate, LANGUAGE_META } from "@/app/_achievementData";
import type { OverviewSummary } from "@/lib/parentInsights";

interface Props {
  overview: OverviewSummary;
  childName: string;
  avatarUrl: string | null;
}

const STATUS_KEY: Record<OverviewSummary["status"], string> = {
  complete: "overviewStatusComplete",
  onTrack: "overviewStatusOnTrack",
  justStarting: "overviewStatusJustStarting",
};

const STATUS_STYLE: Record<OverviewSummary["status"], string> = {
  complete: "bg-yellow-100 text-yellow-700 border-yellow-300",
  onTrack: "bg-blue-100 text-blue-700 border-blue-300",
  justStarting: "bg-green-100 text-green-700 border-green-300",
};

export default function ParentOverviewCard({ overview, childName, avatarUrl }: Props) {
  const { t } = useLanguage();
  const activeMeta = LANGUAGE_META[overview.activeLanguage];

  return (
    <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-md p-4">
      <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2">{t("overviewSectionTitle")}</p>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center shrink-0 overflow-hidden">
          {avatarUrl && avatarUrl.startsWith("http") ? (
            <img src={avatarUrl} alt={childName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl select-none">{avatarUrl || "🧑"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-800 text-lg truncate">{childName}</p>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 font-bold">
            <span>{t("overviewActiveLanguageLabel")}:</span>
            <span className="text-lg">{activeMeta.flag}</span>
            <span>{activeMeta.label}</span>
          </div>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-black border-2 ${STATUS_STYLE[overview.status]}`}>
          {t(STATUS_KEY[overview.status])}
        </span>
      </div>

      <p className="font-bold text-gray-600 text-sm mt-3">
        {fillTemplate(t("levelOfMaxLabel"), { level: String(overview.currentLevel), max: String(overview.maxLevel) })}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="font-black text-gray-800 text-2xl">{overview.totalCertificates}</p>
          <p className="text-gray-400 text-xs mt-0.5">{t("overviewCertificatesLabel")}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="font-black text-gray-800 text-2xl">{overview.totalBadges}</p>
          <p className="text-gray-400 text-xs mt-0.5">{t("overviewBadgesLabel")}</p>
        </div>
      </div>
    </div>
  );
}
