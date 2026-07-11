"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, ChevronRight } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import type { StoryLibraryItem } from "@/lib/story-types";

interface Props {
  stories: StoryLibraryItem[];
  currentStoryId: string | null;
}

export default function StoryLibraryProgress({ stories, currentStoryId }: Props) {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();

  if (stories.length <= 1) return null;

  const completed = stories.filter(s => s.complete).length;

  return (
    <div className="relative overflow-hidden leaf border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/40 to-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      {/* World card texture */}
      <img src={assets.storyCard.background} alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-[0.05]" />

      <div className="absolute inset-x-4 top-4 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)] rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <span className="text-lg">📚</span>
            </div>
            <div>
              <h3 className="font-black text-ds-text text-[16px]">STORY LIBRARY</h3>
              <p className="text-gray-400 text-[10px]">
                Story {completed + (completed < stories.length ? 1 : 0)} of {stories.length}
              </p>
            </div>
          </div>
          <Link href="/stories">
            <motion.button whileHover={m.buttonHover}
              className="bg-ds-action-subtle text-[var(--ds-brand-primary)] font-black text-[11px] rounded-full px-4 py-2 flex items-center gap-1 border border-[var(--ds-brand-primary)]/20">
              View All <ChevronRight className="w-3 h-3" />
            </motion.button>
          </Link>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {stories.map((story, i) => {
            const isCurrent = story.sid === currentStoryId;

            return (
              <div key={story.sid} className="flex items-center shrink-0">
                <Link href={story.unlocked ? `/stories/${story.slug}` : "#"}
                  className={story.unlocked ? "" : "pointer-events-none"}>
                  <motion.div whileHover={story.unlocked ? m.cardHoverSm : undefined}
                    className={`relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-2xl overflow-hidden border-[3px] shadow-xl transition ${
                      story.complete
                        ? "border-[var(--ds-brand-primary)]/50 shadow-ds-cta"
                        : isCurrent
                          ? "border-[var(--ds-brand-primary)]/50 shadow-ds-cta ring-2 ring-[var(--ds-brand-primary)]/20"
                          : "border-ds-border opacity-40"
                    }`}>
                    {story.cover_url ? (
                      <img src={getStorageUrl(story.cover_url)} alt={story.title}
                        className={`absolute inset-0 w-full h-full object-cover ${!story.unlocked ? "grayscale" : ""}`} />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${!story.unlocked ? "grayscale" : ""}`}>
                        <span className="text-3xl">{story.theme_emoji}</span>
                      </div>
                    )}

                    {story.complete && (
                      <div className="absolute inset-0 bg-[var(--ds-brand-primary)]/25 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-[var(--ds-brand-primary)] drop-shadow-lg" />
                      </div>
                    )}
                    {!story.unlocked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white/30" />
                      </div>
                    )}
                    {isCurrent && !story.complete && (
                      <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-center py-0.5">
                        <span className="text-[8px] font-black text-white">▶ NOW</span>
                      </motion.div>
                    )}
                    <div className="absolute top-1.5 left-1.5 w-6 h-6 bg-white/80 rounded-lg flex items-center justify-center">
                      <span className="text-gray-700 text-[10px] font-black">{story.sort_order}</span>
                    </div>
                  </motion.div>
                </Link>
                {i < stories.length - 1 && (
                  <motion.div animate={story.complete ? { x: [0, 3, 0] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}>
                    <ChevronRight className={`w-4 h-4 mx-1 ${
                      story.complete ? "text-[var(--ds-brand-primary)]/50" : "text-gray-200"
                    }`} />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
