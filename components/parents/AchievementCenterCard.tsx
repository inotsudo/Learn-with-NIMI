"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildAchievementCatalog, getEarnedMap, getTrilingualStatus, type AchievementItem } from "@/app/_achievementData";
import type { ChildAchievement } from "@/lib/queries";
import TrilingualChampionBanner from "@/components/certificates/TrilingualChampionBanner";

interface Props {
  achievements: ChildAchievement[];
  maxLevel: number;
  childName: string;
}

export default function AchievementCenterCard({ achievements, maxLevel, childName }: Props) {
  const { t } = useLanguage();
  const catalog = buildAchievementCatalog(maxLevel, t);
  const earnedMap = getEarnedMap(achievements);
  const trilingual = getTrilingualStatus(achievements);

  const earnedCount = (items: AchievementItem[]) => items.filter(item => earnedMap.has(item.slug)).length;

  const tiles = [
    { labelKey: "explorerBadgesSectionTitle", emoji: "🧭", items: catalog.filter(item => item.tier === "explorer") },
    { labelKey: "categoryMasterBadgesSectionTitle", emoji: "🏅", items: catalog.filter(item => item.tier === "categoryMaster") },
    { labelKey: "languageExplorerCertSectionTitle", emoji: "📜", items: catalog.filter(item => item.tier === "languageExplorer") },
  ];

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
      <p className="font-black text-white mb-3">{t("achievementCenterTitle")}</p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {tiles.map(tile => (
          <div key={tile.labelKey} className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-2xl">{tile.emoji}</p>
            <p className="font-black text-white text-sm mt-1">{earnedCount(tile.items)}/{tile.items.length}</p>
            <p className="text-purple-300 text-xs mt-0.5 leading-tight">{t(tile.labelKey)}</p>
          </div>
        ))}
      </div>

      <TrilingualChampionBanner status={trilingual} childName={childName} />

      <Link href="/certificates" className="block text-center text-purple-200 font-black text-sm hover:underline">
        {t("viewFullAchievementDashboard")}
      </Link>
    </div>
  );
}
