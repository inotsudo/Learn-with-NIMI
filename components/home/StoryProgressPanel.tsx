"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import type { StorySlot } from "@/lib/story-types";

interface Props {
  storySlug: string;
  slots: StorySlot[];
}

const R = 52;
const C = 2 * Math.PI * R;

export default function StoryProgressPanel({ storySlug, slots }: Props) {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const SLOTS: Record<string, { num: number; icon: string; label: string }> = {
    flipflop_audio: { num: 1, icon: assets.iconFlipflop, label: "FlipFlop Audio" },
    story_pdf:      { num: 2, icon: assets.iconPdf,      label: "Story PDF" },
    coloring:       { num: 3, icon: assets.iconColoring,  label: "Coloring Activity" },
    move_explore:   { num: 4, icon: assets.iconMove,      label: "Move & Explore" },
    sing_along:     { num: 5, icon: assets.iconSing,      label: "Sing Along" },
    bonus_video:    { num: 6, icon: assets.iconVideo,     label: "Bonus Video" },
  };

  const done   = slots.filter(s => s.completed).length;
  const total  = slots.length || 6;
  const offset = C * (1 - done / total);

  return (
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/40 to-white leaf p-4 sm:p-5 h-full flex flex-col shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      {/* World card texture — 6% opacity, purely decorative */}
      <img src={assets.storyCard.background} alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-[0.06]"  loading="lazy" />

      <div className="absolute inset-x-4 top-4 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <div className="relative z-10 flex flex-col flex-1">
        <div className="mb-3 flex justify-center">
          <div className="rounded-full border border-[var(--ds-border-brand)]/20 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--ds-brand-primary)] shadow-sm">
            Story progress
          </div>
        </div>
        <h3 className="font-baloo font-black text-ds-text text-[16px] sm:text-[18px] uppercase tracking-wider mb-3 text-center">
          Story Progress 🌿
        </h3>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">

          {/* Progress ring */}
          <div className="flex justify-center sm:flex-col sm:items-center shrink-0">
            <div className="relative w-[100px] h-[100px] sm:w-[130px] sm:h-[130px]">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" />
                <motion.circle cx="60" cy="60" r={R} fill="none"
                  stroke="var(--ds-progress-fill)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={C}
                  initial={{ strokeDashoffset: C }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.2, ease: "easeOut" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.img src={assets.starMascot} alt="" className="w-9 h-9 sm:w-11 sm:h-11"
                  animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
                <span className="font-black text-[var(--ds-brand-primary)] text-[18px] sm:text-[22px] leading-none mt-0.5">
                  {done}/{total}
                </span>
                <span className="text-gray-500 text-[7px] sm:text-[9px] font-bold mt-0.5 text-center leading-tight">
                  Missions<br/>Completed
                </span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="flex-1 flex flex-col justify-center gap-[4px] min-w-0">
            {slots.map((slot, i) => {
              const meta = SLOTS[slot.slot_key] ?? { num: i + 1, icon: assets.iconFlipflop, label: slot.slot_key };
              return (
                <Link key={slot.slot_key} href={`/stories/${storySlug}/mission/${slot.slot_key}`}>
                  <div className={`flex items-center gap-2 px-1 py-[3px] rounded-lg transition ${
                    slot.completed ? "hover:bg-[var(--ds-brand-soft)]" : "hover:bg-gray-50"
                  }`}>
                    <img src={meta.icon} alt="" className="w-6 h-6 shrink-0 rounded-md"  loading="lazy" />
                    <span className={`font-nunito text-[11px] sm:text-[12px] font-bold flex-1 leading-tight whitespace-nowrap ${
                      slot.completed ? "text-ds-text" : "text-gray-500"
                    }`}>
                      {meta.num}. {meta.label}
                    </span>
                    {slot.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[var(--ds-brand-primary)] shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <Link href={`/stories/${storySlug}`}
          className="mt-3 sm:mt-4 flex items-center justify-center gap-2 text-[var(--ds-brand-primary)] font-baloo font-black text-[15px] hover:bg-[var(--ds-brand-soft)] leaf py-2.5 transition border border-[var(--ds-brand-primary)]/20">
          View Story <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
