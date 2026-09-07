"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";

interface Props {
  childName: string; themeId: string; greeting: string;
  stories: StoryLibraryItem[]; curStory: StoryLibraryItem | undefined; slots: StorySlot[];
  doneSlots: number; totalSlots: number; progress: number; totalStars: number; streak: number;
  stampsCollected: number; hasSubscription: boolean; nextPremiumStory: StoryLibraryItem | null;
}

// ── Bent border-radius shapes — alternating per card ─────────────────────────
const CARD_BENDS = [
  "22px 10px 22px 10px / 10px 22px 10px 22px",
  "10px 22px 10px 22px / 22px 10px 22px 10px",
  "18px 14px 22px 8px  / 8px  22px 14px 18px",
  "14px 18px 8px  22px / 22px 8px  18px 14px",
];

// ── Priority-ranked recommendations ──────────────────────────────────────────
function buildRecs(
  stories: StoryLibraryItem[],
  curStory: StoryLibraryItem | undefined,
): StoryLibraryItem[] {
  const notCurrent = (s: StoryLibraryItem) => s.sid !== curStory?.sid;
  return [
    // 1. In-progress (started, not done)
    ...stories.filter(s => s.unlocked && !s.complete && s.progress > 0 && notCurrent(s)),
    // 2. Unlocked, fresh
    ...stories.filter(s => s.unlocked && !s.complete && s.progress === 0 && notCurrent(s)),
    // 3. Locked premium (show as teaser)
    ...stories.filter(s => !s.unlocked).slice(0, 4),
    // 4. Completed — replay
    ...stories.filter(s => s.complete && notCurrent(s)).slice(0, 3),
  ];
}

// ── Story card ────────────────────────────────────────────────────────────────
function StoryCard({
  story, index, hasSubscription,
}: { story: StoryLibraryItem; index: number; hasSubscription: boolean }) {
  const isLocked = !story.unlocked;
  const isDone   = story.complete;
  const pct      = story.progress ?? 0;
  const href     = isLocked ? "/shop" : `/stories/${story.slug}`;
  const bend     = CARD_BENDS[index % CARD_BENDS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.05 }}
      className="relative shrink-0 overflow-hidden"
      style={{
        width: 158, height: 220,
        borderRadius: bend,
        background: "#fff",
        border: "1.5px solid rgba(0,0,0,0.08)",
        boxShadow: isLocked
          ? "0 4px 0 rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.10)"
          : "0 4px 0 rgba(38,128,212,0.12), 0 8px 22px rgba(38,128,212,0.14)",
      }}
    >
      <Link href={href} className="flex flex-col h-full">

        {/* Cover — top 60% */}
        <div className="relative overflow-hidden" style={{ height: 132, flexShrink: 0 }}>
          {story.cover_url
            ? <img src={getStorageUrl(story.cover_url)} alt={story.title ?? ""} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-5xl"
                   style={{ background: "linear-gradient(135deg,#FFF3C0,#FFE080)" }}>
                {story.theme_emoji ?? "📚"}
              </div>
          }

          {/* Locked overlay */}
          {isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                 style={{ background: "rgba(6,16,31,0.55)", backdropFilter: "blur(2px)" }}>
              <span className="text-3xl">🔒</span>
              {!hasSubscription && (
                <span className="font-baloo font-black text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F" }}>
                  Premium ⭐
                </span>
              )}
            </div>
          )}

          {/* Done badge */}
          {isDone && !isLocked && (
            <div className="absolute top-2 right-2 rounded-full px-2 py-0.5 font-baloo font-black text-[9px]"
                 style={{ background: "linear-gradient(135deg,#22C55E,#16A34A)", color: "#fff", boxShadow: "0 2px 6px rgba(34,197,94,0.40)" }}>
              ✓ Done
            </div>
          )}

          {/* Progress bar at bottom of cover */}
          {pct > 0 && !isDone && !isLocked && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "rgba(0,0,0,0.20)" }}>
              <motion.div
                className="h-full"
                style={{ background: "linear-gradient(90deg,#F9C932,#E8A820)" }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 + index * 0.04 }}
              />
            </div>
          )}
        </div>

        {/* Info — bottom 40% */}
        <div className="flex flex-1 flex-col justify-between px-3 py-2.5">
          <p className="font-baloo font-black text-[13px] leading-tight line-clamp-2"
             style={{ color: isLocked ? "rgba(13,30,58,0.45)" : "#0D1E3A" }}>
            {story.title ?? "Adventure"}
          </p>

          {/* Status pill */}
          <div className="mt-1">
            {isDone ? (
              <span className="inline-flex items-center gap-1 font-baloo font-bold text-[10px]"
                    style={{ color: "#16A34A" }}>✈️ Completed</span>
            ) : isLocked ? (
              <span className="inline-flex items-center gap-1 font-baloo font-bold text-[10px]"
                    style={{ color: "rgba(13,30,58,0.40)" }}>🔒 Locked</span>
            ) : pct > 0 ? (
              <span className="inline-flex items-center gap-1 font-baloo font-bold text-[10px]"
                    style={{ color: "#E8A820" }}>▶ {pct}% done</span>
            ) : (
              <span className="inline-flex items-center gap-1 font-baloo font-bold text-[10px]"
                    style={{ color: "#2680D4" }}>✨ New!</span>
            )}
          </div>
        </div>

      </Link>
    </motion.div>
  );
}

