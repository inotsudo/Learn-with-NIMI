"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, ChevronRight } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem } from "@/lib/story-types";

interface Props {
  stories: StoryLibraryItem[];
  currentStoryId: string | null;
}

export default function StoryLibraryProgress({ stories, currentStoryId }: Props) {
  if (stories.length <= 1) return null;

  const completed = stories.filter(s => s.complete).length;

  return (
    <div className="relative rounded-[24px] overflow-hidden border-2 theme-border shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-[#1f1050] to-purple-500/5" />

      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <span className="text-lg">📚</span>
            </div>
            <div>
              <h3 className="font-black text-white text-[16px]">STORY LIBRARY</h3>
              <p className="theme-text-faint text-[10px]">Story {completed + (completed < stories.length ? 1 : 0)} of {stories.length}</p>
            </div>
          </div>
          <Link href="/stories">
            <motion.button whileHover={{ scale: 1.03 }}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-[11px] rounded-full px-4 py-2 shadow-lg flex items-center gap-1 border theme-border-strong/20">
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
                  <motion.div whileHover={story.unlocked ? { scale: 1.08, y: -3 } : undefined}
                    className={`relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-2xl overflow-hidden border-[3px] shadow-xl transition ${
                      story.complete ? "border-green-400/50 shadow-green-500/15"
                        : isCurrent ? "border-yellow-400/50 shadow-yellow-500/15 ring-2 ring-yellow-400/20"
                        : "border-white/[0.08] opacity-40"
                    }`}>
                    {story.cover_url ? (
                      <img src={getStorageUrl(story.cover_url)} alt={story.title}
                        className={`absolute inset-0 w-full h-full object-cover ${!story.unlocked ? "grayscale" : ""}`} />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br from-purple-600/40 to-indigo-700/40 flex items-center justify-center ${!story.unlocked ? "grayscale" : ""}`}>
                        <span className="text-3xl">{story.theme_emoji}</span>
                      </div>
                    )}
                    {story.complete && (
                      <div className="absolute inset-0 bg-green-500/25 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-green-400 drop-shadow-lg" />
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
                    <div className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/50 backdrop-blur rounded-lg flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">{story.sort_order}</span>
                    </div>
                  </motion.div>
                </Link>
                {i < stories.length - 1 && (
                  <motion.div animate={story.complete ? { x: [0, 3, 0] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}>
                    <ChevronRight className={`w-4 h-4 mx-1 ${story.complete ? "text-green-400/50" : "text-white/10"}`} />
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
