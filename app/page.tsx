"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadVoices } from "@/lib/speak";
import supabase from "@/lib/supabaseClient";
import { getChildren, ensureParentRow, getChildAchievements } from "@/lib/queries";
import type { Child } from "@/lib/queries";
import { getStoryLibrary, getStorySlots } from "@/lib/storyRepository";
import { getStoryIntroProgress } from "@/lib/storyProgressRepository";
import type { StoryLibraryItem, StorySlot, StoryCompletion } from "@/lib/story-types";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

import StoryHero            from "@/components/home/StoryHero";
import StoryProgressPanel   from "@/components/home/StoryProgressPanel";
import WeeklyChallengeCard  from "@/components/home/WeeklyChallengeCard";
import MyBadgesCard         from "@/components/home/MyBadgesCard";
import NextStoryCard        from "@/components/home/NextStoryCard";
import NimiEncouragement    from "@/components/home/NimiEncouragement";
import CertificateCard      from "@/components/home/CertificateCard";
import MagicBackground      from "@/components/magic/MagicBackground";
import MagicLoader          from "@/components/magic/MagicLoader";
import ChildSelector        from "@/components/home/ChildSelector";
import WhoIsPlaying         from "@/components/home/WhoIsPlaying";
import CreateChildModal      from "@/components/home/CreateChildModal";
import CreateExplorerProfile from "@/components/home/CreateExplorerProfile";
import AppShell             from "@/components/layout/AppShell";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function HomePage() {
  const router = useRouter();
  const { setLanguage } = useLanguage();
  const activeChildRef = useRef<Child | null>(null);
  const [mounted, setMounted] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [noChildrenYet, setNoChildrenYet] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [stories, setStories] = useState<StoryLibraryItem[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [currentSlots, setCurrentSlots] = useState<StorySlot[]>([]);
  const [currentCompletion, setCurrentCompletion] = useState<StoryCompletion | null>(null);
  const [introViewed, setIntroViewed] = useState(0);

  useEffect(() => { setMounted(true); loadVoices(); void loadChildren(); }, []);

  const loadChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/loginpage"); return; }
    await ensureParentRow();
    const list = await getChildren();
    setChildren(list);
    if (list.length === 0) { setNoChildrenYet(true); return; }
    const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    const saved = list.find(c => c.id === savedId);
    if (saved) await selectChild(saved, list);
    else { setChildren(list); setShowPicker(true); }
  };

  const selectChild = async (child: Child, childList?: Child[]) => {
    activeChildRef.current = child;
    setActiveChild(child);
    setShowPicker(false);
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_CHILD_KEY, child.id);
    setLanguage(child.language);
    await loadProgress(child.id, child.language);
    if (childList) setChildren(childList);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<{ language: Language }>).detail?.language;
      const current = activeChildRef.current;
      if (!lang || !current) return;
      setActiveChild({ ...current, language: lang });
      void loadProgress(current.id, lang);
    };
    window.addEventListener("app:languageChange", handler);
    return () => window.removeEventListener("app:languageChange", handler);
  }, []);

  const loadProgress = async (childId: string, language: Language) => {
    const [lib] = await Promise.all([
      getStoryLibrary(childId, language),
    ]);
    setStories(lib);

    const current = lib.find(s => s.unlocked && !s.complete) ?? lib[lib.length - 1];
    const curId = current?.sid ?? null;
    setCurrentStoryId(curId);

    if (curId) {
      const [slots, intro] = await Promise.all([
        getStorySlots(childId, curId, language),
        getStoryIntroProgress(childId, curId, language),
      ]);
      setCurrentSlots(slots);
      setIntroViewed(intro.filter(p => p.consumed).length);
      const doneSlots = slots.filter(s => s.completed).length;
      setCurrentCompletion({ total_slots: slots.length, completed_slots: doneSlots, is_complete: doneSlots >= slots.length && slots.length > 0 });
    }
  };

  const handleChildCreated = async (child: Child) => {
    setShowCreateModal(false);
    setNoChildrenYet(false);
    await selectChild(child, [...children, child]);
  };

  if (!mounted) return null;
  if (noChildrenYet) return <AppShell><CreateExplorerProfile onCreated={handleChildCreated} /></AppShell>;
  if (showPicker) return (
    <>
      <WhoIsPlaying children={children} onSelect={child => selectChild(child)} onAddChild={() => { setShowPicker(false); setShowCreateModal(true); }} />
      {showCreateModal && <CreateChildModal onCreated={handleChildCreated} onClose={() => { setShowCreateModal(false); setShowPicker(true); }} />}
    </>
  );

  const curStory = stories.find(s => s.sid === currentStoryId);

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden theme-bg flex flex-col">
        <MagicBackground variant="meadow" />
        <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">

          {!activeChild || !curStory ? (
            <MagicLoader variant="home" fullPage={false} />
          ) : (
            <>
              {/* ═══ GREETING ═══ */}
              <div className="mb-5">
                <h1 className="font-baloo font-black text-[36px] sm:text-[42px] lg:text-[48px] text-white leading-[1.1]">
                  {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}, <span className="text-yellow-400">{activeChild.name}</span>! 👋
                </h1>
                <p className="font-nunito theme-text text-[14px] sm:text-[16px] mt-1">Ready for a new adventure with Nimi and Piko?</p>
              </div>

              {/* ═══ 1. CURRENT STORY HERO (left) + STORY PROGRESS (right) ═══ */}
              <div className="lg:grid lg:grid-cols-[1fr_350px] lg:gap-4 lg:items-stretch">
                <StoryHero
                  childName={activeChild.name}
                  childAvatar={activeChild.avatar_url}
                  story={curStory}
                  slots={currentSlots}
                  introViewed={introViewed}
                />
                <div className="mt-5 lg:mt-0 flex flex-col">
                  <StoryProgressPanel storySlug={curStory.slug} slots={currentSlots} />
                </div>
              </div>

              {/* ═══ 2. CHALLENGE + BADGES + NEXT STORY ═══ */}
              <div className="mt-4 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[1fr_240px_240px] lg:gap-4">
                <WeeklyChallengeCard childName={activeChild.name} />
                <div className="grid grid-cols-2 gap-3 lg:contents">
                  <MyBadgesCard slots={currentSlots} />
                  <NextStoryCard story={stories.find(s => s.sort_order === curStory.sort_order + 1)} />
                </div>
              </div>

              {/* ═══ 3. ENCOURAGEMENT BANNER ═══ */}
              <div className="mt-5">
                <NimiEncouragement childName={activeChild.name} />
              </div>
            </>
          )}

        </main>
        {showCreateModal && <CreateChildModal onCreated={handleChildCreated} onClose={() => setShowCreateModal(false)} />}
      </div>
    </AppShell>
  );
}
