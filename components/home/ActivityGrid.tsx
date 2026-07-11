"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

interface ActivityGridProps {
  completedCategories: Set<ActivityCategory>;
  starsByCategory?: Partial<Record<ActivityCategory, number>>;
}

export default function ActivityGrid({ completedCategories, starsByCategory }: ActivityGridProps) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ACTIVITIES.map((activity) => {
        const done = completedCategories.has(activity.category);
        const stars = starsByCategory?.[activity.category] ?? activity.stars;
        return (
          <Link key={activity.number} href={activity.href}>
            <motion.div
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={m.buttonPress}
              className="group relative overflow-hidden border border-[var(--ds-border-primary)] bg-white/90 shadow-[0_14px_32px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_38px_rgba(15,23,42,0.12)] transition-all cursor-pointer flex flex-col items-center pt-3 pb-3 px-2 h-full"
              style={{
                borderRadius: 'var(--leaf-r)',
                backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.96), rgba(248,251,244,0.92)), url('${assets.storyCard.background}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundImage: `url('${assets.storyCard.frame}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="absolute inset-x-3 top-2 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
              <div className="absolute inset-x-3 bottom-2 h-10 rounded-2xl bg-white/35 blur-xl" />
              {/* Number badge */}
              <div className={`absolute top-2 left-2 w-6 h-6 ${activity.numBgGlass} ${activity.numTextGlass} rounded-full flex items-center justify-center font-black text-[11px] shadow-[0_6px_16px_rgba(15,23,42,0.12)]`}>
                {activity.number}
              </div>

              {/* Stars pill */}
              <div className="absolute top-2 right-2 bg-white/80 rounded-full px-1.5 py-0.5 text-[9px] font-black text-yellow-600 flex items-center gap-0.5 shadow-sm">
                ⭐ {stars}
              </div>

              {/* Mascot */}
              <div className="relative w-16 h-16 mt-4 mb-2 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[var(--ds-brand-soft)]/60 blur-xl" />
                <img
                  src={activity.mascot === "piko" ? assets.pikoCircle : assets.nimiCircle}
                  alt={activity.mascot.toUpperCase()}
                  className="relative w-12 h-12 rounded-full object-cover border-2 border-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]"
                />
                <div className="absolute -bottom-1 -right-1 bg-[var(--ds-brand-soft)] rounded-full w-6 h-6 flex items-center justify-center text-sm shadow leading-none">
                  {activity.emoji}
                </div>
              </div>

              <p className="relative font-black text-[var(--ds-text-primary)] text-[11px] uppercase tracking-[0.14em] text-center leading-tight">
                {t(activity.titleKey)}
              </p>
              <p className="relative text-[var(--ds-text-secondary)] text-[9px] text-center leading-snug mt-0.5 min-h-[24px]">
                {t(activity.subtitleKey)}
              </p>

              {/* Progress dot */}
              <div className={`relative mt-1 flex h-2.5 w-2.5 items-center justify-center rounded-full ${done ? "bg-[var(--ds-brand-primary)] shadow-[0_0_0_4px_rgba(22,163,74,0.16)]" : "bg-gray-200"}`} />
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
