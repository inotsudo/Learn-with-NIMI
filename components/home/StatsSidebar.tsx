"use client";

import Link from "next/link";
import { Check, Trophy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const BADGE_TYPES = [
  { emoji: "⭐", bg: "bg-yellow-400" },
  { emoji: "🎵", bg: "bg-red-400" },
  { emoji: "🏃", bg: "bg-green-400" },
  { emoji: "🎨", bg: "bg-blue-400" },
  { emoji: "🔍", bg: "bg-teal-400" },
];

interface Props {
  weekStreak: boolean[];
  streakCount: number;
  badgeCount: number;
  todayStars: number;
  activitiesCompleted: number;
}

export default function StatsSidebar({ weekStreak, streakCount, badgeCount, todayStars, activitiesCompleted }: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-4">
      {/* Streak card */}
      <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
        <h3 className="font-black text-white text-[12px] mb-3 text-center tracking-wide">
          🔥 {t("dayStreak").replace("{count}", String(streakCount))}
        </h3>
        <div className="flex items-center justify-between">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold theme-text-muted">{label}</span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                  weekStreak[i]
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "bg-white/10 border-white/20 text-white/40"
                }`}
              >
                {weekStreak[i] && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] theme-text-muted text-center mt-3 leading-snug">
          {t("streakEncouragement")}
        </p>
      </div>

      {/* Badges preview */}
      <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-white text-[12px] tracking-wide">{t("myBadges")}</h3>
          <Link href="/user-profile" className="text-[10px] font-bold theme-text hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2">
          {BADGE_TYPES.map((badge, i) => (
            <div
              key={i}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-base shadow-sm ${
                i < badgeCount ? badge.bg : "bg-white/10 opacity-50"
              }`}
            >
              {badge.emoji}
            </div>
          ))}
        </div>
        <p className="text-[10px] theme-text-muted text-center mt-2 leading-snug">
          {badgeCount > 0 ? t("badgesEarned").replace("{count}", String(badgeCount)) : t("noBadgesYet")}
        </p>
      </div>

      {/* Certificate teaser */}
      <Link href="/certificates">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-md p-4 text-white cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-yellow-300" />
            <h3 className="font-black text-[12px] tracking-wide">{t("certificateTeaserTitle")}</h3>
          </div>
          <p className="text-[10px] theme-text leading-snug mb-2">{t("certificateTeaserBody")}</p>
          <p className="text-[10px] font-bold text-yellow-300">{activitiesCompleted}/8</p>
        </div>
      </Link>

      {/* Today's stars */}
      <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4 text-center">
        <p className="text-[11px] font-bold theme-text">{t("todayStarsLabel")}</p>
        <p className="text-2xl font-black text-yellow-500 mt-1">⭐ {todayStars}</p>
        {todayStars === 0 && (
          <p className="text-[9px] theme-text-muted mt-1 leading-snug">{t("keepLearningStars")}</p>
        )}
      </div>
    </div>
  );
}
