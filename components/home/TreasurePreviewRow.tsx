"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronRight } from "lucide-react";

interface Props {
  badgeCount: number;
}

const STICKER_EMOJIS = ["⭐", "💜", "💧", "🌈", "🎵", "🏆"];
const STICKER_BG     = [
  "from-yellow-400 to-amber-500",
  "from-pink-400 to-fuchsia-500",
  "from-blue-400 to-cyan-500",
  "from-green-400 to-emerald-500",
  "from-purple-400 to-violet-500",
  "from-orange-400 to-red-500",
];
const STICKER_KEYS = [
  "treasureSticker1", "treasureSticker2", "treasureSticker3",
  "treasureSticker4", "treasureSticker5", "treasureSticker6",
] as const;

export default function TreasurePreviewRow({ badgeCount }: Props) {
  const m = useThemeMotion();
  const { t } = useLanguage();
  return (
    <div className="bg-white border border-ds-border shadow-ds-card overflow-hidden" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Treasure chest */}
            <motion.div animate={{ rotate: [0, 3, -3, 0] }} transition={{ duration: 4, repeat: Infinity }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-xl shadow-yellow-500/20 border-2 border-yellow-300/30 shrink-0" style={{ borderRadius: 'var(--leaf-r)' }}>
              <span className="text-2xl">💎</span>
            </motion.div>
            <h3 className="font-black text-ds-text text-[16px] sm:text-[18px] leading-tight">
              {t("treasureTitle")}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-ds-text font-black text-[18px]">{badgeCount}<span className="text-gray-400 text-[14px]">/6</span></span>
            <span className="text-gray-400 text-[9px] font-bold">{t("treasureCollected")}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          {STICKER_KEYS.map((key, i) => {
            const earned = i < badgeCount;
            return (
              <motion.div key={key}
                initial={{ opacity: 0, scale: 0, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <motion.div
                  animate={earned ? { scale: [1, 1.08, 1], y: [0, -3, 0] } : {}}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl border-[3px] shadow-xl ${
                    earned
                      ? `bg-gradient-to-br ${STICKER_BG[i]} border-white/40 shadow-yellow-500/15`
                      : "bg-gray-100 border-dashed border-gray-200"
                  }`}
                  style={{ borderRadius: 'var(--leaf-r)' }}>
                  {earned ? (
                    <span className="drop-shadow-lg">{STICKER_EMOJIS[i]}</span>
                  ) : (
                    <span className="text-gray-300 text-xl font-black">?</span>
                  )}
                </motion.div>
                <span className={`text-[7px] sm:text-[8px] font-black text-center leading-tight whitespace-pre-line truncate w-full ${
                  earned ? "text-gray-600" : "text-gray-300"
                }`}>{t(key)}</span>
              </motion.div>
            );
          })}
        </div>

        <Link href="/treasure">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={m.buttonPress}
            className="w-full text-white font-black text-[13px] py-3 shadow-lg flex items-center justify-center gap-2 transition-colors"
            style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}>
            {t("treasureOpenChest")} <ChevronRight className="w-4 h-4" />
          </motion.button>
        </Link>
      </div>
    </div>
  );
}
