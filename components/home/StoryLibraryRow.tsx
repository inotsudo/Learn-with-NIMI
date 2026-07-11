"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { CheckCircle2, Lock, Play, ChevronRight } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem } from "@/lib/story-types";

interface Props {
  stories: StoryLibraryItem[];
  currentStoryId: string | null;
}

export default function StoryLibraryRow({ stories, currentStoryId }: Props) {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();
  if (stories.length === 0) return null;

  const completed = stories.filter(s => s.complete).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-lg">📚</span>
          </div>
          <div>
            <h2 className="font-black text-ds-text text-base">Story Library</h2>
            <p className="text-gray-500 text-[11px] font-semibold">{completed}/{stories.length} stories completed</p>
          </div>
        </div>
        <Link href="/stories" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs font-bold transition">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
        {stories.map((story, i) => {
          const isCurrent = story.sid === currentStoryId;
          const done = Math.round(story.progress * 6);

          return (
            <motion.div
              key={story.sid}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex-shrink-0 w-[220px] sm:w-[240px] snap-start"
            >
              {story.unlocked ? (
                <Link href={`/stories/${story.slug}`}>
                  <div className={`overflow-hidden border-2 shadow-lg hover:shadow-2xl hover:scale-[1.03] ${m.transitionSlow} cursor-pointer h-full flex flex-col ${
                    story.complete
                      ? "border-[var(--ds-brand-primary)]/60"
                      : isCurrent
                        ? "border-[var(--ds-brand-primary)]/60 ring-2 ring-[var(--ds-brand-primary)]/20"
                        : "border-ds-border hover:border-[var(--ds-brand-primary)]/50"
                  }`}
                  style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                    {/* Cover */}
                    <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200">
                      {story.cover_url ? (
                        <img src={getStorageUrl(story.cover_url)} alt={story.title}
                          className="absolute inset-0 w-full h-full object-cover"  loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <span className="text-5xl">{story.theme_emoji}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                      {/* World badge — number chip */}
                      <div className="absolute top-2.5 left-2.5 w-7 h-7 flex items-center justify-center">
                        <img src={assets.storyCard.badge} alt="" aria-hidden="true"
                          className="absolute inset-0 w-full h-full"  loading="lazy" />
                        <span className="relative z-10 text-white font-black text-xs drop-shadow-sm">
                          {story.sort_order}
                        </span>
                      </div>

                      {/* Status badge */}
                      {story.complete ? (
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[var(--ds-brand-primary)] text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </div>
                      ) : isCurrent ? (
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg">
                          <Play className="w-3 h-3 fill-white" /> Continue
                        </div>
                      ) : null}
                    </div>

                    {/* Info panel — world texture layered in white section */}
                    <div className="p-3 bg-white flex-1 flex flex-col relative overflow-hidden">
                      <img src={assets.storyCard.background} alt="" aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-[0.07]"  loading="lazy" />
                      <div className="relative z-10 flex flex-col flex-1">
                        <p className="font-black text-ds-text text-sm leading-tight">
                          {story.theme_emoji} {story.title}
                        </p>

                        {/* Progress state */}
                        {story.complete ? (
                          <div className="flex items-center gap-1.5 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-[var(--ds-brand-primary)]" />
                            <span className="text-[var(--ds-brand-primary)] text-[11px] font-bold">All missions done!</span>
                          </div>
                        ) : story.progress > 0 ? (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{done}/6</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <motion.div
                                className={`bg-gradient-to-r ${assets.storyCard.progressFill} h-full rounded-full`}
                                initial={{ width: 0 }}
                                animate={{ width: `${story.progress * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-[11px] font-semibold mt-2">Ready to start</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                /* Locked story */
                <div className="overflow-hidden border border-ds-border h-full flex flex-col opacity-50" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                  <div className="relative h-32 bg-gradient-to-br from-gray-50 to-gray-100">
                    {story.cover_url ? (
                      <img src={getStorageUrl(story.cover_url)} alt={story.title}
                        className="absolute inset-0 w-full h-full object-cover grayscale opacity-40"  loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-4xl grayscale opacity-40">{story.theme_emoji}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 shadow-sm rounded-full flex items-center justify-center">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                    <div className="absolute top-2.5 left-2.5 w-7 h-7 bg-gray-200 text-gray-400 rounded-lg flex items-center justify-center font-black text-xs">
                      {story.sort_order}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50">
                    <p className="font-black text-gray-400 text-sm">{story.theme_emoji} {story.title}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Lock className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-gray-300 text-[11px] font-bold">Locked</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
