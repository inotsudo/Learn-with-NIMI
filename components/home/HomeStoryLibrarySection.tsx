"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Star, ChevronRight, Play, Lock } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import { ZoneDecorations } from "@/components/campus/ZoneDecorations";
import type { StoryLibraryItem } from "@/lib/story-types";

// Stepping-stone path marker between campus zones (purely decorative)
function CampusConnector() {
  return (
    <div className="-mt-2 flex items-center justify-center gap-2 mb-5 pointer-events-none select-none" aria-hidden>
      <div className="w-6 h-px bg-emerald-200 rounded-full opacity-50" />
      <motion.span className="text-[11px] opacity-25" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>🌿</motion.span>
      <div className="flex items-center gap-1 opacity-30">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <div className="w-5 h-px bg-emerald-300 rounded-full" />
        <div className="w-2 h-2 rounded-full bg-emerald-300" />
        <div className="w-5 h-px bg-emerald-300 rounded-full" />
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      </div>
      <motion.span className="text-[11px] opacity-25" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>🌿</motion.span>
      <div className="w-6 h-px bg-emerald-200 rounded-full opacity-50" />
    </div>
  );
}

interface Props {
  stories: StoryLibraryItem[];
  curStory: StoryLibraryItem | undefined;
  up: Variants;
  stagger: Variants;
  pop: Variants;
}

export default function HomeStoryLibrarySection({ stories, curStory, up, stagger, pop }: Props) {
  if (stories.length === 0) return null;

  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger} className="relative">
      <div className="leaf-lg border border-white/80 bg-gradient-to-br from-sky-50/80 via-white to-indigo-50/60 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] sm:p-5">
        <ZoneDecorations zone="library" />
        <CampusConnector />
        <motion.div variants={up} className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-[22px] shrink-0 shadow-sm">📚</div>
            <div>
              <p className="font-nunito text-[9px] uppercase tracking-widest text-sky-400 leading-none mb-0.5">The Library</p>
              <h2 className="font-baloo font-black text-[21px] sm:text-[23px] text-gray-800 leading-tight">Story Library</h2>
            </div>
          </div>
          <Link href="/stories" className="flex items-center gap-1 font-nunito font-bold text-sky-500 text-[13px] hover:underline">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
        <motion.div variants={stagger} className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
          {stories.map((story) => {
            const isActive = !story.complete && story.unlocked && story.sid === curStory?.sid;
            const pctDone  = Math.round((story.progress ?? 0) * 100);
            return (
              <motion.div key={story.sid} variants={pop} className="shrink-0 w-[155px] sm:w-[172px]">
                {story.unlocked ? (
                  <Link href={`/stories/${story.slug}`}
                    className="group block leaf overflow-hidden shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]"
                    style={{ border: isActive ? "2px solid rgba(5,150,105,0.45)" : "1px solid rgba(219,234,254,0.8)" }}>
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1/1" }}>
                      {story.cover_url
                        ? <Image src={getStorageUrl(story.cover_url)} alt={story.title} fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full flex items-center justify-center text-5xl"
                            style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)" }}>
                            {story.theme_emoji ?? "📖"}
                          </div>
                      }
                      {story.complete && (
                        <div className="absolute inset-0 flex items-end justify-center pb-2 bg-emerald-600/20">
                          <span className="bg-emerald-500 text-white font-baloo font-black text-[10px] px-3 py-1 rounded-full shadow-md">✓ Complete!</span>
                        </div>
                      )}
                      {isActive && !story.complete && (
                        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                        </div>
                      )}
                    </div>
                    <div className="bg-white px-3 pt-2 pb-3">
                      <p className="font-baloo font-black text-gray-800 text-[13px] leading-tight line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors">
                        {story.title}
                      </p>
                      {pctDone > 0 && !story.complete ? (
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pctDone}%`, background: "linear-gradient(90deg,#34d399,#059669)" }} />
                        </div>
                      ) : story.complete ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-nunito font-bold text-emerald-600 text-[11px]">All done!</span>
                        </div>
                      ) : (
                        <span className="font-nunito font-bold text-sky-500 text-[11px]">Start reading →</span>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="leaf overflow-hidden border border-gray-100 opacity-55">
                    <div className="relative w-full" style={{ aspectRatio: "1/1" }}>
                      {story.cover_url
                        ? <Image src={getStorageUrl(story.cover_url)} alt={story.title} fill
                            className="object-cover grayscale" />
                        : <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-100">
                            {story.theme_emoji ?? "📖"}
                          </div>
                      }
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Lock className="w-5 h-5 text-gray-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-3 pt-2 pb-3">
                      <p className="font-baloo font-black text-gray-400 text-[12px] leading-tight line-clamp-2 mb-1">{story.title}</p>
                      <p className="font-nunito text-gray-400 text-[10px]">Finish the previous story to unlock</p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
