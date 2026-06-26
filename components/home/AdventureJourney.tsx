"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, ChevronRight, Play } from "lucide-react";
import type { StorySlot } from "@/lib/story-types";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  storySlug: string;
  slots: StorySlot[];
}

const MISSION_META: Record<string, { nameKey: string; descKey: string; icon: string; bg: string; mascot: string }> = {
  flipflop_audio: { nameKey: "missionMagicStories", descKey: "missionMagicStoriesDesc", icon: "📖", bg: "from-violet-500 to-purple-700", mascot: "🎧" },
  story_pdf: { nameKey: "missionShinyReaders", descKey: "missionShinyReadersDesc", icon: "📄", bg: "from-blue-500 to-indigo-700", mascot: "📚" },
  coloring: { nameKey: "missionLittleCreators", descKey: "missionLittleCreatorsDesc", icon: "🎨", bg: "from-orange-400 to-pink-600", mascot: "🖌️" },
  move_explore: { nameKey: "missionMoveGroove", descKey: "missionMoveGrooveDesc", icon: "🤸", bg: "from-green-400 to-emerald-700", mascot: "💃" },
  sing_along: { nameKey: "missionSingAlong", descKey: "missionSingAlongDesc", icon: "🎵", bg: "from-pink-400 to-rose-700", mascot: "🎤" },
  bonus_video: { nameKey: "missionJourney", descKey: "missionJourneyDesc", icon: "🎬", bg: "from-red-400 to-orange-700", mascot: "🎥" },
};

export default function AdventureJourney({ storySlug, slots }: Props) {
  const { t } = useLanguage();
  const done = slots.filter(s => s.completed).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <p className="font-black text-yellow-300 text-[14px] sm:text-[16px] uppercase tracking-wider">
          ⭐ Complete all 6 steps to earn your Story Certificate! ⭐
        </p>
      </div>

      {/* 6 Mission Cards — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide lg:grid lg:grid-cols-6 lg:overflow-visible">
        {slots.map((slot, i) => {
          const meta = MISSION_META[slot.slot_key];
          const m = meta ? { name: t(meta.nameKey), desc: t(meta.descKey), icon: meta.icon, bg: meta.bg, mascot: meta.mascot } : { name: slot.slot_key, desc: "", icon: "📌", bg: "from-gray-500 to-gray-700", mascot: "📌" };
          const isNext = !slot.completed && (i === 0 || slots[i - 1]?.completed);
          const isLocked = !slot.completed && !isNext;

          const card = (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={!isLocked ? { y: -6, scale: 1.03 } : undefined}
              className={`relative rounded-[20px] overflow-hidden border-2 flex flex-col min-w-[140px] sm:min-w-[150px] lg:min-w-0 shadow-xl transition-all ${
                slot.completed
                  ? "border-green-400/40 shadow-green-500/10"
                  : isNext
                    ? "border-yellow-400/40 shadow-yellow-500/15 ring-2 ring-yellow-400/15"
                    : "border-white/[0.06] opacity-50"
              }`}
            >
              {/* Background */}
              <div className={`absolute inset-0 bg-gradient-to-b ${
                slot.completed ? "from-green-500/15 to-green-600/5" : isLocked ? "from-white/[0.02] to-transparent" : `${m.bg} opacity-15`
              }`} />

              {/* Number badge */}
              <div className="relative z-10 p-3 pb-0 flex items-center justify-between">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black shadow ${
                  slot.completed ? "bg-green-500 text-white"
                    : isNext ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                    : "bg-white/10 text-white/30"
                }`}>
                  {i + 1}
                </div>
                {isNext && (
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                    className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/40">
                    <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                  </motion.div>
                )}
              </div>

              {/* Icon + Mascot area */}
              <div className="relative z-10 flex items-center justify-center py-3 px-2">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/15 ${
                  slot.completed ? "bg-green-500/20" : isLocked ? "bg-white/[0.04]" : `bg-gradient-to-br ${m.bg} bg-opacity-30`
                }`}>
                  {slot.completed ? <CheckCircle2 className="w-8 h-8 text-green-400" /> :
                   isLocked ? <Lock className="w-6 h-6 text-white/20" /> :
                   <span className="drop-shadow-lg">{m.icon}</span>}
                </div>
              </div>

              {/* Text */}
              <div className="relative z-10 px-3 pb-2 text-center flex-1">
                <p className={`font-black text-[11px] leading-tight whitespace-pre-line ${
                  slot.completed ? "text-green-300" : isNext ? "text-white" : "text-white/30"
                }`}>
                  {m.name}
                </p>
                {!isLocked && (
                  <p className={`text-[8px] mt-1 leading-snug ${
                    slot.completed ? "text-green-200/40" : "theme-text-faint"
                  }`}>
                    {m.desc}
                  </p>
                )}
              </div>

              {/* Status button */}
              <div className="relative z-10 px-3 pb-3">
                {slot.completed ? (
                  <div className="bg-green-500 text-white text-[9px] font-black py-1.5 rounded-lg text-center shadow-lg">
                    ✓ COMPLETED
                  </div>
                ) : isNext ? (
                  <motion.div animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }}
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] font-black py-1.5 rounded-lg text-center shadow-lg shadow-orange-500/25">
                    ▶ START
                  </motion.div>
                ) : (
                  <div className="bg-white/[0.04] text-white/15 text-[9px] font-bold py-1.5 rounded-lg text-center border border-white/[0.06]">
                    🔒 LOCKED
                  </div>
                )}
              </div>
            </motion.div>
          );

          return isLocked ? (
            <div key={slot.slot_key}>{card}</div>
          ) : (
            <Link key={slot.slot_key} href={`/stories/${storySlug}/mission/${slot.slot_key}`} className="contents">
              {card}
            </Link>
          );
        })}
      </div>

      {/* Arrow connectors (desktop only) */}
      <div className="hidden lg:flex items-center justify-center gap-1 -mt-2">
        {slots.map((slot, i) => (
          i < slots.length - 1 && (
            <div key={i} className="flex items-center">
              <div className="w-12" />
              <ChevronRight className={`w-4 h-4 ${slot.completed ? "text-green-400/50" : "text-white/10"}`} />
              <div className="w-12" />
            </div>
          )
        ))}
      </div>
    </div>
  );
}
