"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import UniversePortal from "@/components/universe/UniversePortal";
import { UNIVERSE_GLOW } from "@/lib/design-system/universe";

const SLOT_SHORT: Record<string, string> = {
  flipflop_audio: "Listen", story_pdf: "Read", coloring: "Create",
  move_explore: "Move", sing_along: "Sing", bonus_video: "Watch",
  challenge_1: "Ch1", challenge_2: "Ch2", challenge_3: "Ch3",
  destination_video: "Discover",
};

interface Props {
  curStory: StoryLibraryItem | null | undefined;
  slots: StorySlot[];
  doneSlots: number;
  totalSlots: number;
  childName: string;
  /** Passport stamps (badge achievements) — same value My Passport shows. */
  stampsCollected: number;
}

/**
 * HomeWorldDestination — CURRENT ADVENTURE card (Airways dashboard).
 * Same data + routes as HomeContinueAdventureCard, recomposed to the
 * "Nimipiko Airways Adventure Dashboard" reference: gold header pill,
 * book cover, NOW BOARDING info, numbered step dots, wide gold CTA.
 */
export default function HomeWorldDestination({ curStory, slots, doneSlots, totalSlots, childName, stampsCollected }: Props) {
  const m = useMotion();
  const router = useRouter();
  if (!curStory) {
    return (
      <motion.div {...m.cardEntrance}
        className="relative flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center"
        style={{ background: "rgba(255,253,244,0.96)", border: "1.5px solid rgba(240,208,128,0.9)", boxShadow: UNIVERSE_GLOW.book }}>
        <UniversePortal label="Browse stories" size={104} onEnter={() => router.push("/stories")}>
          <span aria-hidden="true" className="text-4xl">✈️</span>
        </UniversePortal>
        <p className="font-baloo text-base font-black" style={{ color: "#0D1E3A" }}>Choose Your Destination</p>
        <Link href="/stories" className="font-baloo text-sm font-black px-6 py-3 rounded-2xl"
          style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F" }}>
          Browse Stories ✈️
        </Link>
        <span className="sr-only">{childName}, pick a story to begin.</span>
      </motion.div>
    );
  }
  const nextSlot = slots.find((s) => !s.completed);
  const nextLabel = nextSlot ? (SLOT_SHORT[nextSlot.slot_key] ?? "Next") : null;
  const storyHref = `/stories/${curStory.slug}`;
  const nextHref = nextSlot ? `/stories/${curStory.slug}/mission/${nextSlot.slot_key}` : storyHref;
  const cta = doneSlots === 0 ? "Begin Adventure" : "Continue Adventure";
  return (
    <motion.div {...m.cardEntrance} className="relative overflow-hidden rounded-3xl"
      style={{ background: "rgba(255,253,244,0.97)", border: "1.5px solid rgba(240,208,128,0.9)", boxShadow: UNIVERSE_GLOW.book }}>
      <div className="flex items-center justify-between gap-2 px-4 pt-2 sm:px-5 sm:pt-2.5 lg:px-5 lg:pt-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black sm:text-xs"
          style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#0D1E3A", boxShadow: "0 3px 10px rgba(232,168,32,0.35)" }}>
          <span aria-hidden="true">✈</span> Current Adventure
        </span>
        {/* Passport stamp count rides alongside — travel identity; real stamp
            count (badge achievements), same value + route as My Passport. */}
        <Link href="/user-profile" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 font-baloo text-[11px] font-black"
          style={{ background: "rgba(13,45,107,0.08)", color: "#0D2D6B", border: "1px solid rgba(13,45,107,0.22)" }}
          aria-label="Open passport">
          🛂 <span className="tabular-nums">{stampsCollected}</span>
        </Link>
      </div>
      <div className="h1-ca-body flex items-start gap-3 px-4 pt-2 sm:gap-3.5 sm:px-5 lg:gap-4 lg:px-5 lg:pt-2">
        {/* Book cover — the real uploaded story artwork at its own 3:4 aspect
            (book language, not a circular crop). Opens the story on the same
            /stories/[slug] route; fixed rails keep the 9-dot row on one line. */}
        <Link href={storyHref} aria-label={`Open ${curStory.title ?? "current story"}`}
          className="h1-ca-cover relative block w-[86px] shrink-0 grow-0 basis-[86px] transition-transform hover:-translate-y-0.5 active:scale-[0.98] sm:w-[104px] sm:basis-[104px] lg:w-[118px] lg:basis-[118px]">
          <span aria-hidden="true" className="absolute -inset-1.5 rounded-[10px]"
            style={{ background: "radial-gradient(120% 100% at 50% 0%, rgba(245,200,66,0.30) 0%, rgba(201,168,76,0.10) 60%, transparent 78%)" }} />
          <span aria-hidden="true" className="absolute inset-0 rounded-[10px]"
            style={{ boxShadow: "0 0 0 2px rgba(240,208,128,0.95), 0 8px 22px rgba(180,100,20,0.28)" }} />
          {/* Spine on the book's left edge. */}
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[7px] rounded-l-[10px]"
            style={{ background: "linear-gradient(180deg,#F5C842,#C9A84C)" }} />
          <span className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-[10px]">
            {curStory.cover_url ? (
              <Image src={getStorageUrl(curStory.cover_url)} alt="" width={236} height={314} className="h-full w-full object-cover" />
            ) : (<span aria-hidden="true" className="text-4xl">{curStory.theme_emoji ?? "📚"}</span>)}
          </span>
          <span aria-hidden="true" className="absolute -right-1 -top-1 text-base sm:text-xl">✨</span>
        </Link>
        <div className="min-w-0 flex-1 basis-0">
          <p className="font-baloo text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#B08820" }}>Now boarding</p>
          <h2 className="mt-0.5 font-baloo text-lg font-black leading-tight sm:text-xl lg:text-[20px] lg:leading-[1.15]" style={{ color: "#0D1E3A" }}>{curStory.title ?? "Adventure"}</h2>
          {nextLabel && (
            <p className="mt-0.5 font-nunito text-xs font-bold sm:text-[13px]" style={{ color: "rgba(13,30,58,0.62)" }}>
              Next: {nextLabel} · Step {Math.max(1, doneSlots + 1)} of {totalSlots || 6}
            </p>
          )}
          {slots.length > 0 && (
            <ol aria-label="Adventure steps" className="mt-1.5 flex w-full max-w-full flex-wrap items-center gap-1.5 overflow-x-auto sm:gap-2 lg:flex-nowrap lg:gap-[6px] lg:pb-0.5">
              {slots.map((slot, i) => {
                const isNext = i === doneSlots && !curStory.complete;
                return (
                  <li key={slot.slot_key} className="shrink-0">
                    <span aria-hidden="true"
                      className="h1-ca-dot flex h-7 w-7 items-center justify-center rounded-full font-baloo text-xs font-black tabular-nums sm:h-8 sm:w-8 sm:text-[13px] lg:h-[29px] lg:w-[29px] lg:text-[12px]"
                      style={slot.completed
                        ? { background: "linear-gradient(135deg,#C9A84C,#F5C842)", color: "#06101F" }
                        : isNext
                        ? { background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F", boxShadow: "0 0 0 4px rgba(245,200,66,0.28), 0 2px 8px rgba(232,168,32,0.35)" }
                        : { background: "rgba(20,35,59,0.05)", border: "1px solid rgba(20,35,59,0.14)", color: "rgba(20,35,59,0.45)" }}>
                      {i + 1}
                    </span>
                    <span className="sr-only">{`Step ${i + 1} ${SLOT_SHORT[slot.slot_key] ?? ""} ${slot.completed ? "done" : isNext ? "next" : "upcoming"}`}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
      <div className="h1-ca-cta px-4 pb-2.5 pt-1.5 sm:px-5 sm:pb-3 sm:pt-2 lg:px-5 lg:pb-2.5 lg:pt-1.5">
        <Link href={nextHref}
          className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-[20px] px-4 py-2.5 font-baloo text-sm font-black transition-transform hover:-translate-y-0.5 active:scale-[0.98] sm:text-base"
          style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#0D1E3A", boxShadow: "0 6px 18px rgba(232,168,32,0.42)" }}>
          <span aria-hidden="true">✈</span> {cta} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </motion.div>
  );
}
