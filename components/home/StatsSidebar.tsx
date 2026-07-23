"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Trophy, Star, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DURATION, SPRING } from "@/lib/design-system/motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const BADGE_TYPES = [
  { emoji: "⭐", gradient: "linear-gradient(135deg,#fbbf24,#f59e0b)" },
  { emoji: "🎵", gradient: "linear-gradient(135deg,#f87171,#ef4444)" },
  { emoji: "🏃", gradient: "linear-gradient(135deg,#4ade80,#22c55e)" },
  { emoji: "🎨", gradient: "linear-gradient(135deg,#60a5fa,#3b82f6)" },
  { emoji: "🔍", gradient: "linear-gradient(135deg,#2dd4bf,#14b8a6)" },
];

interface Props {
  weekStreak: boolean[];
  streakCount: number;
  badgeCount: number;
  todayStars: number;
  activitiesCompleted: number;
}

export default function StatsSidebar({
  weekStreak,
  streakCount,
  badgeCount,
  todayStars,
  activitiesCompleted,
}: Props) {
  const { t } = useLanguage();
  const m = useThemeMotion();
  const certProgress = Math.min(100, (activitiesCompleted / 8) * 100);
  const hasStreak = streakCount > 0;
  const hasStars = todayStars > 0;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Streak card ── */}
      <div className="bg-white border border-ds-border shadow-ds-card p-4"
        style={{ borderRadius: "var(--leaf-r)" }}>
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <motion.span className="text-2xl leading-none"
            animate={hasStreak
              ? { y: [0, -4, 0], rotate: [-5, 5, -5, 0] }
              : { y: [0, -2, 0] }}
            transition={{ duration: hasStreak ? DURATION.loopFast : DURATION.loopSlow, repeat: Infinity }}>
            🔥
          </motion.span>
          <h3 className="font-baloo font-black text-ds-text text-sm tracking-wide">
            {t("dayStreak").replace("{count}", String(streakCount))}
          </h3>
          {streakCount >= 7 && (
            <motion.span className="text-sm" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING.bounce}>
              🏆
            </motion.span>
          )}
        </div>

        {/* Week dots */}
        <div className="flex items-center justify-between">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-bold text-gray-400">{label}</span>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: weekStreak[i] ? 1 : 0.85 }}
                transition={SPRING.soft}
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  weekStreak[i]
                    ? "bg-orange-500 border-orange-400 text-white shadow-glow-gold"
                    : "bg-gray-100 border-gray-200 text-gray-300"
                }`}>
                {weekStreak[i]
                  ? <Check className="w-4 h-4" strokeWidth={3} />
                  : <span className="w-2 h-2 rounded-full bg-gray-300 block" />}
              </motion.div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-ds-muted text-center mt-3 leading-snug">
          {t("streakEncouragement")}
        </p>
      </div>

      {/* ── Badges preview ── */}
      <div className="bg-white border border-ds-border shadow-ds-card p-4"
        style={{ borderRadius: "var(--leaf-r)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-baloo font-black text-ds-text text-[12px] tracking-wide">{t("myBadges")}</h3>
          <Link href="/user-profile" className="text-[10px] font-bold text-ds-brand hover:underline">
            {t("viewAll")}
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2">
          {BADGE_TYPES.map((badge, i) => {
            const earned = i < badgeCount;
            return (
              <motion.div key={i}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: earned ? 1 : 0.85, opacity: earned ? 1 : 0.45 }}
                transition={{ ...SPRING.bounce, delay: i * DURATION.fast }}
                whileHover={earned ? { scale: 1.15, rotate: 8 } : { scale: 1.08 }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-base cursor-default relative"
                style={earned
                  ? { background: badge.gradient, boxShadow: "0 3px 10px rgba(0,0,0,0.18)" }
                  : { background: "#F3F4F6" }}>
                {earned ? (
                  badge.emoji
                ) : (
                  <>
                    {/* Ghost of the badge — teases what's coming */}
                    <span className="grayscale opacity-30 select-none">{badge.emoji}</span>
                    {/* Pulsing lock pip */}
                    <motion.span
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: DURATION.loopBase, repeat: Infinity, delay: i * 0.3 }}
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center">
                      <Lock className="w-2 h-2 text-gray-400" />
                    </motion.span>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="text-[10px] text-ds-muted text-center mt-2 leading-snug">
          {badgeCount > 0
            ? t("badgesEarned").replace("{count}", String(badgeCount))
            : t("noBadgesYet")}
        </p>
      </div>

      {/* ── Certificate teaser ── redesigned from solid green → subtle tinted card */}
      <Link href="/certificates">
        <motion.div
          whileHover={{ y: m.hoverLift, boxShadow: "var(--ds-shadow-cta)" }}
          whileTap={m.buttonPress}
          className="bg-ds-action-subtle border border-ds-border shadow-ds-card p-4 cursor-pointer kid-tap transition-all"
          style={{
            borderRadius: "var(--leaf-r)",
            borderLeft: "4px solid var(--ds-brand-primary)",
          }}>
          <div className="flex items-center gap-2 mb-1.5">
            <motion.div
              animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: DURATION.loopBase, repeat: Infinity }}>
              <Trophy className="w-5 h-5 text-ds-action" />
            </motion.div>
            <h3 className="font-baloo font-black text-ds-text text-[12px] tracking-wide">{t("certificateTeaserTitle")}</h3>
          </div>
          <p className="text-[10px] text-ds-muted leading-snug mb-2.5">{t("certificateTeaserBody")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-ds-progress-track rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-ds-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${certProgress}%` }}
                transition={{ duration: DURATION.loopBounce }}
              />
            </div>
            <span className="text-[10px] font-baloo font-black text-ds-brand shrink-0">{activitiesCompleted}/8</span>
          </div>
          {certProgress >= 100 && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-bold text-ds-action mt-1.5 flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Ready to claim! ✨
            </motion.p>
          )}
        </motion.div>
      </Link>

      {/* ── Today's stars ── */}
      <div className="bg-white border border-ds-border shadow-ds-card p-4 text-center"
        style={{ borderRadius: "var(--leaf-r)" }}>
        <p className="text-[11px] font-baloo font-bold text-ds-text">{t("todayStarsLabel")}</p>
        <motion.p
          key={todayStars}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING.bounce}
          className="text-4xl font-baloo font-black mt-1 leading-none"
          style={{
            color: "#e89b2a",
            textShadow: hasStars ? "0 0 18px rgba(232,155,42,0.55)" : undefined,
          }}>
          ⭐ {todayStars}
        </motion.p>
        {hasStars ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-[9px] font-nunito font-bold text-ds-brand mt-1">
            Amazing work! Keep going! 🎉
          </motion.p>
        ) : (
          <p className="text-[9px] text-ds-muted mt-1 leading-snug">{t("keepLearningStars")}</p>
        )}
      </div>
    </div>
  );
}
