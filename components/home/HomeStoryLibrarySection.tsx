"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { ChevronRight, Play, Lock, Star, Crown } from "lucide-react";
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
  hasSubscription: boolean;
  up: Variants;
  stagger: Variants;
  pop: Variants;
  onPrefetch?: (storyId: string) => void;
}

function UpgradeWallCard({ lockedCount }: { lockedCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="shrink-0 w-[148px] sm:w-[164px]"
    >
      <Link href="/pricing">
        <div className="rounded-2xl overflow-hidden h-full cursor-pointer group"
          style={{
            background: "linear-gradient(160deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%)",
            boxShadow: "0 8px 28px rgba(109,40,217,0.35), 0 0 0 1px rgba(139,92,246,0.3)",
          }}>
          {/* Top portion — icon + lock count */}
          <div className="flex flex-col items-center justify-center gap-2 px-3 pt-5 pb-3"
            style={{ aspectRatio: "3/4" }}>
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg border border-white/30">
              <Crown className="w-7 h-7 text-yellow-300" />
            </motion.div>
            <div className="text-center">
              <p className="font-baloo font-black text-white text-[13px] leading-tight">
                {lockedCount} more {lockedCount === 1 ? "story" : "stories"}
              </p>
              <p className="text-purple-200 text-[10px] mt-0.5 leading-tight">
                waiting for you
              </p>
            </div>
            {/* Decorative dots */}
            <div className="flex gap-1 mt-1">
              {[...Array(Math.min(lockedCount, 5))].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" />
              ))}
            </div>
          </div>
          {/* Bottom CTA */}
          <div className="px-2.5 py-2.5 bg-white/10 border-t border-white/20 group-hover:bg-white/20 transition">
            <p className="font-baloo font-black text-yellow-300 text-[11px] text-center leading-tight">
              👑 Unlock All →
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomeStoryLibrarySection({ stories, curStory, hasSubscription, up, stagger, pop, onPrefetch }: Props) {
  if (stories.length === 0) return null;

  // For free users: find where free stories end and premium-locked ones begin
  const lastFreeIdx = !hasSubscription
    ? stories.reduce((last, s, i) => (s.is_free ? i : last), -1)
    : -1;
  const premiumLockedCount = !hasSubscription
    ? stories.filter(s => !s.is_free && !s.unlocked).length
    : 0;

  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger} className="relative">
      <div className="leaf-lg border border-white/80 bg-gradient-to-br from-sky-50/80 via-white to-indigo-50/60 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] sm:p-5">
        <ZoneDecorations zone="library" />
        <CampusConnector />

        {/* Section header */}
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

        {/* Card scroll row */}
        <motion.div variants={stagger} className="flex gap-3.5 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
          {stories.map((story, idx) => {
            const isActive = !story.complete && story.unlocked && story.sid === curStory?.sid;
            const pctDone  = Math.round((story.progress ?? 0) * 100);
            const isPremiumLocked = !story.unlocked && !story.is_free && !hasSubscription;

            return (
              <React.Fragment key={story.sid}>
                {/* Inject upgrade wall card immediately after the last free story */}
                {!hasSubscription && lastFreeIdx >= 0 && idx === lastFreeIdx + 1 && premiumLockedCount > 0 && (
                  <UpgradeWallCard lockedCount={premiumLockedCount} />
                )}

              <motion.div variants={pop} className="shrink-0 w-[148px] sm:w-[164px]">
                {story.unlocked ? (
                  <div className="rounded-2xl overflow-hidden bg-white transition-all hover:-translate-y-1"
                    style={{
                      boxShadow: isActive
                        ? "0 8px 28px rgba(5,150,105,0.25), 0 0 0 2px rgba(5,150,105,0.4)"
                        : "0 4px 16px rgba(15,23,42,0.08)",
                    }}>
                    <Link href={`/stories/${story.slug}`}
                      onMouseEnter={() => onPrefetch?.(story.sid)}
                      className="group block">

                      {/* Portrait cover image — 3:4 book ratio */}
                      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4" }}>
                        {story.cover_url
                          ? <Image src={getStorageUrl(story.cover_url)} alt={story.title} fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500" />
                          : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                              style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)" }}>
                              <span className="text-5xl">{story.theme_emoji ?? "📖"}</span>
                            </div>
                        }

                        {/* Gradient fade for text legibility */}
                        <div className="absolute inset-0"
                          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 40%, transparent 70%)" }} />

                        {/* Top-left status chip */}
                        <div className="absolute top-2.5 left-2.5">
                          {story.complete ? (
                            <span className="flex items-center gap-1 font-baloo font-black text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-md">
                              <Star className="w-2.5 h-2.5 fill-white" /> Done
                            </span>
                          ) : isActive ? (
                            <span className="flex items-center gap-1 font-baloo font-black text-[9px] bg-white/90 text-emerald-700 px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm">
                              <Play className="w-2 h-2 fill-emerald-600" /> Reading
                            </span>
                          ) : story.is_free ? (
                            <span className="font-baloo font-black text-[9px] bg-sky-500 text-white px-2 py-0.5 rounded-full shadow-md">
                              Free
                            </span>
                          ) : null}
                        </div>

                        {/* Bottom overlay — title + progress */}
                        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6">
                          <p className="font-baloo font-black text-white text-[12px] leading-tight line-clamp-2 mb-1.5 drop-shadow">
                            {story.title}
                          </p>
                          {pctDone > 0 && !story.complete && (
                            <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pctDone}%`, background: "#34d399" }} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom pill row */}
                      <div className="flex items-center justify-between px-2.5 py-2 bg-white border-t border-gray-50">
                        {story.category ? (
                          <span className="font-nunito font-bold text-[9px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full capitalize truncate max-w-[75px]">
                            {story.category}
                          </span>
                        ) : (
                          <span className="font-nunito font-bold text-[9px] text-gray-400">Story</span>
                        )}
                        {story.complete ? (
                          <span className="font-nunito font-bold text-[9px] text-emerald-600">✓ All done</span>
                        ) : pctDone > 0 ? (
                          <span className="font-nunito font-bold text-[9px] text-gray-400">{pctDone}%</span>
                        ) : (
                          <span className="font-nunito font-bold text-[9px] text-sky-500">Start →</span>
                        )}
                      </div>
                    </Link>

                    {/* Practice reading strip — separate link so it doesn't nest inside the story link */}
                    <Link href="/talk-to-nimi?mode=practice"
                      className="flex items-center justify-center gap-1 py-1.5 text-[9px] font-black transition border-t border-sky-100 bg-sky-50 hover:bg-sky-100 text-sky-600">
                      🎤 Practice Reading
                    </Link>
                  </div>
                ) : (
                  /* Locked card — clickable if premium-locked, static if progress-locked */
                  isPremiumLocked ? (
                    <Link href="/pricing" className="block">
                      <div className="rounded-2xl overflow-hidden bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)] group cursor-pointer">
                        <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                          {story.cover_url
                            ? <Image src={getStorageUrl(story.cover_url)} alt={story.title} fill
                                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                            : <div className="absolute inset-0 flex items-center justify-center text-5xl bg-gray-100">
                                {story.theme_emoji ?? "📖"}
                              </div>
                          }
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-purple-900/50 transition-colors duration-300 flex flex-col items-center justify-center gap-1.5">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:bg-yellow-300 transition-colors">
                              <Crown className="w-5 h-5 text-purple-600 group-hover:text-purple-800" />
                            </div>
                            <span className="font-baloo font-black text-white/90 text-[10px] group-hover:text-yellow-300 transition-colors">Club Only</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-2.5 py-2 bg-purple-50 border-t border-purple-100 group-hover:bg-purple-100 transition-colors">
                          <p className="font-baloo font-black text-purple-700 text-[10px] leading-tight line-clamp-1 flex-1">{story.title}</p>
                          <Crown className="w-3 h-3 text-purple-400 shrink-0 ml-1" />
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="rounded-2xl overflow-hidden bg-white opacity-55 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
                      <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                        {story.cover_url
                          ? <Image src={getStorageUrl(story.cover_url)} alt={story.title} fill
                              className="object-cover grayscale" />
                          : <div className="absolute inset-0 flex items-center justify-center text-5xl bg-gray-100">
                              {story.theme_emoji ?? "📖"}
                            </div>
                        }
                        <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Lock className="w-5 h-5 text-gray-500" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-2 bg-gray-50 border-t border-gray-100">
                        <p className="font-baloo font-black text-gray-400 text-[10px] leading-tight line-clamp-1 flex-1">{story.title}</p>
                        <Lock className="w-3 h-3 text-gray-300 shrink-0 ml-1" />
                      </div>
                    </div>
                  )
                )}
              </motion.div>
              </React.Fragment>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
