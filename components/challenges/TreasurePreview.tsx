"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface Reward {
  emoji: string;
  label: string;
  earned: boolean;
}

interface Props {
  rewards?: Reward[];
}

const DEFAULT_REWARDS: Reward[] = [
  { emoji: "⭐", label: "Story Explorer", earned: true },
  { emoji: "💜", label: "Kind Heart", earned: true },
  { emoji: "💧", label: "Healthy Hero", earned: false },
  { emoji: "🌈", label: "Rainbow Star", earned: false },
  { emoji: "🎵", label: "Music Master", earned: false },
  { emoji: "🏆", label: "Champion", earned: false },
];

export default function TreasurePreview({ rewards = DEFAULT_REWARDS }: Props) {
  const earned = rewards.filter(r => r.earned).length;

  return (
    <div className="bg-white/[0.06] border border-white/[0.08] rounded-[20px] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-white text-[13px] flex items-center gap-1.5">
          🏆 Champion&apos;s Treasure
        </h3>
        <span className="theme-text-faint text-[10px] font-bold">{earned}/{rewards.length} collected</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {rewards.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition ${
              r.earned
                ? "bg-gradient-to-br from-yellow-400/20 to-amber-500/15 border-yellow-400/30 shadow-lg shadow-yellow-500/10"
                : "bg-white/[0.03] border-white/[0.06] border-dashed"
            }`}>
              {r.earned ? (
                <motion.span
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}>
                  {r.emoji}
                </motion.span>
              ) : (
                <span className="text-white/10 text-lg">?</span>
              )}
            </div>
            <span className={`text-[8px] font-bold text-center leading-tight ${
              r.earned ? "text-white/80" : "theme-text-muted/40"
            }`}>{r.label}</span>
          </motion.div>
        ))}
      </div>

      <button className="mt-3 w-full flex items-center justify-center gap-1 theme-text-faint hover:text-white text-[11px] font-bold transition bg-white/[0.04] hover:bg-white/[0.08] rounded-xl py-2 border border-white/[0.06]">
        View Sticker Book <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
