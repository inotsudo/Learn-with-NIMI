"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import HomeWorldDestination from "@/components/home/HomeWorldDestination";
import HomeWorldJourney from "@/components/home/HomeWorldJourney";
import HomeWorldMarker from "@/components/home/HomeWorldMarker";
import HomeWorldPassport from "@/components/home/HomeWorldPassport";
import { pickNextStory } from "@/components/home/pickNextStory";
import "./homeWorldOneScreen.css";

interface Props {
  childName: string; themeId: string; greeting: string;
  stories: StoryLibraryItem[]; curStory: StoryLibraryItem | undefined; slots: StorySlot[];
  doneSlots: number; totalSlots: number; totalStars: number; streak: number;
  /** Passport stamps (badge achievements) — same value My Passport shows. */
  stampsCollected: number;
  /** World marker — level progress (same values HomeClient already computes). */
  level: number; xpIn: number; xpNeeded: number; xpPct: number;
}

// ── Bent border-radius shapes — alternating per card ─────────────────────────
const CARD_BENDS = [
  "22px 10px 22px 10px / 10px 22px 10px 22px",
  "10px 22px 10px 22px / 22px 10px 22px 10px",
  "18px 14px 22px 8px  / 8px  22px 14px 18px",
  "14px 18px 8px  22px / 22px 8px  18px 14px",
];

// ── Single next eligible story (Fly Next) — pure helper in ./pickNextStory ───
// (imported at the top of this file; kept as its own module so unit tests
// don't pull the component's framer-motion / Supabase import chain).

