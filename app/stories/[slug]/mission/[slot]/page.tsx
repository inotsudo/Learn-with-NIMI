"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Star } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChildren, getStoryPages, getColoringPages, createNotification } from "@/lib/queries";
import { lscached, TTL_LONG } from "@/lib/queryCache";
import type { Mission, StoryPage, ColoringPage } from "@/lib/queries";
import { getStoryBySlug, getStorySlots } from "@/lib/storyRepository";
import { completeStorySlot } from "@/lib/storyProgressRepository";
import type { StorySlot, CompleteSlotResult } from "@/lib/story-types";
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
import ShareAchievementFlow from "@/components/community/ShareAchievementFlow";
import { Share2 } from "lucide-react";
import NimiReaction from "@/components/missions/NimiReaction";
import ComprehensionQuestion from "@/components/missions/ComprehensionQuestion";
import type { QuestionData } from "@/components/missions/ComprehensionQuestion";
import WordLearnedCard from "@/components/missions/WordLearnedCard";
import type { VocabWord } from "@/components/missions/WordLearnedCard";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const SLOT_T_KEYS: Record<string, string> = {
  flipflop_audio: "flipflopAudioLabel",
  story_pdf: "storyPdfLabel",
  coloring: "coloringLabel",
  move_explore: "moveExploreLabel",
  sing_along: "singAlongLabel",
  bonus_video: "bonusVideoLabel",
};

const SLOT_EMOJI: Record<string, string> = {
  flipflop_audio: "📚",
  story_pdf:      "📖",
  coloring:       "🎨",
  move_explore:   "🤸",
  sing_along:     "🎵",
  bonus_video:    "🎬",
};

const MISSION_STYLES: Record<string, {
  headerBg: string;
  headerBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  emoji: string;
  label: string;
  resultBg: string;
}> = {
  story: {
    headerBg: "bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-amber-50/80",
    headerBorder: "border-amber-200/60",
    badgeBg: "bg-amber-50", badgeText: "text-amber-700", badgeBorder: "border-amber-200",
    emoji: "📚", label: "Story Time",
    resultBg: "bg-gradient-to-br from-white via-amber-50/70 to-yellow-50/60",
  },
  read: {
    headerBg: "bg-gradient-to-r from-amber-50/80 via-[#fdfaf4]/60 to-orange-50/60",
    headerBorder: "border-amber-200/60",
    badgeBg: "bg-amber-50", badgeText: "text-amber-700", badgeBorder: "border-amber-200",
    emoji: "📖", label: "Story Book",
    resultBg: "bg-gradient-to-br from-white via-amber-50/60 to-orange-50/40",
  },
  color: {
    headerBg: "bg-gradient-to-r from-orange-50/80 via-pink-50/40 to-purple-50/50",
    headerBorder: "border-orange-200/60",
    badgeBg: "bg-orange-50", badgeText: "text-orange-700", badgeBorder: "border-orange-200",
    emoji: "🎨", label: "Art Studio",
    resultBg: "bg-gradient-to-br from-white via-orange-50/70 to-pink-50/60",
  },
  move: {
    headerBg: "bg-gradient-to-r from-pink-50/80 via-rose-50/40 to-orange-50/50",
    headerBorder: "border-pink-200/60",
    badgeBg: "bg-pink-50", badgeText: "text-pink-700", badgeBorder: "border-pink-200",
    emoji: "🤸", label: "Move & Groove",
    resultBg: "bg-gradient-to-br from-white via-pink-50/70 to-orange-50/60",
  },
  sing: {
    headerBg: "bg-gradient-to-r from-purple-50/80 via-violet-50/40 to-indigo-50/50",
    headerBorder: "border-purple-200/60",
    badgeBg: "bg-purple-50", badgeText: "text-purple-700", badgeBorder: "border-purple-200",
    emoji: "🎵", label: "Sing Along",
    resultBg: "bg-gradient-to-br from-white via-purple-50/70 to-violet-50/60",
  },
  watch: {
    headerBg: "bg-gradient-to-r from-indigo-50/80 via-blue-50/40 to-slate-50/50",
    headerBorder: "border-indigo-200/60",
    badgeBg: "bg-indigo-50", badgeText: "text-indigo-700", badgeBorder: "border-indigo-200",
    emoji: "🎬", label: "Movie Time",
    resultBg: "bg-gradient-to-br from-white via-indigo-50/70 to-blue-50/60",
  },
};