// ── Recommended section ───────────────────────────────────────────────────────
function RecommendedSection({
  stories, curStory, hasSubscription, childName, themeId,
}: {
  stories: StoryLibraryItem[];
  curStory: StoryLibraryItem | undefined;
  hasSubscription: boolean;
  childName: string;
  themeId: string;
}) {
  const recs = buildRecs(stories, curStory);
  const allDone = stories.length > 0 && stories.every(s => s.complete);

  return (
    <section className="mt-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="font-baloo font-black text-[18px]" style={{ color: "#0D1E3A" }}>
            {allDone ? "🎉 All Caught Up!" : "✈️ Fly Next"}
          </h2>
          <p className="font-baloo text-[12px]" style={{ color: "rgba(13,30,58,0.50)" }}>
            {allDone
              ? `Every story explored, ${childName}! More coming soon.`
              : "Adventures waiting for you"}
          </p>
        </div>
        <Link
          href="/stories"
          className="font-baloo font-black text-[13px] px-4 py-2 rounded-2xl transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F", boxShadow: "0 3px 0 rgba(180,120,0,0.22)" }}
        >
          See All →
        </Link>
      </div>

      {recs.length === 0 ? (
        /* Empty state — no stories at all */
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-[28px] py-12 text-center"
          style={{ background: "linear-gradient(135deg,#EEF6FF,#E0EEFF)", border: "1.5px solid #C0D8F5" }}
        >
          <span className="text-5xl">🌍</span>
          <p className="font-baloo font-black text-[16px]" style={{ color: "#0D1E3A" }}>Stories loading…</p>
          <Link href="/stories" className="font-baloo font-black text-sm px-5 py-2.5 rounded-2xl"
                style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F" }}>
            Browse Library ✈️
          </Link>
        </div>
      ) : (
        /* Horizontal scroll row */
        <div
          className="flex gap-3 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* NIMI & PIKO — peeking at the start */}
          <div className="shrink-0 hidden sm:flex items-end gap-1 pr-1">
            <img src={`/themes/${themeId}/characters/nimi.png`} alt="Nimi" className="h-[90px] w-auto object-contain drop-shadow-lg" />
            <img src={`/themes/${themeId}/characters/piko.png`} alt="Piko" className="h-[78px] w-auto object-contain drop-shadow-lg -ml-2" />
          </div>

          {recs.map((story, i) => (
            <StoryCard key={story.sid} story={story} index={i} hasSubscription={hasSubscription} />
          ))}

          {/* "See more" end card */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            className="shrink-0 flex flex-col items-center justify-center gap-3 rounded-[22px] px-5"
            style={{
              width: 120, height: 220,
              background: "linear-gradient(145deg,#EEF6FF,#D8ECFF)",
              border: "1.5px dashed #A8D4F5",
            }}
          >
            <span className="text-3xl">✈️</span>
            <Link href="/stories" className="font-baloo font-black text-[11px] text-center"
                  style={{ color: "#2680D4" }}>
              See All<br />Stories →
            </Link>
          </motion.div>
        </div>
      )}
    </section>
  );
}

const missionLabels: Record<string, string> = {
  flipflop_audio: "FlipFlop Audio", story_pdf: "Read the Story", coloring: "Coloring Page",
  move_explore: "Move & Explore", sing_along: "Sing Along", bonus_video: "Bonus Video",
};

