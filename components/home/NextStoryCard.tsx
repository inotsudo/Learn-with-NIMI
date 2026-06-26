"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem } from "@/lib/story-types";

interface Props { story: StoryLibraryItem | undefined; }

export default function NextStoryCard({ story }: Props) {
  if (!story) return null;

  return (
    <div className="theme-card border-2 theme-border rounded-[20px] overflow-hidden flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <h3 className="font-baloo font-black text-white text-[20px] sm:text-[24px] text-center pt-4 px-4 uppercase tracking-wider">
        Next Story 🌿
      </h3>
      {/* Cover — ASSET: next story cover illustration */}
      <div className="relative mx-3 mt-3 rounded-xl overflow-hidden h-28 flex-shrink-0">
        {story.cover_url ? (
          <img src={getStorageUrl(story.cover_url)} alt={story.title}
            className="absolute inset-0 w-full h-full object-cover opacity-40" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-700/50 to-indigo-800/60 flex items-center justify-center"
            data-asset="next-story-cover-illustration">
            <span className="text-5xl opacity-30">{story.theme_emoji}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <div className="w-12 h-12 bg-black/50 backdrop-blur rounded-full flex items-center justify-center border-2 border-white/20">
              <Lock className="w-5 h-5 text-white/60" />
            </div>
          </motion.div>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col text-center">
        <h4 className="font-baloo font-black text-white text-[20px]">{story.title}</h4>
        <p className="font-nunito theme-text text-[14px] mt-1.5 leading-snug flex-1">Complete the current story to unlock this adventure!</p>
        <div className="mt-3 theme-card-hover border theme-border rounded-xl py-2.5">
          <span className="font-nunito theme-text-muted text-[16px] font-black">🔒 Locked</span>
        </div>
      </div>
    </div>
  );
}
