"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Lock, Play, Star, Volume2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChildren, getStorageUrl } from "@/lib/queries";
import { getStoryBySlug, getStoryDetails, getStorySlots } from "@/lib/storyRepository";
import { getStoryIntroProgress, markIntroItemConsumed } from "@/lib/storyProgressRepository";
import { getStoryCertificate } from "@/lib/storyCertificateRepository";
import type { StoryDetails, StorySlot, StoryIntroProgress, StoryCertificate } from "@/lib/story-types";
import ChampionChallengeCard from "@/components/challenges/ChampionChallengeCard";
import PreviewBanner from "@/components/admin/story-readiness/PreviewBanner";
import CelebrationModal from "@/components/challenges/CelebrationModal";
import ShareAchievementFlow from "@/components/community/ShareAchievementFlow";
import StoryVideoPlayer from "@/components/media/StoryVideoPlayer";
import StoryAudioPlayer from "@/components/media/StoryAudioPlayer";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const INTRO_ITEMS = [
  { key: "intro_video",     emoji: "🎬", tKey: "introVideoLabel",  action: "Watch", color: "from-rose-500 to-pink-600" },
  { key: "theme_song",      emoji: "🎵", tKey: "themeSongLabel",   action: "Listen", color: "from-fuchsia-500 to-purple-600" },
  { key: "meet_characters", emoji: "🤝", tKey: "meetCharLabel",    action: "Watch", color: "from-blue-500 to-indigo-600" },
  { key: "story_intro",     emoji: "📖", tKey: "storyIntroLabel",  action: "Watch", color: "from-violet-500 to-purple-600" },
];

const MISSION_META: Record<string, { emoji: string; tKey: string; color: string; action: string }> = {
  flipflop_audio: { emoji: "📚", tKey: "flipflopAudioLabel", color: "from-purple-500 to-indigo-600",  action: "Open Book" },
  story_pdf:      { emoji: "📖", tKey: "storyPdfLabel",      color: "from-blue-500 to-cyan-600",      action: "Read Story" },
  coloring:       { emoji: "🎨", tKey: "coloringLabel",      color: "from-orange-500 to-pink-600",    action: "Start Coloring" },
  move_explore:   { emoji: "🤸", tKey: "moveExploreLabel",   color: "from-green-500 to-emerald-600",  action: "Let's Move!" },
  sing_along:     { emoji: "🎤", tKey: "singAlongLabel",     color: "from-pink-500 to-rose-600",      action: "Sing Along" },
  bonus_video:    { emoji: "🎬", tKey: "bonusVideoLabel",    color: "from-red-500 to-orange-600",     action: "Watch Video" },
};

