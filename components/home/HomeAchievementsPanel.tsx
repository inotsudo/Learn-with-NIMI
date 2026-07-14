"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Trophy } from "lucide-react";
import type { ChildAchievement } from "@/lib/queries";

interface BadgeDisplay {
  emoji: string;
  label: string;
  from: string;
  to: string;
  glow: string;
}

const CAT_BADGE_DISPLAY: Record<string, BadgeDisplay> = {
  morning:   { emoji: "🎵", label: "Music Master",  from: "#ec4899", to: "#db2777", glow: "#ec4899" },
  movement:  { emoji: "🤸", label: "Move Champion", from: "#f43f5e", to: "#e11d48", glow: "#f43f5e" },
  artistic:  { emoji: "🎨", label: "Art Star",      from: "#fbbf24", to: "#f59e0b", glow: "#fbbf24" },
  histoire:  { emoji: "📖", label: "Story Master",  from: "#38bdf8", to: "#0ea5e9", glow: "#38bdf8" },
  zoom:      { emoji: "🔍", label: "Zoom Explorer", from: "#34d399", to: "#10b981", glow: "#34d399" },
  discovery: { emoji: "🌍", label: "Discoverer",    from: "#22d3ee", to: "#06b6d4", glow: "#22d3ee" },
  flipflop:  { emoji: "🎧", label: "Audio Legend",  from: "#a78bfa", to: "#7c3aed", glow: "#a78bfa" },
  coloring:  { emoji: "🦋", label: "Color Expert",  from: "#fb7185", to: "#e11d48", glow: "#fb7185" },
};

const LOCKED_BADGE_PLACEHOLDERS: BadgeDisplay[] = [
  { emoji: "🎨", label: "Art Star",    from: "#fbbf24", to: "#f59e0b", glow: "#fbbf24" },
  { emoji: "🧩", label: "Puzzle Pro",  from: "#818cf8", to: "#6366f1", glow: "#818cf8" },
  { emoji: "🔥", label: "Streak Hero", from: "#f97316", to: "#ea580c", glow: "#f97316" },
];

function parseBadgeSlug(slug: string): BadgeDisplay {
  if (slug.startsWith("trilingual-story-"))
    return { emoji: "🌐", label: "Trilingual!", from: "#14b8a6", to: "#0d9488", glow: "#14b8a6" };
  if (slug.startsWith("story-streak-")) {
    const n = slug.split("-")[2] ?? "5";
    return { emoji: "🔥", label: `${n}-Story Streak`, from: "#f97316", to: "#ea580c", glow: "#f97316" };
  }
  if (slug.startsWith("story-") && slug.includes("-complete-"))
    return { emoji: "📚", label: "Story Complete", from: "#818cf8", to: "#6366f1", glow: "#818cf8" };
  if (slug.startsWith("level-") && slug.includes("-complete-")) {
    const n = slug.split("-")[1] ?? "1";
    return { emoji: "⭐", label: `Level ${n} Champ`, from: "#fbbf24", to: "#f59e0b", glow: "#fbbf24" };
  }
  const cat = slug.split("-")[0] ?? "";
  return CAT_BADGE_DISPLAY[cat] ?? { emoji: "🏅", label: "Achievement", from: "#818cf8", to: "#6366f1", glow: "#818cf8" };
}

interface Props {
  achievements: ChildAchievement[];
}

export default function HomeAchievementsPanel({ achievements }: Props) {
  return (
    <div className="overflow-hidden leaf-lg border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)]">

      {/* Flat header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm shrink-0">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-nunito text-amber-500 text-[10px] uppercase tracking-widest leading-none mb-0.5">Trophy Room</p>
            <h3 className="font-baloo font-black text-gray-900 text-[17px] leading-tight">My Treasures</h3>
          </div>
        </div>
        <Link href="/user-profile" className="flex items-center gap-0.5 font-nunito font-bold text-gray-400 text-[11px] hover:text-amber-600 transition-colors">
          All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="h-px bg-gray-100 mx-4" />

      {/* Badges */}
      <div className="px-4 py-4">
        <div className="flex justify-around gap-2">
          {Array.from({ length: 3 }).map((_, i) => {
            const ach    = achievements[achievements.length - 1 - i];
            const badge  = ach ? parseBadgeSlug(ach.slug) : LOCKED_BADGE_PLACEHOLDERS[i] ?? LOCKED_BADGE_PLACEHOLDERS[0];
            const earned = !!ach;
            return (
              <div key={i} className={`flex flex-col items-center gap-2 flex-1 transition-all ${earned ? "" : "opacity-40 grayscale"}`}>
                <motion.div
                  className="w-[78px] h-[78px] rounded-2xl flex items-center justify-center text-[40px] shadow-lg"
                  style={{ background: `linear-gradient(145deg,${badge.from},${badge.to})`, boxShadow: earned ? `0 6px 24px ${badge.glow}55` : undefined }}
                  animate={earned ? { scale: [1, 1.04, 1] } : undefined}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
                  {badge.emoji}
                </motion.div>
                {earned
                  ? <span className="bg-emerald-100 text-emerald-700 font-nunito font-black text-[9px] px-2 py-0.5 rounded-full">★ Earned</span>
                  : <span className="bg-gray-100 text-gray-400 font-nunito font-black text-[9px] px-2 py-0.5 rounded-full">🔒 Locked</span>
                }
                <p className="font-nunito font-bold text-gray-600 text-[10px] text-center leading-tight">{badge.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
