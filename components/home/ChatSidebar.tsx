"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const BADGE_TYPES = [
  { emoji: "🎵", bg: "bg-purple-400", labelKey: "musicBadgeLabel" },
  { emoji: "📖", bg: "bg-blue-400", labelKey: "storyBadgeLabel" },
  { emoji: "🎨", bg: "bg-orange-400", labelKey: "artBadgeLabel" },
];

interface Props {
  todayStars: number;
  chatStreakDays: number;
  badgeCount: number;
  activitiesCompleted: number;
}

export default function ChatSidebar({ todayStars, chatStreakDays, badgeCount, activitiesCompleted }: Props) {
  const { t } = useLanguage();
  const progressPct = Math.min(100, (activitiesCompleted / 8) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Today's Stars */}
      <div className="bg-white border-2 border-yellow-200 rounded-2xl shadow-md p-4 text-center">
        <p className="font-black text-gray-800 text-[12px] tracking-wide">{t("todaysStarsTitle")}</p>
        <p className="text-2xl font-black text-yellow-500 mt-1">⭐ {todayStars}</p>
        <p className="text-[10px] text-gray-400 mt-1 leading-snug">{t("todaysStarsEncouragement")}</p>
      </div>

      {/* Chat Streak */}
      <div className="bg-white border-2 border-red-200 rounded-2xl shadow-md p-4 text-center">
        <p className="font-black text-gray-800 text-[12px] tracking-wide">{t("chatStreakTitle")}</p>
        <p className="text-2xl font-black text-red-500 mt-1">
          🔥 {t("chatStreakDaysLabel").replace("{count}", String(chatStreakDays))}
        </p>
        <p className="text-[10px] text-gray-400 mt-1 leading-snug">{t("chatStreakEncouragement")}</p>
      </div>

      {/* Badges Earned */}
      <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-gray-800 text-[12px] tracking-wide">{t("badgesEarnedTitle")}</h3>
          <Link href="/user-profile" className="text-[10px] font-bold text-purple-600 hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        <div className="flex items-center justify-around gap-2">
          {BADGE_TYPES.map((badge, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-base shadow-sm ${
                  i < badgeCount ? badge.bg : "bg-gray-100 opacity-50"
                }`}
              >
                {badge.emoji}
              </div>
              <p className="text-[9px] font-bold text-gray-500 text-center leading-tight">{t(badge.labelKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Champion Certificate */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-md p-4 text-white text-center">
        <p className="font-black text-[12px] tracking-wide flex items-center justify-center gap-1.5">
          <Trophy className="w-4 h-4 text-yellow-300" />
          {t("dailyChampionCertTitle")}
        </p>
        <p className="text-[10px] text-purple-100 leading-snug mt-1.5">{t("dailyChampionCertDesc")}</p>
        <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden mt-3">
          <div className="bg-yellow-400 h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-[10px] font-black mt-1.5">{activitiesCompleted}/8</p>
      </div>

      {/* Nimi's Tip */}
      <div className="bg-white border-2 border-blue-200 rounded-2xl shadow-md p-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-black text-gray-800 text-[12px] tracking-wide mb-1">{t("nimiTipTitle")}</p>
          <p className="text-[10.5px] text-gray-500 leading-snug">{t("nimiTipBody")}</p>
        </div>
        <img src="/nimi-logo-circle.png" alt="NIMI"
          className="w-9 h-9 rounded-full object-cover border-2 border-yellow-300 shadow flex-shrink-0" />
      </div>
    </div>
  );
}
