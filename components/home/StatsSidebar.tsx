"use client";

import Link from "next/link";
import { Check, Trophy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const certProgress = Math.min(100, (activitiesCompleted / 8) * 100);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Streak card ── */}
      <div
        className="bg-white border border-ds-border shadow-ds-card p-4"
        style={{ borderRadius: "var(--leaf-r)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <span className="text-xl leading-none">🔥</span>
          <h3 className="font-black text-ds-text text-sm tracking-wide">
            {t("dayStreak").replace("{count}", String(streakCount))}
          </h3>
        </div>

        {/* Week dots — 32 px each, glowing when complete */}
        <div className="flex items-center justify-between">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-bold text-gray-400">{label}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  weekStreak[i]
                    ? "bg-orange-500 border-orange-400 text-white animate-streak-glow"
                    : "bg-gray-100 border-gray-200 text-gray-300"
                }`}
              >
                {weekStreak[i] && <Check className="w-4 h-4" strokeWidth={3} />}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-3 leading-snug">
          {t("streakEncouragement")}
        </p>
      </div>

      {/* ── Badges preview ── */}
      <div
        className="bg-white border border-ds-border shadow-ds-card p-4"
        style={{ borderRadius: "var(--leaf-r)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-ds-text text-[12px] tracking-wide">{t("myBadges")}</h3>
          <Link href="/user-profile" className="text-[10px] font-bold text-ds-brand hover:underline">
            {t("viewAll")}
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2">
          {BADGE_TYPES.map((badge, i) => {
            const earned = i < badgeCount;
            return (
              <div
                key={i}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-all duration-200 ${
                  earned ? "shadow-glow-gold scale-100" : "opacity-40 grayscale"
                }`}
                style={earned ? { background: badge.gradient } : { background: "#F3F4F6" }}
              >
                {badge.emoji}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-gray-500 text-center mt-2 leading-snug">
          {badgeCount > 0
            ? t("badgesEarned").replace("{count}", String(badgeCount))
            : t("noBadgesYet")}
        </p>
      </div>

      {/* ── Certificate teaser ── */}
      <Link href="/certificates">
        <div
          className="bg-ds-action shadow-md p-4 text-white cursor-pointer hover:opacity-95 transition-opacity kid-tap"
          style={{ borderRadius: "var(--leaf-r)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-yellow-300" />
            <h3 className="font-black text-[12px] tracking-wide">{t("certificateTeaserTitle")}</h3>
          </div>
          <p className="text-[10px] text-white/80 leading-snug mb-2">{t("certificateTeaserBody")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-300 rounded-full transition-all duration-700"
                style={{ width: `${certProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-yellow-300 shrink-0">{activitiesCompleted}/8</span>
          </div>
        </div>
      </Link>

      {/* ── Today's stars ── */}
      <div
        className="bg-white border border-ds-border shadow-ds-card p-4 text-center"
        style={{ borderRadius: "var(--leaf-r)" }}
      >
        <p className="text-[11px] font-bold text-ds-text">{t("todayStarsLabel")}</p>
        <p
          className={`text-4xl font-black mt-1 leading-none ${todayStars > 0 ? "animate-star-pop" : ""}`}
          style={{
            color: "#e89b2a",
            textShadow: todayStars > 0 ? "0 0 16px rgba(232,155,42,0.55)" : undefined,
          }}
        >
          ⭐ {todayStars}
        </p>
        {todayStars === 0 && (
          <p className="text-[9px] text-gray-400 mt-1 leading-snug">{t("keepLearningStars")}</p>
        )}
      </div>
    </div>
  );
}
