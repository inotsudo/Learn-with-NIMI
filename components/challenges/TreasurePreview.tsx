"use client";

import { motion } from "framer-motion";
import { SPRING, DURATION } from "@/lib/design-system/motion";
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
    <div className="bg-white border border-ds-border shadow-ds-card leaf p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-ds-text text-[13px] flex items-center gap-1.5">
          🏆 Champion&apos;s Treasure
        </h3>
        <span className="text-gray-500 text-[10px] font-bold">{earned}/{rewards.length} collected</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {rewards.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING.gentle, delay: i * 0.08 }}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-14 h-14 flex items-center justify-center text-2xl border-2 transition ${
              r.earned
                ? "bg-yellow-50 border-yellow-300 shadow-lg"
                : "bg-gray-50 border-ds-border border-dashed"
            }`} style={{ borderRadius: 'var(--leaf-r)' }}>
              {r.earned ? (
                <motion.span
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: DURATION.loopFloat, repeat: Infinity, delay: i * 0.3 }}>
                  {r.emoji}
                </motion.span>
              ) : (
                <span className="text-gray-300 text-lg">?</span>
              )}
            </div>
            <span className={`text-[8px] font-bold text-center leading-tight ${
              r.earned ? "text-ds-text" : "text-gray-400"
            }`}>{r.label}</span>
          </motion.div>
        ))}
      </div>

      <button className="mt-3 w-full flex items-center justify-center gap-1 text-gray-500 hover:text-ds-text text-[11px] font-bold transition bg-gray-50 hover:bg-gray-100 leaf py-2 border border-ds-border">
        View Sticker Book <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
