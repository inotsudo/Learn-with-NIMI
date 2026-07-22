"use client";

import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Maximize } from "lucide-react";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { useStoryBook } from "./StoryBookContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";

interface Props {
  onPrev: () => void;
  onNext: () => void;
  bookRef?: React.RefObject<HTMLDivElement | null>;
}

export default function BookControls({ onPrev, onNext, bookRef }: Props) {
  const { currentPage, totalPages, isPlaying, pageHasAudio, play, pause, replay } = useStoryBook();
  const m = useThemeMotion();
  useAppTheme(); // subscribe so CSS vars are live for themed buttons
  const isFirst = currentPage <= 0;
  const isLast = currentPage >= totalPages - 1;

  return (
    <div className="mt-3 flex items-center justify-center gap-3 sm:gap-4 leaf border border-emerald-100 bg-white/80 px-3 py-3 shadow-sm">
      <motion.button whileTap={m.buttonPress} onClick={onPrev} disabled={isFirst}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border border-ds-border flex items-center justify-center text-gray-700 disabled:opacity-20 transition shadow-sm hover:border-[var(--ds-brand-primary)]/30">
        <ChevronLeft size={22} />
      </motion.button>

      <motion.button whileTap={m.buttonPress} onClick={replay}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-ds-border flex items-center justify-center text-gray-500 transition shadow-sm hover:border-[var(--ds-brand-primary)]/30">
        <RotateCcw size={16} />
      </motion.button>

      {/* Play/Pause — world-themed idle state */}
      <motion.button whileTap={m.buttonPress} onClick={isPlaying ? pause : play} disabled={!pageHasAudio}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${
          !pageHasAudio
            ? "bg-gray-200 text-gray-400 cursor-not-allowed ring-0"
            : isPlaying
              ? "bg-[image:linear-gradient(to_bottom_right,var(--ds-brand-primary),var(--ds-brand-hover))] shadow-ds-cta ring-4 ring-[var(--ds-brand-primary)]/20"
              : "bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-hover)] shadow-[var(--ds-brand-primary)]/30 ring-4 ring-[var(--ds-brand-primary)]/20"
        }`}>
        {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
      </motion.button>


      <motion.button whileTap={m.buttonPress}
        onClick={() => { try { (bookRef?.current ?? document.documentElement).requestFullscreen?.(); } catch {} }}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-ds-border flex items-center justify-center text-gray-500 transition shadow-sm hover:border-[var(--ds-brand-primary)]/30">
        <Maximize size={16} />
      </motion.button>

      <motion.button whileTap={m.buttonPress} onClick={onNext} disabled={isLast}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border border-ds-border flex items-center justify-center text-gray-700 disabled:opacity-20 transition shadow-sm hover:border-[var(--ds-brand-primary)]/30">
        <ChevronRight size={22} />
      </motion.button>
    </div>
  );
}