export default function HomeAirwaysDashboard({
  childName, themeId, greeting, stories, curStory, slots, doneSlots, totalSlots, totalStars, stampsCollected, hasSubscription,
}: Props) {
  const reduceMotion = useReducedMotion();
  const next = slots.find(slot => !slot.completed);
  const nextLabel = next ? missionLabels[next.slot_key] ?? next.slot_key.replaceAll("_", " ") : "Choose an activity";
  const nextHref = curStory && next ? `/stories/${curStory.slug}/mission/${next.slot_key}` : curStory ? `/stories/${curStory.slug}` : "/stories";
  const destinations = stories.filter(story => story.complete).length;
  const actions = [
    {
      icon: "🗺️", title: "My Journey", sub: "View progress", href: "/stories",
      iconBg: "linear-gradient(145deg,#4AABF5,#2680D4)",
      arrowBg: "linear-gradient(135deg,#3B9EF5,#1D72D0)",
      ring: "#A8D4F5", shadow: "rgba(38,128,212,0.18)",
    },
    {
      icon: "📖", title: "Adventure Book", sub: "Continue story",
      href: curStory ? `/stories/${curStory.slug}` : "/stories",
      iconBg: "linear-gradient(145deg,#7C88F5,#4452D8)",
      arrowBg: "linear-gradient(135deg,#6070E8,#3840C0)",
      ring: "#B0B8F8", shadow: "rgba(80,80,220,0.16)",
    },
    {
      icon: "🎯", title: "Daily Mission", sub: "Do today’s activity", href: nextHref,
      iconBg: "linear-gradient(145deg,#F46060,#D83030)",
      arrowBg: "linear-gradient(135deg,#F07070,#D84848)",
      ring: "#F5A8A0", shadow: "rgba(220,60,60,0.18)",
    },
    {
      icon: "🎁", title: "Star Shop", sub: "Spend your stars", href: "/shop",
      iconBg: "linear-gradient(145deg,#EE72B0,#C84080)",
      arrowBg: "linear-gradient(135deg,#E8709A,#C84878)",
      ring: "#F5A8D0", shadow: "rgba(210,60,130,0.18)",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f8f2e7]">
      <div className="w-full overflow-hidden bg-[#f8f2e7]">
        <section className="relative min-h-[360px] overflow-hidden bg-[#8bd9ff] sm:min-h-[460px]">
          <img src="/airport-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          {/* Left fade so text is always readable */}
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,.72)_0%,rgba(255,255,255,.30)_36%,transparent_60%)]" />
          {/* Bottom fade into page bg */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f8f2e7] to-transparent" />

          {/* Decorative clouds */}
          <div aria-hidden className="absolute left-[3%] top-[18%] h-14 w-36 rounded-full bg-white/75 blur-[2px]" />
          <div aria-hidden className="absolute left-[12%] top-[12%] h-10 w-24 rounded-full bg-white/60 blur-[1px]" />
          <div aria-hidden className="absolute left-[25%] top-[23%] h-8 w-20 rounded-full bg-white/55" />

          {/* Greeting text */}
          <div className="relative z-10 flex min-h-[360px] flex-col justify-end px-6 pb-14 pt-10 sm:min-h-[460px] sm:px-10 lg:px-14">
            <div className="relative max-w-[400px]">
              <span aria-hidden className="absolute -left-3 top-8 text-3xl text-[#ffc400]">✦</span>
              <span aria-hidden className="absolute -right-1 top-4 text-4xl text-[#ffc400]">★</span>
              <p className="font-baloo text-[22px] font-black leading-none text-[#0e368b] drop-shadow-[0_2px_0_rgba(255,255,255,.9)] sm:text-[28px]">{greeting},</p>
              <h1 className="mt-1 font-baloo text-[50px] font-black leading-[.82] tracking-tight text-[#0e368b] drop-shadow-[0_2px_0_rgba(255,255,255,.95)] sm:text-[68px]">
                {childName}! <span className="inline-block text-[#ffbc14]">👋</span>
              </h1>
              <p className="mt-3 font-baloo text-[18px] font-black text-[#123a87] drop-shadow-[0_2px_0_rgba(255,255,255,.85)] sm:text-[22px]">Where shall we fly today?</p>
              <div className="mt-3 h-[3px] w-56 -rotate-[4deg] rounded-full bg-[#ffc400]" />
            </div>
          </div>

          {/* NIMI + PIKO characters */}
          <div className="absolute bottom-5 right-4 z-10 hidden items-end gap-1 sm:flex lg:right-10">
            <motion.img animate={reduceMotion ? undefined : { y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} src={`/themes/${themeId}/characters/nimi.png`} alt="Nimi" className="h-[175px] w-auto object-contain drop-shadow-2xl lg:h-[240px]" />
            <motion.img animate={reduceMotion ? undefined : { y: [0, -5, 0] }} transition={{ duration: 5.2, repeat: Infinity, delay: .4, ease: "easeInOut" }} src={`/themes/${themeId}/characters/piko.png`} alt="Piko" className="h-[152px] w-auto object-contain drop-shadow-2xl lg:h-[205px]" />
          </div>
        </section>

        <div className="relative z-20 -mt-5 px-3 pb-5 sm:-mt-6 sm:px-5 lg:px-7">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {actions.map((action, i) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, boxShadow: `0 18px 36px ${action.shadow}` }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 320, damping: 22, delay: i * 0.06 }}
                style={{
                  background: "#fff",
                  border: `1.5px solid rgba(0,0,0,0.07)`,
                  borderRadius: 24,
                  boxShadow: `0 4px 0 rgba(0,0,0,0.06), 0 8px 24px ${action.shadow}`,
                }}
              >
                <Link href={action.href} className="flex items-center gap-3.5 px-4 py-4">
                  {/* Icon with white halo ring */}
                  <span
                    className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full text-[30px] select-none"
                    style={{
                      background: action.iconBg,
                      boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${action.ring}, 0 6px 16px ${action.shadow}`,
                    }}
                  >{action.icon}</span>

                  {/* Label */}
                  <span className="min-w-0 flex-1">
                    <span className="block font-baloo text-[15px] font-black leading-tight" style={{ color: "#0D1E3A" }}>{action.title}</span>
                    <span className="block font-baloo text-[11px] font-semibold mt-0.5" style={{ color: "rgba(13,30,58,0.48)" }}>{action.sub}</span>
                  </span>

                  {/* Chevron arrow */}
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: action.arrowBg, boxShadow: `0 3px 10px ${action.shadow}` }}
                  >
                    <svg viewBox="0 0 12 12" width={11} height={11} fill="none"><path d="M2.5 6h7M6.5 3.5L9.5 6l-3 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </Link>
              </motion.div>
            ))}
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.9fr_.95fr]">
            <article className="relative overflow-hidden rounded-[28px] border border-[#e8dca9] bg-[#fffdf8] p-4 shadow-[0_7px_0_rgba(173,145,100,.1),0_12px_24px_rgba(33,58,85,.08)]" style={{ backgroundImage: "linear-gradient(135deg,rgba(255,253,248,.97),rgba(255,249,232,.94)),url('/paper-texture.png')", backgroundSize: "cover" }}>
              <span aria-hidden className="absolute right-4 top-8 text-3xl text-[#ffbd0a]">✦</span><span aria-hidden className="absolute right-8 top-[7.5rem] text-xl text-[#ffbd0a]">✦</span>
              <div className="-mt-1 inline-flex -rotate-1 rounded-full bg-[#ffd331] px-4 py-1 font-baloo text-[14px] font-black text-[#092d78] shadow-sm">Continue Your Adventure ✈</div>
              <div className="mt-3 flex gap-3">
                <div className="flex h-[136px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] border-2 border-[#edc953] bg-[#f6d562] shadow-md">
                  {curStory?.cover_url ? <img src={getStorageUrl(curStory.cover_url)} alt={curStory.title ?? "Story"} className="h-full w-full object-cover" /> : <span className="text-5xl">📚</span>}
                </div>
                <div className="min-w-0 pt-1"><p className="font-nunito text-[10px] font-black uppercase tracking-wide text-[#7790b3]">Current story</p><p className="font-baloo text-[18px] font-black leading-tight text-[#082b78]">{curStory?.title ?? "Choose a story"}</p><p className="mt-4 font-nunito text-[10px] font-black uppercase tracking-wide text-[#7790b3]">Next activity</p><p className="font-baloo text-[16px] font-black leading-tight text-[#082b78] capitalize">{nextLabel}</p><p className="mt-2 font-nunito text-[12px] font-bold text-[#7891b6]">Step {Math.max(1, doneSlots + 1)} of {totalSlots || 9}</p></div>
              </div>
              <div aria-hidden className="absolute bottom-[4.7rem] right-4 h-12 w-20 rounded-full border-2 border-dashed border-[#f8bf22]/55 opacity-50" />
              <Link href={nextHref} className="relative mt-4 flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#ffd94d,#ffad12)] py-3 font-baloo text-[17px] font-black text-[#10285d] shadow-[0_4px_0_#db8b00,inset_0_1px_0_rgba(255,255,255,.8)] transition hover:brightness-105">▶ Begin Adventure&nbsp; →</Link>
            </article>

            <article className="relative overflow-hidden rounded-[30px] border border-[#8fc5db] bg-[#fffdf5] shadow-[0_7px_0_rgba(92,145,165,.12),0_12px_24px_rgba(33,58,85,.08)]">

              {/* ── Bent ribbon header ── */}
              <div
                className="relative px-5 pt-3 pb-8 flex items-center justify-between text-white"
                style={{ background: "linear-gradient(105deg,#063e82 0%,#1460b8 55%,#147ac4 100%)" }}
              >
                <span className="relative z-10 font-baloo text-[16px] font-black flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[15px]">🛂</span>
                  YOUR PASSPORT
                </span>
                <motion.span
                  className="relative z-10 text-[#ffe156] text-xl"
                  animate={{ scale: [1, 1.35, 1], rotate: [0, 12, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                >✦</motion.span>

                {/* Wave cutout — body color fills the bottom curve making it look bent */}
                <svg
                  aria-hidden
                  className="absolute bottom-0 left-0 w-full"
                  viewBox="0 0 400 28"
                  preserveAspectRatio="none"
                  style={{ height: 28, display: "block" }}
                >
                  <path d="M0,28 L0,14 Q100,0 200,10 Q300,20 400,6 L400,28 Z" fill="#fffdf5" />
                </svg>
              </div>

              {/* Body */}
              <div className="relative px-5 pb-4 pt-4" style={{ backgroundImage: "linear-gradient(135deg,rgba(255,253,245,.96),rgba(239,249,252,.8))" }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-nunito text-[11px] font-bold text-[#31588b]">Stamps Collected</p>
                    <p className="font-baloo text-[27px] font-black text-[#082b78]">{stampsCollected} <span className="text-[16px]">/ 42</span></p>
                  </div>
                  <div>
                    <p className="font-nunito text-[11px] font-bold text-[#31588b]">Destinations Visited</p>
                    <p className="font-baloo text-[27px] font-black text-[#082b78]">{destinations}</p>
                  </div>
                </div>
                <span aria-hidden className="absolute right-5 top-10 text-2xl">🗺️</span>
                <span aria-hidden className="absolute bottom-[3.3rem] right-5 rotate-[-16deg] rounded-full border-2 border-dashed border-[#4ba7cc]/45 px-2 py-1 font-baloo text-[8px] font-black uppercase tracking-wider text-[#398fb3]/55">Nimipiko Air Mail</span>
                <div className="mt-7 h-8 rounded-full border-y border-[#cfe5ed] bg-[linear-gradient(135deg,#e5f6fb,#f8feff)] opacity-90" />
                <Link href="/user-profile" className="mt-3 flex justify-center rounded-full bg-[#07458d] py-3 font-baloo text-[16px] font-black text-white shadow-[0_3px_0_#052e62] transition hover:brightness-110">
                  View Passport&nbsp; →
                </Link>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[28px] border border-[#eadcc6] bg-[radial-gradient(circle_at_50%_35%,#fffdf5_0%,#fff4d5_61%,#f8e6b7_100%)] p-5 shadow-[0_7px_0_rgba(173,145,100,.1),0_12px_24px_rgba(33,58,85,.08)]">
              <span aria-hidden className="absolute left-6 top-9 text-xl text-[#ffbc09]">✦</span><span aria-hidden className="absolute right-8 top-14 text-lg text-[#1bbbd5]">✦</span><span aria-hidden className="absolute bottom-12 left-7 text-xl text-[#ff9b00]">✦</span><h2 className="text-center font-baloo text-[20px] font-black text-[#082b78]">Today’s Stars</h2><div className="mt-3 flex flex-col items-center justify-center"><motion.span animate={reduceMotion ? undefined : { rotate: [0, 5, -3, 0], scale: [1, 1.08, 1] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }} className="text-[70px] leading-none drop-shadow-[0_7px_0_rgba(221,145,0,.18)]">⭐</motion.span><div className="-mt-1 flex items-baseline gap-1"><span className="font-baloo text-[36px] font-black text-[#f5a500]">{totalStars}</span><span className="font-baloo text-[18px] font-black text-[#64769b]">/100</span></div></div><p className="mt-2 text-center font-nunito text-[12px] font-bold text-[#4e6791]">Play today to start a new streak!</p><div className="mt-8 h-5 overflow-hidden rounded-full border border-[#e1d4b7] bg-[#e9dfcc] p-[2px] shadow-inner"><div className="h-full rounded-full bg-[linear-gradient(90deg,#ffc400,#ffdf52)] shadow-[0_0_8px_rgba(255,188,0,.5)]" style={{ width: `${Math.min(100, totalStars)}%` }} /></div><span className="absolute bottom-3 right-5 text-xl">✦</span>
            </article>
          </section>

          <RecommendedSection
            stories={stories}
            curStory={curStory}
            hasSubscription={hasSubscription}
            childName={childName}
            themeId={themeId}
          />
        </div>
      </div>
    </main>
  );
}
