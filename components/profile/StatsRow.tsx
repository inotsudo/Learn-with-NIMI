"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const steps = 28;
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

interface StatPillProps {
  emoji: string;
  value: number;
  label: string;
  gradient: string;
  delay: number;
}

function StatPill({ emoji, value, label, gradient, delay }: StatPillProps) {
  const animated = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay, type: "spring", stiffness: 260, damping: 20 }}
      className="flex-1 flex flex-col items-center gap-1.5 py-4 px-2"
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-3xl shadow-md`}>
        {emoji}
      </div>
      <p className="font-baloo font-black text-ds-text text-[24px] leading-none tabular-nums">{animated}</p>
      <p className="text-ds-muted text-[11px] font-bold text-center leading-tight">{label}</p>
    </motion.div>
  );
}

interface Props {
  starsCollected: number;
  badgesEarned: number;
  certificates: number;
}

export default function StatsRow({ starsCollected, badgesEarned, certificates }: Props) {
  const { t } = useLanguage();

  const stats: StatPillProps[] = [
    { emoji: "⭐", value: starsCollected, label: t("statStarsLabel"),        gradient: "from-amber-300 to-yellow-400",   delay: 0 },
    { emoji: "🏅", value: badgesEarned,   label: t("statBadgesLabel"),       gradient: "from-violet-400 to-purple-500",  delay: 0.08 },
    { emoji: "🎓", value: certificates,   label: t("statCertificatesLabel"), gradient: "from-emerald-400 to-teal-500",   delay: 0.16 },
  ];

  return (
    <div className="bg-ds-card border border-ds-border shadow-ds-card flex divide-x divide-ds-border overflow-hidden" style={{ borderRadius: 'var(--leaf-r)' }}>
      {stats.map((s, i) => <StatPill key={i} {...s} />)}
    </div>
  );
}
