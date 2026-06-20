"use client";

import Link from "next/link";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import { useLanguage } from "@/contexts/LanguageContext";

const BADGE_TITLES: Record<number, string> = {
  1: "Morning Star",
  2: "Movement Master",
  3: "Creative Artist",
  4: "History Explorer",
  5: "Zoom Detective",
  6: "Discovery Champ",
  7: "Story Reader",
  8: "Coloring Star",
};

const BADGE_MAP = ACTIVITIES.map(a => ({
  category: a.category,
  title: BADGE_TITLES[a.number] ?? a.titleKey,
  icon: a.emoji,
  bg: a.numBgGlass,
  href: a.href,
}));

interface Props {
  completedInLevel: Set<ActivityCategory>;
}

export default function ProfileBadgesRow({ completedInLevel }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-white">{t("myBadges")}</h3>
        <Link href="/user-profile" className="text-sm font-bold text-purple-200 hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <div className="flex flex-wrap justify-between sm:justify-start sm:gap-6 gap-4">
        {BADGE_MAP.map(badge => {
          const earned = completedInLevel.has(badge.category);
          return (
            <div key={badge.category} className="flex flex-col items-center gap-1.5 w-16">
              {earned ? (
                <Link href={badge.href}
                  className={`w-14 h-14 ${badge.bg} backdrop-blur border border-white/20 rounded-full flex items-center justify-center text-2xl shadow-md`}>
                  {badge.icon}
                </Link>
              ) : (
                <div className="w-14 h-14 bg-white/10 backdrop-blur border border-white/20 rounded-full flex items-center justify-center text-2xl opacity-40 relative">
                  {badge.icon}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                    <span className="text-sm">🔒</span>
                  </div>
                </div>
              )}
              <p className={`text-[11px] text-center font-bold leading-tight ${earned ? "text-purple-200" : "text-gray-300"}`}>
                {badge.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
