"use client";

import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Maximize } from "lucide-react";
import { motion } from "framer-motion";
import { useStoryBook } from "./StoryBookContext";

interface Props {
  onPrev: () => void;
  onNext: () => void;
  bookRef?: React.RefObject<HTMLDivElement | null>;
}

export default function BookControls({ onPrev, onNext, bookRef }: Props) {
  const { currentPage, totalPages, isPlaying, play, pause, replay } = useStoryBook();
  const isFirst = currentPage <= 0;
  const isLast = currentPage >= totalPages - 1;

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 py-3">
      <motion.button whileTap={{ scale: 0.85 }} onClick={onPrev} disabled={isFirst}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center text-white disabled:opacity-20 transition shadow-lg">
        <ChevronLeft size={22} />
      </motion.button>

      <motion.button whileTap={{ scale: 0.85 }} onClick={replay}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center text-white/60 transition shadow">
        <RotateCcw size={16} />
      </motion.button>

      <motion.button whileTap={{ scale: 0.85 }} onClick={isPlaying ? pause : play}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${
          isPlaying
            ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30 ring-4 ring-green-400/20"
            : "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-orange-500/30"
        }`}>
        {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
      </motion.button>

      <motion.button whileTap={{ scale: 0.85 }}
        onClick={() => { try { (bookRef?.current ?? document.documentElement).requestFullscreen?.(); } catch {} }}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center text-white/60 transition shadow">
        <Maximize size={16} />
      </motion.button>

      <motion.button whileTap={{ scale: 0.85 }} onClick={onNext} disabled={isLast}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center text-white disabled:opacity-20 transition shadow-lg">
        <ChevronRight size={22} />
      </motion.button>
    </div>
  );
}