export default function StoryMissionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const slotKey = params.slot as string;
  const { t, language } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const [loading, setLoading] = useState(true);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string>("");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [slot, setSlot] = useState<StorySlot | null>(null);
  const [allSlots, setAllSlots] = useState<StorySlot[]>([]);
  const [mission, setMission] = useState<Mission | null>(null);
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [coloringPages, setColoringPages] = useState<ColoringPage[]>([]);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CompleteSlotResult | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);  // index of the question being shown
  const [wordIdx, setWordIdx] = useState(0);           // index of the vocab word being shown

  useEffect(() => {
    void (async () => {
      // auth + children + story slug are independent — fetch all three in parallel
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const [{ data: { user } }, list, story] = await Promise.all([
        supabase.auth.getUser(),
        getChildren(),
        getStoryBySlug(slug),
      ]);
      setParentId(user?.id ?? null);
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }
      setChildId(child.id);
      setChildName(child.name ?? "");

      if (!story) { setLoading(false); return; }
      setStoryId(story.id);

      const slots = await getStorySlots(child.id, story.id, child.language);
      const currentSlot = slots.find(s => s.slot_key === slotKey);
      if (!currentSlot) { setLoading(false); return; }
      setSlot(currentSlot);
      setAllSlots([...slots].sort((a, b) => (a.slot_order ?? 0) - (b.slot_order ?? 0)));
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
            setStoryPages(pages.map(p => ({ ...p, text: personalize(p.text, child.name) })));
          } else {
            setColoringPages(await getColoringPages(story.id));
          }
        } finally {
          setPagesLoading(false);
        }
      }
    })();
  }, [slug, slotKey, language]);

  const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'true';

  const missionStyle = MISSION_STYLES[mission?.type ?? ""] ?? {
    headerBg: "bg-gradient-to-r from-white via-emerald-50/60 to-white",
    headerBorder: "border-emerald-100",
    badgeBg: "bg-emerald-50", badgeText: "text-emerald-700", badgeBorder: "border-emerald-200",
    emoji: "⭐", label: "Tiny Mission",
    resultBg: "bg-gradient-to-br from-white via-emerald-50/70 to-amber-50/60",
  };

  const handleComplete = useCallback(async () => {
    if (!childId || !slot?.mission_id || completed || saving) return;
    if (isPreview) {
      setCompleted(true);
      setResult({ stars_earned: 10, new_badges: [], new_certificate: null, story_complete: false, next_story_unlocked: false });
      return;
    }
    setSaving(true);
    const res = await completeStorySlot(childId, slot.mission_id);
    setResult(res);
    setCompleted(true);
    setSaving(false);
    if (res?.story_complete) {
      playCelebration();
      // Fire in-app notification for the parent
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
        <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">

          {/* Header */}
          <div className={`mb-5 border ${missionStyle.headerBorder} ${missionStyle.headerBg} p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]`} style={{ borderRadius: 'var(--leaf-r-lg)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push(`/stories/${slug}`)}
                className="w-10 h-10 bg-white border border-ds-border rounded-full flex items-center justify-center text-ds-text transition hover:bg-gray-50 shadow-sm">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full border ${missionStyle.badgeBorder} ${missionStyle.badgeBg} px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${missionStyle.badgeText}`}>
                    {missionStyle.emoji} {missionStyle.label}
                  </span>
                  {completed && (
                    <span className="rounded-full border border-[var(--ds-border-brand)]/30 bg-[var(--ds-brand-subtle)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--ds-brand-primary)]">
                      Completed
                    </span>
                  )}
                </div>
                <h1 className="font-baloo font-black text-[20px] sm:text-[24px] text-ds-text leading-tight mt-1">
                  {slot?.title || t(SLOT_T_KEYS[slotKey] ?? '') || slotKey}
                </h1>
                <p className="text-gray-500 text-[13px] mt-1">
                  Activity {slot?.slot_order} of 6 · {slot?.subtitle}
                </p>
              </div>
              {completed ? (
                <div className="rounded-full bg-emerald-50 p-2.5 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                </div>
              ) : (
                <div className="rounded-full bg-amber-50 p-2.5 border border-amber-200">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
              )}
            </div>
          </div>

          {/* Mission Progress Strip */}
          {allSlots.length > 0 && (
            <div className="mb-4 px-1">
              {/* Track + nodes */}
              <div className="relative flex items-center justify-between">
                {/* Background track */}
                <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 h-[2px] bg-gray-100 rounded-full" />
                {/* Completed-segment overlay — scaleX from left so it covers exactly the same span as the track */}
                {(() => {
                  const currentIdx = allSlots.findIndex(s => s.slot_key === slotKey);
                  const completedUpTo = allSlots.slice(0, currentIdx).filter(s => s.completed).length;
                  const ratio = allSlots.length > 1
                    ? completedUpTo / (allSlots.length - 1)
                    : 0;
                  return (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: ratio }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                      className="absolute inset-x-5 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-[var(--nimi-green)] to-emerald-400 rounded-full origin-left"
                    />
                  );
                })()}

                {allSlots.map((s) => {
                  const isCurrent = s.slot_key === slotKey;
                  const isDone = s.completed || (isCurrent && completed);
                  const emoji = SLOT_EMOJI[s.slot_key] ?? "⭐";
                  return (
                    <div key={s.slot_key} className="relative z-10 flex flex-col items-center gap-1">
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22, delay: (s.slot_order ?? 0) * 0.06 }}
                        className={`flex items-center justify-center rounded-full transition-all ${
                          isDone
                            ? "w-8 h-8 bg-[var(--nimi-green)] shadow-[0_2px_8px_rgba(16,185,129,0.35)] text-white text-[13px] font-black"
                            : isCurrent
                              ? `w-9 h-9 border-2 ${missionStyle.badgeBorder} ${missionStyle.badgeBg} text-[18px] shadow-md`
                              : "w-7 h-7 bg-white border border-gray-200 text-[14px] opacity-40"
                        }`}
                      >
                        {isDone ? "✓" : emoji}
                      </motion.div>
                      {isCurrent && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className={`text-[8px] font-black uppercase tracking-[0.18em] ${missionStyle.badgeText}`}
                        >
                          Now
                        </motion.span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Renderer */}
          {mission && (
            <div className="bg-white border border-ds-border shadow-[0_16px_34px_rgba(15,23,42,0.08)] overflow-hidden p-4 sm:p-5" style={{ borderRadius: 'var(--leaf-r)' }}>
              {mission.type === "story" && (
                <StoryContent mission={mission} storyPages={storyPages} onComplete={handleComplete} completed={completed} saving={saving} pagesLoading={pagesLoading} />
              )}
              {mission.type === "read" && (
                <ReadContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />
              )}
              {mission.type === "color" && (
                <ColoringContent mission={mission} coloringPages={coloringPages} onComplete={handleComplete} completed={completed} saving={saving} pagesLoading={pagesLoading} />
              )}
              {mission.type === "move" && (
                <MoveGrooveContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />
              )}
              {mission.type === "sing" && (
                <SingAlongContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />
              )}
              {mission.type === "watch" && (
                <WatchContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} storySlug={slug} />
              )}
            </div>
          )}

          {/* Post-completion delight layer */}
          {completed && mission && (() => {
            const questions = Array.isArray(mission.content?.questions) ? (mission.content.questions as QuestionData[]) : [];
            const vocabulary = Array.isArray(mission.content?.vocabulary) ? (mission.content.vocabulary as VocabWord[]) : [];
            return (
              <div className="space-y-4 mt-4">
                {/* 1. Nimi personal reaction */}
                <NimiReaction missionType={mission.type} />

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
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={SPRING.modal}
              className={`mt-5 relative overflow-hidden border ${missionStyle.badgeBorder} ${missionStyle.resultBg} p-6 text-center shadow-[0_20px_42px_rgba(15,23,42,0.12)]`}
              style={{ borderRadius: 'var(--leaf-r)' }}>
              <RewardBurst active config={CONFETTI_BURST} className="absolute inset-0" />

              <div className="relative z-10">
                <motion.img src={assets.starMascot} alt="" className="w-16 h-16 mx-auto mb-3"
                  initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...SPRING.gentle, delay: 0.2 }} />
                <AnimatedCheckmark className="mx-auto mb-3" />

                <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-white/90 px-4 py-2 mb-3 shadow-sm">
                  <Image src={assets.starMascot} alt="" width={24} height={24} className="w-6 h-6" />
                  <span className="font-baloo font-black text-amber-500 text-[28px]">+{result.stars_earned}</span>
                  <span className="font-nunito text-gray-600 text-[14px] font-bold">{t("storyStarsLabel")}</span>
                </div>

                {result.story_complete && (
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                    className="mb-3">
                    <p className="font-baloo font-black text-emerald-700 text-[22px]">{t("storyCompleteResult")}</p>
                    <p className="font-nunito text-ds-text text-[14px]">{t("storyEarnedCert")}</p>
                  </motion.div>
                )}

                {result.next_story_unlocked && (
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
                    className="mb-3 bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/30 leaf px-4 py-2 inline-block">
                    <p className="font-nunito text-ds-text text-[14px] font-bold">{t("storyNextUnlocked")}</p>
                  </motion.div>
                )}

                {!result.story_complete && (
                  <p className="font-nunito text-ds-text text-[14px] mb-3">{t("storyGreatJob")}</p>
                )}

                <motion.button initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}
                  onClick={() => router.push(`/stories/${slug}`)}
                  className="font-baloo font-black bg-cta-gradient text-white text-[16px] rounded-full px-7 py-3 shadow-lg shadow-ds-cta transition hover:shadow-ds-hover">
                  {result.story_complete ? t("storyViewCert") : t("storyContinueArrow")}
                </motion.button>

                {/* Share row */}
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="mt-4 space-y-2 w-full text-left">
                  {childId && childName && mission?.title && (
                    <ShareAchievementFlow
                      childId={childId}
                      childName={childName}
                      shareType="sticker"
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
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 px-4 py-3 font-baloo font-black text-[14px] text-gray-600 transition shadow-sm"
                  >
                    <Share2 className="w-4 h-4 text-gray-500" />
                    {t("shareFriendsBtn")}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </main>
      </PageSurface>
    </AppShell>
  );
}
