"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Play, ChevronRight } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";

interface Props {
  curStory: StoryLibraryItem | undefined;
  doneSlots: number;
  totalSlots: number;
  pct: number;
  slots: StorySlot[];
  up: Variants;
  stagger: Variants;
}

export default function HomeAdventureSection({ curStory, doneSlots, totalSlots, pct, slots, up, stagger }: Props) {
  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="relative">
      <motion.div variants={up}
        className="leaf-lg overflow-hidden border border-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.12)]">

        {curStory ? (
          <>
            {/* Cover hero — full-bleed image with gradient overlay */}
            <Link href={`/stories/${curStory.slug}`} className="relative block w-full overflow-hidden group"
              style={{ aspectRatio: "16/7" }}>
              {curStory.cover_url ? (
                <Image src={getStorageUrl(curStory.cover_url)} alt={curStory.title} fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700" priority />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)" }}>
                  <span className="text-[64px]">{curStory.theme_emoji ?? "📖"}</span>
                </div>
              )}
              {/* Gradient overlay — readable text over any image */}
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 45%, transparent 100%)" }} />

              {/* Status badge */}
              <div className="absolute top-3 left-3">
                {curStory.complete ? (
                  <span className="flex items-center gap-1.5 font-baloo font-black text-[11px] text-amber-900 bg-amber-400 px-3 py-1 rounded-full shadow-md">
                    🏆 Complete!
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-baloo font-black text-[11px] text-white bg-emerald-600/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-md">
                    📖 Your Adventure
                  </span>
                )}
              </div>

              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl">
                  <Play className="w-6 h-6 fill-emerald-600 text-emerald-600 ml-0.5" />
                </div>
              </div>

              {/* Bottom title overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8">
                <p className="font-nunito text-white/70 text-[10px] uppercase tracking-widest mb-0.5">
                  {curStory.complete ? "Finished" : `Mission ${doneSlots} of ${totalSlots || 6}`}
                </p>
                <h2 className="font-baloo font-black text-white text-[20px] sm:text-[22px] leading-tight drop-shadow-lg line-clamp-1">
                  {curStory.title}
                </h2>
              </div>
            </Link>

            {/* Progress + CTA */}
            <div className="bg-white px-4 sm:px-5 pt-4 pb-4">
              {!curStory.complete && (
                <>
                  {/* Mission dots */}
                  {slots.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {slots.map((slot, i) => (
                        <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shadow-sm transition-all ${
                          slot.completed
                            ? "bg-emerald-500 text-white shadow-emerald-200"
                            : "bg-gray-100 text-gray-400 border border-gray-200"
                        }`}>
                          {slot.completed ? "⭐" : i + 1}
                        </div>
                      ))}
                      <span className="font-nunito text-gray-400 text-[11px] ml-1">{pct}% done</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <motion.div className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg,#34d399,#059669)" }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} />
                  </div>
                </>
              )}

              <Link href={`/stories/${curStory.slug}`}
                className="flex items-center justify-center gap-2 w-full font-baloo font-black text-[15px] sm:text-[16px] py-3.5 leaf shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: curStory.complete
                    ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
                    : "linear-gradient(135deg,#059669,#047857)",
                  color: curStory.complete ? "#78350f" : "white",
                  boxShadow: curStory.complete
                    ? "0 4px 18px rgba(245,158,11,0.35)"
                    : "0 4px 18px rgba(5,150,105,0.35)",
                }}>
                {curStory.complete ? "⭐ View My Certificate" : "Keep Going!"}
                <Play className="w-4 h-4" fill="currentColor" />
              </Link>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-4 p-8 text-center bg-white">
            <motion.span className="text-[56px] leading-none select-none"
              animate={{ y: [0,-8,0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>🔭</motion.span>
            <div>
              <p className="font-baloo font-black text-gray-800 text-[20px]">Your story awaits!</p>
              <p className="font-nunito text-gray-500 text-[14px] mt-1">Zilo found some great adventures at the Library.</p>
            </div>
            <Link href="/stories"
              className="flex items-center gap-2 font-baloo font-black text-white text-[16px] px-8 py-3.5 leaf shadow-xl transition-all hover:-translate-y-0.5 active:scale-95"
              style={{ background: "linear-gradient(135deg,#059669,#047857)", boxShadow: "0 6px 22px rgba(5,150,105,0.4)" }}>
              Start Your Journey <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </motion.div>
    </motion.section>
  );
}
