"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES } from "@/app/_activityData";

interface Props {
  stepsCompleted: number[];
}

const BADGE_KEYS: Record<number, string> = {
  1: "badgeMorningStar", 2: "badgeMovementMaster", 3: "badgeCreativeArtist",
  4: "badgeHistoryExplorer", 5: "badgeZoomDetective", 6: "badgeDiscoveryChamp",
  7: "badgeStoryReader", 8: "badgeColoringStar",
};

export default function RecentBadgesCard({ stepsCompleted }: Props) {
  const { t } = useLanguage();
  const earned = new Set(stepsCompleted);
  const earnedCount = earned.size;
  const total = ACTIVITIES.length;

  return (
    <div className="bg-ds-card border border-ds-border shadow-ds-card p-5" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-baloo font-black text-ds-text text-[16px]">🎖️ {t("recentBadgesTitle")}</h2>
        <span className="text-[11px] font-bold text-ds-muted">{earnedCount} / {total}</span>
      </div>

      {/* Progress strip */}
      <div className="w-full h-1.5 bg-ds-border rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-cta-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${(earnedCount / total) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Badge grid — all 8 activities */}
      <div className="grid grid-cols-4 gap-3">
        {ACTIVITIES.map((activity, i) => {
          const isEarned = earned.has(activity.number);
          const label = t(BADGE_KEYS[activity.number] ?? activity.titleKey);
          return (
            <motion.div
              key={activity.number}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.055, type: "spring", stiffness: 280, damping: 20 }}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <div className={`relative w-14 h-14 rounded-full flex items-center justify-center text-2xl ring-2 transition-all ${
                isEarned
                  ? `${activity.numBg} ring-amber-300 shadow-[0_4px_14px_rgba(251,191,36,0.35)]`
                  : "bg-gray-100 ring-gray-200 opacity-40 grayscale"
              }`}>
                {activity.emoji}
                {isEarned && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm text-[7px] text-white font-black">✓</span>
                )}
              </div>
              <p className={`font-nunito font-bold text-[10px] leading-tight max-w-[64px] ${isEarned ? "text-ds-text" : "text-ds-muted"}`}>
                {label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {earnedCount === 0 && (
        <p className="text-center text-ds-muted text-[12px] mt-3">{t("noBadgesYet")}</p>
      )}
    </div>
  );
}
