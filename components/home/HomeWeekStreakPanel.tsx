"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  weekStreak: boolean[];
  consecutiveStreak: number;
  totalStars: number;
  streakBroke?: boolean;
}

const DAYS = ["M","T","W","T","F","S","S"];

export default function HomeWeekStreakPanel({ weekStreak, consecutiveStreak, totalStars, streakBroke = false }: Props) {
  const { t } = useLanguage();
  const todayRaw = new Date().getDay();
  const todayIdx = todayRaw === 0 ? 6 : todayRaw - 1;

  const isBroke  = streakBroke && consecutiveStreak === 0;
  const hasStreak = consecutiveStreak > 0;
  const noStreak  = !isBroke && consecutiveStreak === 0;

  const message = isBroke              ? t("homeStreakBroke") :
    consecutiveStreak >= 7             ? t("homeStreakUnstoppable") :
    consecutiveStreak >= 3             ? t("homeStreakOnFire") :
    consecutiveStreak > 0              ? t("homeStreakKeepItUp") :
                                         t("homeStreakStart");

  const heading = isBroke          ? "Keep going!"     :
    consecutiveStreak >= 7         ? "Unstoppable! 🚀" :
    consecutiveStreak >= 3         ? "On Fire! 🔥"     :
    consecutiveStreak > 0          ? "Keep it up!"     :
                                     "Start today!";

  /* dot color: gold for "broke" restart, orange for active fire, muted for none */
  const dotDone   = isBroke ? "rgba(201,168,76,0.70)" : "rgba(251,146,60,0.90)"; // gold or orange
  const todayBorder = isBroke ? "rgba(201,168,76,0.55)" : "rgba(251,146,60,0.55)";
  const numColor  = isBroke ? "var(--airways-gold-text, #E8BC56)" : noStreak ? "rgba(240,232,212,0.30)" : "rgb(251,146,60)";
  const accentText= isBroke ? "var(--airways-gold-text, #E8BC56)" : noStreak ? "rgba(240,232,212,0.50)" : "rgb(251,146,60)";
  const eyebrowColor = isBroke ? "var(--airways-gold-text, #E8BC56)" : noStreak ? "rgba(240,232,212,0.35)" : "rgba(251,146,60,0.85)";

  return (
    <div
      className="overflow-hidden rounded-3xl shadow-2xl"
      style={{
        background: "linear-gradient(160deg,#06101F 0%,#0A1828 60%,#0D1E3A 100%)",
        border: "1px solid rgba(201,168,76,0.20)",
      }}
    >
      {/* Gold top bar */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#C9A84C,#F5C842,#C9A84C)" }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: isBroke ? "rgba(201,168,76,0.15)" : noStreak ? "rgba(255,255,255,0.06)" : "rgba(251,146,60,0.15)" }}>
            {isBroke ? "🌱" : "🔥"}
          </div>
          <div>
            <p className="font-nunito text-[10px] uppercase tracking-widest leading-none mb-0.5"
              style={{ color: eyebrowColor }}>
              {isBroke ? "Fresh start" : noStreak ? "Start a streak" : "Daily streak"}
            </p>
            <h3 className="font-baloo font-black text-mlg leading-tight"
              style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>
              {heading}
            </h3>
          </div>
        </div>

        {/* Stars pill — airways style */}
        <div className="flex items-center gap-1 rounded-full px-2.5 py-1"
          style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}>
          <span className="text-xs leading-none">⭐</span>
          <span className="font-baloo font-black text-sml leading-none" style={{ color: "var(--airways-gold-text, #E8BC56)" }}>{totalStars}</span>
        </div>
      </div>

      <div className="h-px mx-4" style={{ background: "rgba(201,168,76,0.12)" }} />

      {/* Big number + message */}
      {noStreak ? (
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <motion.span aria-hidden="true" className="text-5xl leading-none"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
            🔥
          </motion.span>
          <div>
            <p className="font-baloo font-black text-sm leading-tight" style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>
              Build your streak!
            </p>
            <p className="font-nunito text-2xs mt-0.5" style={{ color: "rgba(240,232,212,0.45)" }}>{message}</p>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-2 flex items-end gap-3">
          <motion.span
            className="font-baloo font-black leading-none"
            style={{ fontSize: "clamp(44px,8vw,60px)", color: numColor }}
            animate={hasStreak ? { scale: [1, 1.04, 1] } : undefined}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            {consecutiveStreak}
          </motion.span>
          <div className="pb-1.5">
            <p className="font-baloo font-black text-mbase leading-none"
              style={{ color: "rgba(240,232,212,0.35)" }}>
              {consecutiveStreak === 1 ? t("homeStreakDayLabel") : t("homeStreakDaysLabel")}
            </p>
            <p className="font-nunito font-semibold text-2xs mt-0.5 leading-snug max-w-[130px]"
              style={{ color: accentText }}>
              {message}
            </p>
          </div>
        </div>
      )}

      {/* Week grid */}
      <div className="mx-3 mb-4 rounded-2xl px-3 py-3"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex justify-between gap-1">
          {DAYS.map((day, i) => {
            const done    = weekStreak[i] ?? false;
            const isToday = i === todayIdx;
            const future  = i > todayIdx;
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <motion.div
                  className="w-full aspect-square max-w-[34px] rounded-full flex items-center justify-center text-sm transition-all duration-200"
                  style={done ? {
                    background: dotDone,
                    border: "none",
                    boxShadow: `0 0 8px ${dotDone}`,
                  } : isToday ? {
                    border: `2px solid ${todayBorder}`,
                    background: "rgba(201,168,76,0.08)",
                  } : future ? {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    opacity: 0.4,
                  } : {
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  animate={done ? { scale: [1, 1.08, 1] } : undefined}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}>
                  {done    ? <span className="text-white text-sml">{isBroke ? "🌟" : "🔥"}</span> :
                   isToday ? <span className="font-black text-2xs" style={{ color: "rgba(240,232,212,0.45)" }}>•</span> :
                             null}
                </motion.div>
                <span className="font-nunito font-bold text-4xs"
                  style={{ color: done ? (isBroke ? "var(--airways-gold-text, #E8BC56)" : "rgba(251,146,60,0.85)") :
                    isToday ? "rgba(240,232,212,0.60)" :
                    "rgba(240,232,212,0.25)" }}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>

        {isBroke && (
          <p className="text-center font-nunito text-3xs mt-2.5 leading-snug"
            style={{ color: "rgba(240,232,212,0.40)" }}>
            {t("homeStreakBrokeHint")}
          </p>
        )}
      </div>
    </div>
  );
}
