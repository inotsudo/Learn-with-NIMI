"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";

interface ActivityGridProps {
  completedCategories: Set<ActivityCategory>;
  starsByCategory?: Partial<Record<ActivityCategory, number>>;
}

export default function ActivityGrid({ completedCategories, starsByCategory }: ActivityGridProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ACTIVITIES.map((activity) => {
        const done = completedCategories.has(activity.category);
        const stars = starsByCategory?.[activity.category] ?? activity.stars;
        return (
          <Link key={activity.number} href={activity.href}>
            <motion.div
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`relative bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col items-center pt-3 pb-3 px-2 h-full`}
            >
              {/* Number badge */}
              <div className={`absolute top-2 left-2 w-6 h-6 ${activity.numBgGlass} backdrop-blur border border-white/20 ${activity.numTextGlass} rounded-full flex items-center justify-center font-black text-[11px] shadow`}>
                {activity.number}
              </div>

              {/* Stars pill */}
              <div className="absolute top-2 right-2 bg-yellow-400/20 backdrop-blur border border-white/20 rounded-full px-1.5 py-0.5 text-[9px] font-black text-yellow-200 flex items-center gap-0.5">
                ⭐ {stars}
              </div>

              {/* Mascot */}
              <div className="relative w-16 h-16 mt-4 mb-2 flex items-center justify-center">
                <img
                  src={activity.mascot === "piko" ? "/piko-logo-circle.png.png" : "/nimi-logo-circle.png"}
                  alt={activity.mascot.toUpperCase()}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                />
                <div className="absolute -bottom-1 -right-1 bg-white/10 backdrop-blur rounded-full w-6 h-6 flex items-center justify-center text-sm shadow border border-white/20 leading-none">
                  {activity.emoji}
                </div>
              </div>

              <p className="font-black text-white text-[11px] uppercase text-center leading-tight">
                {t(activity.titleKey)}
              </p>
              <p className="theme-text text-[9px] text-center leading-snug mt-0.5 min-h-[24px]">
                {t(activity.subtitleKey)}
              </p>

              {/* Progress dot */}
              <div className={`w-2.5 h-2.5 rounded-full mt-1 ${done ? "bg-green-500" : "bg-white/20"}`} />
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
