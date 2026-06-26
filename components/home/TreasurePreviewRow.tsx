"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface Props {
  badgeCount: number;
}

const STICKERS = [
  { emoji: "⭐", label: "Explorer\nStar",    bg: "from-yellow-400 to-amber-500" },
  { emoji: "💜", label: "Kind\nHeart",       bg: "from-pink-400 to-fuchsia-500" },
  { emoji: "💧", label: "Healthy\nHero",     bg: "from-blue-400 to-cyan-500" },
  { emoji: "🌈", label: "Rainbow\nStar",     bg: "from-green-400 to-emerald-500" },
  { emoji: "🎵", label: "Music\nMaster",     bg: "from-purple-400 to-violet-500" },
  { emoji: "🏆", label: "Super\nChampion",   bg: "from-orange-400 to-red-500" },
];

export default function TreasurePreviewRow({ badgeCount }: Props) {
  return (
    <div className="relative rounded-[24px] overflow-hidden border-2 border-yellow-400/15 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
      {/* Warm golden gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-[#1f1050] to-yellow-500/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.08),transparent_60%)]" />

      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Treasure chest */}
            <motion.div animate={{ rotate: [0, 3, -3, 0] }} transition={{ duration: 4, repeat: Infinity }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-yellow-500/20 border-2 border-yellow-300/30 shrink-0">
              <span className="text-2xl">💎</span>
            </motion.div>
            <h3 className="font-black text-yellow-200 text-[16px] sm:text-[18px] leading-tight">
              MY CHAMPION<br/>TREASURE
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-white font-black text-[18px]">{badgeCount}<span className="text-white/30 text-[14px]">/6</span></span>
            <span className="theme-text-faint text-[9px] font-bold">collected</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          {STICKERS.map((s, i) => {
            const earned = i < badgeCount;
            return (
              <motion.div key={s.label}
                initial={{ opacity: 0, scale: 0, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <motion.div
                  animate={earned ? { scale: [1, 1.08, 1], y: [0, -3, 0] } : {}}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl border-[3px] shadow-xl ${
                    earned
                      ? `bg-gradient-to-br ${s.bg} border-white/40 shadow-yellow-500/15`
                      : "bg-white/[0.03] border-dashed border-white/10"
                  }`}>
                  {earned ? (
                    <span className="drop-shadow-lg">{s.emoji}</span>
                  ) : (
                    <span className="text-white/8 text-xl font-black">?</span>
                  )}
                </motion.div>
                <span className={`text-[7px] sm:text-[8px] font-black text-center leading-tight whitespace-pre-line truncate w-full ${
                  earned ? "text-yellow-200/80" : "text-white/15"
                }`}>{s.label}</span>
              </motion.div>
            );
          })}
        </div>

        <Link href="/treasure">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-black text-[13px] rounded-full py-3 shadow-xl shadow-pink-500/20 border border-pink-300/20 flex items-center justify-center gap-2 hover:shadow-pink-500/30 transition-shadow">
            Open Treasure Chest <ChevronRight className="w-4 h-4" />
          </motion.button>
        </Link>
      </div>
    </div>
  );
}
