"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import type { StorySlot } from "@/lib/story-types";

interface Props {
  storySlug: string;
  slots: StorySlot[];
}

const SLOTS: Record<string, { num: number; icon: string; label: string }> = {
  flipflop_audio: { num: 1, icon: "/assets/icon-flipflop.svg", label: "FlipFlop Audio" },
  story_pdf:      { num: 2, icon: "/assets/icon-pdf.svg",      label: "Story PDF" },
  coloring:       { num: 3, icon: "/assets/icon-coloring.svg",  label: "Coloring Activity" },
  move_explore:   { num: 4, icon: "/assets/icon-move.svg",      label: "Move & Explore" },
  sing_along:     { num: 5, icon: "/assets/icon-sing.svg",      label: "Sing Along" },
  bonus_video:    { num: 6, icon: "/assets/icon-video.svg",     label: "Bonus Video" },
};

const R = 52;
const C = 2 * Math.PI * R;

export default function StoryProgressPanel({ storySlug, slots }: Props) {
  const done = slots.filter(s => s.completed).length;
  const total = slots.length || 6;
  const offset = C * (1 - done / total);

  return (
    <div className="theme-card border-2 theme-border rounded-[20px] p-4 sm:p-5 h-full flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <h3 className="font-baloo font-black text-white text-[16px] sm:text-[18px] uppercase tracking-wider mb-3 text-center">
        Story Progress 🌿
      </h3>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">

        {/* Ring */}
        <div className="flex justify-center sm:flex-col sm:items-center shrink-0">
          <div className="relative w-[100px] h-[100px] sm:w-[130px] sm:h-[130px]">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <motion.circle cx="60" cy="60" r={R} fill="none"
                stroke="#22c55e" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: "easeOut" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.img src="/assets/star-mascot.svg" alt="" className="w-9 h-9 sm:w-11 sm:h-11"
                animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
              <span className="font-black text-green-400 text-[18px] sm:text-[22px] leading-none mt-0.5">{done}/{total}</span>
              <span className="theme-text text-[7px] sm:text-[9px] font-bold mt-0.5 text-center leading-tight">Missions<br/>Completed</span>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="flex-1 flex flex-col justify-center gap-[4px] min-w-0">
          {slots.map((slot, i) => {
            const m = SLOTS[slot.slot_key] ?? { num: i + 1, icon: "/assets/icon-flipflop.svg", label: slot.slot_key };
            return (
              <Link key={slot.slot_key} href={`/stories/${storySlug}/mission/${slot.slot_key}`}>
                <div className={`flex items-center gap-2 px-1 py-[3px] rounded-lg transition ${
                  slot.completed ? "hover:bg-green-500/10" : "hover:bg-white/5"
                }`}>
                  <img src={m.icon} alt="" className="w-6 h-6 shrink-0 rounded-md" />
                  <span className={`font-nunito text-[11px] sm:text-[12px] font-bold flex-1 leading-tight whitespace-nowrap ${
                    slot.completed ? "text-white" : "theme-text-muted"
                  }`}>
                    {m.num}. {m.label}
                  </span>
                  {slot.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 theme-text-muted shrink-0" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Link href={`/stories/${storySlug}`}
        className="mt-3 sm:mt-4 flex items-center justify-center gap-2 text-white font-baloo font-black text-[15px] theme-card-hover hover:theme-card-hover rounded-xl py-2.5 transition border theme-border">
        View Story <ChevronRight className="w-5 h-5" />
      </Link>
    </div>
  );
}
