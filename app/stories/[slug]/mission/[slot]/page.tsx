"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChildren, getStoryPages, getColoringPages, createNotification } from "@/lib/queries";
import { lscached, TTL_LONG } from "@/lib/queryCache";
import type { Mission, StoryPage, ColoringPage } from "@/lib/queries";
import { getStoryBySlug, getStorySlots } from "@/lib/storyRepository";
import { completeStorySlot } from "@/lib/storyProgressRepository";
import type { StorySlot, CompleteSlotResult, CompleteSlotOutcome } from "@/lib/story-types";
import supabase from "@/lib/supabaseClient";

import { personalize, personalizeJson } from "@/lib/personalize";
import { playCelebration, playStar } from "@/lib/sounds";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { PageSurface } from "@/components/layout/primitives";
import PreviewBanner from "@/components/admin/story-readiness/PreviewBanner";
import StoryContent from "@/components/missions/StoryContent";
import SingAlongContent from "@/components/missions/SingAlongContent";
import MoveGrooveContent from "@/components/missions/MoveGrooveContent";
import WatchContent from "@/components/missions/WatchContent";
import ReadContent from "@/components/missions/ReadContent";
import ColoringContent from "@/components/missions/ColoringContent";
import RewardBurst from "@/components/delight/RewardBurst";
import AnimatedCheckmark from "@/components/delight/AnimatedCheckmark";
import { CONFETTI_BURST } from "@/lib/design-system/delight";
import { SPRING } from "@/lib/design-system/motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import ShareAchievementFlow from "@/components/community/ShareAchievementFlow";
import { Share2 } from "lucide-react";
import NimiReaction from "@/components/missions/NimiReaction";
import ComprehensionQuestion from "@/components/missions/ComprehensionQuestion";
import type { QuestionData } from "@/components/missions/ComprehensionQuestion";
import WordLearnedCard from "@/components/missions/WordLearnedCard";
import type { VocabWord } from "@/components/missions/WordLearnedCard";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const SLOT_T_KEYS: Record<string, string> = {
  flipflop_audio:    "flipflopAudioLabel",
  story_pdf:         "storyPdfLabel",
  coloring:          "coloringLabel",
  move_explore:      "moveExploreLabel",
  sing_along:        "singAlongLabel",
  bonus_video:       "bonusVideoLabel",
  challenge_1:       "weeklyChallenge1Label",
  challenge_2:       "weeklyChallenge2Label",
  challenge_3:       "weeklyChallenge3Label",
  destination_video: "destinationVideoLabel",
};

