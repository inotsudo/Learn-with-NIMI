"use client";

import Link from "next/link";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import { useLanguage } from "@/contexts/LanguageContext";

const BADGE_KEYS: Record<number, string> = {
  1: "badgeMorningStar", 2: "badgeMovementMaster", 3: "badgeCreativeArtist",
  4: "badgeHistoryExplorer", 5: "badgeZoomDetective", 6: "badgeDiscoveryChamp",
  7: "badgeStoryReader", 8: "badgeColoringStar",
};

interface Props {
  completedInLevel: Set<ActivityCategory>;
}

export default function ProfileBadgesRow({ completedInLevel }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-ds-text">{t("myBadges")}</h3>
        <Link href="/user-profile" className="text-sm font-bold text-ds-text hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <div className="flex flex-wrap justify-between sm:justify-start sm:gap-6 gap-4">
        {ACTIVITIES.map(a => {
          const badge = { category: a.category, title: t(BADGE_KEYS[a.number] ?? a.titleKey), icon: a.emoji, bg: a.numBgGlass, href: a.href };
          const earned = completedInLevel.has(badge.category);
          return (
            <div key={badge.category} className="flex flex-col items-center gap-1.5 w-16">
              {earned ? (
                <Link href={badge.href}
                  className={`w-14 h-14 ${badge.bg} rounded-full flex items-center justify-center text-2xl shadow-md`}>
                  {badge.icon}
                </Link>
              ) : (
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl opacity-50 relative">
                  {badge.icon}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full">
                    <span className="text-sm">🔒</span>
                  </div>
                </div>
              )}
              <p className={`text-[11px] text-center font-bold leading-tight ${earned ? "text-ds-text" : "text-gray-400"}`}>
                {badge.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