type Phase = "welcome" | "intro" | "missions" | "certificate" | "challenge" | "complete";

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState("");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [details, setDetails] = useState<StoryDetails | null>(null);
  const [slots, setSlots] = useState<StorySlot[]>([]);
  const [introProgress, setIntroProgress] = useState<StoryIntroProgress[]>([]);
  const [certificate, setCertificate] = useState<StoryCertificate | null>(null);
  const [challengeDone, setChallengeDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeIntro, setActiveIntro] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("welcome");

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }
      setChildId(child.id);
      setChildName(child.name);
      const story = await getStoryBySlug(slug);
      if (!story) { setLoading(false); return; }
      setStoryId(story.id);
      const [det, sl, intro, cert] = await Promise.all([
        getStoryDetails(story.id, child.language),
        getStorySlots(child.id, story.id, child.language),
        getStoryIntroProgress(child.id, story.id, child.language),
        getStoryCertificate(child.id, story.id, child.language),
      ]);
      setDetails(det);
      setSlots(sl);
      setIntroProgress(intro);
      setCertificate(cert);

      // Auto-detect phase based on progress
      const doneSlots = sl.filter(s => s.completed).length;
      const allIntrosDone = INTRO_ITEMS.every(item => intro.find(p => p.slot_key === item.key)?.consumed);
      const allMissionsDone = doneSlots >= sl.length && sl.length > 0;

      if (allMissionsDone && cert) setPhase("complete");
      else if (allMissionsDone) setPhase("certificate");
      else if (allIntrosDone || doneSlots > 0) setPhase("missions");
      else if (intro.some(p => p.consumed)) setPhase("intro");
      else setPhase("welcome");

      setLoading(false);
    })();
  }, [slug, language]);

  const handleIntroClick = async (key: string) => {
    if (!childId || !storyId || !details) return;
    const urlKey = `${key}_url` as keyof StoryDetails;
    if (!(details[urlKey] as string | null)) return;
    setActiveIntro(activeIntro === key ? null : key);
    await markIntroItemConsumed(childId, storyId, key);
    setIntroProgress(prev => prev.map(p => p.slot_key === key ? { ...p, consumed: true } : p));
  };

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen theme-bg flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  const doneCount = slots.filter(s => s.completed).length;
  const totalCount = slots.length || 6;
  const totalStars = slots.reduce((s, sl) => s + (sl.completed ? (sl.stars ?? 10) : 0), 0);
  const storyTitle = details?.title ?? slug;
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "true";
  const allIntrosDone = INTRO_ITEMS.every(item => introProgress.find(p => p.slot_key === item.key)?.consumed);
  const nextMission = slots.find((s, i) => !s.completed && (i === 0 || slots[i - 1]?.completed));

  return (
    <AppShell>
      <PreviewBanner />
      <div className={`min-h-screen theme-bg ${isPreview ? "pt-10" : ""}`}>
        <main className="max-w-lg mx-auto w-full min-h-screen flex flex-col">

          <AnimatePresence mode="wait">

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 1: WELCOME                           */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "welcome" && (
              <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col">

                {/* Cover */}
                <div className="relative">
                  {details?.cover_url ? (
                    <img src={getStorageUrl(details.cover_url)} alt={storyTitle} className="w-full h-72 object-cover" />
                  ) : (
                    <div className="w-full h-72 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 flex items-center justify-center">
                      <motion.span className="text-8xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                        {details?.theme_emoji ?? "📚"}
                      </motion.span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#150b35] via-transparent to-[#150b35]/30" />
                  <button onClick={() => router.push("/stories")}
                    className="absolute top-4 left-4 w-10 h-10 bg-black/30 backdrop-blur rounded-full flex items-center justify-center text-white z-10">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* Welcome content */}
                <div className="flex-1 flex flex-col items-center px-6 -mt-10 relative z-10">
                  {/* Characters */}
                  <div className="flex items-end gap-4 mb-4">
                    <motion.img src="/nimi-logo-circle.png" alt="Nimi" animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-16 h-16 rounded-full border-4 border-yellow-400 shadow-xl" />
                    <motion.img src="/piko-logo-circle.png.png" alt="Piko" animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      className="w-16 h-16 rounded-full border-4 border-blue-400 shadow-xl" />
                  </div>

                  <h1 className="font-baloo font-black text-[28px] text-white text-center leading-tight">
                    {storyTitle}
                  </h1>

                  <motion.p className="theme-text-faint text-[16px] font-nunito text-center mt-3"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    Hi {childName}! 👋<br />Ready for today&apos;s adventure?
                  </motion.p>

                  {/* Progress stars */}
                  <div className="flex items-center gap-1 mt-5">
                    {Array.from({ length: totalCount }).map((_, i) => (
                      <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.1, type: "spring" }}>
                        <Star className={`w-6 h-6 ${i < doneCount ? "text-yellow-400 fill-yellow-400" : "theme-text-muted/30 fill-purple-500/30"}`} />
                      </motion.div>
                    ))}
                  </div>
                  <p className="theme-text-faint text-[12px] font-bold mt-1">{doneCount}/{totalCount}</p>

                  {/* Start button */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, type: "spring" }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setPhase(allIntrosDone ? "missions" : "intro")}
                    className="mt-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-baloo font-black text-[20px] rounded-full px-10 py-4 shadow-2xl shadow-orange-500/30 flex items-center gap-3">
                    <Play className="w-6 h-6 fill-white" />
                    {doneCount > 0 ? "Continue Adventure" : "Start Adventure"}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 2: INTRO JOURNEY                     */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                className="flex-1 flex flex-col px-5 py-6">

                <button onClick={() => setPhase("welcome")} className="self-start mb-4 theme-text-faint flex items-center gap-1 text-[13px] font-bold">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <h2 className="font-baloo font-black text-yellow-300 text-[22px] text-center mb-2">Your Adventure Begins! ✨</h2>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-6">
                  {INTRO_ITEMS.map(item => {
                    const done = introProgress.find(p => p.slot_key === item.key)?.consumed ?? false;
                    return (
                      <motion.div key={item.key}
                        animate={done ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.5 }}
                        className={`w-3 h-3 rounded-full ${done ? "bg-green-400" : "theme-accent/30"}`} />
                    );
                  })}
                </div>

                {/* Intro cards — one per item, big and clear */}
                <div className="space-y-3 flex-1">
                  {INTRO_ITEMS.map((item, i) => {
                    const done = introProgress.find(p => p.slot_key === item.key)?.consumed ?? false;
                    const hasUrl = !!(details?.[`${item.key}_url` as keyof StoryDetails]);
                    const isActive = activeIntro === item.key;
                    const prevDone = i === 0 || (introProgress.find(p => p.slot_key === INTRO_ITEMS[i - 1].key)?.consumed ?? false);
                    const isNext = !done && prevDone;

                    return (
                      <div key={item.key}>
                        <motion.button
                          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                          whileTap={hasUrl ? { scale: 0.97 } : {}}
                          onClick={() => handleIntroClick(item.key)} disabled={!hasUrl}
                          className={`w-full rounded-3xl p-5 flex items-center gap-4 transition-all ${
                            done ? "bg-green-500/15 border-2 border-green-400/30" :
                            isNext ? `bg-gradient-to-r ${item.color} border-2 border-white/20 shadow-xl` :
                            "theme-card border-2 theme-border opacity-40"
                          }`}>
                          <motion.span className="text-4xl" animate={isNext ? { rotate: [0, -10, 10, 0] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}>{item.emoji}</motion.span>
                          <div className="flex-1 text-left">
                            <p className="font-baloo font-black text-white text-[17px]">{t(item.tKey)}</p>
                          </div>
                          {done ? (
                            <CheckCircle2 className="w-7 h-7 text-green-400 shrink-0" />
                          ) : isNext && hasUrl ? (
                            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </motion.div>
                          ) : null}
                        </motion.button>

                        {/* Inline player */}
                        {isActive && details && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 mb-1">
                            {(item.key === "intro_video" || item.key === "meet_characters" || item.key === "story_intro") && (
                              <StoryVideoPlayer url={details[`${item.key}_url` as keyof StoryDetails] as string | null} title={t(item.tKey)} />
                            )}
                            {item.key === "theme_song" && (
                              <StoryAudioPlayer url={details.theme_song_url} title={t("themeSongLabel")} subtitle={storyTitle} color={item.color} />
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Begin Adventure button — appears when all intros done */}
                {allIntrosDone && (
                  <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring" }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setPhase("missions")}
                    className="mt-6 w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-baloo font-black text-[20px] rounded-full py-4 shadow-2xl shadow-green-500/30 flex items-center justify-center gap-3">
                    🚀 Begin My Adventure!
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 3: MISSION PATH                      */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "missions" && (
              <motion.div key="missions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col pb-28 relative">

                {/* Tweak 5: Cover image as faded background */}
                {details?.cover_url && (
                  <div className="absolute inset-0 z-0 overflow-hidden">
                    <img src={getStorageUrl(details.cover_url)} alt="" className="w-full h-full object-cover opacity-[0.06] blur-sm scale-110" />
                  </div>
                )}

                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-4 relative z-10">
                  <button onClick={() => setPhase("welcome")} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {/* Tweak 4: Star count with bounce */}
                  <motion.div
                    initial={{ scale: 1 }} animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/10 rounded-full px-4 py-2 border border-yellow-400/25 shadow-lg shadow-yellow-500/10">
                    <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    </motion.div>
                    <span className="font-baloo font-black text-yellow-300 text-[16px]">{totalStars}</span>
                  </motion.div>
                </div>

                {/* Tweak 1: Nimi with speech bubble */}
                <div className="flex justify-center mb-3 relative z-10">
                  <div className="relative">
                    <motion.img src="/nimi-logo-circle.png" alt="Nimi" animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-16 h-16 rounded-full border-4 border-yellow-400 shadow-xl" />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -top-2 -right-2 bg-yellow-400 rounded-full px-1.5 py-0.5 shadow-lg">
                      <span className="text-[10px] font-black theme-text">{doneCount}/{totalCount}</span>
                    </motion.div>
                    {/* Speech bubble */}
                    <motion.div initial={{ opacity: 0, scale: 0.5, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      className="absolute -right-28 top-1 bg-white rounded-2xl rounded-bl-sm px-3 py-1.5 shadow-lg min-w-[100px]">
                      <p className="font-baloo font-bold theme-text text-[11px] whitespace-nowrap">
                        {doneCount === 0 ? "Let's go! 🚀" : doneCount < totalCount / 2 ? "Great start! 💪" : doneCount < totalCount ? "Almost there! 🔥" : "You did it! 🎉"}
                      </p>
                      <div className="absolute left-[-6px] top-3 w-3 h-3 bg-white rotate-45" />
                    </motion.div>
                  </div>
                </div>

                {/* ═══ WINDING MAP ═══ */}
                <div className="px-5 flex-1 relative z-10">
                  {slots.map((slot, i) => {
                    const meta = MISSION_META[slot.slot_key] ?? { emoji: "📌", tKey: slot.slot_key, color: "from-gray-500 to-gray-600", action: "Go" };
                    const isNext = !slot.completed && (i === 0 || slots[i - 1]?.completed);
                    const isLocked = !slot.completed && !isNext;
                    const isEven = i % 2 === 0;

                    return (
                      <div key={slot.slot_key} className="relative">
                        {/* Tweak 3: Curved connector with glow */}
                        {i > 0 && (
                          <svg className="w-full h-10 overflow-visible" viewBox="0 0 300 40" preserveAspectRatio="none">
                            <defs>
                              <filter id={`glow-${i}`}><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                            </defs>
                            {slots[i-1]?.completed && (
                              <path d={isEven ? "M 230 0 Q 150 40, 70 40" : "M 70 0 Q 150 40, 230 40"}
                                fill="none" stroke="#4ade80" strokeWidth="8" strokeLinecap="round" opacity="0.25" filter={`url(#glow-${i})`} />
                            )}
                            <path d={isEven ? "M 230 0 Q 150 40, 70 40" : "M 70 0 Q 150 40, 230 40"}
                              fill="none" stroke={slots[i-1]?.completed ? "#4ade80" : "#3b1f8e"} strokeWidth="4" strokeLinecap="round" strokeDasharray={isLocked ? "8 8" : "none"} />
                          </svg>
                        )}

                        {/* Mission node */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1, type: "spring", stiffness: 150 }}
                          className={`flex ${isEven ? "justify-start" : "justify-end"}`}>

                          <Link href={isLocked ? "#" : `/stories/${slug}/mission/${slot.slot_key}`}
                            onClick={e => { if (isLocked) e.preventDefault(); }}>
                            <motion.div
                              whileTap={!isLocked ? { scale: 0.9 } : {}}
                              className="flex flex-col items-center gap-1.5 w-[110px]">

                              {/* The big circle */}
                              <motion.div
                                animate={isNext ? {
                                  boxShadow: ["0 0 0 0 rgba(250,204,21,0.4)", "0 0 0 16px rgba(250,204,21,0)", "0 0 0 0 rgba(250,204,21,0.4)"],
                                } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                                className={`relative w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all ${
                                  slot.completed
                                    ? `bg-gradient-to-br ${meta.color} shadow-xl ring-4 ring-green-400/40`
                                    : isNext
                                      ? `bg-gradient-to-br ${meta.color} shadow-2xl ring-4 ring-yellow-400/50`
                                      : "theme-card border-2 theme-border"
                                }`}>

                                {/* Emoji or lock */}
                                <motion.span className={`${isLocked ? "" : "drop-shadow-lg"}`}
                                  animate={isNext ? { scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] } : {}}
                                  transition={{ duration: 2.5, repeat: Infinity }}
                                  style={{ fontSize: isLocked ? 24 : 40 }}>
                                  {isLocked ? "🔒" : meta.emoji}
                                </motion.span>

                                {/* Green check on completed */}
                                {slot.completed && (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-3 theme-border shadow-lg">
                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                  </motion.div>
                                )}

                                {/* Tweak 2: Sparkle confetti on completed */}
                                {slot.completed && (
                                  <>
                                    <motion.span className="absolute -top-3 left-1 text-[12px]" animate={{ opacity: [0, 1, 0], y: [0, -8, 0], rotate: [0, 180, 360] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }}>⭐</motion.span>
                                    <motion.span className="absolute -top-2 right-0 text-[10px]" animate={{ opacity: [0, 1, 0], y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}>✨</motion.span>
                                    <motion.span className="absolute top-0 -left-3 text-[8px]" animate={{ opacity: [0, 0.8, 0], x: [-2, -8, -2] }} transition={{ duration: 3, repeat: Infinity, delay: 1.2 }}>🌟</motion.span>
                                    <motion.span className="absolute -bottom-2 left-2 text-[9px]" animate={{ opacity: [0, 0.7, 0], y: [0, 5, 0] }} transition={{ duration: 2.8, repeat: Infinity, delay: 0.5 }}>💫</motion.span>
                                  </>
                                )}

                                {/* Play overlay for next */}
                                {isNext && (
                                  <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full flex items-center justify-center bg-black/10">
                                  </motion.div>
                                )}
                              </motion.div>

                              {/* Label below circle */}
                              <p className={`font-baloo font-black text-[12px] text-center leading-tight ${
                                isLocked ? "theme-text-muted/20" : slot.completed ? "text-white/70" : "text-white"
                              }`}>
                                {slot.title || t(meta.tKey)}
                              </p>

                              {/* Stars below label */}
                              {!isLocked && (
                                <div className="flex items-center gap-0.5">
                                  <Star className={`w-3 h-3 ${slot.completed ? "text-yellow-400 fill-yellow-400" : "text-yellow-400/40 fill-yellow-400/40"}`} />
                                  <span className={`text-[10px] font-bold ${slot.completed ? "text-yellow-300" : "text-yellow-300/40"}`}>{slot.stars}</span>
                                </div>
                              )}
                            </motion.div>
                          </Link>
                        </motion.div>
                      </div>
                    );
                  })}

                  {/* Trophy at the end */}
                  <div className="relative">
                    <svg className="w-full h-10 overflow-visible" viewBox="0 0 300 40" preserveAspectRatio="none">
                      <path d={slots.length % 2 === 0 ? "M 230 0 Q 150 40, 150 40" : "M 70 0 Q 150 40, 150 40"}
                        fill="none" stroke={doneCount >= totalCount ? "#4ade80" : "#3b1f8e"} strokeWidth="4" strokeLinecap="round" strokeDasharray={doneCount >= totalCount ? "none" : "8 8"} />
                    </svg>
                    <div className="flex justify-center">
                      <motion.div animate={doneCount >= totalCount ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl ${
                          doneCount >= totalCount
                            ? "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-2xl shadow-yellow-500/30 ring-4 ring-yellow-400/40"
                            : "theme-card border-2 theme-border"
                        }`}>
                        {doneCount >= totalCount ? "🏆" : "🔒"}
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Certificate button */}
                {doneCount >= totalCount && totalCount > 0 && (
                  <div className="px-5 mt-4">
                    <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPhase("certificate")}
                      className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-baloo font-black text-[20px] rounded-full py-4 shadow-2xl shadow-yellow-500/30 flex items-center justify-center gap-3">
                      🎉 See My Certificate!
                    </motion.button>
                  </div>
                )}

                {/* Piko at bottom with speech bubble */}
                <div className="flex justify-center mt-4 relative z-10">
                  <div className="relative">
                    <motion.img src="/piko-logo-circle.png.png" alt="Piko" animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="w-14 h-14 rounded-full border-4 border-blue-400 shadow-xl" />
                    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1, type: "spring" }}
                      className="absolute -left-24 top-0 bg-white rounded-2xl rounded-br-sm px-3 py-1.5 shadow-lg">
                      <p className="font-baloo font-bold theme-text text-[11px] whitespace-nowrap">
                        {doneCount >= totalCount ? "We did it! 🥳" : "Keep going! 💙"}
                      </p>
                      <div className="absolute right-[-6px] top-3 w-3 h-3 bg-white rotate-45" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 4: CERTIFICATE                       */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "certificate" && (
              <motion.div key="certificate" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">

                {/* Confetti-like stars */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.span key={i} className="absolute text-yellow-400"
                    style={{ left: `${10 + (i * 7) % 80}%`, top: `${10 + (i * 11) % 60}%` }}
                    animate={{ opacity: [0, 1, 0], y: [0, -30, 0], rotate: [0, 360] }}
                    transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.2 }}>
                    {i % 3 === 0 ? "⭐" : i % 3 === 1 ? "✨" : "🌟"}
                  </motion.span>
                ))}

                <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}
                  className="text-7xl mb-4">🎉</motion.div>

                <h2 className="font-baloo font-black text-white text-[28px]">WOOHOOO!</h2>
                <p className="theme-text-faint text-[16px] font-nunito mt-2">
                  <span className="text-yellow-300 font-bold">{childName}</span> completed
                </p>
                <h3 className="font-baloo font-black text-yellow-300 text-[24px] mt-1">{storyTitle}</h3>

                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}
                  className="mt-6 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/40">
                  <Star className="w-10 h-10 text-white fill-white" />
                </motion.div>
                <p className="text-yellow-300 font-baloo font-black text-[20px] mt-3">⭐ +{totalStars} Stars</p>
                <p className="theme-text-faint text-[13px] font-bold mt-1">🏅 Certificate Earned</p>

                <div className="mt-6 space-y-3 w-full max-w-xs">
                  <ShareAchievementFlow childId={childId} childName={childName} shareType="certificate"
                    title={storyTitle} description={`${childName} completed: ${storyTitle}`}
                    imageUrl={details?.cover_url ? getStorageUrl(details.cover_url) : null} />

                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => setPhase("challenge")}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-baloo font-black text-[16px] rounded-full py-3.5 shadow-lg flex items-center justify-center gap-2">
                    🏆 Bonus Challenge
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 5: CHAMPION CHALLENGE                */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "challenge" && (
              <motion.div key="challenge" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                className="flex-1 flex flex-col px-5 py-6">

                <button onClick={() => setPhase("certificate")} className="self-start mb-4 theme-text-faint flex items-center gap-1 text-[13px] font-bold">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <h2 className="font-baloo font-black text-yellow-300 text-[22px] text-center mb-4">🏆 Bonus Challenge</h2>

                {challengeDone ? (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center">
                    <motion.span className="text-6xl" animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>🎉</motion.span>
                    <h3 className="font-baloo font-black text-white text-[22px] mt-4">Challenge Done!</h3>
                    <p className="theme-text-faint text-[14px] mt-2">You&apos;re a true champion!</p>
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => setPhase("complete")}
                      className="mt-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-baloo font-black text-[18px] rounded-full px-8 py-4 shadow-xl flex items-center gap-2">
                      🌟 Continue
                    </motion.button>
                  </motion.div>
                ) : (
                  <ChampionChallengeCard onDidIt={() => setShowCelebration(true)} />
                )}
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 6: COMPLETE — NEXT STORY             */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">

                <motion.span className="text-6xl mb-3" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>🌟</motion.span>
                <h2 className="font-baloo font-black text-white text-[24px]">Story Complete!</h2>
                <p className="theme-text-faint text-[14px] mt-1">{storyTitle}</p>

                <div className="mt-6 space-y-3 w-full max-w-xs">
                  <Link href="/treasure">
                    <motion.div whileTap={{ scale: 0.95 }}
                      className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-baloo font-black text-[16px] rounded-full py-3.5 shadow-lg flex items-center justify-center gap-2">
                      🏆 My Treasure
                    </motion.div>
                  </Link>

                  <Link href="/community">
                    <motion.div whileTap={{ scale: 0.95 }}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-baloo font-black text-[16px] rounded-full py-3.5 shadow-lg flex items-center justify-center gap-2">
                      👥 Share with Friends
                    </motion.div>
                  </Link>

                  <Link href="/stories">
                    <motion.div whileTap={{ scale: 0.95 }}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-baloo font-black text-[16px] rounded-full py-3.5 shadow-lg flex items-center justify-center gap-2">
                      🚀 Next Story
                    </motion.div>
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          <CelebrationModal isOpen={showCelebration}
            onClose={() => { setShowCelebration(false); setChallengeDone(true); }} childName={childName} />
        </main>
      </div>
    </AppShell>
  );
}
