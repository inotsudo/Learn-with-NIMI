"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SPRING } from "@/lib/design-system/motion";

export interface QuestionData {
  text: string;
  options: string[];
  correct: number;
  emoji?: string;
}

interface ComprehensionQuestionProps {
  question: QuestionData;
  onAnswered: (correct: boolean) => void;
  current?: number;
  total?: number;
}

export default function ComprehensionQuestion({ question, onAnswered, current, total }: ComprehensionQuestionProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const handleSelect = (idx: number) => {
    if (locked) return;
    setSelected(idx);
    setLocked(true);
    const isCorrect = idx === question.correct;
    setTimeout(() => onAnswered(isCorrect), isCorrect ? 1200 : 1600);
  };

  const isCorrect = selected === question.correct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={SPRING.card}
      className="leaf-lg border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-indigo-50/50 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
          <span className="text-lg select-none">{question.emoji ?? "🧠"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-nunito font-black text-[10px] uppercase tracking-[0.2em] text-violet-400">{t("comprehensionTitle")}</p>
            {total && total > 1 && (
              <span className="ml-auto font-nunito font-bold text-[10px] text-violet-300">
                {current}/{total}
              </span>
            )}
          </div>
          <p className="font-baloo font-black text-ds-text text-[16px] leading-snug">{question.text}</p>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const isRight = i === question.correct;
          const showResult = locked;

          let ringClass = "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50";
          if (showResult && isRight) ringClass = "border-emerald-400 bg-emerald-50";
          else if (showResult && isSelected && !isRight) ringClass = "border-red-300 bg-red-50";

          return (
            <motion.button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={locked}
              whileTap={!locked ? { scale: 0.97 } : {}}
              animate={isSelected && locked && isRight ? { scale: [1, 1.04, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${ringClass} disabled:cursor-default`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[12px] flex-shrink-0 ${
                showResult && isRight ? "bg-emerald-400 text-white" :
                showResult && isSelected ? "bg-red-400 text-white" :
                "bg-gray-100 text-gray-500"
              }`}>
                {showResult && isRight ? <Check className="w-4 h-4" /> :
                 showResult && isSelected ? <X className="w-4 h-4" /> :
                 String.fromCharCode(65 + i)}
              </span>
              <span className="font-nunito font-bold text-[14px] text-ds-text">{opt}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {locked && (
          <motion.p
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`mt-3 font-baloo font-black text-[15px] text-center ${isCorrect ? "text-emerald-600" : "text-rose-500"}`}
          >
            {isCorrect ? t("comprehensionCorrect") : t("comprehensionTryAgain")}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
