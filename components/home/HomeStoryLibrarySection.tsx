"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { ChevronRight, Crown, Lock, Play } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem } from "@/lib/story-types";

/* ── Category badge config ──────────────────────────────────────────────── */
const CAT_BADGE: Record<string, { emoji: string; color: string }> = {
  adventure: { emoji: "🌿", color: "bg-emerald-900/40 text-emerald-300 border border-emerald-700/30" },
  audio:     { emoji: "🎧", color: "bg-violet-900/40  text-violet-300  border border-violet-700/30"  },
  reading:   { emoji: "📖", color: "bg-sky-900/40     text-sky-300     border border-sky-700/30"     },
  creative:  { emoji: "🎨", color: "bg-amber-900/40   text-amber-300   border border-amber-700/30"   },
  discovery: { emoji: "🌍", color: "bg-teal-900/40    text-teal-300    border border-teal-700/30"    },
  music:     { emoji: "🎵", color: "bg-pink-900/40    text-pink-300    border border-pink-700/30"    },
  science:   { emoji: "🔬", color: "bg-blue-900/40    text-blue-300    border border-blue-700/30"    },
};
function getCat(raw: string | null) {
  if (!raw) return null;
  return CAT_BADGE[raw.toLowerCase()] ?? { emoji: "📖", color: "bg-white/10 text-white/60 border border-white/15" };
}

/* ── StoryCard (destination card) ─────────────────────────────────────── */
interface CardProps {
  story:           StoryLibraryItem;
  isActive:        boolean;
  hasSubscription: boolean;
  onPrefetch?:     (sid: string) => void;
}

