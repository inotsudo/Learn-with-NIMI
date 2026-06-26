"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Lock, Play, ChevronRight } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem } from "@/lib/story-types";

interface Props {
  stories: StoryLibraryItem[];
  currentStoryId: string | null;
}

export default function StoryLibraryRow({ stories, currentStoryId }: Props) {
  if (stories.length === 0) return null;

  const completed = stories.filter(s => s.complete).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-lg">📚</span>
          </div>
          <div>
            <h2 className="font-black text-white text-base">Story Library</h2>
            <p className="theme-text-muted text-[11px] font-semibold">{completed}/{stories.length} stories completed</p>
          </div>
        </div>
        <Link href="/stories" className="flex items-center gap-1 theme-text-muted hover:text-white text-xs font-bold transition">
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
                  <div className={`rounded-2xl overflow-hidden border-2 shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer h-full flex flex-col ${
                    story.complete
                      ? "border-green-400/60"
                      : isCurrent
                        ? "border-yellow-400/70 ring-2 ring-yellow-400/20"
                        : "border-white/15 hover:theme-border-strong/40"
                  }`}>
                    {/* Cover */}
                    <div className="relative h-32 bg-gradient-to-br from-purple-700/50 to-indigo-800/30">
                      {story.cover_url ? (
                        <img src={getStorageUrl(story.cover_url)} alt={story.title}
                          className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center">
                          <span className="text-5xl">{story.theme_emoji}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                      {/* Number */}
                      <div className="absolute top-2.5 left-2.5 w-7 h-7 theme-accent/90 backdrop-blur text-white rounded-lg flex items-center justify-center font-black text-xs shadow-md">
                        {story.sort_order}
                      </div>

                      {/* Status badge */}
                      {story.complete ? (
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-green-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </div>
                      ) : isCurrent ? (
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg">
                          <Play className="w-3 h-3 fill-white" /> Continue
                        </div>
                      ) : null}
                    </div>

                    {/* Info */}
                    <div className="p-3 bg-white/5 flex-1 flex flex-col">
                      <p className="font-black text-white text-sm leading-tight">
                        {story.theme_emoji} {story.title}
                      </p>

                      {/* Progress */}
                      {story.complete ? (
                        <div className="flex items-center gap-1.5 mt-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-green-300 text-[11px] font-bold">All missions done!</span>
                        </div>
                      ) : story.progress > 0 ? (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] font-bold theme-text-muted mb-1">
                            <span>Progress</span>
                            <span>{done}/6</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${story.progress * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="theme-text-muted text-[11px] font-semibold mt-2">Ready to start</p>
                      )}
                    </div>
                  </div>
                </Link>
              ) : (
                /* Locked story */
                <div className="rounded-2xl overflow-hidden border-2 border-white/8 h-full flex flex-col opacity-50">
                  <div className="relative h-32 bg-gradient-to-br from-gray-800/60 to-gray-900/40">
                    {story.cover_url ? (
                      <img src={getStorageUrl(story.cover_url)} alt={story.title}
                        className="absolute inset-0 w-full h-full object-cover grayscale opacity-40" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <span className="text-4xl grayscale opacity-40">{story.theme_emoji}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white/50" />
                      </div>
                    </div>
                    <div className="absolute top-2.5 left-2.5 w-7 h-7 bg-gray-600/80 text-white/40 rounded-lg flex items-center justify-center font-black text-xs">
                      {story.sort_order}
                    </div>
                  </div>
                  <div className="p-3 bg-white/3">
                    <p className="font-black text-white/30 text-sm">{story.theme_emoji} {story.title}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Lock className="w-3.5 h-3.5 text-white/20" />
                      <span className="text-white/20 text-[11px] font-bold">Locked</span>
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
