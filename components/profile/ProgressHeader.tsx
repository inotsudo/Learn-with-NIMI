"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import ChildAvatar from "@/components/avatar/ChildAvatar";

export type ProgressTab = "overview" | "streaks";

interface Props {
  activeTab:          ProgressTab;
  onTabChange:        (tab: ProgressTab) => void;
  childName?:         string;
  avatarUrl?:         string | null;
  onEditProfile?:     () => void;
  level?:             number;
  totalStars?:        number;
  lastActiveDaysAgo?: number | null;
}

const LEVEL_META: Record<number, { label: string; emoji: string; starsMin: number; starsMax: number }> = {
  1: { label: "Sprout",   emoji: "🌱", starsMin: 0,   starsMax: 50  },
  2: { label: "Explorer", emoji: "🧭", starsMin: 50,  starsMax: 150 },
  3: { label: "Creator",  emoji: "🎨", starsMin: 150, starsMax: 300 },
  4: { label: "Champion", emoji: "🏆", starsMin: 300, starsMax: 500 },
  5: { label: "Legend",   emoji: "👑", starsMin: 500, starsMax: 500 },
};

const TAB_META: { id: ProgressTab; emoji: string; labelKey: string }[] = [
  { id: "overview", emoji: "🏠", labelKey: "overview"  },
  { id: "streaks",  emoji: "🔥", labelKey: "tabStreaks" },
];

const STARS = [
  { top: "12%", left:  "4%",  emoji: "⭐", size: 14, delay: 0    },
  { top: "65%", left:  "6%",  emoji: "✨", size: 11, delay: 0.7  },
  { top: "18%", right: "4%",  emoji: "🌟", size: 18, delay: 0.35 },
  { top: "60%", right: "6%",  emoji: "⭐", size: 10, delay: 1.1  },
  { top: "40%", left:  "2%",  emoji: "💫", size: 12, delay: 0.55 },
  { top: "38%", right: "2%",  emoji: "✨", size: 13, delay: 0.9  },
];

function lastActiveLabel(days: number): string {
  if (days === 0) return "Active today";
  if (days === 1) return "Active yesterday";
  return `Active ${days}d ago`;
}

