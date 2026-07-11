"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

const BADGE_TYPES = [
  { emoji: "🎵", bg: "bg-green-400",  shadow: "shadow-green-100",  labelKey: "musicBadgeLabel"  },
  { emoji: "📖", bg: "bg-blue-400",   shadow: "shadow-blue-100",   labelKey: "storyBadgeLabel"  },
  { emoji: "🎨", bg: "bg-orange-400", shadow: "shadow-orange-100", labelKey: "artBadgeLabel"    },
];

interface Props {
  todayStars: number;
  chatStreakDays: number;
  badgeCount: number;
  activitiesCompleted: number; // kept for API compat, no longer displayed
}

export default function ChatSidebar({ todayStars, chatStreakDays, badgeCount }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  return (
    <div className="flex flex-col gap-3">

      {/* Today's Stars */}
      <div className="bg-ds-surface border border-ds-border shadow-ds-card p-4 text-center"
        style={{ borderRadius:"var(--leaf-r)" }}>
        <p className="font-black text-ds-text text-[12px] tracking-wide uppercase">{t("todaysStarsTitle")}</p>
        <motion.p
          key={todayStars}
          initial={{ scale:1.3, opacity:0.6 }}
          animate={{ scale:1,   opacity:1 }}
          className="text-[28px] font-black text-yellow-500 mt-1 leading-tight"
        >
          ⭐ {todayStars}
        </motion.p>
        <p className="text-[11px] text-gray-500 mt-1 leading-snug">{t("todaysStarsEncouragement")}</p>
      </div>

      {/* Chat Streak */}
      <div className="bg-ds-surface border border-ds-border shadow-ds-card p-4 text-center"
        style={{ borderRadius:"var(--leaf-r)" }}>
        <p className="font-black text-ds-text text-[12px] tracking-wide uppercase">{t("currentStreakLabel")}</p>
        <motion.p
          key={chatStreakDays}
          initial={{ scale:1.3, opacity:0.6 }}
          animate={{ scale:1,   opacity:1 }}
          className="text-[28px] font-black text-orange-500 mt-1 leading-tight"
        >
          🔥 {t("chatStreakDaysLabel").replace("{count}", String(chatStreakDays))}
        </motion.p>
        <p className="text-[11px] text-gray-500 mt-1 leading-snug">{t("chatStreakEncouragement")}</p>
      </div>

      {/* Badges Earned */}
      <div className="bg-ds-surface border border-ds-border shadow-ds-card p-4"
        style={{ borderRadius:"var(--leaf-r)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-ds-text text-[12px] tracking-wide uppercase">{t("badgesEarnedTitle")}</h3>
          <Link href="/user-profile"
            className="text-[11px] font-bold text-nimi-green hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        <div className="flex items-center justify-around gap-2">
          {BADGE_TYPES.map((badge, i) => {
            const earned = i < badgeCount;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <motion.div
                  whileHover={earned ? { scale:1.12 } : {}}
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm transition-all ${
                    earned ? `${badge.bg} ${badge.shadow} shadow-md` : "bg-gray-100 grayscale opacity-40"
                  }`}
                >
                  {badge.emoji}
                </motion.div>
                <p className="text-[11px] font-bold text-gray-400 text-center leading-tight">{t(badge.labelKey)}</p>
              </div>
            );
          })}
        </div>
        {badgeCount === 0 && (
          <p className="text-center text-[11px] text-gray-400 mt-3">Complete stories to earn badges!</p>
        )}
      </div>

      {/* Nimi's Tip */}
      <div className="bg-ds-surface border border-ds-border shadow-ds-card p-4 flex items-start gap-3"
        style={{ borderRadius:"var(--leaf-r)" }}>
        <div className="min-w-0 flex-1">
          <p className="font-black text-ds-text text-[12px] tracking-wide uppercase mb-1">{t("nimiTipTitle")}</p>
          <p className="text-[11px] text-gray-500 leading-snug">{t("nimiTipBody")}</p>
        </div>
        <img src={assets.nimiCircle} alt="NIMI"
          className="w-10 h-10 rounded-full object-cover border-2 border-yellow-300 shadow flex-shrink-0"  loading="lazy" />
      </div>
    </div>
  );
}
