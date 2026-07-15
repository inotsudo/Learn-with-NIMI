"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import { HeroBanner } from "@/components/layout/primitives";

export type ProgressTab = "overview" | "streaks";

interface Props {
  activeTab:       ProgressTab;
  onTabChange:     (tab: ProgressTab) => void;
  childName?:      string;
  avatarUrl?:      string | null;
  onEditProfile?:  () => void;
}

const TAB_META: { id: ProgressTab; emoji: string; labelKey: string }[] = [
  { id: "overview",  emoji: "🏠", labelKey: "overview" },
  { id: "streaks",   emoji: "🔥", labelKey: "tabStreaks" },
];

// Floating star decorations (fixed positions, no random)
const STARS = [
  { top:"12%", left:"4%",   emoji:"⭐", size:14, delay:0    },
  { top:"65%", left:"6%",   emoji:"✨", size:11, delay:0.7  },
  { top:"18%", right:"4%",  emoji:"🌟", size:18, delay:0.35 },
  { top:"60%", right:"6%",  emoji:"⭐", size:10, delay:1.1  },
  { top:"40%", left:"2%",   emoji:"💫", size:12, delay:0.55 },
  { top:"38%", right:"2%",  emoji:"✨", size:13, delay:0.9  },
];

export default function ProgressHeader({
  activeTab, onTabChange, childName, avatarUrl, onEditProfile,
}: Props) {
  const { t } = useLanguage();
  const displayName = childName ?? "Explorer";

  return (
    <div>
      {/* ── Hero banner ───────────────────────────────────────────────── */}
      <HeroBanner zone="profile" className="mb-5">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/8 pointer-events-none" />

        {/* Floating star emojis */}
        {STARS.map((d, i) => (
          <motion.span
            key={i}
            className="absolute pointer-events-none select-none"
            style={{
              top: d.top,
              left:  (d as { left?: string }).left,
              right: (d as { right?: string }).right,
              fontSize: d.size,
            }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -5, 0], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: d.delay }}
            aria-hidden
          >
            {d.emoji}
          </motion.span>
        ))}

        {/* ── Main content: avatar + name ── */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 px-5 py-6 sm:px-8 sm:py-7">
          {/* Avatar circle with edit button */}
          <div className="relative shrink-0 group">
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-white/30"
              animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Avatar ring + avatar */}
            <motion.button
              onClick={onEditProfile}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 ring-4 ring-white/60 flex items-center justify-center overflow-hidden shadow-2xl cursor-pointer transition-transform hover:scale-105 active:scale-95"
              whileTap={{ scale: 0.93 }}
              aria-label="Edit profile"
            >
              <ChildAvatar avatarUrl={avatarUrl} size={112} className="translate-y-[6px]" />
            </motion.button>

            {/* Edit pencil badge */}
            <motion.button
              onClick={onEditProfile}
              className="absolute -bottom-1 -right-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-[var(--ds-brand-primary)] shadow-lg flex items-center justify-center border-2 border-white transition-transform hover:scale-110 active:scale-95"
              whileHover={{ rotate: -10 }}
              aria-label="Edit profile"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </motion.button>
          </div>

          {/* Name + subtitle */}
          <div className="flex-1 text-center sm:text-left pb-0 sm:pb-2 min-w-0">
            <motion.h1
              className="font-baloo font-black text-white leading-tight drop-shadow-md
                         text-[26px] sm:text-[32px] lg:text-[36px]
                         truncate max-w-[280px] sm:max-w-none mx-auto sm:mx-0"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {displayName}!&nbsp;🌟
            </motion.h1>
            <motion.p
              className="text-white/80 text-[12px] sm:text-[14px] font-nunito font-semibold mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t("myProgressSubtitle")}
            </motion.p>

            {/* Tap to edit — small hint, only on mobile */}
            {onEditProfile && (
              <motion.button
                onClick={onEditProfile}
                className="mt-2.5 sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-[11px] font-bold border border-white/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {t("tapAvatarToEdit") || "Tap avatar to edit"}
              </motion.button>
            )}
          </div>
        </div>
      </HeroBanner>

      {/* ── Tab pills — horizontally scrollable, never wrap ──────────── */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TAB_META.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] sm:text-[13px] font-baloo font-black transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? "bg-ds-action text-white shadow-sm"
                : "bg-ds-card border border-ds-border text-ds-muted hover:text-ds-text hover:bg-ds-page"
            }`}
          >
            <span>{tab.emoji}</span>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