function StoryCard({ story, isActive, hasSubscription, onPrefetch }: CardProps) {
  const pct          = Math.round((story.progress ?? 0) * 100);
  const isPremLocked = !story.unlocked && !story.is_free && !hasSubscription;
  const cat          = getCat(story.category);

  /* Progress-locked */
  if (!story.unlocked && !isPremLocked) {
    return (
      <div className="shrink-0 w-[156px] sm:w-[172px] select-none opacity-50">
        <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="relative w-full" style={{ aspectRatio: "3/4", background: "rgba(255,255,255,0.04)" }}>
            {story.cover_url
              ? <Image src={getStorageUrl(story.cover_url)} alt={story.title} fill className="object-cover grayscale" />
              : <div className="absolute inset-0 flex items-center justify-center text-5xl">{story.theme_emoji ?? "📖"}</div>}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shadow-lg border border-white/20">
                <Lock className="w-5 h-5 text-white/60" />
              </div>
            </div>
          </div>
          <div className="px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="font-baloo font-black text-2xs leading-tight line-clamp-2" style={{ color: "rgba(240,232,212,0.30)" }}>{story.title}</p>
          </div>
        </div>
      </div>
    );
  }

  /* Premium-locked */
  if (isPremLocked) {
    return (
      <div className="shrink-0 w-[156px] sm:w-[172px]">
        <Link href="/pricing">
          <div className="rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:-translate-y-1 transition-transform duration-200 border border-purple-500/30">
            <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
              {story.cover_url
                ? <Image src={getStorageUrl(story.cover_url)} alt={story.title} fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                : <div className="absolute inset-0 flex items-center justify-center text-5xl bg-purple-900/50">{story.theme_emoji ?? "📖"}</div>}
              <div className="absolute inset-0 bg-black/50 group-hover:bg-purple-900/50 transition-colors flex flex-col items-center justify-center gap-2">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shadow-lg group-hover:bg-yellow-400/90 transition-colors">
                  <Crown className="w-5 h-5 text-yellow-300 group-hover:text-purple-900" />
                </div>
                <span className="font-baloo font-black text-white text-3xs group-hover:text-yellow-300 transition-colors">Club Only</span>
              </div>
            </div>
            <div className="px-3 py-2.5" style={{ background: "rgba(88,28,135,0.30)", borderTop: "1px solid rgba(168,85,247,0.20)" }}>
              <p className="font-baloo font-black text-purple-200 text-xs leading-tight line-clamp-2">{story.title}</p>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* Unlocked destination card */
  const ctaLabel = story.complete ? "🏆 Revisit" : pct > 0 ? "Continue →" : "Board ✈️";

  return (
    <div className="shrink-0 w-[156px] sm:w-[172px]">
      <Link
        href={`/stories/${story.slug}`}
        onMouseEnter={() => onPrefetch?.(story.sid)}
        className="group block"
        aria-label={`${story.complete ? "Revisit" : pct > 0 ? "Continue" : "Start"} story: ${story.title}`}
      >
        <div
          className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5"
          style={{
            border: isActive
              ? "2px solid rgba(201,168,76,0.60)"
              : story.complete
              ? "1.5px solid rgba(201,168,76,0.40)"
              : "1.5px solid rgba(255,255,255,0.10)",
            boxShadow: isActive
              ? "0 6px 22px rgba(201,168,76,0.25), 0 0 0 3px rgba(201,168,76,0.12)"
              : story.complete
              ? "0 6px 22px rgba(201,168,76,0.12)"
              : "0 4px 14px rgba(0,0,0,0.28)",
          }}
        >
          {/* Artwork */}
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4", background: "rgba(6,16,31,0.80)" }}>
            {story.cover_url
              ? <Image src={getStorageUrl(story.cover_url)} alt={story.title} fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500" />
              : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#06101F,#1A3558)" }}>
                  <span className="text-5xl">{story.theme_emoji ?? "📖"}</span>
                </div>}

            {/* Status badge */}
            <div className="absolute top-2 left-2">
              {story.complete ? (
                <span className="font-baloo font-black text-4xs px-2 py-0.5 rounded-full shadow-md"
                  style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F" }}>
                  ⭐ Done
                </span>
              ) : isActive ? (
                <span className="font-baloo font-black text-4xs bg-white/90 px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm"
                  style={{ color: "#07111F" }}>
                  ✈️ Flying
                </span>
              ) : story.is_free ? (
                <span className="font-baloo font-black text-4xs px-2 py-0.5 rounded-full shadow-md"
                  style={{ background: "rgba(201,168,76,0.85)", color: "#07111F" }}>
                  Free
                </span>
              ) : null}
            </div>

            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-xl backdrop-blur-sm">
                <Play className="w-5 h-5 ml-0.5" style={{ fill: "#C9A84C", color: "#C9A84C" }} />
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="px-3 pt-2.5 pb-3 flex flex-col gap-2" style={{ background: "rgba(10,24,48,0.90)" }}>
            {cat && (
              <span className={`inline-flex items-center gap-1 font-nunito font-bold text-4xs px-2 py-0.5 rounded-full w-fit capitalize ${cat.color}`}>
                {cat.emoji} {story.category}
              </span>
            )}
            <p className="font-baloo font-black text-sml leading-tight line-clamp-2" style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>
              {story.title}
            </p>
            {pct > 0 && !story.complete && (
              <div className="flex flex-col gap-1">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#C9A84C,#F5C842)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
                <span className="font-nunito font-bold text-3xs" style={{ color: "var(--airways-gold-text, #E8BC56)" }}>{pct}% done</span>
              </div>
            )}
            <div
              className="text-center font-baloo font-black text-2xs py-1.5 rounded-xl transition-all"
              style={story.complete ? {
                background: "rgba(201,168,76,0.15)",
                color: "var(--airways-gold-text, #E8BC56)",
                border: "1px solid rgba(201,168,76,0.30)",
              } : {
                background: "rgba(201,168,76,0.10)",
                color: "var(--airways-text-muted, rgba(240,232,212,0.60))",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {ctaLabel}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ── Discovery / "More destinations" card ───────────────────────────────── */
function DiscoveryCard({ hasSubscription, lockedCount }: { hasSubscription: boolean; lockedCount: number }) {
  if (!hasSubscription && lockedCount > 0) {
    return (
      <div className="shrink-0 w-[156px] sm:w-[172px]">
        <Link href="/pricing">
          <div
            className="rounded-2xl overflow-hidden cursor-pointer group hover:-translate-y-1.5 transition-transform duration-200 border border-purple-500/30"
            style={{ background: "linear-gradient(160deg,#4c1d95,#6d28d9)", boxShadow: "0 8px 28px rgba(109,40,217,0.30)" }}
          >
            <div className="flex flex-col items-center justify-center gap-3 px-3 py-5 text-center" style={{ aspectRatio: "3/4" }}>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="w-13 h-13 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shadow-lg"
              >
                <Crown className="w-7 h-7 text-yellow-300" />
              </motion.div>
              <div>
                <p className="font-baloo font-black text-white text-sml leading-tight">
                  {lockedCount} more {lockedCount === 1 ? "destination" : "destinations"}
                </p>
                <p className="font-nunito text-purple-200 text-3xs mt-0.5">waiting to explore</p>
              </div>
              <span className="font-baloo font-black text-yellow-300 text-2xs">👑 Unlock All →</span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="shrink-0 w-[156px] sm:w-[172px]">
      <Link href="/stories">
        <div
          className="rounded-2xl overflow-hidden cursor-pointer group hover:-translate-y-1.5 transition-transform duration-200"
          style={{
            aspectRatio: "3/4",
            background: "rgba(255,255,255,0.04)",
            border: "2px dashed rgba(201,168,76,0.35)",
          }}
        >
          <div className="flex flex-col items-center justify-center gap-3 h-full px-3 text-center">
            <motion.span
              className="text-5xl leading-none"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >🌍</motion.span>
            <div>
              <p className="font-baloo font-black text-sml leading-tight" style={{ color: "var(--airways-gold-text, #E8BC56)" }}>
                More destinations
              </p>
              <p className="font-nunito text-3xs mt-1 leading-snug" style={{ color: "var(--airways-text-muted, rgba(240,232,212,0.55))" }}>
                New adventures await!
              </p>
            </div>
            <span className="font-baloo font-black text-2xs" style={{ color: "var(--airways-gold-text, #E8BC56)" }}>Explore →</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
interface Props {
  stories:         StoryLibraryItem[];
  curStory:        StoryLibraryItem | undefined;
  hasSubscription: boolean;
  up:              Variants;
  stagger:         Variants;
  pop:             Variants;
  onPrefetch?:     (storyId: string) => void;
}

const HOME_MAX_STORIES = 5;

export default function HomeStoryLibrarySection({ stories, curStory, hasSubscription, up, stagger, pop, onPrefetch }: Props) {
  if (stories.length === 0) {
    return (
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
        <div className="rounded-3xl p-8 flex flex-col items-center gap-4 text-center shadow-sm"
          style={{ background: "rgba(10,24,48,0.90)", border: "1px solid rgba(201,168,76,0.18)" }}>
          <motion.span className="text-5xl leading-none"
            animate={{ y: [0,-8,0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>🌍</motion.span>
          <div>
            <p className="font-baloo font-black text-xl" style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>No destinations yet!</p>
            <p className="font-nunito text-sm mt-1" style={{ color: "var(--airways-text-muted, rgba(240,232,212,0.55))" }}>Check back soon — new adventures are coming.</p>
          </div>
        </div>
      </motion.section>
    );
  }

  const premiumLockedCount = !hasSubscription ? stories.filter(s => !s.is_free && !s.unlocked).length : 0;
  const visibleStories = stories.slice(0, HOME_MAX_STORIES);
  const lastFreeIdx = !hasSubscription
    ? visibleStories.reduce((last, s, i) => (s.is_free ? i : last), -1)
    : -1;

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={stagger}
      className="relative h-full"
    >
      <div
        className="rounded-3xl border shadow-2xl flex flex-col h-full"
        style={{
          background: "linear-gradient(160deg,#06101F 0%,#0A1828 60%,#0D1E3A 100%)",
          border: "1px solid rgba(201,168,76,0.20)",
        }}
      >
        {/* Gold top bar */}
        <div className="h-1 w-full shrink-0 rounded-t-3xl" style={{ background: "linear-gradient(90deg,#C9A84C,#F5C842,#C9A84C)" }} />

        {/* Section header */}
        <motion.div variants={up} className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg shrink-0"
              style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)" }}>
              🌍
            </div>
            <div>
              <p className="font-nunito font-bold text-[10px] uppercase tracking-widest leading-none mb-0.5"
                style={{ color: "var(--airways-gold-text, #E8BC56)" }}>DESTINATIONS</p>
              <h2 className="font-baloo font-black text-lg leading-tight" style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>
                Adventure Book
              </h2>
            </div>
          </div>
          <Link href="/stories"
            className="flex items-center gap-0.5 font-nunito font-bold text-sml hover:opacity-80 transition-opacity shrink-0"
            style={{ color: "var(--airways-gold-text, #E8BC56)" }}
            aria-label="See all stories">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Horizontal destination scroll */}
        <motion.div
          variants={stagger}
          className="flex gap-3.5 overflow-x-auto px-4 sm:px-5 pb-4 pt-3 flex-1"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {visibleStories.map((story, idx) => {
            const isActive = !story.complete && story.unlocked && story.sid === curStory?.sid;
            return (
              <React.Fragment key={story.sid}>
                {!hasSubscription && lastFreeIdx >= 0 && idx === lastFreeIdx + 1 && premiumLockedCount > 0 && (
                  <motion.div variants={pop}>
                    <DiscoveryCard hasSubscription={false} lockedCount={premiumLockedCount} />
                  </motion.div>
                )}
                <motion.div variants={pop}>
                  <StoryCard
                    story={story}
                    isActive={isActive}
                    hasSubscription={hasSubscription}
                    onPrefetch={onPrefetch}
                  />
                </motion.div>
              </React.Fragment>
            );
          })}

          {(hasSubscription || premiumLockedCount === 0) && (
            <motion.div variants={pop}>
              <DiscoveryCard hasSubscription={hasSubscription} lockedCount={0} />
            </motion.div>
          )}
        </motion.div>

        {/* Practice link */}
        <div className="px-4 sm:px-5 pb-4 pt-1 shrink-0">
          <Link
            href="/talk-to-nimi?mode=practice"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl font-nunito font-semibold text-xs transition-colors active:scale-[0.98]"
            style={{
              color: "rgba(240,232,212,0.45)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--airways-gold-text, #E8BC56)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(201,168,76,0.30)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(240,232,212,0.45)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
            aria-label="Practice reading with Nimi AI"
          >
            ✏️ Practice Reading with Nimi
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
