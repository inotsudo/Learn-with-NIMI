"use client";

import Image from "next/image";
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
  complete: "bg-yellow-50 text-yellow-700 border-yellow-200",
  onTrack: "bg-blue-50 text-blue-700 border-blue-200",
  justStarting: "bg-green-50 text-green-700 border-green-200",
};

export default function ParentOverviewCard({ overview, childName, avatarUrl }: Props) {
  const { t } = useLanguage();
  const activeMeta = LANGUAGE_META[overview.activeLanguage];

  return (
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/35 to-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">{t("overviewSectionTitle")}</p>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {avatarUrl && avatarUrl.startsWith("http") ? (
            <Image src={avatarUrl} alt={childName} fill className="object-cover" />
          ) : (
            <span className="text-3xl select-none">{avatarUrl || "🧑"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-ds-text text-lg truncate">{childName}</p>
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

      <p className="font-bold text-ds-text text-sm mt-3">
        {fillTemplate(t("levelOfMaxLabel"), { level: String(overview.currentLevel), max: String(overview.maxLevel) })}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-gray-50 leaf p-3 text-center">
          <p className="font-black text-ds-text text-2xl">{overview.totalCertificates}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t("overviewCertificatesLabel")}</p>
        </div>
        <div className="bg-gray-50 leaf p-3 text-center">
          <p className="font-black text-ds-text text-2xl">{overview.totalBadges}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t("overviewBadgesLabel")}</p>
        </div>
      </div>
    </div>
  );
}
