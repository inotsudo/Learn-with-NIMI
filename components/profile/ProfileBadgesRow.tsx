"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

const PROFILE_BADGES = [
  { emoji: "🎵", bg: "bg-purple-600", titleKey: "badgeMusicStar" },
  { emoji: "🤸", bg: "bg-pink-600", titleKey: "badgeMovingHero" },
  { emoji: "🎨", bg: "bg-orange-500", titleKey: "badgeArtCreator" },
  { emoji: "🏛️", bg: "bg-amber-700", titleKey: "badgeHistoryExplorer" },
  { emoji: "🔍", bg: "bg-green-600", titleKey: "badgeZoomDetective" },
];

export default function ProfileBadgesRow() {
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
        {PROFILE_BADGES.map((badge, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 w-16">
            <div className={`w-14 h-14 ${badge.bg} rounded-full flex items-center justify-center text-2xl shadow-md`}>
              {badge.emoji}
            </div>
            <p className="text-[11px] text-center font-bold text-purple-200 leading-tight">
              {t(badge.titleKey)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
