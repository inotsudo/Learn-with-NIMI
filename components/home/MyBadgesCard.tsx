"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";
import type { StorySlot } from "@/lib/story-types";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

interface Props { slots: StorySlot[]; }

export default function MyBadgesCard({ slots }: Props) {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const BADGES = [
    { key: "flipflop_audio", label: "Story Explorer",  emoji: "📖" },
    { key: "coloring",       label: "Kind Heart",      emoji: "🎨" },
    { key: "move_explore",   label: "Healthy Hero",    emoji: "⚡" },
    { key: "bonus_video",    label: "Adventure Star",  emoji: "🌟" },
  ];

  const earned = (key: string) => slots.find(s => s.slot_key === key)?.completed ?? false;

  return (
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/40 to-white leaf p-4 flex flex-col shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      <Image src={assets.storyCard.background} alt="" aria-hidden="true" fill
        className="object-cover pointer-events-none opacity-[0.05]" />
      <div className="absolute inset-x-4 top-4 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <div className="relative z-10 flex flex-col flex-1">
        <div className="mb-3 flex justify-center">
          <div className="rounded-full border border-[var(--ds-border-brand)]/20 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--ds-brand-primary)] shadow-sm">
            Badge collection
          </div>
        </div>
        <h3 className="font-baloo font-black text-ds-text text-[20px] sm:text-[24px] text-center mb-3 uppercase tracking-wider">
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
                <div className="relative w-16 h-16">
                  <motion.div
                    animate={is ? { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] } : {}}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center border-[3px] shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${
                      is ? "border-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)]" : "border-gray-200 bg-gray-50"
                    }`}>
                    <span className={`text-3xl leading-none select-none ${is ? "" : "grayscale opacity-30"}`}>
                      {b.emoji}
                    </span>
                  </motion.div>
                  {is && (
                    <Image src={assets.rewards.badgeFrame} alt="" aria-hidden="true" fill
                      className="pointer-events-none opacity-75" />
                  )}
                  {!is && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
                <span className={`font-nunito text-[12px] font-bold text-center leading-tight ${is ? "text-gray-800" : "text-gray-400"}`}>{b.label}</span>
              </motion.div>
            );
          })}
        </div>
        <Link href="/treasure" className="mt-3 flex items-center justify-center gap-1 font-nunito text-[var(--ds-brand-primary)] hover:text-[var(--ds-brand-hover)] text-[13px] font-bold transition hover:bg-[var(--ds-brand-subtle)] leaf py-2.5 border border-[var(--ds-brand-primary)]/20">
          View All Badges <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
