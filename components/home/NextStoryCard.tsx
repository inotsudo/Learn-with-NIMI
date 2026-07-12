"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Lock } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem } from "@/lib/story-types";

interface Props { story: StoryLibraryItem | undefined; }

export default function NextStoryCard({ story }: Props) {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();
  if (!story) return null;

  return (
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/60 to-white shadow-[0_16px_34px_rgba(15,23,42,0.08)] flex flex-col h-full" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
      <Image src={assets.storyCard.background} alt="" aria-hidden="true"
        fill className="object-cover pointer-events-none opacity-[0.08]" />
      <Image src={assets.storyCard.frame} alt="" aria-hidden="true"
        fill className="object-cover pointer-events-none opacity-40 z-[1]" />
      <div className="absolute inset-x-4 top-4 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />

      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-center justify-center px-4 pt-4">
          <div className="rounded-full border border-[var(--ds-border-brand)]/20 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--ds-brand-primary)] shadow-sm">
            Next Adventure
          </div>
        </div>
        <h3 className="font-baloo font-black text-ds-text text-[20px] sm:text-[24px] text-center pt-3 px-4 uppercase tracking-wider">
          Next Story 🌿
        </h3>

        <div className="relative mx-3 mt-3 leaf overflow-hidden h-28 flex-shrink-0 border border-white/70 shadow-[0_8px_22px_rgba(15,23,42,0.08)]">
          {story.cover_url ? (
            <Image src={getStorageUrl(story.cover_url)} alt={story.title}
              fill className="object-cover opacity-40" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-5xl opacity-30">{story.theme_emoji}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/20 flex items-center justify-center">
            <motion.div animate={m.floatSoft.animate} transition={m.floatSoft.transition}>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <Image src={assets.storyCard.badge} alt="" aria-hidden="true" fill className="opacity-90" />
                <Lock className="relative z-10 w-5 h-5 text-white drop-shadow-sm" />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col text-center">
          <h4 className="font-baloo font-black text-ds-text text-[20px]">{story.title}</h4>
          <p className="font-nunito text-gray-500 text-[14px] mt-1.5 leading-snug flex-1">
            Complete the current story to unlock this adventure!
          </p>
          <div className="mt-3 border border-[var(--ds-border-brand)]/20 bg-white/80 leaf py-2.5 shadow-sm">
            <span className="font-nunito text-[var(--ds-brand-primary)] text-[16px] font-black">🔒 Locked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