const MISSION_STYLES: Record<string, {
  headerBg: string;
  headerBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  emoji: string;
  label: string;
  friendlyLabel: string;
  resultBg: string;
}> = {
  story: {
    headerBg: "bg-gradient-to-r from-[rgba(6,16,31,0.08)] via-[rgba(13,30,58,0.06)] to-[rgba(6,16,31,0.08)]",
    headerBorder: "border-[rgba(201,168,76,0.35)]",
    badgeBg: "bg-[rgba(201,168,76,0.12)]", badgeText: "text-[#A96113]", badgeBorder: "border-[rgba(201,168,76,0.4)]",
    emoji: "🎧", label: "Listen", friendlyLabel: "Let's Listen!",
    resultBg: "bg-gradient-to-br from-white via-[rgba(201,168,76,0.06)] to-[rgba(6,16,31,0.04)]",
  },
  read: {
    headerBg: "bg-gradient-to-r from-[rgba(6,16,31,0.08)] via-[rgba(13,30,58,0.06)] to-[rgba(6,16,31,0.08)]",
    headerBorder: "border-[rgba(201,168,76,0.35)]",
    badgeBg: "bg-[rgba(201,168,76,0.12)]", badgeText: "text-[#A96113]", badgeBorder: "border-[rgba(201,168,76,0.4)]",
    emoji: "📖", label: "Read", friendlyLabel: "Let's Read!",
    resultBg: "bg-gradient-to-br from-white via-[rgba(201,168,76,0.06)] to-[rgba(6,16,31,0.04)]",
  },
  color: {
    headerBg: "bg-gradient-to-r from-[rgba(6,16,31,0.08)] via-[rgba(13,30,58,0.06)] to-[rgba(6,16,31,0.08)]",
    headerBorder: "border-[rgba(201,168,76,0.35)]",
    badgeBg: "bg-[rgba(201,168,76,0.12)]", badgeText: "text-[#A96113]", badgeBorder: "border-[rgba(201,168,76,0.4)]",
    emoji: "🎨", label: "Create", friendlyLabel: "Let's Create!",
    resultBg: "bg-gradient-to-br from-white via-[rgba(201,168,76,0.06)] to-[rgba(6,16,31,0.04)]",
  },
  move: {
    headerBg: "bg-gradient-to-r from-[rgba(6,16,31,0.08)] via-[rgba(13,30,58,0.06)] to-[rgba(6,16,31,0.08)]",
    headerBorder: "border-[rgba(201,168,76,0.35)]",
    badgeBg: "bg-[rgba(201,168,76,0.12)]", badgeText: "text-[#A96113]", badgeBorder: "border-[rgba(201,168,76,0.4)]",
    emoji: "🤸", label: "Move", friendlyLabel: "Let's Move!",
    resultBg: "bg-gradient-to-br from-white via-[rgba(201,168,76,0.06)] to-[rgba(6,16,31,0.04)]",
  },
  sing: {
    headerBg: "bg-gradient-to-r from-[rgba(6,16,31,0.08)] via-[rgba(13,30,58,0.06)] to-[rgba(6,16,31,0.08)]",
    headerBorder: "border-[rgba(201,168,76,0.35)]",
    badgeBg: "bg-[rgba(201,168,76,0.12)]", badgeText: "text-[#A96113]", badgeBorder: "border-[rgba(201,168,76,0.4)]",
    emoji: "🎵", label: "Sing", friendlyLabel: "Let's Sing!",
    resultBg: "bg-gradient-to-br from-white via-[rgba(201,168,76,0.06)] to-[rgba(6,16,31,0.04)]",
  },
  watch: {
    headerBg: "bg-gradient-to-r from-[rgba(6,16,31,0.08)] via-[rgba(13,30,58,0.06)] to-[rgba(6,16,31,0.08)]",
    headerBorder: "border-[rgba(201,168,76,0.35)]",
    badgeBg: "bg-[rgba(201,168,76,0.12)]", badgeText: "text-[#A96113]", badgeBorder: "border-[rgba(201,168,76,0.4)]",
    emoji: "🎬", label: "Watch", friendlyLabel: "Let's Watch!",
    resultBg: "bg-gradient-to-br from-white via-[rgba(201,168,76,0.06)] to-[rgba(6,16,31,0.04)]",
  },
  destination: {
    headerBg: "bg-gradient-to-r from-[#06101F]/10 via-[#0d1e3a]/8 to-[#06101F]/10",
    headerBorder: "border-[rgba(201,168,76,0.35)]",
    badgeBg: "bg-[rgba(201,168,76,0.12)]", badgeText: "text-[#C9A84C]", badgeBorder: "border-[rgba(201,168,76,0.4)]",
    emoji: "🌍", label: "Destination", friendlyLabel: "Arrival!",
    resultBg: "bg-gradient-to-br from-white via-[rgba(201,168,76,0.06)] to-[rgba(6,16,31,0.04)]",
  },
  challenge: {
    headerBg: "bg-gradient-to-r from-[#06101F]/10 via-[#0d1e3a]/8 to-[#06101F]/10",
    headerBorder: "border-[rgba(201,168,76,0.35)]",
    badgeBg: "bg-[rgba(201,168,76,0.12)]", badgeText: "text-[#C9A84C]", badgeBorder: "border-[rgba(201,168,76,0.4)]",
    emoji: "🏆", label: "Challenge", friendlyLabel: "Family Challenge!",
    resultBg: "bg-gradient-to-br from-white via-[rgba(201,168,76,0.06)] to-[rgba(6,16,31,0.04)]",
  },
};

