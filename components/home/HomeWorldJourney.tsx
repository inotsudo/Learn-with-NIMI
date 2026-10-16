"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem } from "@/lib/story-types";

/**
 * HomeWorldJourney — full adventure map / destination trail through the world.
 * Every stop routes to /stories/{slug}; the story detail page enforces any
 * subscription/paywall restriction with a parent-facing upsell, so the child's
 * journey shows no locks — only completed / in-progress / not-started states.
 * Serpentine dotted trail; the current stop glows with a "● You" marker.
 */
export default function HomeWorldJourney({ stories, curStory }: { stories: StoryLibraryItem[]; curStory: StoryLibraryItem | null | undefined }) {
  const m = useMotion();
  if (!stories.length) return null;
  const visible = stories.slice(0, 8);
  const done = stories.filter((s) => s.complete).length;
  const inFlight = stories.filter((s) => !s.complete && ((s.progress ?? 0) > 0 || s.sid === curStory?.sid)).length;
  const notStarted = stories.length - done - inFlight;
  const trailPct = Math.round((done / stories.length) * 100);
  return (
    <motion.section {...m.fadeUp} aria-label="My journey" className="h1-j relative overflow-hidden rounded-3xl px-3 py-2.5 sm:px-4"
      style={{ background: "rgba(13,30,58,0.72)", border: "1px solid rgba(201,168,76,0.28)" }}>
      {/* Golden flight-path sweep behind the route header. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{ background: "radial-gradient(90% 100% at 50% 0%, rgba(245,200,66,0.26) 0%, rgba(245,200,66,0) 70%)" }} />
      <div className="relative mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">✈️</span>
          <div>
            <h2 className="font-baloo text-[15px] font-black leading-tight sm:text-base" style={{ color: "#F0E8D4" }}>My Journey</h2>
            <p className="font-nunito text-[12px]" style={{ color: "rgba(240,232,212,0.75)" }}>Follow the trail · {done}/{stories.length} stops</p>
          </div>
        </div>
        <Link href="/stories" className="inline-flex min-h-[44px] items-center font-baloo text-[12px] font-black px-3 rounded-xl"
          style={{ background: "rgba(201,168,76,0.12)", color: "#E8BC56", border: "1px solid rgba(201,168,76,0.3)" }}>
          Map →
        </Link>
      </div>
      {/* Trail stats — at-a-glance counts so the panel reads as a route
          summary, not just a row of tiles. */}
      <div className="h1-chips mt-1 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-baloo text-[10px] font-black" style={{ background: "rgba(34,197,94,0.16)", color: "#7EE2A8" }}>✅ {done} done</span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-baloo text-[10px] font-black" style={{ background: "rgba(245,200,66,0.16)", color: "#F5C842" }}>▶️ {inFlight} in flight</span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-baloo text-[10px] font-black" style={{ background: "rgba(240,232,212,0.08)", color: "rgba(240,232,212,0.55)" }}>🧭 {notStarted} to explore</span>
      </div>
      <ol className="mt-1.5 flex items-start gap-0 overflow-x-auto pb-1">
        {visible.map((story, idx) => {
          const current = story.sid === curStory?.sid;
          const href = `/stories/${story.slug}`;
          return (
            <li key={story.sid} className="flex shrink-0 items-start">
              <Link href={href} className="flex w-[64px] flex-col items-center gap-1 py-1"
                aria-label={`${story.title ?? `Book ${idx + 1}`} — ${story.complete ? "done" : current ? "current" : `${story.progress ?? 0}%`}`}>
                <span className="h1-jtile relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full sm:h-16 sm:w-16"
                  style={current
                    ? { border: "3px solid #F5C842", boxShadow: "0 0 0 3px rgba(245,200,66,0.25), 0 0 24px rgba(245,200,66,0.85), 0 0 6px rgba(245,200,66,1)" }
                    : story.complete
                      ? { border: "2.5px solid rgba(245,200,66,0.75)" }
                      : { border: "1.5px solid rgba(240,232,212,0.25)" }}>
                  {story.cover_url ? (
                    <img src={getStorageUrl(story.cover_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (<span aria-hidden="true" className="text-xl">{story.theme_emoji ?? "📚"}</span>)}
                  {story.complete && (
                    <span aria-hidden="true" className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] leading-none"
                      style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#06101F", boxShadow: "0 1px 4px rgba(3,12,23,0.45)" }}>✓</span>
                  )}
                </span>
                <span aria-hidden="true" className="truncate font-baloo text-[9px] font-black" style={{ maxWidth: 60, color: "#F0E8D4" }}>
                  {(story.title ?? "").split(" ").slice(0, 2).join(" ") || `Book ${idx + 1}`}
                </span>
                <span aria-hidden="true" className="font-nunito text-[8px]" style={{ color: current ? "#E8BC56" : "rgba(240,232,212,0.4)" }}>
                  {/* Current tile = position marker only ("● You") — it must
                      never repeat the story's progress percentage; that slot-level
                      detail lives on the Current Adventure card. */}
                  {current ? "● You" : story.complete ? "Done ✓" : `${story.progress ?? 0}%`}
                </span>
              </Link>
              {idx < visible.length - 1 && (
                <span className="h1-jleg relative mt-7 block h-0 w-4 shrink-0 sm:mt-8 sm:w-6"
                  style={{ borderTop: "2px dotted rgba(201,168,76,0.65)" }}>
                  {/* Plane flying the first leg of the trail (reference motif). */}
                  {idx === 0 && (
                    <span aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[220%] rotate-[24deg] text-base sm:text-lg">✈️</span>
                  )}
                </span>
              )}
            </li>
          );
        })}
        {/* Ghost stop — keeps short trails from ending abruptly mid-air. */}
        {visible.length < 4 && (
          <li className="flex shrink-0 items-start">
            {visible.length > 0 && (
              <span aria-hidden="true" className="h1-jleg mt-7 block h-0 w-4 shrink-0 sm:mt-8 sm:w-6"
                style={{ borderTop: "2px dotted rgba(201,168,76,0.45)" }} />
            )}
            <span className="flex w-[64px] flex-col items-center gap-1 py-1" aria-hidden="true">
              <span className="flex h-14 w-14 items-center justify-center rounded-full text-xl sm:h-16 sm:w-16"
                style={{ background: "rgba(240,232,212,0.05)", border: "1.5px dashed rgba(240,232,212,0.25)" }}>✈️</span>
              <span className="text-center font-baloo text-[9px] font-black leading-tight" style={{ color: "rgba(240,232,212,0.35)" }}>More<br />soon</span>
            </span>
          </li>
        )}
      </ol>
      {/* Trail progress — closes the panel with a sense of direction. */}
      <div className="h1-jprog mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(240,232,212,0.12)" }}>
        <div className="h-full rounded-full" style={{ width: `${trailPct}%`, background: "linear-gradient(90deg,#C9A84C,#F5C842)" }} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="h1-hint font-nunito text-[9px]" style={{ color: "rgba(240,232,212,0.45)" }}>
          ✨ Collect stars, complete missions and unlock new destinations!
        </p>
        <span className="shrink-0 font-baloo text-[10px] font-black tabular-nums" style={{ color: "#E8BC56" }}>{trailPct}%</span>
      </div>
    </motion.section>
  );
}
