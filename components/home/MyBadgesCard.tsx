"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";
import type { StorySlot } from "@/lib/story-types";

interface Props { slots: StorySlot[]; }

const BADGES = [
  { key: "flipflop_audio", label: "Story Explorer",  icon: "/assets/badge-explorer.svg" },
  { key: "coloring",       label: "Kind Heart",      icon: "/assets/badge-kindheart.svg" },
  { key: "move_explore",   label: "Healthy Hero",    icon: "/assets/badge-hero.svg" },
  { key: "bonus_video",    label: "Adventure Star",  icon: "/assets/star-mascot.svg" },
];

export default function MyBadgesCard({ slots }: Props) {
  const earned = (key: string) => slots.find(s => s.slot_key === key)?.completed ?? false;

  return (
    <div className="theme-card border-2 theme-border rounded-[20px] p-4 flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <h3 className="font-baloo font-black text-white text-[20px] sm:text-[24px] text-center mb-3 uppercase tracking-wider">
        My Badges 🌿
      </h3>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {BADGES.map((b, i) => {
          const is = earned(b.key);
          return (
            <motion.div key={b.key}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring" }}
              className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <motion.div
                  animate={is ? { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] } : {}}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                  className={`w-16 h-16 rounded-full flex items-center justify-center border-[3px] shadow-lg ${
                    is ? "border-yellow-400/50 theme-card-hover" : "theme-border theme-card-active"
                  }`}>
                  <img src={b.icon} alt={b.label}
                    className={`w-12 h-12 ${is ? "" : "grayscale opacity-30"}`} />
                </motion.div>
                {!is && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-4 h-4 theme-text-muted/50" />
                  </div>
                )}
              </div>
              <span className={`font-nunito text-[12px] font-bold text-center leading-tight ${is ? "text-white" : "theme-text-muted/40"}`}>{b.label}</span>
            </motion.div>
          );
        })}
      </div>
      <Link href="/treasure" className="mt-3 flex items-center justify-center gap-1 font-nunito theme-text hover:text-white text-[13px] font-bold transition theme-card-hover hover:theme-card-hover rounded-xl py-2.5 border theme-border">
        View All Badges <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
