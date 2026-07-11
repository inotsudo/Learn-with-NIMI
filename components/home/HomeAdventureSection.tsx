"use client";

import Link from "next/link";
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
      <motion.div variants={up} className="leaf-lg overflow-hidden border border-white/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]">

        {/* Header band */}
        <div className="relative px-5 py-4 overflow-hidden"
          style={{ background: curStory?.complete
            ? "linear-gradient(135deg,#fbbf24 0%,#f59e0b 55%,#f97316 100%)"
            : "linear-gradient(135deg,#059669 0%,#10b981 55%,#34d399 100%)" }}>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          <motion.span className="absolute top-3 right-5 text-2xl select-none pointer-events-none"
            animate={{ y: [0,-5,0], rotate: [0,10,0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
            {curStory?.complete ? "🏆" : "⭐"}
          </motion.span>
          <p className="font-nunito text-white/65 text-[10px] uppercase tracking-widest mb-0.5">📖 Your Adventure</p>
          <h2 className="font-baloo font-black text-white text-[22px] sm:text-[24px] leading-tight">
            {curStory
              ? curStory.complete ? "Adventure Complete! 🎉" : "Continue the Journey!"
              : "Your Adventure Awaits!"}
          </h2>
        </div>

        {/* Content */}
        {curStory ? (
          <div className="flex gap-4 sm:gap-5 p-4 sm:p-5 bg-white">

            {/* Story cover */}
            <Link href={`/stories/${curStory.slug}`}
              className="relative rounded-2xl overflow-hidden shrink-0 transition-transform hover:scale-[1.03] active:scale-[0.97]"
              style={{
                width: 130, height: 130,
                boxShadow: "0 0 0 3px rgba(5,150,105,0.22), 0 8px 24px rgba(0,0,0,0.26)",
              }}>
              {curStory.cover_url
                ? <img src={getStorageUrl(curStory.cover_url)} alt={curStory.title} className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center text-5xl">
                    {curStory.theme_emoji ?? "📖"}
                  </div>
              }
              <div className="absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/25 transition">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl">
                  <Play className="w-4 h-4 fill-emerald-600 text-emerald-600 ml-0.5" />
                </div>
              </div>
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <p className="font-nunito font-bold text-emerald-600 text-[11px] uppercase tracking-widest mb-1">
                  {curStory.complete ? "✅ Completed!" : `Mission ${doneSlots} of ${totalSlots || 6}`}
                </p>
                <h3 className="font-baloo font-black text-gray-800 text-[19px] sm:text-[21px] leading-tight line-clamp-2">
                  {curStory.title}
                </h3>
              </div>

              {/* Mission dots */}
              {!curStory.complete && slots.length > 0 && (
                <div className="flex items-center gap-2 my-2 flex-wrap">
                  {slots.map((slot, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black shadow-sm transition-all ${
                      slot.completed
                        ? "bg-emerald-500 text-white shadow-emerald-200"
                        : "bg-gray-100 text-gray-400 border-2 border-gray-200"
                    }`}>
                      {slot.completed ? "⭐" : i + 1}
                    </div>
                  ))}
                </div>
              )}

              {/* Progress bar */}
              {!curStory.complete && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-nunito font-bold text-gray-400 text-[11px]">Progress</span>
                    <span className="font-baloo font-black text-emerald-600 text-[12px]">{pct}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg,#34d399,#059669)" }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} />
                  </div>
                </div>
              )}

              {/* CTA */}
              <Link href={`/stories/${curStory.slug}`}
                className="flex items-center justify-center gap-2 font-baloo font-black text-[15px] sm:text-[16px] py-3 leaf shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: curStory.complete
                    ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
                    : "linear-gradient(135deg,#059669,#047857)",
                  color: curStory.complete ? "#78350f" : "white",
                  boxShadow: curStory.complete
                    ? "0 4px 18px rgba(245,158,11,0.4)"
                    : "0 4px 18px rgba(5,150,105,0.4)",
                }}>
                {curStory.complete ? "⭐ View My Certificate" : "Keep Going!"}
                <Play className="w-4 h-4" fill="currentColor" />
              </Link>
            </div>
          </div>
        ) : (
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
