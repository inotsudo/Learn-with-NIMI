"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, BookOpen } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";

interface Props {
  curStory: StoryLibraryItem | undefined;
  slots: StorySlot[];
  pct: number;
}

export default function HomeStoryJourneyPanel({ curStory, slots, pct }: Props) {
  const done    = slots.filter(s => s.completed).length;
  const total   = slots.length;

  return (
    <div className="overflow-hidden leaf-lg border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)]">

      {/* Flat header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm shrink-0">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-nunito text-emerald-500 text-[10px] uppercase tracking-widest leading-none mb-0.5">Your Journey</p>
            <h3 className="font-baloo font-black text-gray-900 text-[17px] leading-tight">Story Journey</h3>
          </div>
        </div>
      </div>
      <div className="h-px bg-gray-100 mx-4" />

      {/* Content */}
      <div className="px-4 py-3">
        {curStory ? (
          <>
            {/* Story row */}
            <div className="flex items-center gap-3 mb-3">
              {curStory.cover_url ? (
                <Image src={getStorageUrl(curStory.cover_url)} alt={curStory.title}
                  width={44} height={44}
                  className="rounded-xl object-cover border border-gray-100 shadow-sm shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-[20px] shrink-0 shadow-sm">
                  {curStory.theme_emoji ?? "📖"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-baloo font-black text-gray-800 text-[14px] leading-tight line-clamp-1">
                  {curStory.title}
                </p>
                <p className="font-nunito text-gray-400 text-[11px] mt-0.5">
                  {curStory.complete ? "✅ Completed!" : `${done} of ${total || 6} missions`}
                </p>
              </div>
            </div>

            {/* Slot pip track */}
            {slots.length > 0 && (
              <div className="flex gap-1 mb-3">
                {slots.map((slot, i) => (
                  <motion.div key={slot.slot_key}
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.05, ease: "easeOut" }}
                    className={`flex-1 h-2 rounded-full origin-left transition-colors ${
                      slot.completed ? "bg-emerald-500" : "bg-gray-100"
                    }`} />
                ))}
              </div>
            )}

            {/* Progress % */}
            {!curStory.complete && (
              <p className="font-nunito font-semibold text-gray-400 text-[11px] text-center mb-3">
                {pct}% complete
              </p>
            )}
          </>
        ) : (
          <p className="text-center font-nunito text-gray-400 text-[12px] py-3 mb-2">
            Choose a story to begin your adventure!
          </p>
        )}

        {/* CTA */}
        {curStory ? (
          <Link href={`/stories/${curStory.slug}`}
            className="flex items-center justify-center gap-2 w-full font-baloo font-black text-white text-[13px] py-3 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 shadow-md"
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
            className="flex items-center justify-center gap-2 w-full font-baloo font-black text-white text-[13px] py-3 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 4px 14px rgba(5,150,105,0.3)" }}>
            <Play className="w-3.5 h-3.5 fill-white" />
            Start First Story
          </Link>
        )}
      </div>
    </div>
  );
}