// ── Compact story card for the Fly Next strip ────────────────────────────────
function MiniStoryCard({
  story, index,
}: { story: StoryLibraryItem; index: number }) {
  const isLocked = !story.unlocked;
  const isDone   = story.complete;
  const pct      = story.progress ?? 0;
  const href     = isLocked ? "/shop" : `/stories/${story.slug}`;
  const bend     = CARD_BENDS[index % CARD_BENDS.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.04 }}
      className="relative shrink-0 overflow-hidden"
      style={{
        width: 108, height: 132,
        borderRadius: bend,
        background: "#fff",
        border: "1.5px solid rgba(0,0,0,0.08)",
        boxShadow: isLocked
          ? "0 3px 0 rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.10)"
          : "0 3px 0 rgba(38,128,212,0.12), 0 6px 18px rgba(38,128,212,0.14)",
      }}
    >
      <Link href={href} className="flex h-full flex-col">
        <div className="relative overflow-hidden" style={{ height: 78, flexShrink: 0 }}>
          {story.cover_url
            ? <img src={getStorageUrl(story.cover_url)} alt={story.title ?? ""} className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center text-3xl"
                   style={{ background: "linear-gradient(135deg,#FFF3C0,#FFE080)" }}>
                {story.theme_emoji ?? "📚"}
              </div>
          }
          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center"
                 style={{ background: "rgba(6,16,31,0.55)" }}>
              <span className="text-xl">🔒</span>
            </div>
          )}
          {isDone && !isLocked && (
            <div className="absolute right-1 top-1 rounded-full px-1.5 py-0.5 font-baloo text-[8px] font-black"
                 style={{ background: "linear-gradient(135deg,#22C55E,#16A34A)", color: "#fff" }}>✓</div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between px-2 py-1.5">
          <p className="font-baloo font-black text-[11px] leading-tight line-clamp-2"
             style={{ color: isLocked ? "rgba(13,30,58,0.45)" : "#0D1E3A" }}>
            {story.title ?? "Adventure"}
          </p>
          <p className="font-baloo text-[9px] font-bold"
             style={{ color: isDone ? "#16A34A" : isLocked ? "rgba(13,30,58,0.55)" : pct > 0 ? "#B07800" : "#2680D4" }}>
            {isDone ? "Completed" : isLocked ? "Locked" : pct > 0 ? `${pct}% done` : "New!"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Fly Next — horizontal boarding-strip card (desktop, Phase 2.21) ─────────
// Same genuine story data + /stories/[slug] route as the mobile MiniStoryCard,
// laid out in one 64px row so the populated section is exactly as tall as the
// empty state — the one-screen desktop layout never grows for a next flight.
function WideStoryCard({ story }: { story: StoryLibraryItem }) {
  const isLocked = !story.unlocked;
  const pct = story.progress ?? 0;
  const href = isLocked ? "/shop" : `/stories/${story.slug}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="h1-flyrow h-16 w-[300px] shrink-0 overflow-hidden rounded-2xl"
      style={{ background: "#fff", border: "1.5px solid rgba(0,0,0,0.08)", boxShadow: "0 3px 0 rgba(38,128,212,0.12), 0 6px 18px rgba(38,128,212,0.14)" }}
    >
      <Link href={href} className="flex h-full min-w-0 items-center gap-2.5 px-2.5">
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl" style={{ background: "linear-gradient(135deg,#FFF3C0,#FFE080)" }}>
          {story.cover_url
            ? <img src={getStorageUrl(story.cover_url)} alt="" className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center text-xl">{story.theme_emoji ?? "📚"}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-baloo text-[13px] font-black leading-tight" style={{ color: "#0D1E3A" }}>{story.title ?? "Adventure"}</span>
          <span className="block font-baloo text-[10px] font-bold" style={{ color: isLocked ? "rgba(13,30,58,0.55)" : story.complete ? "#16A34A" : pct > 0 ? "#B07800" : "#2680D4" }}>
            {isLocked ? "Locked" : story.complete ? "Completed" : pct > 0 ? `${pct}% done` : "New!"}
          </span>
        </span>
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black"
          style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F" }}>→</span>
      </Link>
    </motion.div>
  );
}

// ── Fly Next — ONE next eligible flight, integrated into the same viewport ───
function FlyNextCompact({
  stories, curStory, childName, themeId,
}: {
  stories: StoryLibraryItem[];
  curStory: StoryLibraryItem | undefined;
  childName: string;
  themeId: string;
}) {
  const next = pickNextStory(stories, curStory);
  return (
    <section aria-label="Fly Next" className="h1-fly mt-1 rounded-2xl px-2.5 py-2 sm:px-3"
      style={{ background: "rgba(13,30,58,0.72)", border: "1px solid rgba(201,168,76,0.28)" }}>
      <div className="h1-flyhead mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="font-baloo font-black text-[15px] leading-tight" style={{ color: "#F0E8D4" }}>✈️ Fly Next</h3>
          <p className="truncate font-baloo text-[11px]" style={{ color: "rgba(240,232,212,0.7)" }}>Your next adventure</p>
        </div>
        <Link href="/stories"
          className="inline-flex min-h-[40px] shrink-0 items-center font-baloo font-black text-[12px] px-3.5 rounded-xl transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F", boxShadow: "0 3px 0 rgba(180,120,0,0.22)" }}>
          See All →
        </Link>
      </div>
      {next ? (
        <>
          {/* Desktop: horizontal boarding strip — same height as the empty
              state, so the one-screen layout holds with a next flight. */}
          <div className="hidden items-end gap-2.5 lg:flex" style={{ scrollbarWidth: "none" }}>
            <div className="h1-flyrow flex h-16 shrink-0 items-end gap-1 pr-1">
              <img src={`/themes/${themeId}/characters/nimi.png`} alt="Nimi" className="h-[64px] w-auto object-contain drop-shadow-lg" />
              <img src={`/themes/${themeId}/characters/piko.png`} alt="Piko" className="h-[54px] w-auto object-contain drop-shadow-lg -ml-1" />
            </div>
            <WideStoryCard story={next} />
            <Link href="/stories"
              className="flex h1-flyrow h-16 w-[96px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl"
              style={{ background: "linear-gradient(145deg,#EEF6FF,#D8ECFF)", border: "1.5px dashed #A8D4F5" }}>
              <span className="text-lg leading-none">✈️</span>
              <span className="text-center font-baloo font-black text-[9px] leading-tight" style={{ color: "#2680D4" }}>See All<br />Stories →</span>
            </Link>
          </div>
          {/* Mobile/tablet: the original vertical strip (layout unchanged). */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 lg:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <div className="shrink-0 hidden items-end gap-1 pr-1 sm:flex">
              <img src={`/themes/${themeId}/characters/nimi.png`} alt="Nimi" className="h-[64px] w-auto object-contain drop-shadow-lg" />
              <img src={`/themes/${themeId}/characters/piko.png`} alt="Piko" className="h-[54px] w-auto object-contain drop-shadow-lg -ml-1" />
            </div>
            <MiniStoryCard story={next} index={0} />
            <Link href="/stories"
              className="flex h-[132px] w-[96px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-2"
              style={{ background: "linear-gradient(145deg,#EEF6FF,#D8ECFF)", border: "1.5px dashed #A8D4F5" }}>
              <span className="text-2xl">✈️</span>
              <span className="text-center font-baloo font-black text-[10px] leading-tight" style={{ color: "#2680D4" }}>See All<br />Stories →</span>
            </Link>
          </div>
        </>
      ) : (
        /* Genuine empty state — never fabricate stories. */
        <div className="h1-flyempty flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ background: "linear-gradient(135deg,rgba(238,246,255,0.14),rgba(216,236,255,0.10))", border: "1.5px dashed rgba(168,212,245,0.40)" }}>
          <span aria-hidden="true" className="text-2xl">🌍</span>
          <p className="min-w-0 flex-1 font-baloo text-[13px] font-bold" style={{ color: "#F0E8D4" }}>
            No other adventures queued right now.
          </p>
          <Link href="/stories"
            className="inline-flex min-h-[40px] shrink-0 items-center font-baloo font-black text-[12px] px-3.5 rounded-xl"
            style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F" }}>
            Browse Stories ✈️
          </Link>
        </div>
      )}
    </section>
  );
}

export default function HomeAirwaysDashboard({
  childName, themeId, greeting, stories, curStory, slots, doneSlots, totalSlots, totalStars,
  streak, stampsCollected, level, xpIn, xpNeeded, xpPct,
}: Props) {
  const reduceMotion = useReducedMotion();
  const next = slots.find(slot => !slot.completed);
  const nextHref = curStory && next ? `/stories/${curStory.slug}/mission/${next.slot_key}` : curStory ? `/stories/${curStory.slug}` : "/stories";
  const destinations = stories.filter(story => story.complete).length;

  // Long child names step down in size so the hero greeting never clips or
  // splits a single long name across two lines on narrow phones. Desktop
  // (sm:/lg:) sizes are deliberately generous and unchanged.
  const nameSize =
    childName.length > 16 ? "text-[22px] sm:text-[32px] lg:text-[34px]"
    : childName.length > 11 ? "text-[26px] sm:text-[38px] lg:text-[42px]"
    : "text-[30px] sm:text-[44px] lg:text-[48px]";

  // Quick actions — the My Journey entry was removed (Phase 2.20B): it only
  // duplicated the My Journey card's "Map →" route (/stories). Three actions
  // remain in a single row on sm+ and a single column on phones.
  const actions = [
    { icon: "📖", title: "Adventure Book", sub: "Continue story",
      href: curStory ? `/stories/${curStory.slug}` : "/stories",
      iconBg: "linear-gradient(145deg,#7C88F5,#4452D8)", arrowBg: "linear-gradient(135deg,#6070E8,#3840C0)",
      ring: "#B0B8F8", shadow: "rgba(80,80,220,0.16)" },
    { icon: "🎯", title: "Daily Mission", sub: "Today’s activity", href: nextHref,
      iconBg: "linear-gradient(145deg,#F46060,#D83030)", arrowBg: "linear-gradient(135deg,#F07070,#D84848)",
      ring: "#F5A8A0", shadow: "rgba(220,60,60,0.18)" },
    { icon: "🎁", title: "Star Shop", sub: "Spend your stars", href: "/shop",
      iconBg: "linear-gradient(145deg,#EE72B0,#C84080)", arrowBg: "linear-gradient(135deg,#E8709A,#C84878)",
      ring: "#F5A8D0", shadow: "rgba(210,60,130,0.18)" },
  ];

  // Transparent root: the HomeWorldShell world art shows through — no opaque
  // background. min-h-screen is only a floor (fills the viewport so the world
  // shows behind the whole composition). The greeting stage is sized from the
  // approved reference (card top at ~37% of viewport height), so on short
  // desktop screens the card grid begins lower and the page scrolls — that is
  // the reference composition, not an overflow bug.
  return (
    <main className="flex min-h-screen w-full flex-col">
      {/* ── Greeting + character stage (reference-matched composition) ── */}
      {/* Sized from `now/Nimipiko Airways Adventure Dashboard.png`:
          stage ≈ 39vh puts the Current Adventure card top at ~0.37 of viewport
          height (ref: y376/1024). Nimi/Piko heights are viewport-width relative
          (17.1vw / 16.2vw → visible 248px / 163px at 1536 = reference exactly).
          The stage is an in-flow, bottom-aligned sibling of the greeting copy:
          it can never collide with the text or the top status pills, and the
          inner padding-bottom always clears the card grid's negative-margin
          overlap so the prompt line stays readable. The stage's negative bottom
          margin plus the grid's negative top margin tuck the characters' feet
          ~11px behind the card tops (world-building, matching the reference art). */}
      <section className="h1-stage relative flex shrink-0 flex-col overflow-hidden min-h-[150px] sm:min-h-[166px] lg:min-h-[39vh]">
        <div className="relative z-10 flex flex-1 items-end gap-2 px-4 pb-6 pt-4 sm:gap-3 sm:px-6 sm:pb-7 lg:px-8 [@media(max-height:820px)]:pt-1 [@media(max-height:820px)]:pb-9">
          {/* Reference: the greeting sits beside Nimi's torso with its bottom
              ~45px above the characters' feet line, not flushed to their feet. */}
          <div className="relative min-w-0 max-w-[72%] sm:max-w-[520px] lg:mb-8 lg:max-w-[560px]">
            <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-baloo text-[10px] font-black uppercase tracking-[0.18em] [@media(max-height:820px)]:mb-1"
              style={{ background: "rgba(6,16,31,0.55)", color: "#E8BC56", border: "1px solid rgba(240,208,128,0.45)" }}>✈️ NIMIPIKO Airways · Home Base</span>
            <p className="font-baloo text-[16px] font-black leading-none text-[#F0E8D4] drop-shadow-[0_2px_8px_rgba(3,12,23,0.85)] sm:text-[19px]">{greeting},</p>
            <h1 className={`mt-0.5 font-baloo font-black leading-[.84] tracking-tight text-[#F0E8D4] drop-shadow-[0_3px_10px_rgba(3,12,23,0.9)] ${nameSize}`}
              style={{ overflowWrap: "normal", wordBreak: "keep-all" }}>
              {childName}! <span className="inline-block text-[#ffbc14]">👋</span>
            </h1>
            <p className="mt-1.5 font-baloo text-[14px] font-black text-[#E8BC56] drop-shadow-[0_2px_8px_rgba(3,12,23,0.85)] sm:text-[16px]">Where shall we fly today?</p>
          </div>
          {/* Nimi + Piko — in-flow welcome stage, both guides at every size.
              lg: sizes reproduce the reference composition (Nimi visible 248px,
              Piko visible 163px at 1536w). The negative bottom margin offsets
              piko.png's larger transparent bottom padding so both characters'
              visible feet meet the card line, and -mb-7 tucks them ~11px behind
              the card tops. Piko's negative left margin reproduces the
              reference's body-to-robot gap. */}
          <div className="pointer-events-none -mb-2.5 flex shrink-0 items-end gap-1 sm:-mb-3 lg:-mb-7" aria-label="Nimi and Piko welcome you">
            <motion.img animate={reduceMotion ? undefined : { y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} src={`/themes/${themeId}/characters/nimi.png`} alt="Nimi" className="h-[84px] w-auto object-contain drop-shadow-2xl sm:h-[104px] lg:h-auto lg:w-[121px]" />
            <motion.img animate={reduceMotion ? undefined : { y: [0, -7, -2, 0] }} transition={{ duration: 5.2, repeat: Infinity, delay: .4, ease: "easeInOut" }} src={`/themes/${themeId}/characters/piko.png`} alt="Piko" className="h-[64px] w-auto object-contain drop-shadow-2xl sm:h-[80px] lg:mb-[calc(-2.1vw)] lg:h-auto lg:w-[121px] lg:-ml-4" />
          </div>
        </div>
      </section>

      {/* ── One-screen composition: 2-col grid, overlapping the world band ── */}
      <div className="h1-outer relative z-20 flex flex-1 flex-col gap-2 px-2 pb-3 sm:px-4 lg:gap-2.5 lg:px-6 [@media(max-height:820px)]:gap-1 [@media(max-height:820px)]:pb-0.5">
        <section className="mx-auto grid w-full max-w-[1248px] grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-[1.02fr_0.98fr] lg:gap-4 lg:items-start">
          {/* LEFT — main adventure + journey route */}
          <div className="h1-left flex min-w-0 flex-col gap-2.5 sm:gap-3 lg:gap-3.5 [@media(max-height:820px)]:gap-1.5">
            <HomeWorldDestination
              curStory={curStory}
              slots={slots}
              doneSlots={doneSlots}
              totalSlots={totalSlots}
              childName={childName}
              stampsCollected={stampsCollected}
            />
            <HomeWorldJourney stories={stories} curStory={curStory} />
          </div>
          {/* RIGHT — passport + level + quick actions + treasure */}
          <div className="h1-right flex min-w-0 flex-col gap-2.5 sm:gap-3 lg:gap-3 [@media(max-height:820px)]:gap-1.5">
            <div className="flex flex-col gap-1.5">
              <HomeWorldPassport stamps={stampsCollected} destinations={destinations} />
              <HomeWorldMarker level={level} xpIn={xpIn} xpNeeded={xpNeeded} xpPct={xpPct} totalStars={totalStars} streak={streak} />
            </div>
            <section aria-label="Quick actions" className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2">
              {actions.map((action, i) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6, boxShadow: `0 18px 36px ${action.shadow}` }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22, delay: i * 0.06 }}
                  style={{
                    background: "rgba(255,253,244,0.96)",
                    border: `1.5px solid rgba(240,208,128,0.6)`,
                    borderRadius: 20,
                    boxShadow: `0 4px 0 rgba(13,30,58,0.06), 0 8px 24px ${action.shadow}`,
                  }}
                >
                  <Link href={action.href} className="h1-qa flex items-center gap-2 px-2 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5">
                    <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-[20px] select-none sm:h-[46px] sm:w-[46px] sm:text-[24px]"
                      style={{ background: action.iconBg, boxShadow: `0 0 0 3px #FFFDF4, 0 0 0 5px ${action.ring}, 0 6px 16px ${action.shadow}` }}>{action.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-baloo text-[13px] font-black leading-tight" style={{ color: "#0D1E3A" }}>{action.title}</span>
                      <span className="mt-0.5 block font-baloo text-[11px] font-semibold" style={{ color: "rgba(13,30,58,0.62)" }}>{action.sub}</span>
                    </span>
                    <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full sm:flex"
                      style={{ background: action.arrowBg, boxShadow: `0 3px 10px ${action.shadow}` }}>
                      <svg viewBox="0 0 12 12" width={11} height={11} fill="none"><path d="M2.5 6h7M6.5 3.5L9.5 6l-3 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </section>
            <Link href="/treasure"
              className="h1-tr group flex min-h-[56px] items-center gap-3 overflow-hidden rounded-2xl px-3 py-1.5 transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, rgba(26,74,154,0.90), rgba(13,45,107,0.92))", border: "1.5px solid rgba(240,208,128,0.65)", boxShadow: "0 10px 26px rgba(6,20,45,0.40)" }}>
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", boxShadow: "0 4px 12px rgba(245,200,66,0.45)" }}>🎁</span>
              <span className="min-w-0 flex-1">
                <span className="block font-baloo text-sm font-black leading-tight" style={{ color: "#FFFDF4" }}>Treasure Chest</span>
                <span className="block font-baloo text-[12px] font-semibold tabular-nums" style={{ color: "rgba(240,232,212,0.85)" }}>{stampsCollected} badges</span>
              </span>
              <span aria-hidden="true" className="font-baloo text-lg font-black transition-transform group-hover:translate-x-0.5" style={{ color: "#F5C842" }}>→</span>
            </Link>
          </div>
        </section>

        {/* Fly Next — compact, integrated into the same viewport (not a 2nd band) */}
        <div className="mx-auto w-full max-w-[1248px]">
          <FlyNextCompact stories={stories} curStory={curStory} childName={childName} themeId={themeId} />
        </div>
      </div>
    </main>
  );
}
