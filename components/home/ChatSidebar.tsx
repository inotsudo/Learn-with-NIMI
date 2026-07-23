"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { DURATION, SPRING } from "@/lib/design-system/motion";
import type { ChildBadge } from "@/lib/queries";
import { MILESTONE_BADGES } from "@/lib/milestoneBadges";
import BadgeCircle from "@/components/stories/BadgeCircle";

interface Props {
  todayStars: number;
  chatStreakDays: number;
  badges: ChildBadge[];
  badgeImageMap?: Record<string, string>;
  activitiesCompleted: number;
}

export default function ChatSidebar({ todayStars, chatStreakDays, badges, badgeImageMap = {} }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const earnedCount = badges.length;

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
          <Link href="/user-profile" className="text-[11px] font-bold text-ds-brand hover:underline">
            {t("viewAll")}
          </Link>
        </div>

        {badges.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {badges.slice(0, 6).map((b, i) => (
              <motion.div key={b.badge_slug}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...SPRING.bounce, delay: i * DURATION.fast }}
                whileHover={{ scale: 1.15, rotate: 8 }}>
                <BadgeCircle slug={b.badge_slug} size="sm" imageUrl={badgeImageMap?.[b.badge_slug]} />
              </motion.div>
            ))}
            {badges.length > 6 && (
              <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-[10px] font-black text-gray-400">+{badges.length - 6}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-around gap-1">
            {MILESTONE_BADGES.map((badge, i) => (
              <motion.div key={badge.slug}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 0.88, opacity: 1 }}
                transition={{ ...SPRING.bounce, delay: i * DURATION.fast }}
                whileHover={{ scale: 1.06 }}
                title={`🔒 ${badge.desc}`}
                className="flex flex-col items-center gap-1 cursor-default">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center relative">
                  <span className="grayscale opacity-25 text-xl">{badge.emoji}</span>
                  <motion.span
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ duration: DURATION.loopBase, repeat: Infinity, delay: i * 0.3 }}
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center">
                    <Lock className="w-2 h-2 text-gray-400" />
                  </motion.span>
                </div>
                <p className="text-[9px] font-bold text-center leading-tight text-gray-300">{badge.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {earnedCount === 0 && (
          <p className="text-center text-[11px] text-ds-muted mt-2">Complete stories to earn badges!</p>
        )}
      </div>

      {/* Nimi's Tip */}
      <div className="bg-ds-surface border border-ds-border shadow-ds-card p-4 flex items-start gap-3"
        style={{ borderRadius:"var(--leaf-r)" }}>
        <div className="min-w-0 flex-1">
          <p className="font-black text-ds-text text-[12px] tracking-wide uppercase mb-1">{t("nimiTipTitle")}</p>
          <p className="text-[11px] text-gray-500 leading-snug">{t("nimiTipBody")}</p>
        </div>
        <Image src={assets.nimiCircle} alt="NIMI" width={40} height={40}
          className="w-10 h-10 rounded-full object-cover border-2 border-yellow-300 shadow flex-shrink-0" />
      </div>
    </div>
  );
}
