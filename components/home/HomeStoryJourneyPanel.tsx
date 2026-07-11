"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";

interface Props {
  curStory: StoryLibraryItem | undefined;
  slots: StorySlot[];
  pct: number;
}

export default function HomeStoryJourneyPanel({ curStory, slots, pct }: Props) {
  return (
    <div className="overflow-hidden leaf-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <div className="relative px-5 pt-5 pb-5 overflow-hidden"
        style={{ background: curStory?.complete
          ? "linear-gradient(135deg,#f59e0b 0%,#d97706 55%,#b45309 100%)"
          : "linear-gradient(135deg,#059669 0%,#10b981 55%,#34d399 100%)" }}>
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
        <div className="flex items-center gap-3">
          {curStory?.cover_url ? (
            <img src={getStorageUrl(curStory.cover_url)} alt={curStory.title}
              className="w-12 h-12 rounded-xl object-cover border-2 border-white/40 shadow-md shrink-0" loading="lazy" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-[22px] shrink-0 shadow-md">
              {curStory?.theme_emoji ?? "📖"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-nunito text-white/60 text-[9px] uppercase tracking-widest mb-0.5">
              {curStory?.complete ? "Completed! 🎉" : "Your Journey"}
            </p>
            <h3 className="font-baloo font-black text-white text-[15px] leading-tight line-clamp-1">
              {curStory?.title ?? "Start Your Story"}
            </h3>
          </div>
        </div>
        {curStory && (
          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((curStory.progress ?? 0) * 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }} />
          </div>
        )}
      </div>

      <div className="bg-white px-4 py-3">
        {slots.length > 0 ? (
          <>
            <div className="flex gap-1.5 justify-center mb-3">
              {slots.map((slot, i) => (
                <motion.div key={slot.slot_key}
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 20 }}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    slot.completed ? "bg-emerald-500" : "bg-gray-200"
                  }`} />
              ))}
            </div>
            <p className="text-center font-nunito font-semibold text-gray-500 text-[11px] mb-3">
              {slots.filter(s => s.completed).length}/{slots.length} missions complete
            </p>
          </>
        ) : (
          <p className="text-center font-nunito text-gray-400 text-[12px] py-2 mb-2">
            Choose a story to begin your adventure!
          </p>
        )}

        {curStory ? (
          <Link href={`/stories/${curStory.slug}`}
            className="flex items-center justify-center gap-2 w-full font-baloo font-black text-white text-[13px] py-3 leaf transition-all hover:-translate-y-0.5 active:scale-95"
            style={{
              background: curStory.complete
                ? "linear-gradient(135deg,#f59e0b,#d97706)"
                : "linear-gradient(135deg,#059669,#10b981)",
              boxShadow: curStory.complete
                ? "0 4px 14px rgba(245,158,11,0.3)"
                : "0 4px 14px rgba(5,150,105,0.3)",
            }}>
            <Play className="w-3.5 h-3.5 fill-white" />
            {curStory.complete ? "See Certificate 🏆" : "Continue Story"}
          </Link>
        ) : (
          <Link href="/stories"
            className="flex items-center justify-center gap-2 w-full font-baloo font-black text-white text-[13px] py-3 leaf transition-all hover:-translate-y-0.5 active:scale-95"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 4px 14px rgba(5,150,105,0.3)" }}>
            <Play className="w-3.5 h-3.5 fill-white" />
            Start First Story
          </Link>
        )}
      </div>
    </div>
  );
}
