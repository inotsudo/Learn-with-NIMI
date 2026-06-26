"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Star } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import MagicBackground from "@/components/magic/MagicBackground";
import MagicLoader from "@/components/magic/MagicLoader";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChildren, getStoryPages, getColoringPages } from "@/lib/queries";
import type { Mission, StoryPage, ColoringPage } from "@/lib/queries";
import { getStoryBySlug, getStorySlots } from "@/lib/storyRepository";
import { completeStorySlot } from "@/lib/storyProgressRepository";
import type { StorySlot, CompleteSlotResult } from "@/lib/story-types";
import supabase from "@/lib/supabaseClient";

import { personalize, personalizeJson } from "@/lib/personalize";
import PreviewBanner from "@/components/admin/story-readiness/PreviewBanner";
import StoryContent from "@/components/missions/StoryContent";
import SingAlongContent from "@/components/missions/SingAlongContent";
import MoveGrooveContent from "@/components/missions/MoveGrooveContent";
import WatchContent from "@/components/missions/WatchContent";
import ReadContent from "@/components/missions/ReadContent";
import ColoringContent from "@/components/missions/ColoringContent";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const SLOT_T_KEYS: Record<string, string> = {
  flipflop_audio: "flipflopAudioLabel",
  story_pdf: "storyPdfLabel",
  coloring: "coloringLabel",
  move_explore: "moveExploreLabel",
  sing_along: "singAlongLabel",
  bonus_video: "bonusVideoLabel",
};

export default function StoryMissionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const slotKey = params.slot as string;
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [childId, setChildId] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [slot, setSlot] = useState<StorySlot | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [coloringPages, setColoringPages] = useState<ColoringPage[]>([]);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CompleteSlotResult | null>(null);

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }
      setChildId(child.id);

      const story = await getStoryBySlug(slug);
      if (!story) { setLoading(false); return; }
      setStoryId(story.id);

      const slots = await getStorySlots(child.id, story.id, child.language);
      const currentSlot = slots.find(s => s.slot_key === slotKey);
      if (!currentSlot) { setLoading(false); return; }
      setSlot(currentSlot);
      setCompleted(currentSlot.completed);

      // Fetch mission data
      const { data: missionData } = await supabase
        .from("missions")
        .select("*, mission_versions(*)")
        .eq("id", currentSlot.mission_id)
        .maybeSingle();

      if (missionData) {
        // Resolve language-specific version
        const versions = (missionData.mission_versions ?? []) as any[];
        const langVersion = versions.find((v: any) => v.language === child.language && v.published) ??
                           versions.find((v: any) => v.language === "en" && v.published);

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

      // Load slot-specific data
      if (slotKey === "flipflop_audio") {
        const pages = await getStoryPages(story.id, child.language);
        setStoryPages(pages.map(p => ({ ...p, text: personalize(p.text, child.name) })));
      }
      if (slotKey === "coloring") {
        setColoringPages(await getColoringPages(story.id));
      }

      setLoading(false);
    })();
  }, [slug, slotKey, language]);

  const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'true';

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
  }, [childId, slot, completed, saving, isPreview]);

  if (loading) {
    return (
      <AppShell>
        <MagicLoader variant="missions" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PreviewBanner />
      <div className={`min-h-screen relative overflow-hidden theme-bg flex flex-col ${isPreview ? 'pt-10' : ''}`}>
        <MagicBackground variant="forest" />
        <main className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => router.push(`/stories/${slug}`)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-black text-lg text-white">
                {slot?.title || t(SLOT_T_KEYS[slotKey] ?? '') || slotKey}
              </h1>
              <p className="theme-text text-xs">
                Mission {slot?.slot_order}/6 · {slot?.subtitle}
              </p>
            </div>
            {completed && <CheckCircle2 className="w-7 h-7 text-green-400 shrink-0" />}
          </div>

          {/* Renderer */}
          {mission && (
            <div className="theme-card border-2 theme-border rounded-[20px] shadow-xl overflow-hidden p-4 sm:p-5">
              {mission.type === "story" && (
                <StoryContent mission={mission} storyPages={storyPages} onComplete={handleComplete} completed={completed} saving={saving} />
              )}
              {mission.type === "read" && (
                <ReadContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />
              )}
              {mission.type === "color" && (
                <ColoringContent mission={mission} coloringPages={coloringPages} onComplete={handleComplete} completed={completed} saving={saving} />
              )}
              {mission.type === "move" && (
                <MoveGrooveContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />
              )}
              {mission.type === "sing" && (
                <SingAlongContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />
              )}
              {mission.type === "watch" && (
                <WatchContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />
              )}
            </div>
          )}

          {/* Completion result */}
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="mt-5 relative theme-card border-2 border-green-400/25 rounded-[24px] p-6 text-center overflow-hidden">
              {/* Confetti */}
              {Array.from({ length: 15 }).map((_, i) => (
                <motion.div key={i} className="absolute w-2 h-2 rounded-full"
                  style={{ left: `${(i * 37) % 90 + 5}%`, backgroundColor: ["#FFD700","#FF6B6B","#4ECDC4","#45B7D1","#DDA0DD","#FF9800"][i % 6] }}
                  initial={{ top: "-5%", opacity: 1 }}
                  animate={{ top: "110%", opacity: [1, 1, 0], rotate: 360 }}
                  transition={{ duration: 2.5, delay: i * 0.15, ease: "easeIn" }} />
              ))}

              <div className="relative z-10">
                <motion.img src="/assets/star-mascot.svg" alt="" className="w-16 h-16 mx-auto mb-3"
                  initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.2 }} />

                <div className="flex items-center justify-center gap-2 mb-3">
                  <img src="/assets/star-mascot.svg" alt="" className="w-6 h-6" />
                  <span className="font-baloo font-black text-yellow-300 text-[28px]">+{result.stars_earned}</span>
                  <span className="font-nunito text-yellow-200/60 text-[14px] font-bold">Stars</span>
                </div>

                {result.story_complete && (
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                    className="mb-3">
                    <p className="font-baloo font-black text-green-400 text-[22px]">🏆 Story Complete!</p>
                    <p className="font-nunito theme-text text-[14px]">You earned your Story Certificate!</p>
                  </motion.div>
                )}

                {result.next_story_unlocked && (
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
                    className="mb-3 theme-accent/15 border theme-border rounded-xl px-4 py-2 inline-block">
                    <p className="font-nunito theme-text text-[14px] font-bold">🔓 Next story unlocked!</p>
                  </motion.div>
                )}

                {!result.story_complete && (
                  <p className="font-nunito theme-text text-[14px] mb-3">Great job! Keep going!</p>
                )}

                <motion.button initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}
                  onClick={() => router.push(`/stories/${slug}`)}
                  className="font-baloo font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[16px] rounded-full px-7 py-3 shadow-lg shadow-green-500/20 transition hover:shadow-green-500/30">
                  {result.story_complete ? "View Certificate →" : "Continue Adventure →"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
