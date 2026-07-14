"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Lock, Play, Star, Volume2 } from "lucide-react";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { DURATION, EASE, SPRING } from "@/lib/design-system/motion";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChildren, getStorageUrl, getConsecutiveStreak, awardMilestoneBadges, createNotification, getStoryPages } from "@/lib/queries";
import { getMilestoneBadgeMeta } from "@/lib/milestoneBadges";
import { getStoryBySlug, getStoryDetails, getStorySlots, getStoryLibrary } from "@/lib/storyRepository";
import type { StoryLibraryItem } from "@/lib/story-types";
import { getStoryIntroProgress, markIntroItemConsumed } from "@/lib/storyProgressRepository";
import { getStoryCertificate } from "@/lib/storyCertificateRepository";
import type { StoryDetails, StorySlot, StoryIntroProgress, StoryCertificate } from "@/lib/story-types";
import supabase from "@/lib/supabaseClient";
import ChampionChallengeCard from "@/components/challenges/ChampionChallengeCard";
import PreviewBanner from "@/components/admin/story-readiness/PreviewBanner";
import CelebrationModal from "@/components/challenges/CelebrationModal";
import ShareAchievementFlow from "@/components/community/ShareAchievementFlow";
import StoryVideoPlayer from "@/components/media/StoryVideoPlayer";
import StoryAudioPlayer from "@/components/media/StoryAudioPlayer";
import { playTap, playSuccess, playCelebration, playUnlock, playStar } from "@/lib/sounds";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { PageSurface } from "@/components/layout/primitives";
import MeetCharactersCard from "@/components/stories/MeetCharactersCard";
import BadgeCircle from "@/components/stories/BadgeCircle";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

// Steps 2–4 of the boss's learning journey (Cover is step 1, shown on welcome screen)
const INTRO_ITEMS = [
  { key: "intro_video",     emoji: "🎬", tKey: "introVideoLabel",  actionKey: "storyIntroWatch"  },
  { key: "theme_song",      emoji: "🎵", tKey: "themeSongLabel",   actionKey: "storyIntroListen" },
  { key: "meet_characters", emoji: "🤝", tKey: "meetCharLabel",    actionKey: "storyIntroMeet"   },
];

const MISSION_META: Record<string, { emoji: string; tKey: string; actionKey: string }> = {
  flipflop_audio: { emoji: "📚", tKey: "flipflopAudioLabel", actionKey: "storyMissionOpenBook"    },
  story_pdf:      { emoji: "📖", tKey: "storyPdfLabel",      actionKey: "storyMissionReadStory"   },
  coloring:       { emoji: "🎨", tKey: "coloringLabel",      actionKey: "storyMissionStartColoring" },
  move_explore:   { emoji: "🤸", tKey: "moveExploreLabel",   actionKey: "storyMissionLetsMove"    },
  sing_along:     { emoji: "🎤", tKey: "singAlongLabel",     actionKey: "storyMissionSingAlong"   },
  bonus_video:    { emoji: "🎬", tKey: "bonusVideoLabel",    actionKey: "storyMissionWatchVideo"  },
};

