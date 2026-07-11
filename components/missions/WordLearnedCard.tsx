"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStorageUrl } from "@/lib/queries";
import { SPRING } from "@/lib/design-system/motion";

export interface VocabWord {
  word: string;
  meaning: string;
  emoji?: string;
  audio_url?: string | null;
}

interface WordLearnedCardProps {
  word: VocabWord;
  onNext?: () => void;
  current?: number;
  total?: number;
}

export default function WordLearnedCard({ word, onNext, current, total }: WordLearnedCardProps) {
  const { t } = useLanguage();
  const [played, setPlayed] = useState(false);

  const playAudio = () => {
    if (!word.audio_url) return;
    const a = new Audio(getStorageUrl(word.audio_url));
    a.play().catch(() => {});
    setPlayed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...SPRING.card, delay: 0.15 }}
      className="leaf-lg border border-teal-200/60 bg-gradient-to-br from-teal-50 via-white to-cyan-50/50 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center mb-3">
        <p className="font-nunito font-black text-[10px] uppercase tracking-[0.2em] text-teal-400">
          ✨ {t("wordLearnedTitle")}
        </p>
        {total && total > 1 && (
          <span className="ml-auto font-nunito font-bold text-[10px] text-teal-300">{current}/{total}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Big emoji */}
        <motion.div
          animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center text-4xl select-none flex-shrink-0 shadow-sm"
        >
          {word.emoji ?? "📖"}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-baloo font-black text-[22px] text-teal-800 leading-none">{word.word}</h3>
            {word.audio_url && (
              <motion.button
                onClick={playAudio}
                whileTap={{ scale: 0.9 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  played ? "bg-teal-400 text-white" : "bg-teal-100 text-teal-500 hover:bg-teal-200"
                }`}
                aria-label={t("tapToHear")}
              >
                <Volume2 className="w-4 h-4" />
              </motion.button>
            )}
          </div>
          <p className="font-nunito text-[13px] text-gray-600 leading-snug">{word.meaning}</p>
        </div>
      </div>

      {/* Footer: confetti + Got it button */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-1.5">
          {["🌟", "✨", "💫", "⭐", "🌟"].map((e, i) => (
            <motion.span key={i} className="text-[11px] select-none"
              animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5 + i * 0.2, repeat: Infinity, delay: i * 0.3 }}>
              {e}
            </motion.span>
          ))}
        </div>
        {onNext && (
          <div className="flex items-center gap-2">
            {total && current && current >= total && (
              <Link href="/vocab" className="font-nunito font-bold text-[11px] text-teal-500 hover:underline">
                See all my words →
              </Link>
            )}
            <motion.button
              onClick={onNext}
              whileTap={{ scale: 0.95 }}
              className="font-baloo font-black text-[13px] text-white bg-teal-500 hover:bg-teal-600 transition px-4 py-1.5 rounded-full shadow-sm"
            >
              {total && current && current < total ? "Next word →" : "Got it! ✓"}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
