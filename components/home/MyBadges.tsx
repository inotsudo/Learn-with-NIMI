"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ACTIVITIES } from "@/app/_activityData";
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
  step: a.number,
  title: BADGE_TITLES[a.number] ?? a.titleKey,
  icon: a.emoji,
  bg: a.numBgGlass,
  href: a.href,
}));

interface Props {
  completedSteps: number[];
}

export default function MyBadges({ completedSteps }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4 flex flex-col h-full">
      <h3 className="font-black text-white text-[12px] mb-3 text-center tracking-wide">My Badges</h3>
      <div className="grid grid-cols-3 gap-2 flex-1">
        {BADGE_MAP.map(badge => {
          const earned = completedSteps.includes(badge.step);
          return (
            <div key={badge.title} className="flex flex-col items-center gap-1">
              {earned ? (
                <Link href={badge.href}>
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    className={`w-12 h-12 ${badge.bg} backdrop-blur border border-white/20 rounded-full flex items-center justify-center text-2xl shadow-md cursor-pointer`}>
                    {badge.icon}
                  </motion.div>
                </Link>
              ) : (
                <div className="w-12 h-12 bg-white/10 backdrop-blur border border-white/20 rounded-full flex items-center justify-center text-2xl opacity-40 relative">
                  {badge.icon}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                    <span className="text-sm">🔒</span>
                  </div>
                </div>
              )}
              <p className={`text-[8px] text-center leading-tight font-semibold ${earned ? "theme-text" : "text-gray-300"}`}>
                {badge.title}
              </p>
              <span className={`text-xs leading-none ${earned ? "text-yellow-500" : "text-gray-200"}`}>⭐</span>
            </div>
          );
        })}
      </div>
      {completedSteps.length === 0 && (
        <p className="text-[9px] theme-text-muted text-center mt-2 leading-snug">
          Complete steps to earn badges!
        </p>
      )}
      <Link
        href="/certificates"
        className="block text-center text-[10px] font-black theme-text mt-2 pt-2 border-t border-white/15 hover:underline"
      >
        {t("viewAllAchievements")} →
      </Link>
    </div>
  );
}
