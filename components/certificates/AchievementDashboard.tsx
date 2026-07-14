"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  buildAchievementCatalog, getEarnedMap, getTrilingualStatus,
  LANGUAGE_META, LANGUAGES, type Lang,
} from "@/app/_achievementData";
import type { ChildAchievement } from "@/lib/queries";
import AchievementCard from "./AchievementCard";
import TrilingualChampionBanner from "./TrilingualChampionBanner";

interface Props {
  childName: string;
  childLanguage: Lang;
  achievements: ChildAchievement[];
  maxLevel: number;
  levelSlugs?: Map<number, string>;
}

export default function AchievementDashboard({ childName, childLanguage, achievements, maxLevel, levelSlugs }: Props) {
  const { t } = useLanguage();
  const [activeLang, setActiveLang] = useState<Lang>(childLanguage);

  const catalog = buildAchievementCatalog(maxLevel, t, levelSlugs);
  const earnedMap = getEarnedMap(achievements);
  const trilingual = getTrilingualStatus(achievements);

  const langItems = catalog.filter(item => item.language === activeLang);
  const certItem = langItems.find(item => item.tier === "languageExplorer");
  const explorerItems = langItems.filter(item => item.tier === "explorer");
  const categoryItems = langItems.filter(item => item.tier === "categoryMaster");

  return (
    <div className="mt-4">
      <TrilingualChampionBanner status={trilingual} childName={childName} />

      {/* Language tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => setActiveLang(lang)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-black transition-colors ${
              activeLang === lang
                ? "bg-[var(--nimi-green)] text-white shadow"
                : "border border-ds-border text-ds-text bg-white hover:bg-gray-50"
            }`}
          >
            <span className="text-lg">{LANGUAGE_META[lang].flag}</span>
            {LANGUAGE_META[lang].label}
          </button>
        ))}
      </div>

      {certItem && (
        <div className="mb-5">
          <h2 className="font-black text-ds-text text-sm uppercase tracking-wide mb-2">
            {t("languageExplorerCertSectionTitle")}
          </h2>
          <div className="max-w-sm">
            <AchievementCard item={certItem} earnedAt={earnedMap.get(certItem.slug) ?? null} childName={childName} />
          </div>
        </div>
      )}

      <div className="mb-5">
        <h2 className="font-black text-ds-text text-sm uppercase tracking-wide mb-2">
          {t("explorerBadgesSectionTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {explorerItems.map(item => (
            <AchievementCard key={item.slug} item={item} earnedAt={earnedMap.get(item.slug) ?? null} childName={childName} />
          ))}
        </div>
      </div>

      <div className="mb-5">
        <h2 className="font-black text-ds-text text-sm uppercase tracking-wide mb-2">
          {t("categoryMasterBadgesSectionTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryItems.map(item => (
            <AchievementCard key={item.slug} item={item} earnedAt={earnedMap.get(item.slug) ?? null} childName={childName} />
          ))}
        </div>
      </div>
    </div>
  );
}
