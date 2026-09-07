"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";

const SLOT_LABELS: Record<string, string> = {
  flipflop_audio:    "FlipFlop Audio",
  story_pdf:         "Read The Story",
  coloring:          "Coloring Page",
  move_explore:      "Move & Explore",
  sing_along:        "Sing Along",
  bonus_video:       "Bonus Video",
  challenge_1:       "Weekly Challenge 1",
  challenge_2:       "Weekly Challenge 2",
  challenge_3:       "Weekly Challenge 3",
  destination_video: "Destination Video",
};

interface Props {
  curStory:        StoryLibraryItem | null | undefined;
  slots:           StorySlot[];
  doneSlots:       number;
  totalSlots:      number;
  pct:             number;
  storyNumber:     number;
  hasSubscription: boolean;
}

export default function HomeContinueAdventureCard({ curStory, slots, doneSlots, totalSlots }: Props) {
  if (!curStory) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-3xl overflow-hidden flex flex-col items-center justify-center gap-4 py-10 px-6 text-center"
        style={{ background: "linear-gradient(135deg,#FFFDF4,#FEF3D0)", border: "1.5px solid #F0D080", boxShadow: "0 8px 32px rgba(200,160,60,0.13)" }}
      >
        <span className="text-5xl">✈️</span>
        <p className="font-baloo font-black text-base" style={{ color: "#14233B" }}>Choose Your Destination</p>
        <Link href="/stories"
          className="font-baloo font-black text-sm px-5 py-2.5 rounded-2xl transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F" }}
        >Browse Stories ✈️</Link>
      </motion.div>
    );
  }

  const nextSlot  = slots.find((s) => !s.completed);
  const nextLabel = nextSlot ? (SLOT_LABELS[nextSlot.slot_key] ?? nextSlot.slot_key) : null;
  const storyHref = `/stories/${curStory.slug}`;
  const nextHref  = nextSlot ? `/stories/${curStory.slug}/mission/${nextSlot.slot_key}` : storyHref;
  const ctaLabel  = doneSlots === 0 ? "Begin Adventure" : "Continue Adventure";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-3xl overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(160deg,#FFFDF4 0%,#FEF6D8 60%,#FDF0C0 100%)", border: "1.5px solid #F0D080", boxShadow: "0 8px 32px rgba(200,160,60,0.13)" }}
    >
      {/* Scattered sparkle decorations */}
      {[{top:"12%",left:"76%"},{top:"48%",left:"88%"},{top:"72%",left:"78%"},{top:"28%",left:"82%"}].map((pos,i)=>(
        <span key={i} aria-hidden className="pointer-events-none absolute text-[#F5C842] opacity-60 select-none" style={{ ...pos, fontSize: i%2===0?14:10 }}>✦</span>
      ))}

      {/* Gold pill label top-left */}
      <div className="px-4 pt-4 pb-2">
        <span
          className="inline-flex items-center gap-1.5 font-baloo font-black text-xs px-3 py-1.5 rounded-full"
          style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F", boxShadow: "0 2px 8px rgba(232,168,32,0.35)" }}
        >
          Continue Your Adventure ✈️
        </span>
      </div>

      {/* Story info row */}
      <div className="flex gap-3 px-4 pt-1 pb-3 flex-1">
        {/* Cover */}
        <div className="shrink-0 w-[76px] h-[90px] rounded-xl overflow-hidden shadow-md"
          style={{ border: "1.5px solid rgba(200,160,60,0.25)" }}>
          {curStory.cover_url
            ? <img src={getStorageUrl(curStory.cover_url)} alt={curStory.title ?? "Story"} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: "#FEF3D0" }}>{curStory.theme_emoji ?? "📚"}</div>
          }
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
          <div>
            <p className="font-baloo font-bold text-[10px] uppercase tracking-widest" style={{ color: "#B08820" }}>Current Story</p>
            <p className="font-baloo font-black text-base leading-tight truncate" style={{ color: "#0D1E3A" }}>{curStory.title ?? "Adventure"}</p>
          </div>
          {nextLabel && (
            <div>
              <p className="font-baloo font-bold text-[10px] uppercase tracking-widest" style={{ color: "#B08820" }}>Next Activity</p>
              <p className="font-baloo font-black text-base leading-tight truncate" style={{ color: "#0D1E3A" }}>{nextLabel}</p>
            </div>
          )}
          <p className="font-baloo text-xs" style={{ color: "rgba(13,30,58,0.45)" }}>
            Step {Math.max(1, doneSlots + 1)} of {totalSlots || 6}
          </p>
        </div>
      </div>

      {/* Full-width CTA button */}
      <div className="px-4 pb-4">
        <Link
          href={nextHref}
          className="w-full flex items-center justify-center gap-2 font-baloo font-black text-sm py-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F", boxShadow: "0 4px 14px rgba(232,168,32,0.40)" }}
        >
          ▶ {ctaLabel} →
        </Link>
      </div>
    </motion.div>
  );
}