// Pre-activity Nimi intro messages — keyed by mission.type, shown before completion
const INTRO_MESSAGES: Record<string, string> = {
  story:       "Ready for a story stop? Let's discover it together! 📖✈️",
  read:        "Ready to read, traveler? Let's explore these words! 📚",
  color:       "Creative stop ahead! Let's make this picture shine! 🎨✨",
  move:        "Ready to move? Let's bring this stop to life! 🕺✈️",
  sing:        "Music stop ahead! Let's sing along together! 🎵",
  watch:       "Eyes ready, traveler! Something fun is waiting! 🎬✨",
  destination: "Your destination stop is ready! Something special ahead! ✨✈️",
  challenge:   "Challenge stop ahead! Let's see what you can do! 🏆✈️",
};
const INTRO_FALLBACK = "Ready for your next flight stop? Let's do it together! ✈️";

export default function StoryMissionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const slotKey = params.slot as string;
  const { t, language } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();

  const [loading, setLoading] = useState(true);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string>("");
  const [childLanguage, setChildLanguage] = useState<string>("en");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [slot, setSlot] = useState<StorySlot | null>(null);
  const [allSlots, setAllSlots] = useState<StorySlot[]>([]);
  const [mission, setMission] = useState<Mission | null>(null);
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [coloringPages, setColoringPages] = useState<ColoringPage[]>([]);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [outcome, setOutcome] = useState<CompleteSlotOutcome | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);  // index of the question being shown
  const [wordIdx, setWordIdx] = useState(0);           // index of the vocab word being shown

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // auth + children + story slug are independent — fetch all three in parallel
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const [{ data: { user } }, list, story] = await Promise.all([
        supabase.auth.getUser(),
        getChildren(),
        getStoryBySlug(slug),
      ]);
      if (cancelled) return;
      if (!user) { router.replace("/loginpage"); return; }
      setParentId(user?.id ?? null);
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }
      setChildId(child.id);
      setChildName(child.name ?? "");
      setChildLanguage(child.language ?? "en");

      if (!story) { setLoading(false); return; }
      setStoryId(story.id);

      const slots = await getStorySlots(child.id, story.id, child.language);
      if (cancelled) return;
      const currentSlot = slots.find(s => s.slot_key === slotKey);
      if (!currentSlot) { setLoading(false); return; }

      // Sequential access guard — mirrors the UI lock shown on the story map.
      // A slot is accessible if it's already done, it's the first slot,
      // or the slot immediately before it is completed.
      const sortedSlots = [...slots].sort((a, b) => (a.slot_order ?? 0) - (b.slot_order ?? 0));
      const slotIndex = sortedSlots.findIndex(s => s.slot_key === slotKey);
      const prevDone = slotIndex === 0 || sortedSlots[slotIndex - 1].completed;
      if (!currentSlot.completed && !prevDone) {
        router.replace(`/stories/${slug}`);
        return;
      }

      setSlot(currentSlot);
      setAllSlots(sortedSlots);
      setCompleted(currentSlot.completed);

      // lscached — survives page reload; mission content only changes when admin publishes
      const missionData = await lscached(`mission:${currentSlot.mission_id}`, TTL_LONG, async () => {
        const { data } = await supabase
          .from("missions")
          .select("*, mission_versions(*)")
          .eq("id", currentSlot.mission_id)
          .maybeSingle();
        return data ?? null;
      });
      if (cancelled) return;

      if (missionData) {
        // Resolve language-specific version
        type VersionRow = { language: string; published: boolean; title?: string | null; subtitle?: string | null; tip_text?: string | null; content_json?: Record<string, unknown> | null; media_url?: string | null };
        const versions = (missionData.mission_versions ?? []) as VersionRow[];
        const langVersion = versions.find(v => v.language === child.language && v.published) ??
                           versions.find(v => v.language === "en" && v.published);

        const childN = child.name;
        const resolved: Mission = {
          id: missionData.id,
          story_id: missionData.story_id,
          day_number: missionData.sequence ?? 1,
          type: missionData.type,
          title: personalize(langVersion?.title ?? currentSlot.title ?? "", childN),
          duration_minutes: missionData.duration_minutes ?? 10,
          media_url: langVersion?.media_url ?? null,
          page_start: null,
          page_end: null,
          stars: missionData.stars ?? 10,
          subtitle: personalize(langVersion?.subtitle ?? currentSlot.subtitle ?? "", childN),
          tip_text: personalize(langVersion?.tip_text, childN),
          content: personalizeJson(langVersion?.content_json, childN),
        };
        setMission(resolved);
      }

      // Show header immediately after mission meta is resolved
      setLoading(false);

      // Load slot-specific page data in background
      if (slotKey === "flipflop_audio" || slotKey === "coloring") {
        setPagesLoading(true);
        try {
          if (slotKey === "flipflop_audio") {
            const pages = await getStoryPages(story.id, child.language);
            if (!cancelled) setStoryPages(pages.map(p => ({ ...p, text: personalize(p.text, child.name) })));
          } else {
            const pages = await getColoringPages(story.id);
            if (!cancelled) setColoringPages(pages);
          }
        } finally {
          if (!cancelled) setPagesLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [slug, slotKey, language]);

  const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'true';

  const isDestinationVideo = slotKey === "destination_video";
  const isChallengeSlot = slotKey === "challenge_1" || slotKey === "challenge_2" || slotKey === "challenge_3";
  const effectiveType = isDestinationVideo ? "destination" : mission?.type ?? "";

  const missionStyle = MISSION_STYLES[effectiveType] ?? {
    headerBg: "bg-gradient-to-r from-[rgba(6,16,31,0.08)] via-[rgba(13,30,58,0.06)] to-[rgba(6,16,31,0.08)]",
    headerBorder: "border-[rgba(201,168,76,0.35)]",
    badgeBg: "bg-[rgba(201,168,76,0.12)]", badgeText: "text-[#A96113]", badgeBorder: "border-[rgba(201,168,76,0.4)]",
    emoji: "✈️", label: "Flight Stop", friendlyLabel: "Ready for takeoff!",
    resultBg: "bg-gradient-to-br from-white via-[rgba(201,168,76,0.06)] to-[rgba(6,16,31,0.04)]",
  };

  const flightNumber = `NMP1${String(slot?.slot_order ?? 1).padStart(2, "0")}`;

  const handleComplete = useCallback(async () => {
    if (!childId || !slot?.mission_id || completed || saving) return;
    if (isPreview) {
      setCompleted(true);
      setOutcome({ queued: false, result: { stars_earned: 10, new_badges: [], new_certificate: null, story_complete: false, next_story_unlocked: false } });
      return;
    }
    setSaving(true);
    setSaveError(false);
    let res: CompleteSlotOutcome | null;
    try {
      res = await completeStorySlot(childId, slot.mission_id);
    } catch {
      setSaving(false);
      setSaveError(true);
      return;
    }
    if (!res) {
      setSaving(false);
      setSaveError(true);
      return;
    }
    setOutcome(res);
    setCompleted(true);
    setSaving(false);
    if (!res.queued && res.result.story_complete) {
      playCelebration();
      if (parentId) {
        void createNotification(parentId, {
          title: "📖 Story Complete!",
          body: `${childName} finished the story — amazing work! 🎉`,
          type: "story",
          url: `/stories/${slug}`,
        });
      }
    } else {
      playStar();
    }
  }, [childId, slot, completed, saving, isPreview, parentId, childName, slug]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 pb-24 space-y-4">
          <Bone className="h-10 w-56" />
          <Bone className="h-64 leaf-lg" />
          <div className="grid grid-cols-2 gap-3">
            <Bone className="h-16 leaf-lg" />
            <Bone className="h-16 leaf-lg" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PreviewBanner />
      <PageSurface className={isPreview ? "pt-10" : ""}>
        <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full relative overflow-hidden" style={{ isolation: 'isolate' }}>

          {/* ── Airways atmosphere ─────────────────────────────────── */}
          {/* Navy gradient behind all content; z:-1 stays in isolation stacking context */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: -1,
              background: 'linear-gradient(180deg, rgba(6,16,31,0.08) 0%, rgba(6,16,31,0.04) 45%, transparent 75%)',
            }}
          />

          {/* In-flight ambient clouds — decorative, reduced-motion guarded */}
          {!m.reduced && (
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
              <motion.span
                style={{ position: 'absolute', top: '3%', left: '8%', fontSize: 38, opacity: 0.07 }}
                animate={{ x: [0, 20, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
              >☁️</motion.span>
              <motion.span
                style={{ position: 'absolute', top: '18%', right: '10%', fontSize: 26, opacity: 0.05 }}
                animate={{ x: [0, -14, 0] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
              >☁️</motion.span>
              <motion.span
                style={{ position: 'absolute', top: '36%', left: '52%', fontSize: 20, opacity: 0.04 }}
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 13 }}
              >⛅</motion.span>
            </div>
          )}

          {/* Airways header */}
          <div className={`mb-4 border ${missionStyle.headerBorder} ${missionStyle.headerBg} shadow-card-2xl overflow-hidden`} style={{ borderRadius: 'var(--leaf-r-lg)' }}>

            {/* Top bar: back button + airways label */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-[var(--ds-border-primary)]/20">
              <button onClick={() => router.push(`/stories/${slug}`)}
                aria-label="Back to my flight"
                className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-full font-nunito font-bold text-xs whitespace-nowrap transition"
                style={{ background: "rgba(6,16,31,0.25)", border: "1px solid rgba(201,168,76,0.30)", color: "rgba(240,232,212,0.75)" }}>
                <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">My Flight</span>
              </button>
              <p aria-hidden="true" className="font-nunito font-black text-3xs uppercase tracking-widest flex items-center gap-1" style={{ color: "rgba(201,168,76,0.75)" }}>
                <span>✈️</span>
                <span>NIMIPIKO AIRWAYS</span>
              </p>
            </div>

            {/* Mission identity body */}
            <div className="px-4 py-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-baloo font-black text-2xl sm:text-3xl leading-none mb-2" style={{ color: 'var(--airways-gold-text, #E8BC56)' }}>
                  {missionStyle.emoji} {missionStyle.friendlyLabel}
                </p>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`rounded-full border ${missionStyle.badgeBorder} ${missionStyle.badgeBg} px-2.5 py-1 text-3xs font-black uppercase tracking-[0.24em] ${missionStyle.badgeText}`}>
                    {missionStyle.label}
                  </span>
                  {completed && (
                    <span className="rounded-full px-2.5 py-1 text-3xs font-black uppercase tracking-[0.24em]" style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.40)", color: "#C9A84C" }}>
                      Completed ✓
                    </span>
                  )}
                </div>
                <h1 className="font-baloo font-black text-lg sm:text-xl text-ds-text leading-tight">
                  {slot?.title || t(SLOT_T_KEYS[slotKey] ?? '') || slotKey}
                </h1>
                <p className="font-nunito text-[var(--ds-text-tertiary)] text-xs mt-0.5">
                  {flightNumber} · Stop {slot?.slot_order ?? "?"} of {allSlots.length || 6}
                  {slot?.subtitle ? ` · ${slot.subtitle}` : ""}
                </p>
              </div>

              {/* Nimi companion — flight guide indicator below avatar */}
              <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                <Image
                  src={assets.nimiCircle}
                  alt="Nimi"
                  width={52}
                  height={52}
                  className="w-[52px] h-[52px] rounded-full border-2 shadow-md object-cover"
                  style={{ borderColor: '#C9A84C' }}
                />
                {completed ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--ds-brand-primary)]" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>✈️</span>
                )}
              </div>
            </div>
          </div>

          {/* Mission Progress Strip — plain numbered dots for the current book's real steps
              (allSlots/s.completed/slotKey), matching the reference's simple dot row instead
              of the airplane-on-a-track design. */}
          {allSlots.length > 0 && (
            <div className="mb-4 flex items-center justify-center gap-2 px-1">
              {allSlots.map((s, i) => {
                const isCurrent = s.slot_key === slotKey;
                const isDone = s.completed || (isCurrent && completed);
                return (
                  <motion.span
                    key={s.slot_key}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22, delay: (s.slot_order ?? 0) * 0.06 }}
                    className="flex h-7 w-7 items-center justify-center rounded-full font-baloo text-xs font-black"
                    style={
                      isDone
                        ? { background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#06101F" }
                        : isCurrent
                          ? { background: "rgba(245,200,66,.18)", border: "2px solid #F5C842", color: "#F5C842" }
                          : { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", color: "rgba(255,255,255,.45)" }
                    }
                  >
                    {isDone ? "✓" : i + 1}
                  </motion.span>
                );
              })}
            </div>
          )}

          {/* Pre-activity Nimi intro — shown before completion; suppressed for challenge slots (which show the redirect card instead) */}
          {mission && !completed && !isChallengeSlot && (
            <div
              className="mb-3 border px-4 py-3"
              style={{
                borderRadius: 'var(--leaf-r)',
                borderColor: 'rgba(201,168,76,0.4)',
                background: 'rgba(6,16,31,0.05)',
              }}
            >
              <p
                className="font-nunito font-black text-3xs uppercase tracking-widest mb-1"
                style={{ color: 'rgba(201,168,76,0.75)' }}
                aria-hidden="true"
              >
                <span>✈️ </span>In-Flight Tip
              </p>
              <p className="font-baloo font-black text-sm text-[var(--ds-text-primary)] leading-snug">
                {INTRO_MESSAGES[effectiveType] ?? INTRO_FALLBACK}
              </p>
            </div>
          )}

          {/* Challenge slots redirect to story page — family challenge CTA lives there */}
          {isChallengeSlot && (
            <div
              className="mb-3 border px-5 py-4 text-center"
              style={{
                borderRadius: 'var(--leaf-r)',
                borderColor: 'rgba(201,168,76,0.4)',
                background: 'rgba(6,16,31,0.05)',
              }}
            >
              <p className="font-baloo font-black text-lg text-[var(--ds-text-primary)] mb-1">🏆 Family Challenge</p>
              <p className="font-nunito text-sm text-[var(--ds-text-secondary)] mb-3">Family challenges are played together from your flight page.</p>
              <a
                href={`/stories/${slug}`}
                className="inline-flex items-center gap-2 font-baloo font-black text-sm rounded-full px-5 py-2.5 min-h-[44px]"
                style={{ background: '#C9A84C', color: '#06101F' }}
              >
                ✈️ Return to My Flight
              </a>
            </div>
          )}

          {/* Renderer */}
          {mission && !isChallengeSlot && (
            <div className="bg-[var(--ds-surface-card)] border border-ds-border shadow-card-2xl overflow-hidden p-4 sm:p-5" style={{ borderRadius: 'var(--leaf-r)' }}>
              {mission.type === "story" && (
                <StoryContent mission={mission} storyPages={storyPages} onComplete={handleComplete} completed={completed} saving={saving} pagesLoading={pagesLoading} storySlug={slug} />
              )}
              {mission.type === "read" && (
                <ReadContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} storySlug={slug} />
              )}
              {mission.type === "color" && (
                <ColoringContent mission={mission} coloringPages={coloringPages} onComplete={handleComplete} completed={completed} saving={saving} pagesLoading={pagesLoading} storySlug={slug} />
              )}
              {mission.type === "move" && (
                <MoveGrooveContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} storySlug={slug} />
              )}
              {mission.type === "sing" && (
                <SingAlongContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} storySlug={slug} />
              )}
              {(mission.type === "watch" || isDestinationVideo) && (
                <WatchContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} storySlug={slug} />
              )}
            </div>
          )}

          {/* Save error — shown when completeStorySlot returns null; completed stays false so the activity button retries */}
          {saveError && !completed && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-3 bg-red-50 border border-red-200 px-4 py-3 shadow-sm"
              style={{ borderRadius: 'var(--leaf-r)' }}>
              <span className="text-xl">😬</span>
              <div className="flex-1 min-w-0">
                <p className="font-baloo font-black text-red-700 text-sm leading-tight">Oops, something went wrong!</p>
                <p className="font-nunito text-red-500 text-xs">Your internet might be sleepy. Tap the button again to try!</p>
              </div>
            </motion.div>
          )}

          {/* Post-completion delight layer */}
          {completed && mission && (() => {
            const questions = Array.isArray(mission.content?.questions) ? (mission.content.questions as QuestionData[]) : [];
            const vocabulary = Array.isArray(mission.content?.vocabulary) ? (mission.content.vocabulary as VocabWord[]) : [];
            return (
              <div className="space-y-4 mt-4">
                {/* 1. Nimi personal reaction */}
                <NimiReaction missionType={effectiveType} />

                {/* 2. Comprehension questions — cycle through all */}
                {questions.length > 0 && questionIdx < questions.length && (
                  <ComprehensionQuestion
                    key={questionIdx}
                    question={questions[questionIdx] as QuestionData}
                    current={questionIdx + 1}
                    total={questions.length}
                    onAnswered={() => setQuestionIdx(i => i + 1)}
                  />
                )}

                {/* 3. Vocabulary words — cycle through all after questions done */}
                {vocabulary.length > 0
                  && wordIdx < vocabulary.length
                  && (questionIdx >= questions.length || questions.length === 0) && (
                  <WordLearnedCard
                    key={wordIdx}
                    word={vocabulary[wordIdx] as VocabWord}
                    current={wordIdx + 1}
                    total={vocabulary.length}
                    onNext={() => setWordIdx(i => i + 1)}
                  />
                )}
              </div>
            );
          })()}

          {/* Completion result */}
          {outcome && (() => {
            // Derive res via the discriminated union so TypeScript narrows correctly:
            // outcome.queued branches outcome to its two union members, giving
            // outcome.result the type CompleteSlotResult (not undefined) in the false branch.
            const res = outcome.queued ? null : outcome.result;
            return (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={SPRING.modal}
                aria-live="polite"
                className={`mt-5 relative overflow-hidden border ${missionStyle.badgeBorder} ${missionStyle.resultBg} p-6 text-center shadow-[0_20px_42px_rgba(15,23,42,0.12)]`}
                style={{ borderRadius: 'var(--leaf-r)' }}>
                <RewardBurst active config={CONFETTI_BURST} className="absolute inset-0" />

                <div className="relative z-10">
                  <motion.p
                    initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
                    className="font-baloo font-black text-2xl mb-2"
                    style={{ color: "var(--airways-gold-text, #E8BC56)" }}>
                    ✈️ MISSION COMPLETE!
                  </motion.p>
                  <motion.img src={assets.starMascot} alt="" className="w-14 h-14 mx-auto mb-2"
                    initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...SPRING.gentle, delay: 0.2 }} />
                  <AnimatedCheckmark className="mx-auto mb-2" />

                  {outcome.queued ? (
                    <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-[var(--ds-surface-card)]/90 px-4 py-2 mb-3 shadow-sm">
                      <span className="font-nunito text-blue-700 text-sml font-bold">{t("slotSavedOffline")}</span>
                    </div>
                  ) : (
                    <>
                      <div aria-hidden="true" className="flex items-center justify-center gap-3 mb-2">
                        {[0, 1, 2].map(i => (
                          <motion.span key={i}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.3 + i * 0.18 }}
                            className="text-4xl select-none leading-none">
                            ⭐
                          </motion.span>
                        ))}
                      </div>
                      <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-[var(--ds-surface-card)]/90 px-4 py-2 mb-3 shadow-sm">
                        <span className="font-baloo font-black text-amber-500 text-3.5xl">+{outcome.result.stars_earned}</span>
                        <span className="font-nunito text-[var(--ds-text-secondary)] text-sm font-bold">{t("storyStarsLabel")}</span>
                      </div>
                    </>
                  )}

                  {res?.story_complete && (
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                      className="mb-3">
                      <p className="font-baloo font-black text-1.5xl" style={{ color: "var(--airways-gold-text, #E8BC56)" }}>{t("storyCompleteResult")}</p>
                      <p className="font-nunito text-sm" style={{ color: "var(--airways-text-muted, rgba(240,232,212,0.55))" }}>{t("storyEarnedCert")}</p>
                    </motion.div>
                  )}

                  {res?.next_story_unlocked && (
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
                      className="mb-3 leaf px-4 py-2 inline-block"
                      style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.30)" }}>
                      <p className="font-nunito text-sm font-bold" style={{ color: "var(--airways-gold-text, #E8BC56)" }}>{t("storyNextUnlocked")}</p>
                    </motion.div>
                  )}

                  {(!res?.story_complete) && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                      className="mb-3">
                      <p className="font-nunito font-black text-xs mb-0.5" style={{ color: "rgba(201,168,76,0.70)" }}>
                        🛫 Next stop reached!
                      </p>
                      <p className="font-nunito text-sm" style={{ color: "var(--airways-text-muted, rgba(240,232,212,0.55))" }}>{t("storyGreatJob")}</p>
                    </motion.div>
                  )}

                  <motion.button initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => router.push(`/stories/${slug}`)}
                    className="font-baloo font-black text-base rounded-full px-8 py-3.5 min-h-[48px] shadow-lg transition"
                    style={{ background: "linear-gradient(135deg, #F5C842, #C9A84C)", color: "#07111F", boxShadow: "0 8px 24px rgba(201,168,76,0.35)" }}>
                    {res?.story_complete ? t("storyViewCert") : "✈️ Return to My Flight"}
                  </motion.button>

                  {/* Share row */}
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="mt-4 space-y-2 w-full text-left">
                    {res?.story_complete && childId && childName && mission?.title && (
                      <ShareAchievementFlow
                        childId={childId}
                        childName={childName}
                        childLanguage={childLanguage}
                        storySlug={slug}
                        shareType="certificate"
                        title={mission.title}
                      />
                    )}
                    <button
                      onClick={async () => {
                        const url = window.location.href;
                        const text = `${childName || "We"} just completed "${mission?.title}" on NIMIPIKO! 🎉`;
                        if (navigator.share) {
                          try { await navigator.share({ title: "NIMIPIKO", text, url }); } catch { /* cancelled */ }
                        } else {
                          await navigator.clipboard.writeText(`${text}\n${url}`).catch(() => {});
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-baloo font-black text-sm transition"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(201,168,76,0.25)", color: "var(--airways-text-muted, rgba(240,232,212,0.55))" }}
                    >
                      <Share2 aria-hidden="true" className="w-4 h-4" />
                      {t("shareFriendsBtn")}
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            );
          })()}
        </main>
      </PageSurface>
    </AppShell>
  );
}
