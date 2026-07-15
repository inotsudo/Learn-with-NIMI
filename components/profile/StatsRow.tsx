"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const steps = 30;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCount(Math.round((step / steps) * target));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

interface StatCellProps {
  emoji: string;
  value: number;
  label: string;
  gradient: string;
  delay: number;
  suffix?: string;
  zeroLabel?: string;
}

function StatCell({ emoji, value, label, gradient, delay, suffix, zeroLabel }: StatCellProps) {
  const animated = useCountUp(value);
  const isEmpty = value === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, type: "spring", stiffness: 260, damping: 22 }}
      className="flex items-center gap-3 p-4"
    >
      {/* Icon */}
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-[22px] shadow-md shrink-0 ${isEmpty ? "opacity-50 grayscale" : ""}`}>
        {emoji}
      </div>

      {/* Value + label */}
      <div className="min-w-0">
        <p className={`font-baloo font-black leading-none tabular-nums ${
          isEmpty ? "text-ds-muted text-[20px]" : "text-ds-text text-[22px]"
        }`}>
          {isEmpty && zeroLabel ? (
            <span className="text-[13px] font-bold">{zeroLabel}</span>
          ) : (
            <>{animated}{suffix && <span className="text-[14px] ml-0.5">{suffix}</span>}</>
          )}
        </p>
        <p className="text-ds-muted text-[11px] font-semibold mt-0.5 leading-tight">{label}</p>
      </div>
    </motion.div>
  );
}

interface Props {
  starsCollected:  number;
  badgesEarned:    number;
  storiesCompleted: number;
  currentStreak:   number;
}

export default function StatsRow({ starsCollected, badgesEarned, storiesCompleted, currentStreak }: Props) {
  const { t } = useLanguage();

  const stats: StatCellProps[] = [
    {
      emoji: "⭐",
      value: starsCollected,
      label: t("statStarsLabel"),
      gradient: "from-amber-300 to-yellow-400",
      delay: 0,
      zeroLabel: t("statZeroStars") || "None yet",
    },
    {
      emoji: "📖",
      value: storiesCompleted,
      label: t("statStoriesLabel") || "Stories Done",
      gradient: "from-blue-400 to-indigo-500",
      delay: 0.07,
      zeroLabel: t("statZeroStories") || "Start one!",
    },
    {
      emoji: "🏅",
      value: badgesEarned,
      label: t("statBadgesLabel"),
      gradient: "from-violet-400 to-purple-500",
      delay: 0.14,
      zeroLabel: t("statZeroBadges") || "Earn one!",
    },
    {
      emoji: "🔥",
      value: currentStreak,
      label: t("statStreakLabel") || "Day Streak",
      gradient: "from-orange-400 to-red-500",
      delay: 0.21,
      suffix: currentStreak === 1 ? "d" : "d",
      zeroLabel: t("statZeroStreak") || "Start today!",
    },
  ];

  return (
    <div
      className="bg-ds-card border border-ds-border shadow-ds-card overflow-hidden"
      style={{ borderRadius: 'var(--leaf-r)' }}
    >
      <div className="grid grid-cols-2 divide-x divide-y divide-ds-border">
        {stats.map((s, i) => (
          <StatCell key={i} {...s} />
        ))}
      </div>
    </div>
  );
}