export default function ProgressHeader({
  activeTab, onTabChange, childName, avatarUrl, onEditProfile,
  level = 1, totalStars = 0, lastActiveDaysAgo,
}: Props) {
  const { t } = useLanguage();
  const displayName = childName || t("defaultChildName");

  const clampedLevel = Math.min(Math.max(level, 1), 5);
  const meta = LEVEL_META[clampedLevel];

  // Progress within the current level, using stars as XP proxy
  const isMaxLevel = clampedLevel >= 5;
  const starsInLevel  = isMaxLevel ? 1 : Math.max(0, totalStars - meta.starsMin);
  const starsForLevel = isMaxLevel ? 1 : (meta.starsMax - meta.starsMin);
  const levelPct      = isMaxLevel ? 1 : Math.min(1, starsInLevel / starsForLevel);
  const starsToNext   = isMaxLevel ? 0 : Math.max(0, meta.starsMax - totalStars);

  const C = 2 * Math.PI * 47; // circumference for r=47

  return (
    <div>
      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden -mx-4 sm:-mx-5 -mt-4 mb-5 bg-[#0b2f6e]" style={{ minHeight: 260 }}>
        <img src="/airport-hero.png" alt="" aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center select-none pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(100deg,rgba(255,255,255,.94) 0%,rgba(255,255,255,.72) 48%,rgba(255,255,255,.18) 66%,transparent 82%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
          style={{ background: "linear-gradient(to top, #f8f2e7, transparent)" }} />

        {/* Left content */}
        <div className="relative z-10 flex min-h-[260px] flex-col justify-end px-5 pb-10 pt-8 sm:px-10">
          <span className="inline-flex items-center gap-1.5 font-black text-2xs px-2.5 py-1 rounded-full mb-2 self-start"
            style={{ background:"rgba(255,255,255,0.88)", border:"1.5px solid #edc953", color:"#7a5800" }}>
            {meta.emoji} {meta.label} · Level {clampedLevel}
          </span>
          <motion.h1
            className="font-baloo font-black leading-tight drop-shadow-[0_2px_0_rgba(255,255,255,.95)]"
            style={{ fontSize: "clamp(1.8rem,5vw,2.6rem)", color: "#0e368b" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {displayName}!&nbsp;🌟
          </motion.h1>
          <div className="mt-2 h-[3px] w-44 -rotate-[3deg] rounded-full bg-[#ffc400]" />
          <div className="mt-3 flex flex-wrap gap-2">
            {!isMaxLevel && starsToNext > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 shadow-sm font-baloo text-[13px] font-bold"
                style={{ background:"rgba(255,255,255,0.88)", border:"1.5px solid #f5d142", color:"#7a5800" }}>
                ⭐ {starsToNext} stars to next level
              </span>
            )}
            {isMaxLevel && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 shadow-sm font-baloo font-bold text-[13px]"
                style={{ background:"rgba(255,255,255,0.88)", border:"1.5px solid #f5d142", color:"#7a5800" }}>
                Max level reached 🎉
              </span>
            )}
            {lastActiveDaysAgo !== null && lastActiveDaysAgo !== undefined && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 shadow-sm font-baloo font-bold text-[13px]"
                style={{ background:"rgba(255,255,255,0.88)", border:"1.5px solid #c8d9ef", color:"#123a87" }}>
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: lastActiveDaysAgo === 0 ? "#4ade80" : lastActiveDaysAgo <= 2 ? "#fbbf24" : "#f87171" }} />
                {lastActiveLabel(lastActiveDaysAgo)}
              </span>
            )}
          </div>
          {onEditProfile && (
            <motion.button
              onClick={onEditProfile}
              className="mt-2.5 sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xs font-bold self-start"
              style={{ background:"rgba(255,255,255,0.88)", border:"1.5px solid #edc953", color:"#7a5800" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {t("tapAvatarToEdit")}
            </motion.button>
          )}
        </div>

        {/* Avatar with ring — right side */}
        <div className="absolute right-4 sm:right-8 bottom-6 z-10 flex flex-col items-center gap-1">
          <div className="relative w-[110px] h-[110px] sm:w-[128px] sm:h-[128px] flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 108 108" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="54" cy="54" r="47" fill="none" stroke="rgba(237,201,83,0.35)" strokeWidth="5" />
              <motion.circle
                cx="54" cy="54" r="47" fill="none" stroke="#ffd331" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${C} ${C}`}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - levelPct) }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
              />
            </svg>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 20 }}
              className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-xs"
              style={{ border: "2px solid #edc953" }}
            >
              {meta.emoji}
            </motion.div>
            <motion.button
              onClick={onEditProfile}
              className="relative w-24 h-24 sm:w-[108px] sm:h-[108px] rounded-full flex items-center justify-center overflow-hidden shadow-2xl cursor-pointer transition-transform hover:scale-105 active:scale-95"
              style={{ border: "4px solid #ffd331" }}
              whileTap={{ scale: 0.93 }}
              aria-label="Edit profile"
            >
              <ChildAvatar avatarUrl={avatarUrl} size={112} className="translate-y-[6px]" />
            </motion.button>
            <motion.button
              onClick={onEditProfile}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-10"
              style={{ border: "2px solid #edc953", color: "#082b78" }}
              whileHover={{ rotate: -10 }}
              aria-label="Edit profile"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </motion.button>
          </div>
        </div>
      </section>

      {/* ── Tab pills ── */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TAB_META.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-baloo font-black transition-all whitespace-nowrap shrink-0"
            style={activeTab === tab.id
              ? { background: "linear-gradient(135deg,#ffd331,#ffbc14)", color: "#07111F", boxShadow: "0 2px 8px rgba(255,188,20,.40)" }
              : { background: "rgba(255,255,255,0.80)", border: "1.5px solid #c8d9ef", color: "#082b78" }
            }
          >
            <span>{tab.emoji}</span>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
