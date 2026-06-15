"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";

interface DailyAdventureGridProps {
  completedInLevel: Set<ActivityCategory>;
}

export default function DailyAdventureGrid({ completedInLevel }: DailyAdventureGridProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {ACTIVITIES.map((activity) => {
        const done = completedInLevel.has(activity.category);

        const card = (
          <motion.div
            whileHover={{ scale: 1.04, y: -4 }}
            whileTap={{ scale: 0.97 }}
            className={`relative bg-white border-2 ${activity.borderColor} rounded-2xl shadow-sm hover:shadow-xl transition-all flex flex-col items-center pt-4 pb-3 px-2 h-full cursor-pointer`}
          >
            {/* Number badge */}
            <div className={`absolute top-2 left-2 w-6 h-6 ${activity.numBg} rounded-full flex items-center justify-center text-white font-black text-[11px] shadow`}>
              {activity.number}
            </div>

            {/* Mascot */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-2 flex items-center justify-center">
              <img
                src={activity.mascot === "piko" ? "/piko-logo-circle.png.png" : "/nimi-logo-circle.png"}
                alt={activity.mascot.toUpperCase()}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow"
              />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-7 h-7 flex items-center justify-center text-base shadow border border-gray-100 leading-none">
                {activity.emoji}
              </div>
            </div>

            <p className={`font-black text-gray-800 text-xs sm:text-sm uppercase text-center leading-tight`}>
              {t(activity.titleKey)}
            </p>
            <p className="text-gray-500 text-[10px] sm:text-[11px] text-center leading-snug mt-0.5 min-h-[28px]">
              {t(activity.subtitleKey)}
            </p>

            {/* Start button */}
            <div className={`mt-2 w-full ${activity.numBg} text-white font-black text-[11px] sm:text-xs uppercase rounded-full py-2 text-center shadow`}>
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
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-md p-4 sm:p-5 text-white text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
      <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-300 shrink-0" />
      <p className="font-black text-sm sm:text-base">{t("levelChampionCtaTitle")}</p>
      <span className="text-yellow-300 font-bold text-sm">{activitiesCompleted}/8</span>
    </div>
  );
}
