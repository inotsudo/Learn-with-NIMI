"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ChevronRight } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StorySlot, StoryLibraryItem } from "@/lib/story-types";

interface Props {
  slots: StorySlot[];
  storyTitle: string;
  storySlug: string;
  isComplete: boolean;
  nextStory: StoryLibraryItem | undefined;
}

const BADGES = [
  { key: "flipflop_audio", emoji: "⭐", label: "Story\nExplorer", bg: "from-yellow-400 to-amber-500", ring: "ring-yellow-300/40" },
  { key: "coloring",       emoji: "💜", label: "Kind\nHeart",     bg: "from-pink-400 to-fuchsia-500", ring: "ring-pink-300/40" },
  { key: "move_explore",   emoji: "💧", label: "Healthy\nHero",   bg: "from-blue-400 to-cyan-500",    ring: "ring-blue-300/40" },
];

export default function AchievementRow({ slots, storyTitle, storySlug, isComplete, nextStory }: Props) {
  const earned = (key: string) => slots.find(s => s.slot_key === key)?.completed ?? false;

  return (
    <>
      {/* ── MY BADGES ── */}
      <div className="relative rounded-[24px] overflow-hidden border-2 border-yellow-400/15 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-[#1f1050] to-amber-500/5" />
        <div className="relative z-10 p-4">
          <h4 className="font-black text-[13px] text-center mb-3">
            <span className="text-yellow-300">MY BADGES</span> <span>🏅</span>
          </h4>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {BADGES.map((b, i) => {
              const is = earned(b.key);
              return (
                <motion.div key={b.key}
                  initial={{ opacity: 0, scale: 0, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1 + i * 0.12, type: "spring" }}
                  className="flex flex-col items-center gap-1">
                  <motion.div
                    animate={is ? { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] } : {}}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-[3px] shadow-lg ${
                      is
                        ? `bg-gradient-to-br ${b.bg} border-white/40 ${b.ring} ring-3`
                        : "bg-white/[0.04] border-dashed border-white/10"
                    }`}>
                    {is ? b.emoji : <span className="text-white/10 text-sm">?</span>}
                  </motion.div>
                  <span className={`text-[8px] font-black text-center leading-tight whitespace-pre-line ${is ? "text-yellow-200" : "text-white/20"}`}>
                    {b.label}
                  </span>
                </motion.div>
              );
            })}
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg bg-white/[0.03] border-[3px] border-dashed border-white/[0.08]">
                <span className="text-white/10 font-black">?</span>
              </div>
              <span className="text-[8px] font-black text-center text-white/15">More to<br/>Earn</span>
            </div>
          </div>
          <Link href="/treasure"
            className="flex items-center justify-center gap-1 text-yellow-300/60 hover:text-yellow-200 text-[10px] font-black transition">
            ◀ View All Badges <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── NEXT STORY ── */}
      <div className="relative rounded-[24px] overflow-hidden border-2 theme-border shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-[#1f1050] to-indigo-500/5" />
        <div className="relative z-10 p-4 flex flex-col items-center text-center h-full justify-center">
          <h4 className="font-black text-[13px] theme-text-muted mb-3">NEXT STORY ✨</h4>
          {nextStory ? (
            <>
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 mb-2 shadow-lg">
                {nextStory.cover_url ? (
                  <img src={getStorageUrl(nextStory.cover_url)} alt="" className="absolute inset-0 w-full h-full object-cover grayscale opacity-25" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-700/30 to-gray-900/50 flex items-center justify-center">
                    <span className="text-3xl opacity-25">{nextStory.theme_emoji}</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Lock className="w-6 h-6 text-white/40" />
                  </motion.div>
                </div>
              </div>
              <p className="font-black text-white text-[13px]">{nextStory.theme_emoji} {nextStory.title}</p>
              <p className="theme-text-muted/30 text-[9px] mt-1">Complete the current story to unlock!</p>
              <div className="mt-2 theme-accent/15 border theme-border rounded-lg py-1.5 px-4">
                <span className="theme-text-muted/40 text-[10px] font-black">🔒 Locked</span>
              </div>
            </>
          ) : (
            <>
              <span className="text-3xl mb-2">🌟</span>
              <p className="theme-text-muted/30 text-[11px] font-bold">More stories coming soon!</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
