"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useThemeMotion } from "@/hooks/useThemeMotion";

interface DailyAdventureGridProps {
  completedInLevel: Set<ActivityCategory>;
}

export default function DailyAdventureGrid({ completedInLevel }: DailyAdventureGridProps) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {ACTIVITIES.map((activity) => {
        const done = completedInLevel.has(activity.category);

        const card = (
          <motion.div
            whileHover={m.cardHover}
            whileTap={m.buttonPress}
            className={`relative overflow-hidden bg-white/95 border border-ds-border shadow-[0_14px_32px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)] transition-all flex flex-col items-center pt-4 pb-3 px-2 h-full cursor-pointer ${done ? "ring-2 ring-green-400/30" : ""}`}
            style={{ borderRadius: 'var(--leaf-r)' }}
          >
            {/* Number badge */}
            <div className={`absolute top-2 left-2 w-6 h-6 ${activity.numBg} text-white rounded-full flex items-center justify-center font-black text-[11px] shadow-[0_8px_18px_rgba(15,23,42,0.12)]`}>
              {activity.number}
            </div>

            {/* Mascot */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-2 flex items-center justify-center">
              <img
                src={activity.mascot === "piko" ? assets.pikoCircle : assets.nimiCircle}
                alt={activity.mascot.toUpperCase()}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow"
              />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-7 h-7 flex items-center justify-center text-base shadow-[0_8px_18px_rgba(15,23,42,0.12)] border border-gray-200 leading-none">
                {activity.emoji}
              </div>
            </div>

            <p className={`font-black text-ds-text text-xs sm:text-sm uppercase text-center leading-tight`}>
              {t(activity.titleKey)}
            </p>
            <p className="text-gray-500 text-[10px] sm:text-[11px] text-center leading-snug mt-0.5 min-h-[28px]">
              {t(activity.subtitleKey)}
            </p>

            {/* Start button */}
            <div className={`mt-2 w-full ${activity.numBg} text-white font-black text-[11px] sm:text-xs uppercase py-2 text-center shadow-[0_10px_22px_rgba(15,23,42,0.12)]`} style={{ borderRadius: 'var(--leaf-r-sm)' }}>
              {t(activity.startKey ?? "")}
            </div>

            {/* Activity star */}
            <div className="mt-2 text-lg leading-none">
              {done ? "⭐" : <span className="text-gray-300">☆</span>}
            </div>
          </motion.div>
        );

        return (
          <Link key={activity.number} href={activity.href}>
            {card}
          </Link>
        );
      })}
    </div>
  );
}

export function DailyChampionCTA({ activitiesCompleted }: { activitiesCompleted: number }) {
  const { t } = useLanguage();

  return (
    <div className="bg-ds-action shadow-md p-4 sm:p-5 text-white text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3" style={{ borderRadius: 'var(--leaf-r)' }}>
      <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-300 shrink-0" />
      <p className="font-black text-sm sm:text-base">{t("levelChampionCtaTitle")}</p>
      <span className="text-yellow-300 font-bold text-sm">{activitiesCompleted}/8</span>
    </div>
  );
}
