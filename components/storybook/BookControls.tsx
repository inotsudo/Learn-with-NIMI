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

  const navyBtn = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,168,76,0.28)", color: "rgba(240,232,212,0.85)" };

  return (
    <div
      className="mt-3 flex items-center justify-center gap-3 sm:gap-4 rounded-2xl px-3 py-3"
      style={{ background: "linear-gradient(160deg, #0D1E3A, #0A1828)", border: "1px solid rgba(201,168,76,0.28)", boxShadow: "0 8px 20px rgba(10,28,48,0.18)" }}
    >
      <motion.button whileTap={m.buttonPress} onClick={onPrev} disabled={isFirst}
        style={navyBtn}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center disabled:opacity-20 transition hover:border-[#F5C842]/50">
        <ChevronLeft size={22} />
      </motion.button>

      <motion.button whileTap={m.buttonPress} onClick={replay}
        style={navyBtn}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition hover:border-[#F5C842]/50">
        <RotateCcw size={16} />
      </motion.button>

      {/* Play/Pause — gold when active, matching the Airways CTA color everywhere else */}
      <motion.button whileTap={m.buttonPress} onClick={isPlaying ? pause : play} disabled={!pageHasAudio}
        className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all"
        style={!pageHasAudio ? { background: "rgba(255,255,255,0.06)", color: "rgba(240,232,212,0.35)", cursor: "not-allowed" }
          : { background: "linear-gradient(135deg,#F5C842,#C9A84C)", boxShadow: "0 6px 18px rgba(201,168,76,0.35)" }}>
        {isPlaying ? <Pause size={24} style={{ color: "#06101F" }} /> : <Play size={24} style={{ color: "#06101F" }} className="ml-1" />}
      </motion.button>

      <motion.button whileTap={m.buttonPress}
        onClick={() => { try { (bookRef?.current ?? document.documentElement).requestFullscreen?.(); } catch {} }}
        style={navyBtn}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition hover:border-[#F5C842]/50">
        <Maximize size={16} />
      </motion.button>

      <motion.button whileTap={m.buttonPress} onClick={onNext} disabled={isLast}
        style={navyBtn}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center disabled:opacity-20 transition hover:border-[#F5C842]/50">
        <ChevronRight size={22} />
      </motion.button>
    </div>
  );
}