const SLOT_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  flipflop_audio: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200"  },
  story_pdf:      { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200"  },
  coloring:       { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  move_explore:   { bg: "bg-pink-50",   text: "text-pink-700",   border: "border-pink-200"   },
  sing_along:     { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  bonus_video:    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
};

type Phase = "welcome" | "intro" | "missions" | "certificate" | "challenge" | "complete";

interface WeeklyChallenge {
  challenge_id: string;
  ch_stars: number;
  title: string;
  description: string;
  image_url: string | null;
  video_url: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  reward_badge: string | null;
  completed: boolean;
}

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { t, language } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const v = getComponentVariant(themeId);
  const m = useThemeMotion();

  const [loading, setLoading] = useState(true);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState("");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [details, setDetails] = useState<StoryDetails | null>(null);
  const [slots, setSlots] = useState<StorySlot[]>([]);
  const [introProgress, setIntroProgress] = useState<StoryIntroProgress[]>([]);
  const [certificate, setCertificate] = useState<StoryCertificate | null>(null);
  const [challengeDone, setChallengeDone] = useState(false);
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeIntro, setActiveIntro] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("welcome");
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [treasureAnimating, setTreasureAnimating] = useState(false);
  const [earnedBadgeSlug, setEarnedBadgeSlug] = useState<string | null>(null);
  const [nextStory, setNextStory] = useState<StoryLibraryItem | null>(null);
  const [streak, setStreak] = useState(0);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setParentId(user?.id ?? null);
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }
      setChildId(child.id);
      setChildName(child.name);
      getConsecutiveStreak(child.id, child.language as "en" | "fr" | "rw").then(setStreak);
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

      // Prefetch story pages in background so the flipflop_audio slot opens instantly
      void getStoryPages(story.id, child.language as "en" | "fr" | "rw");

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

  // Refetch slots + certificate when the tab becomes visible again —
  // catches the case where a child completes a mission and navigates back.
  const refreshSlots = useCallback(async () => {
    if (!childId || !storyId) return;
    const [sl, cert] = await Promise.all([
      getStorySlots(childId, storyId, language),
      getStoryCertificate(childId, storyId, language),
    ]);
    setSlots(sl);
    setCertificate(cert);
    const allDone = sl.filter(s => s.completed).length >= sl.length && sl.length > 0;
    if (allDone && cert) setPhase("complete");
    else if (allDone)    setPhase("certificate");
  }, [childId, storyId, language]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshSlots();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshSlots]);

  // Fetch weekly challenge when entering the challenge phase
  useEffect(() => {
    if (phase !== "challenge" || !childId || !storyId || weeklyChallenge || challengeLoading) return;
    setChallengeLoading(true);
    void (async () => {
      const { data } = await supabase.rpc("get_weekly_challenges", {
        p_child_id: childId,
        p_story_id: storyId,
        p_language: language,
      });
      const first = (data as WeeklyChallenge[] | null)?.[0] ?? null;
      setWeeklyChallenge(first);
      if (first?.completed) setChallengeDone(true);
      setChallengeLoading(false);
    })();
  }, [phase, childId, storyId, language, weeklyChallenge, challengeLoading]);

  const handleChallengeDidIt = async () => {
    if (!childId || !weeklyChallenge) {
      setShowCelebration(true);
      return;
    }
    await supabase.rpc("complete_weekly_challenge", {
      p_child_id: childId,
      p_challenge_id: weeklyChallenge.challenge_id,
    });
    setChallengeDone(true);
    setShowCelebration(true);
  };

  const handleIntroClick = async (key: string) => {
    if (!childId || !storyId || !details) return;
    const urlKey = `${key}_url` as keyof StoryDetails;
    const hasMedia = !!(details[urlKey] as string | null);
    // meet_characters always opens — shows a built-in character card when no video is uploaded
    if (!hasMedia && key !== "meet_characters") return;
    setActiveIntro(activeIntro === key ? null : key);
    await markIntroItemConsumed(childId, storyId, key);
    setIntroProgress(prev => prev.map(p => p.slot_key === key ? { ...p, consumed: true } : p));
  };

  // Load existing feeling when certificate phase is entered
  useEffect(() => {
    if (phase !== "certificate" || !childId || !storyId) return;
    supabase
      .from("story_feelings")
      .select("feeling")
      .eq("child_id", childId)
      .eq("story_id", storyId)
      .eq("language", language)
      .maybeSingle()
      .then(({ data }) => { if (data?.feeling) setFeeling(data.feeling); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, childId, storyId]);

  const handleFeelingSelect = async (emoji: string) => {
    setFeeling(emoji);
    if (!childId || !storyId) return;
    await supabase.from("story_feelings").upsert(
      { child_id: childId, story_id: storyId, language, feeling: emoji, felt_at: new Date().toISOString() },
      { onConflict: "child_id,story_id,language" }
    );
  };

  // On certificate phase: award milestone badges, fire notifications, show badge.
  useEffect(() => {
    if (phase !== "certificate" || !childId) return;
    void (async () => {
      const newSlugs = await awardMilestoneBadges(childId, language);

      // Notify parent for each newly earned badge
      if (newSlugs.length > 0 && parentId) {
        const { getMilestoneBadgeMeta: getMeta } = await import("@/lib/milestoneBadges");
        for (const slug of newSlugs) {
          const meta = getMeta(slug);
          await createNotification(parentId, {
            title: `${meta?.emoji ?? "🏅"} Badge Earned!`,
            body: meta ? `${childName} earned "${meta.label}" — ${meta.desc}` : `${childName} earned a new badge!`,
            type: "achievement",
            url: "/user-profile",
          });
        }
        setEarnedBadgeSlug(newSlugs[0]);
        return;
      }

      // Fallback: show most recently earned badge (admin-awarded or prior milestone)
      const { data } = await supabase
        .from("child_badges")
        .select("badge_slug")
        .eq("child_id", childId)
        .order("earned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.badge_slug) setEarnedBadgeSlug(data.badge_slug);
    })();
  }, [phase, childId, language, parentId, childName]);

  // Detect premium lock for this story
  useEffect(() => {
    if (!childId || !storyId) return;
    void (async () => {
      const library = await getStoryLibrary(childId, language);
      const entry = library.find(s => s.sid === storyId);
      if (entry && !entry.is_free && !entry.unlocked) setPremiumLocked(true);
    })();
  }, [childId, storyId, language]);

  // Fetch next story in sequence for the complete phase
  useEffect(() => {
    if (phase !== "complete" || !childId || !details) return;
    void (async () => {
      const library = await getStoryLibrary(childId, language);
      const currentIdx = library.findIndex(s => s.sid === storyId);
      setNextStory(library[currentIdx + 1] ?? null);
    })();
  }, [phase, childId, storyId, details, language]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto w-full px-4 py-6 pb-24 space-y-4">
          <Bone className="h-8 w-48" />
          <Bone className="leaf-lg" style={{ height: 300 }} />
          <Bone className="h-24 leaf-lg" />
          <Bone className="h-12 leaf-lg" />
        </div>
      </AppShell>
    );
  }

  if (premiumLocked) {
    return (
      <AppShell>
        <PageSurface>
          <main className="max-w-lg mx-auto w-full min-h-screen flex flex-col items-center justify-center px-5 py-12 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 22 }}>
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-5xl shadow-2xl shadow-purple-400/30 mb-6 mx-auto">
                👑
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h1 className="font-baloo font-black text-ds-text text-[28px] leading-tight mb-2">
                {t("premiumStoryTitle")}
              </h1>
              <p className="font-nunito text-gray-500 text-[15px] leading-relaxed mb-8 max-w-xs mx-auto">
                {t("premiumStoryDesc")}
              </p>
              <div className="space-y-3">
                <Link href="/parents">
                  <motion.button
                    whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}
                    className="w-full font-baloo font-black text-white text-[17px] bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl px-6 py-4 shadow-lg shadow-purple-400/25"
                  >
                    🔓 {t("unlockWithClub")}
                  </motion.button>
                </Link>
                <button onClick={() => router.back()}
                  className="w-full font-baloo font-black text-gray-400 text-[15px] py-2">
                  ← {t("goBack")}
                </button>
              </div>
            </motion.div>
          </main>
        </PageSurface>
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
      <PageSurface className={isPreview ? "pt-10" : ""}>
        <main className="max-w-lg mx-auto w-full min-h-screen flex flex-col">

          <AnimatePresence mode="wait">

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 1: WELCOME                           */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "welcome" && (
              <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col">

                {/* Cover */}
                <div className="relative h-72">
                  {details?.cover_url ? (
                    <Image src={getStorageUrl(details.cover_url)} alt={storyTitle} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-72 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center">
                      <motion.span className="text-8xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: DURATION.loopBase, repeat: Infinity }}>
                        {details?.theme_emoji ?? "📚"}
                      </motion.span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  <button onClick={() => router.push("/stories")}
                    className="absolute top-4 left-4 w-10 h-10 bg-black/30 backdrop-blur rounded-full flex items-center justify-center text-white z-10">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* Welcome content */}
                <div className="flex-1 flex flex-col items-center px-6 -mt-10 relative z-10">
                  <div className="w-full max-w-md leaf-lg border border-white/30 bg-white/95 px-5 py-6 shadow-[0_20px_48px_rgba(15,23,42,0.14)] backdrop-blur">
                    {/* Nimi — the Library guide */}
                    <div className="flex items-end justify-center mb-4">
                      <motion.img src={assets.nimiCircle} alt="Nimi" animate={{ y: [0, -8, 0] }}
                        transition={{ duration: DURATION.loopBase, repeat: Infinity }}
                        className="w-20 h-20 rounded-full border-4 shadow-xl" style={{ borderColor: 'var(--nimi-green)' }} />
                    </div>

                    <div className="flex items-center justify-center mb-3">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">
                        Story guide
                      </span>
                    </div>

                    <h1 className="font-baloo font-black text-[28px] text-ds-text text-center leading-tight">
                      {storyTitle}
                    </h1>

                    <motion.p className="text-gray-500 text-[15px] font-nunito text-center mt-3"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: DURATION.base }}>
                      {childName}, your story is waiting!<br />
                      <span className="text-gray-600 text-[13px]">Nimi will guide you through each little adventure.</span>
                    </motion.p>

                    {/* Progress stars */}
                    <div className="flex items-center justify-center gap-1 mt-5">
                      {Array.from({ length: totalCount }).map((_, i) => (
                        <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: DURATION.moderate + i * DURATION.fast, ...SPRING.card }}>
                          <Star className={`w-6 h-6 ${i < doneCount ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-200"}`} />
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-gray-500 text-[12px] font-bold mt-1 text-center">{doneCount} / 6 Missions Completed</p>

                    {/* Streak badge */}
                    {streak > 0 && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.5 }}
                        className="mt-3 flex items-center justify-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-5 py-2"
                      >
                        <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>🔥</motion.span>
                        <span className="font-baloo font-black text-orange-600 text-[15px]">{streak} {t("streakDays")}</span>
                      </motion.div>
                    )}

                    {/* Start button */}
                    {doneCount >= totalCount && totalCount > 0 ? (
                      /* MASTERY MODE — all missions done */
                      <div className="mt-8 space-y-3">
                        {/* Gold mastered badge */}
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.3 }}
                          className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 rounded-full px-5 py-2"
                        >
                          <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>🏆</motion.span>
                          <span className="font-baloo font-black text-amber-700 text-[14px]">{t("masteredLabel")} — {storyTitle}</span>
                        </motion.div>
                        {/* View certificate */}
                        <motion.button
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, ...SPRING.gentle }}
                          whileHover={m.buttonHover} whileTap={m.buttonPress}
                          onClick={() => { playCelebration(); setPhase("certificate"); }}
                          className="w-full text-white font-baloo font-black text-[18px] px-10 py-4 shadow-2xl flex items-center justify-center gap-3"
                          style={{ background: 'linear-gradient(to right, #f59e0b, #d97706)', borderRadius: 'var(--leaf-r-lg)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
                          🌟 {t("storySeeCertificate")}
                        </motion.button>
                        {/* Read again (mastery replay) */}
                        <motion.button
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, ...SPRING.gentle }}
                          whileTap={m.buttonPress}
                          onClick={() => { playTap(); setPhase("missions"); }}
                          className="w-full font-baloo font-black text-[15px] py-3 rounded-full border-2 border-[var(--nimi-green)] text-[var(--ds-brand-primary)] bg-white flex items-center justify-center gap-2 transition hover:bg-emerald-50">
                          {t("playAgainBtn")}
                        </motion.button>
                      </div>
                    ) : (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: DURATION.loopBounce, ...SPRING.gentle }}
                        whileHover={m.buttonHover} whileTap={m.buttonPress}
                        onClick={() => { playTap(); setPhase(allIntrosDone ? "missions" : "intro"); }}
                        className="mt-8 w-full text-white font-baloo font-black text-[20px] px-10 py-4 shadow-2xl flex items-center justify-center gap-3" style={{ background: 'linear-gradient(to right, var(--nimi-green), #0e9d60)', borderRadius: 'var(--leaf-r-lg)', boxShadow: '0 8px 24px rgba(26,168,106,0.35)' }}>
                        <Play className="w-6 h-6 fill-white" />
                        {doneCount > 0 ? "Continue My Journey" : "Begin the Story"}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 2: INTRO JOURNEY                     */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                className="flex-1 flex flex-col px-5 py-6">

                <button onClick={() => setPhase("welcome")} className="self-start mb-4 text-gray-400 flex items-center gap-1 text-[13px] font-bold">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <h2 className="font-baloo font-black text-[var(--ds-brand-primary)] text-[22px] text-center mb-2">{t("storyAdventureBegins")}</h2>

                <div className="mb-5 leaf border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
                  <p className="font-baloo font-black text-[16px] text-emerald-800">First, meet the story helpers</p>
                  <p className="text-[13px] text-gray-600 mt-1">Each card opens a tiny adventure. Complete them in order and the path ahead will light up.</p>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-6">
                  {INTRO_ITEMS.map(item => {
                    const done = introProgress.find(p => p.slot_key === item.key)?.consumed ?? false;
                    return (
                      <motion.div key={item.key}
                        animate={done ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: DURATION.slow }}
                        className={`w-3 h-3 rounded-full ${done ? "bg-green-500" : "bg-green-200"}`} />
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
                          whileTap={(hasUrl || item.key === "meet_characters") ? m.buttonPress : {}}
                          onClick={() => handleIntroClick(item.key)} disabled={!hasUrl && item.key !== "meet_characters"}
                          className={`w-full p-5 flex items-center gap-4 transition-all ${
                            done ? "bg-[var(--ds-brand-subtle)] border-2 border-[var(--ds-border-brand)]/40" :
                            isNext ? `bg-gradient-to-r ${v.contentGradients.storyIntro[i]} border-2 border-white/20 shadow-xl` :
                            "bg-gray-50 border-2 border-ds-border opacity-40"
                          }`}
                          style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                          <motion.span className="text-4xl" animate={isNext ? { rotate: [0, -10, 10, 0] } : {}}
                            transition={{ duration: DURATION.loopBase, repeat: Infinity }}>{item.emoji}</motion.span>
                          <div className="flex-1 text-left">
                            <p className={`font-baloo font-black text-[17px] ${done ? "text-green-800" : isNext ? "text-white" : "text-gray-500"}`}>{t(item.tKey)}</p>
                          </div>
                          {done ? (
                            <CheckCircle2 className="w-7 h-7 text-green-400 shrink-0" />
                          ) : isNext && (hasUrl || item.key === "meet_characters") ? (
                            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: DURATION.loopShimmer, repeat: Infinity }}
                              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </motion.div>
                          ) : null}
                        </motion.button>

                        {/* Inline player */}
                        {isActive && details && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 mb-1">
                            {item.key === "intro_video" && (
                              <StoryVideoPlayer url={details.intro_video_url} title={t(item.tKey)} />
                            )}
                            {item.key === "theme_song" && (
                              <StoryAudioPlayer url={details.theme_song_url} title={t("themeSongLabel")} subtitle={storyTitle} color={v.contentGradients.storyIntro[i]} />
                            )}
                            {item.key === "meet_characters" && (
                              details.meet_characters_url
                                ? <StoryVideoPlayer url={details.meet_characters_url} title={t(item.tKey)} />
                                : <MeetCharactersCard assets={assets} />
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Begin Adventure button — appears when all intros done */}
                {allIntrosDone && (
                  <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.gentle }}
                    whileHover={m.buttonHover} whileTap={m.buttonPress}
                    onClick={() => { playUnlock(); setPhase("missions"); }}
                    className="mt-6 w-full text-white font-baloo font-black text-[20px] py-4 flex items-center justify-center gap-3" style={{ background: 'linear-gradient(to right, var(--nimi-green), #0e9d60)', borderRadius: 'var(--leaf-r-lg)', boxShadow: '0 8px 24px rgba(26,168,106,0.35)' }}>
                    {t("storyBeginMyAdventure")}
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
                    <Image src={getStorageUrl(details.cover_url)} alt="" fill className="object-cover opacity-[0.06] blur-sm scale-110" />
                  </div>
                )}

                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-4 relative z-10">
                  <button onClick={() => setPhase("welcome")} className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-gray-700">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {/* Tweak 4: Star count with bounce */}
                  <div className="flex items-center gap-2">
                    {streak > 0 && (
                      <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
                        <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>🔥</motion.span>
                        <span className="font-baloo font-black text-orange-600 text-[13px]">{streak}</span>
                      </div>
                    )}
                    <motion.div
                      initial={{ scale: 1 }} animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: DURATION.slow, delay: DURATION.base }}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/10 rounded-full px-4 py-2 border border-yellow-400/25 shadow-lg shadow-yellow-500/10">
                      <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: DURATION.loopBase, repeat: Infinity }}>
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      </motion.div>
                      <span className="font-baloo font-black text-yellow-600 text-[16px]">{totalStars}</span>
                    </motion.div>
                  </div>
                </div>

                <div className="mx-5 mb-4 leaf border border-white/70 bg-white/85 p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] backdrop-blur relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-baloo font-black text-[15px] text-ds-text">Adventure path</p>
                      <p className="text-[12px] text-gray-500 mt-0.5">{doneCount} / 6 Missions Completed · {totalStars} ⭐ collected</p>
                    </div>
                    {(() => {
                      const nb = nextMission ? (SLOT_BADGE[nextMission.slot_key] ?? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" }) : null;
                      const ne = nextMission ? (MISSION_META[nextMission.slot_key]?.emoji ?? "⭐") : null;
                      return (
                        <div className={`rounded-full border px-3 py-1.5 text-[11px] font-black whitespace-nowrap ${
                          nb ? `${nb.bg} ${nb.text} ${nb.border}` : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {nextMission
                            ? `${ne} Next: ${nextMission.title || t(MISSION_META[nextMission.slot_key]?.tKey ?? "storyMissionGo")}`
                            : "All done ✨"}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Tweak 1: Nimi with speech bubble */}
                <div className="flex justify-center mb-3 relative z-10">
                  <div className="relative">
                    <motion.img src={assets.nimiCircle} alt="Nimi" animate={{ y: [0, -6, 0] }}
                      transition={{ duration: DURATION.loopBase, repeat: Infinity }}
                      className="w-16 h-16 rounded-full border-4 border-yellow-400 shadow-xl" />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: DURATION.loopFast, repeat: Infinity }}
                      className="absolute -top-2 -right-2 bg-yellow-400 rounded-full px-1.5 py-0.5 shadow-lg">
                      <span className="text-[10px] font-black text-ds-text">{doneCount}/{totalCount}</span>
                    </motion.div>
                    {/* Speech bubble */}
                    <motion.div initial={{ opacity: 0, scale: 0.5, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: DURATION.moderate, ...SPRING.card }}
                      className="absolute -right-28 top-1 bg-white px-3 py-1.5 shadow-lg min-w-[100px]" style={{ borderRadius: 'var(--leaf-r)' }}>
                      <p className="font-baloo font-bold text-ds-text text-[11px] whitespace-nowrap">
                        {doneCount === 0 ? t("storyBubbleLetsGo") : doneCount < totalCount / 2 ? t("storyBubbleGreatStart") : doneCount < totalCount ? t("storyBubbleAlmostThere") : t("storyBubbleYouDidIt")}
                      </p>
                      <div className="absolute left-[-6px] top-3 w-3 h-3 bg-white rotate-45" />
                    </motion.div>
                  </div>
                </div>

                {/* ═══ WINDING ADVENTURE MAP ═══ */}
                <div className="px-5 flex-1 relative z-10">

                  {/* Terrain decorations — scattered along the path */}
                  {[
                    { emoji: "🌳", x: "85%", top: "5%", size: 22, opacity: 0.15 },
                    { emoji: "🌿", x: "10%", top: "15%", size: 18, opacity: 0.12 },
                    { emoji: "🍄", x: "90%", top: "30%", size: 16, opacity: 0.1 },
                    { emoji: "🌸", x: "5%", top: "45%", size: 14, opacity: 0.12 },
                    { emoji: "🦋", x: "88%", top: "55%", size: 16, opacity: 0.15 },
                    { emoji: "🌻", x: "8%", top: "70%", size: 18, opacity: 0.1 },
                    { emoji: "🌲", x: "92%", top: "80%", size: 20, opacity: 0.12 },
                    { emoji: "⭐", x: "15%", top: "88%", size: 12, opacity: 0.08 },
                  ].map((d, i) => (
                    <motion.span key={i} className="absolute pointer-events-none select-none"
                      style={{ left: d.x, top: d.top, fontSize: d.size, opacity: d.opacity }}
                      animate={{ y: [0, -3, 0], rotate: [0, i % 2 === 0 ? 5 : -5, 0] }}
                      transition={{ duration: DURATION.loopFloat + i * 0.5, repeat: Infinity, delay: i * 0.3 }}>
                      {d.emoji}
                    </motion.span>
                  ))}

                  {slots.map((slot, i) => {
                    const metaBase = MISSION_META[slot.slot_key] ?? { emoji: "📌", tKey: slot.slot_key, actionKey: "storyMissionGo" };
                    const missionColor = v.contentGradients.missionPath[slot.slot_key] ?? "from-gray-500 to-gray-600";
                    const meta = { ...metaBase, color: missionColor };
                    const isNext = !slot.completed && (i === 0 || slots[i - 1]?.completed);
                    const isLocked = !slot.completed && !isNext;
                    const isEven = i % 2 === 0;

                    return (
                      <div key={slot.slot_key} className="relative">
                        {/* Curved path connector */}
                        {i > 0 && (
                          <svg className="w-full h-12 overflow-visible" viewBox="0 0 300 48" preserveAspectRatio="none">
                            <defs>
                              <filter id={`glow-${i}`}><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                            </defs>
                            {/* Glow behind completed paths */}
                            {slots[i-1]?.completed && (
                              <path d={isEven ? "M 230 0 Q 150 48, 70 48" : "M 70 0 Q 150 48, 230 48"}
                                fill="none" stroke="var(--ds-brand-primary)" strokeWidth="10" strokeLinecap="round" opacity="0.2" filter={`url(#glow-${i})`} />
                            )}
                            {/* Main path */}
                            <path d={isEven ? "M 230 0 Q 150 48, 70 48" : "M 70 0 Q 150 48, 230 48"}
                              fill="none" stroke={slots[i-1]?.completed ? "var(--ds-brand-primary)" : "rgba(0,0,0,0.1)"} strokeWidth="5" strokeLinecap="round"
                              strokeDasharray={isLocked ? "10 10" : "none"} />
                            {/* Footstep dots along completed paths */}
                            {slots[i-1]?.completed && [0.2, 0.5, 0.8].map((t, j) => (
                              <circle key={j} cx={isEven ? 230 - t * 160 : 70 + t * 160} cy={t * 48}
                                r="3" fill="rgba(0,0,0,0.1)" opacity="1" />
                            ))}
                          </svg>
                        )}

                        {/* Small terrain detail next to some nodes */}
                        {i === 0 && <span className="absolute -left-2 top-4 text-[14px] opacity-10 pointer-events-none">🏕️</span>}
                        {i === 2 && <span className="absolute -right-2 top-4 text-[14px] opacity-10 pointer-events-none">🌉</span>}
                        {i === 4 && <span className="absolute -left-2 top-4 text-[14px] opacity-10 pointer-events-none">⛺</span>}

                        {/* Mission node */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1, ...SPRING.card }}
                          className={`flex ${isEven ? "justify-start" : "justify-end"}`}>

                          <Link href={isLocked ? "#" : `/stories/${slug}/mission/${slot.slot_key}`}
                            onClick={e => { if (isLocked) e.preventDefault(); }}>
                            <motion.div
                              whileTap={!isLocked ? m.dangerPress : {}}
                              className={`relative flex flex-col items-center gap-2 w-[128px] leaf border p-3 transition-all ${
                                slot.completed
                                  ? "border-emerald-200 bg-emerald-50/80 shadow-[0_10px_24px_rgba(16,185,129,0.12)]"
                                  : isNext
                                    ? "border-amber-200 bg-white/90 shadow-[0_12px_28px_rgba(250,204,21,0.16)]"
                                    : "border-white/70 bg-white/70 shadow-sm"
                              }`}>
                              <div className={`absolute inset-x-3 top-2 h-1 rounded-full ${slot.completed ? "bg-emerald-400" : isNext ? "bg-amber-400" : "bg-slate-200"}`} />

                              {/* The big circle */}
                              <motion.div
                                animate={isNext ? {
                                  boxShadow: ["0 0 0 0 rgba(250,204,21,0.4)", "0 0 0 16px rgba(250,204,21,0)", "0 0 0 0 rgba(250,204,21,0.4)"],
                                } : {}}
                                transition={{ duration: DURATION.loopBase, repeat: Infinity }}
                                className={`relative w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all ${
                                  slot.completed
                                    ? `bg-gradient-to-br ${meta.color} shadow-xl ring-4 ring-green-400/40`
                                    : isNext
                                      ? `bg-gradient-to-br ${meta.color} shadow-2xl ring-4 ring-yellow-400/50`
                                      : "bg-white border-2 border-ds-border"
                                }`}>

                                {/* Emoji or lock */}
                                <motion.span className={`${isLocked ? "" : "drop-shadow-lg"}`}
                                  animate={isNext ? { scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] } : {}}
                                  transition={{ duration: DURATION.loopSlow, repeat: Infinity }}
                                  style={{ fontSize: isLocked ? 24 : 40 }}>
                                  {isLocked ? "🔒" : meta.emoji}
                                </motion.span>

                                {/* Green check on completed */}
                                {slot.completed && (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...SPRING.card, delay: DURATION.base }}
                                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--nimi-green)] rounded-full flex items-center justify-center border-3 border-ds-border shadow-lg">
                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                  </motion.div>
                                )}

                                {/* Tweak 2: Sparkle confetti on completed */}
                                {slot.completed && (
                                  <>
                                    <motion.span className="absolute -top-3 left-1 text-[12px]" animate={{ opacity: [0, 1, 0], y: [0, -8, 0], rotate: [0, 180, 360] }} transition={{ duration: DURATION.loopSlow, repeat: Infinity, delay: DURATION.fast }}>⭐</motion.span>
                                    <motion.span className="absolute -top-2 right-0 text-[10px]" animate={{ opacity: [0, 1, 0], y: [0, -6, 0] }} transition={{ duration: DURATION.loopBase, repeat: Infinity, delay: DURATION.slow }}>✨</motion.span>
                                    <motion.span className="absolute top-0 -left-3 text-[8px]" animate={{ opacity: [0, 0.8, 0], x: [-2, -8, -2] }} transition={{ duration: DURATION.loopFloat, repeat: Infinity, delay: DURATION.progress }}>🌟</motion.span>
                                    <motion.span className="absolute -bottom-2 left-2 text-[9px]" animate={{ opacity: [0, 0.7, 0], y: [0, 5, 0] }} transition={{ duration: DURATION.loopSlow, repeat: Infinity, delay: DURATION.moderate }}>💫</motion.span>
                                  </>
                                )}

                                {/* Play overlay for next */}
                                {isNext && (
                                  <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: DURATION.loopFast, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full flex items-center justify-center bg-black/10">
                                  </motion.div>
                                )}
                              </motion.div>

                              {/* Label below circle */}
                              <p className={`font-baloo font-black text-[12px] text-center leading-tight ${
                                isLocked ? "text-gray-300" : slot.completed ? "text-gray-700" : "text-gray-900"
                              }`}>
                                {slot.title || t(meta.tKey)}
                              </p>

                              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                slot.completed ? "text-emerald-600" : isNext ? "text-amber-600" : "text-slate-400"
                              }`}>
                                {slot.completed && doneCount >= totalCount ? t("masteredLabel") : slot.completed ? "Done ✓" : isNext ? "Ready" : "Soon"}
                              </div>

                              {/* Stars below label */}
                              {!isLocked && (
                                <div className="flex items-center gap-0.5">
                                  <Star className={`w-3 h-3 ${slot.completed ? "text-yellow-400 fill-yellow-400" : "text-yellow-400/40 fill-yellow-400/40"}`} />
                                  <span className={`text-[10px] font-bold ${slot.completed ? "text-yellow-600" : "text-yellow-400/40"}`}>{slot.stars}</span>
                                </div>
                              )}
                            </motion.div>
                          </Link>
                        </motion.div>
                      </div>
                    );
                  })}

                  {/* ═══ FINISH LINE — Trophy + Piko ═══ */}
                  <div className="relative mt-2">
                    <svg className="w-full h-12 overflow-visible" viewBox="0 0 300 48" preserveAspectRatio="none">
                      <path d={slots.length % 2 === 0 ? "M 230 0 Q 150 48, 150 48" : "M 70 0 Q 150 48, 150 48"}
                        fill="none" stroke={doneCount >= totalCount ? "var(--ds-brand-primary)" : "rgba(0,0,0,0.1)"} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={doneCount >= totalCount ? "none" : "10 10"} />
                    </svg>
                    <div className="flex flex-col items-center gap-2">
                      {/* Trophy */}
                      <motion.div animate={doneCount >= totalCount ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                        transition={{ duration: DURATION.loopBase, repeat: Infinity }}
                        className={`relative w-24 h-24 rounded-full flex items-center justify-center text-5xl ${
                          doneCount >= totalCount
                            ? "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-2xl shadow-yellow-500/30 ring-4 ring-yellow-400/40"
                            : "bg-white border-2 border-ds-border"
                        }`}>
                        {doneCount >= totalCount ? "🏆" : "🔒"}
                        {doneCount >= totalCount && (
                          <>
                            <motion.span className="absolute -top-3 -left-2 text-[14px]" animate={{ opacity: [0, 1, 0], y: [0, -10, 0] }} transition={{ duration: DURATION.loopBase, repeat: Infinity }}>⭐</motion.span>
                            <motion.span className="absolute -top-2 -right-3 text-[12px]" animate={{ opacity: [0, 1, 0], y: [0, -8, 0] }} transition={{ duration: DURATION.loopSlow, repeat: Infinity, delay: DURATION.moderate }}>✨</motion.span>
                          </>
                        )}
                      </motion.div>
                      {/* Piko cheering at the finish */}
                      <div className="relative">
                        <motion.img src={assets.pikoCircle} alt="Piko"
                          animate={{ y: [0, -4, 0] }} transition={{ duration: DURATION.loopBase, repeat: Infinity, delay: DURATION.moderate }}
                          className="w-12 h-12 rounded-full border-3 border-blue-400 shadow-lg" />
                        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: DURATION.loopSpark, ...SPRING.gentle }}
                          className="absolute -left-24 top-0 bg-white rounded-2xl rounded-br-sm px-2.5 py-1 shadow-lg">
                          <p className="font-baloo font-bold text-ds-text text-[10px] whitespace-nowrap">
                            {doneCount >= totalCount ? t("storyBubbleWeDidIt") : t("storyBubbleKeepGoing")}
                          </p>
                          <div className="absolute right-[-5px] top-2.5 w-2.5 h-2.5 bg-white rotate-45" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificate button */}
                {doneCount >= totalCount && totalCount > 0 && (
                  <div className="px-5 mt-4">
                    <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      whileTap={m.buttonPress}
                      onClick={() => { playCelebration(); setPhase("certificate"); }}
                      className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-baloo font-black text-[20px] rounded-full py-4 shadow-2xl shadow-yellow-500/30 flex items-center justify-center gap-3">
                      {t("storySeeCertificate")}
                    </motion.button>
                  </div>
                )}

              </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 4: CERTIFICATE                       */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "certificate" && (
              <motion.div key="certificate" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center relative overflow-hidden">

                {/* Confetti stars */}
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.span key={i} className="absolute text-yellow-400 pointer-events-none"
                    style={{ left: `${5 + (i * 6) % 85}%`, top: `${5 + (i * 9) % 65}%` }}
                    animate={{ opacity: [0, 1, 0], y: [0, -30, 0], rotate: [0, 360] }}
                    transition={{ duration: DURATION.loopBase + (i % 3), repeat: Infinity, delay: i * 0.15 }}>
                    {["⭐", "✨", "🌟", "💫", "🎉"][i % 5]}
                  </motion.span>
                ))}

                {/* Nimi celebrating */}
                <motion.img
                  src={assets.nimiCelebration}
                  alt="Nimi celebrating"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, y: [0, -7, 0] }}
                  transition={{ scale: { type: "spring", stiffness: 240, damping: 16 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
                  className="w-28 h-28 rounded-full object-cover border-4 border-yellow-300 shadow-2xl mb-4"
                />

                {/* Child name — the hero text */}
                <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <p className="font-nunito text-gray-400 text-[13px] font-bold uppercase tracking-widest mb-1">{t("storyCertWoo")}</p>
                  <h2 className="font-baloo font-black text-[32px] leading-tight" style={{ color: "var(--ds-brand-primary)" }}>
                    ⭐ {childName}! ⭐
                  </h2>
                  <p className="font-nunito text-gray-500 text-[15px] mt-1">{t("storyCertCompleted")}</p>
                  <h3 className="font-baloo font-black text-ds-text text-[20px] mt-0.5 leading-tight">{storyTitle}</h3>
                </motion.div>

                {/* Stars earned card */}
                <motion.div
                  initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
                  className="mt-5 w-full max-w-sm leaf-lg border border-amber-100 bg-white/90 p-5 shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: DURATION.moderate, ...SPRING.card }}
                    className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/40">
                    <Star className="w-10 h-10 text-white fill-white" />
                  </motion.div>
                  <p className="text-yellow-500 font-baloo font-black text-[24px] mt-3">+{totalStars} {t("storyStarsLabel")}</p>
                  <p className="text-gray-400 text-[13px] font-bold mt-1">{t("storyCertEarned")}</p>
                  <div className="mt-3 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-2 text-[12px] font-black text-yellow-700">
                    ✨ A shining finish for {childName}!
                  </div>
                </motion.div>

                {/* ═══ THE MAGIC BUTTON — Champion Reward ═══ */}
                <motion.div className="mt-8 w-full max-w-sm"
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: DURATION.loopSpark, ...SPRING.gentle }}>
                  <motion.button
                    onClick={() => { playCelebration(); setShowRewardModal(true); }}
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(250,204,21,0.4)",
                        "0 0 30px 8px rgba(250,204,21,0.3)",
                        "0 0 0 0 rgba(250,204,21,0.4)",
                      ],
                    }}
                    transition={{ duration: DURATION.loopBase, repeat: Infinity }}
                    whileHover={m.buttonHover}
                    whileTap={m.buttonPress}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-yellow-400 via-amber-400 to-green-400 text-white font-baloo font-black text-[20px] leaf py-5 shadow-2xl flex items-center justify-center gap-3">

                    {/* Sparkle particles inside button */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <motion.span key={i} className="absolute text-white/30 pointer-events-none"
                        style={{ left: `${15 + i * 18}%`, top: "20%" }}
                        animate={{ y: [-5, -20, -5], opacity: [0, 0.6, 0], scale: [0.5, 1, 0.5] }}
                        transition={{ duration: DURATION.loopFast, repeat: Infinity, delay: i * 0.3 }}>
                        ✦
                      </motion.span>
                    ))}

                    <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: DURATION.loopFast, repeat: Infinity }}
                      className="text-3xl">🏆</motion.span>
                    <span className="relative z-10 drop-shadow-lg">Claim Your Rewards!</span>
                    <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: DURATION.loopSpark, repeat: Infinity }}
                      className="text-2xl">🌟</motion.span>
                  </motion.button>
                </motion.div>

                {/* Emotional check-in */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-5 w-full max-w-xs leaf border border-pink-100 bg-gradient-to-br from-pink-50/60 via-white to-rose-50/40 p-4 text-center"
                >
                  {feeling ? (
                    <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
                      <span className="text-4xl">{feeling}</span>
                      <p className="font-baloo font-black text-ds-text text-[15px] mt-2">{t("feelingThanks")}</p>
                    </motion.div>
                  ) : (
                    <>
                      <p className="font-baloo font-black text-ds-text text-[14px] mb-3">{t("howDidYouFeel")}</p>
                      <div className="flex items-center justify-center gap-3">
                        {["😊", "😢", "😮", "😂", "💖"].map(emoji => (
                          <motion.button key={emoji} onClick={() => handleFeelingSelect(emoji)}
                            whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.2 }}
                            className="text-3xl select-none transition">
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>

                <div className="mt-4 space-y-3 w-full max-w-xs">
                  <ShareAchievementFlow childId={childId} childName={childName} shareType="certificate"
                    title={storyTitle} description={`${childName} completed: ${storyTitle}`}
                    imageUrl={details?.cover_url ? getStorageUrl(details.cover_url) : null} />

                  <motion.button whileTap={m.buttonPress}
                    onClick={() => setPhase("challenge")}
                    className="w-full bg-gradient-to-r from-[var(--nimi-green)] to-[var(--ds-brand-hover)] text-white font-baloo font-black text-[16px] rounded-full py-3.5 shadow-lg flex items-center justify-center gap-2">
                    {t("storyBonusChallenge")}
                  </motion.button>
                </div>

                {/* ═══ REWARD MODAL — Double Reward Effect ═══ */}
                <AnimatePresence>
                  {showRewardModal && (
                    <>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm" style={{ zIndex: 100 }}
                        onClick={() => !treasureAnimating && setShowRewardModal(false)} />

                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        transition={SPRING.bounce}
                        className="fixed inset-x-4 top-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[400px] bg-white leaf-lg border-2 border-yellow-400/30 p-6 text-center shadow-2xl"
                        style={{ zIndex: 101 }}>

                        {!treasureAnimating ? (
                          <>
                            {/* Eyebrow */}
                            <p className="font-nunito font-black text-[11px] text-yellow-500 uppercase tracking-[0.14em] mb-4">
                              🏆 Badge Unlocked!
                            </p>

                            {/* Big badge with glow + shine sweep */}
                            <div className="relative flex justify-center items-center mb-4">
                              {/* Pulsing glow */}
                              <motion.div
                                className="absolute w-40 h-40 rounded-full bg-yellow-300/35 blur-2xl"
                                animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.3, 0.7, 0.3] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                              />
                              {/* Badge + shine */}
                              <div className="relative rounded-full overflow-hidden w-32 h-32">
                                <motion.div
                                  initial={{ scale: 0, rotate: -30 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.1 }}>
                                  <BadgeCircle slug={earnedBadgeSlug} size="xl" />
                                </motion.div>
                                {/* Shine streak */}
                                <motion.div
                                  className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/55 to-transparent -skew-x-12 pointer-events-none"
                                  initial={{ x: "-100%" }}
                                  animate={{ x: "320%" }}
                                  transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 2.8 }}
                                />
                              </div>
                            </div>

                            {/* Badge name */}
                            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                              <h3 className="font-baloo font-black text-gray-900 text-[22px] leading-tight">
                                {earnedBadgeSlug
                                  ? (getMilestoneBadgeMeta(earnedBadgeSlug)?.label
                                      ?? earnedBadgeSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "))
                                  : "Story Explorer"}
                              </h3>
                              <p className="font-nunito text-gray-400 text-[13px] mt-1 leading-snug">
                                {earnedBadgeSlug && getMilestoneBadgeMeta(earnedBadgeSlug)
                                  ? <>{getMilestoneBadgeMeta(earnedBadgeSlug)!.desc} 🎉</>
                                  : <>{childName} earned this by completing<br /><span className="font-bold text-gray-600">{storyTitle}</span></>
                                }
                              </p>
                            </motion.div>

                            {/* Certificate strip */}
                            <motion.div
                              initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.48 }}
                              className="w-full mt-4 bg-gradient-to-r from-amber-50 via-[#faf6ee] to-amber-50 border border-amber-200/70 rounded-2xl p-3.5 flex items-center gap-3">
                              <div className="w-11 h-11 bg-gradient-to-br from-yellow-300 to-amber-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-xl">
                                📜
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="font-baloo font-black text-amber-800 text-[13px] leading-tight">Story Certificate</p>
                                <p className="font-nunito text-amber-500/80 text-[11px] truncate">Awarded to {childName}</p>
                              </div>
                              <button
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    child: childName, story: storyTitle,
                                    stars: String(totalStars), lang: language,
                                    ...(storyId ? { storyId } : {}),
                                    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                                  });
                                  window.open(`/api/certificate?${params}`, "_blank");
                                }}
                                className="flex-shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-700 font-black text-[11px] rounded-xl px-3 py-1.5 transition">
                                📥 Download
                              </button>
                            </motion.div>

                            {/* Send to Treasure Box */}
                            <motion.button
                              initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.58 }}
                              whileTap={m.buttonPress}
                              onClick={() => {
                                setTreasureAnimating(true);
                                playStar();
                                setTimeout(() => {
                                  playCelebration();
                                  setTimeout(() => {
                                    setTreasureAnimating(false);
                                    setShowRewardModal(false);
                                  }, 2000);
                                }, 1500);
                              }}
                              className="w-full mt-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-baloo font-black text-[17px] rounded-full py-4 shadow-[0_8px_22px_rgba(245,158,11,0.32)] flex items-center justify-center gap-2">
                              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: DURATION.loopSpark, repeat: Infinity }}>✨</motion.span>
                              Send to My Treasure Box!
                            </motion.button>

                            <button onClick={() => setShowRewardModal(false)}
                              className="mt-3 text-gray-400 text-[12px] font-semibold hover:text-gray-600 transition">
                              Maybe later
                            </button>
                          </>
                        ) : (
                          /* Treasure Box animation — items flying in */
                          <div className="py-8">
                            {/* Flying certificate */}
                            <motion.div
                              initial={{ x: -60, y: 0, scale: 1, opacity: 1 }}
                              animate={{ x: 0, y: -100, scale: 0.3, opacity: 0 }}
                              transition={{ duration: DURATION.loopFast, ease: EASE.exit }}
                              className="w-14 h-14 mx-auto mb-2 bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-yellow-300 rounded-xl flex items-center justify-center">
                              <span className="font-baloo font-black text-yellow-700 text-center leading-tight" style={{ fontSize: 7 }}>STORY<br/>CERT</span>
                            </motion.div>

                            {/* Flying badge */}
                            <motion.div
                              initial={{ x: 60, y: 0, scale: 1, opacity: 1 }}
                              animate={{ x: 0, y: -100, scale: 0.3, opacity: 0 }}
                              transition={{ duration: DURATION.loopFast, ease: EASE.exit, delay: DURATION.base }}
                              className="mx-auto mb-4 flex justify-center">
                              <BadgeCircle slug={earnedBadgeSlug} size="sm" />
                            </motion.div>

                            {/* Treasure chest receiving */}
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: [0.8, 1.3, 1], rotate: [0, -10, 10, 0] }}
                              transition={{ duration: DURATION.loopFast, delay: DURATION.loopSpark }}
                              className="text-7xl mb-4">🎁</motion.div>

                            {/* Sparkle burst */}
                            {Array.from({ length: 8 }).map((_, i) => (
                              <motion.span key={i} className="absolute text-yellow-400"
                                style={{ left: "50%", top: "50%" }}
                                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                animate={{
                                  x: Math.cos(i * Math.PI / 4) * 80,
                                  y: Math.sin(i * Math.PI / 4) * 80,
                                  scale: [0, 1.5, 0], opacity: [0, 1, 0],
                                }}
                                transition={{ duration: DURATION.loopSpark, delay: DURATION.loopFast }}>
                                ✨
                              </motion.span>
                            ))}

                            <motion.p
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: DURATION.loopBase }}
                              className="font-baloo font-black text-yellow-600 text-[20px] mt-4">
                              POOF! 🎉
                            </motion.p>
                            <motion.p
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: DURATION.loopBase + DURATION.base }}
                              className="text-gray-500 text-[14px] mt-1">
                              Saved to your Champion Treasure Box!
                            </motion.p>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 5: CHAMPION CHALLENGE                */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "challenge" && (
              <motion.div key="challenge" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                className="flex-1 flex flex-col px-5 py-6">

                <button onClick={() => { playCelebration(); setPhase("certificate"); }} className="self-start mb-4 text-gray-400 flex items-center gap-1 text-[13px] font-bold">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="mb-4 leaf border border-yellow-200 bg-gradient-to-r from-yellow-50 via-amber-50/60 to-yellow-50 p-4 shadow-sm">
                  <p className="font-baloo font-black text-[16px] text-amber-800">🏆 One extra sparkle challenge</p>
                  <p className="text-[13px] text-gray-600 mt-1">A little kindness mission to finish the story with a happy heart.</p>
                </div>

                <h2 className="font-baloo font-black text-[var(--ds-brand-primary)] text-[22px] text-center mb-4">{t("storyBonusChallenge")}</h2>

                {challengeDone ? (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center">
                    <motion.span className="text-6xl" animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: DURATION.loopBase, repeat: Infinity }}>🎉</motion.span>
                    <h3 className="font-baloo font-black text-ds-text text-[22px] mt-4">{t("storyChallengeDone")}</h3>
                    <p className="text-gray-500 text-[14px] mt-2">You&apos;re a true champion!</p>
                    <motion.button whileTap={m.buttonPress}
                      onClick={() => { playStar(); setPhase("complete"); }}
                      className="mt-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-baloo font-black text-[18px] rounded-full px-8 py-4 shadow-xl flex items-center gap-2">
                      {t("storyContinueBtn")}
                    </motion.button>
                  </motion.div>
                ) : challengeLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <motion.span className="text-4xl" animate={{ rotate: [0, 360] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>⭐</motion.span>
                  </div>
                ) : weeklyChallenge ? (
                  <ChampionChallengeCard
                    title={weeklyChallenge.title || undefined}
                    description={weeklyChallenge.description || undefined}
                    stars={weeklyChallenge.ch_stars}
                    image_url={weeklyChallenge.image_url}
                    video_url={weeklyChallenge.video_url}
                    difficulty={weeklyChallenge.difficulty ?? undefined}
                    reward={weeklyChallenge.reward_badge ?? undefined}
                    completed={challengeDone}
                    onDidIt={handleChallengeDidIt}
                  />
                ) : (
                  <ChampionChallengeCard onDidIt={handleChallengeDidIt} />
                )}
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* PHASE 6: COMPLETE — WHAT'S NEXT            */}
            {/* ═══════════════════════════════════════════ */}
            {phase === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center px-5 pb-8 text-center overflow-y-auto">

                {/* ── Celebration hero ── */}
                <div className="relative w-full flex flex-col items-center pt-6 pb-4 mb-2">
                  {/* Floating confetti particles */}
                  {[
                    { emoji: "⭐", x: "10%",  delay: 0,    dur: 2.8 },
                    { emoji: "🎉", x: "82%",  delay: 0.3,  dur: 3.1 },
                    { emoji: "✨", x: "25%",  delay: 0.7,  dur: 2.5 },
                    { emoji: "🌟", x: "68%",  delay: 0.5,  dur: 3.4 },
                    { emoji: "⭐", x: "50%",  delay: 1.1,  dur: 2.9 },
                    { emoji: "🎊", x: "90%",  delay: 0.9,  dur: 3.2 },
                  ].map((p, i) => (
                    <motion.span key={i}
                      className="absolute top-0 text-xl pointer-events-none select-none"
                      style={{ left: p.x }}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: [0, -18, 0], opacity: [0, 1, 0] }}
                      transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}>
                      {p.emoji}
                    </motion.span>
                  ))}

                  {/* Nimi celebrating */}
                  <motion.img
                    src={assets.nimiCelebration}
                    alt="Nimi celebrating"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
                    transition={{ scale: { type: "spring", stiffness: 260, damping: 18 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
                    className="w-28 h-28 rounded-full object-cover border-4 border-yellow-300 shadow-xl mb-4"
                  />

                  <motion.h2
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="font-baloo font-black text-ds-text text-[26px] leading-tight">
                    {t("storyComplete")} 🌟
                  </motion.h2>
                  <motion.p
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="font-nunito text-gray-400 text-[14px] mt-1">
                    {storyTitle}
                  </motion.p>
                </div>

                {/* ── What's Next cards ── */}
                <motion.div
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="w-full max-w-sm mb-5">

                  <p className="font-baloo font-black text-ds-text text-[12px] uppercase tracking-[0.12em] mb-3 flex items-center justify-center gap-1.5">
                    <span>🚀</span> What&apos;s Next?
                  </p>

                  <div className="flex items-stretch gap-3">
                    {/* Current story — MASTERED */}
                    <div className="flex-1 bg-white border-2 border-green-200 rounded-2xl p-3.5 flex flex-col items-center gap-2 shadow-sm">
                      <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">
                        Story {details?.sort_order ?? ""}
                      </p>
                      <span className="text-4xl leading-none">{details?.theme_emoji ?? "📖"}</span>
                      <p className="font-baloo font-black text-[12px] text-ds-text text-center leading-tight line-clamp-2 flex-1">
                        {storyTitle}
                      </p>
                      <div className="w-full bg-green-500 text-white font-black text-[11px] rounded-full py-1.5 flex items-center justify-center gap-1">
                        ✅ MASTERED!
                      </div>
                    </div>

                    {/* Connector */}
                    <div className="flex flex-col items-center justify-center gap-1.5 flex-shrink-0 py-2">
                      <div className="w-px flex-1 bg-gray-150" />
                      <motion.div
                        animate={nextStory?.unlocked ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 1.8, repeat: Infinity }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-sm ${
                          nextStory?.unlocked ? "bg-green-100" : "bg-gray-100"
                        }`}>
                        {nextStory?.unlocked ? "🔓" : <Lock className="w-4 h-4 text-gray-400" />}
                      </motion.div>
                      <div className="w-px flex-1 bg-gray-150" />
                    </div>

                    {/* Next story */}
                    {nextStory ? (
                      nextStory.unlocked ? (
                        <Link href={`/stories/${nextStory.slug}`} className="flex-1">
                          <motion.div whileTap={m.buttonPress}
                            className="h-full bg-white border-2 rounded-2xl p-3.5 flex flex-col items-center gap-2 shadow-sm transition"
                            style={{ borderColor: "var(--ds-brand-primary)" }}>
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--ds-brand-primary)" }}>
                              Story {nextStory.sort_order}
                            </p>
                            <span className="text-4xl leading-none">{nextStory.theme_emoji ?? "📖"}</span>
                            <p className="font-baloo font-black text-[12px] text-ds-text text-center leading-tight line-clamp-2 flex-1">
                              {nextStory.title}
                            </p>
                            <div className="w-full text-white font-black text-[11px] rounded-full py-1.5 flex items-center justify-center gap-1"
                              style={{ background: "linear-gradient(to right, var(--nimi-green), var(--ds-brand-hover))" }}>
                              🚀 START!
                            </div>
                          </motion.div>
                        </Link>
                      ) : (
                        <div className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl p-3.5 flex flex-col items-center gap-2">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Story {nextStory.sort_order}
                          </p>
                          <span className="text-4xl leading-none opacity-50">{nextStory.theme_emoji ?? "📖"}</span>
                          <p className="font-baloo font-black text-[12px] text-gray-400 text-center leading-tight line-clamp-2 flex-1">
                            {nextStory.title}
                          </p>
                          <div className="w-full bg-gray-300 text-white font-black text-[11px] rounded-full py-1.5 flex items-center justify-center gap-1">
                            🔒 LOCKED
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">🌟</span>
                        <p className="font-baloo font-black text-[11px] text-gray-400 text-center leading-snug">More coming soon!</p>
                      </div>
                    )}
                  </div>

                  <p className="font-nunito text-gray-400 text-[12px] mt-3">
                    {nextStory?.unlocked
                      ? "Your next adventure is ready — tap to begin! 🎉"
                      : "Complete all missions to unlock the next adventure!"}
                  </p>
                </motion.div>

                {/* ── Action buttons ── */}
                <motion.div
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="space-y-3 w-full max-w-xs">

                  {/* Primary: next story (if unlocked) OR treasure */}
                  {nextStory?.unlocked ? (
                    <Link href={`/stories/${nextStory.slug}`}>
                      <motion.div whileTap={m.buttonPress}
                        className="w-full text-white font-baloo font-black text-[17px] rounded-full py-4 shadow-[0_8px_20px_rgba(0,150,80,0.28)] flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(to right, var(--nimi-green), var(--ds-brand-hover))" }}>
                        🚀 Start Next Story
                      </motion.div>
                    </Link>
                  ) : (
                    <Link href="/treasure">
                      <motion.div whileTap={m.buttonPress}
                        className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-baloo font-black text-[17px] rounded-full py-4 shadow-[0_8px_20px_rgba(245,158,11,0.28)] flex items-center justify-center gap-2">
                        {t("storyMyTreasure")}
                      </motion.div>
                    </Link>
                  )}

                  {/* Secondary: treasure (if next story is primary) or share */}
                  {nextStory?.unlocked && (
                    <Link href="/treasure">
                      <motion.div whileTap={m.buttonPress}
                        className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-baloo font-black text-[15px] rounded-full py-3.5 shadow-[0_6px_16px_rgba(245,158,11,0.22)] flex items-center justify-center gap-2">
                        {t("storyMyTreasure")}
                      </motion.div>
                    </Link>
                  )}

                  <Link href="/community">
                    <motion.div whileTap={m.buttonPress}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-baloo font-black text-[15px] rounded-full py-3.5 shadow-[0_6px_16px_rgba(236,72,153,0.22)] flex items-center justify-center gap-2">
                      {t("storyShareFriends")}
                    </motion.div>
                  </Link>

                  <Link href="/stories">
                    <motion.div whileTap={m.buttonPress}
                      className="w-full bg-white border-2 border-gray-200 text-gray-500 font-baloo font-black text-[14px] rounded-full py-3 flex items-center justify-center gap-2 hover:border-[var(--ds-brand-primary)] hover:text-[var(--ds-brand-primary)] transition">
                      {t("storyNextStory")}
                    </motion.div>
                  </Link>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>

          <CelebrationModal isOpen={showCelebration}
            onClose={() => { setShowCelebration(false); setChallengeDone(true); }} childName={childName} />
        </main>
      </PageSurface>
    </AppShell>
  );
}
