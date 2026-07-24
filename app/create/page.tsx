"use client";

/**
 * /create — Creative Studio Hub — Phase 7
 *
 * Four tabs: Challenges | Color | Draw | Story
 * Loads the active child, story context, and passes them to each view.
 * Stars earned in any view bubble up and are reflected in the header.
 */

import { useEffect, useState, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import { Bone } from "@/components/ui/Bone";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getChildren } from "@/lib/queries";
import { getStoryLibrary } from "@/lib/storyRepository";
import { getTodayStars } from "@/lib/queries";
import ColoringCoachView    from "@/components/creative/ColoringCoachView";
import DrawingCoachView     from "@/components/creative/DrawingCoachView";
import StoryCreatorView     from "@/components/creative/StoryCreatorView";
import CreativityChallengesView from "@/components/creative/CreativityChallengesView";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

type TabId = "challenges" | "color" | "draw" | "story";

const TABS: { id: TabId; emoji: string; label: string }[] = [
  { id: "challenges", emoji: "🌟", label: "Challenges" },
  { id: "color",      emoji: "🎨", label: "Color"      },
  { id: "draw",       emoji: "✏️", label: "Draw"       },
  { id: "story",      emoji: "📖", label: "Story"      },
];

function CreativeStudioPage() {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const searchParams = useSearchParams();

  const [childId,       setChildId]       = useState<string | null>(null);
  const [childName,     setChildName]     = useState("");
  const [childAge,      setChildAge]      = useState<number | null>(null);
  const [childLanguage, setChildLanguage] = useState<"en" | "fr" | "rw">("en");
  const [storyId,       setStoryId]       = useState<string | null>(null);
  const [storyTitle,    setStoryTitle]    = useState<string | null>(null);
  const [storyEmoji,    setStoryEmoji]    = useState<string | null>(null);
  const [todayStars,    setTodayStars]    = useState(0);
  const [loaded,        setLoaded]        = useState(false);

  const initialTab = (searchParams.get("tab") as TabId) ?? "challenges";
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some(t => t.id === initialTab) ? initialTab : "challenges"
  );

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const list = await getChildren();
    if (list.length === 0) { setLoaded(true); return; }

    const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    const child   = list.find(c => c.id === savedId) ?? list[0];

    setChildId(child.id);
    setChildName(child.name);
    setChildAge(child.age ?? null);
    setChildLanguage(child.language);

    const [stories, stars] = await Promise.all([
      getStoryLibrary(child.id, child.language),
      getTodayStars(child.id, child.language),
    ]);

    setTodayStars(stars);

    const active = stories.find((s: { unlocked: boolean; complete: boolean }) => s.unlocked && !s.complete)
      ?? stories[0];
    if (active) {
      setStoryId(active.sid);
      setStoryTitle(active.title);
      setStoryEmoji(active.theme_emoji ?? null);
    }

    setLoaded(false);  // avoid showing skeleton once data arrives
    setLoaded(true);
  };

  const handleStarsEarned = useCallback((n: number) => {
    setTodayStars(prev => prev + n);
  }, []);

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-4">
          <Bone className="h-32 leaf-lg" />
          <Bone className="h-12 leaf-lg" />
          <Bone className="h-64 leaf-lg" />
        </div>
      </AppShell>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 pb-28 flex-1 w-full content-enter">

          {/* ── HERO ── */}
          <HeroBanner zone="creative" className="mb-4">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />

            {/* Floating emojis */}
            {["🎨","✏️","⭐","📖","🌟","🎉"].map((em, i) => (
              <motion.span key={i}
                className="absolute pointer-events-none select-none text-[14px] sm:text-[16px]"
                style={{
                  top:   ["12%","72%","18%","70%","38%","55%"][i],
                  left:  ["6%","5%",undefined,"88%",undefined,"90%"][i] ?? undefined,
                  right: ["6%","5%","5%",undefined,"6%",undefined][i] ?? undefined,
                }}
                animate={{ opacity:[0.3,1,0.3], y:[0,-6,0] }}
                transition={{ duration:2.4, repeat:Infinity, delay:i*0.4 }}
                aria-hidden>
                {em}
              </motion.span>
            ))}

            <div className="relative z-10 px-5 pt-12 pb-5 sm:px-7 sm:pb-6 flex items-center gap-4">
              <motion.img src={assets.nimiCircle} alt="Nimi"
                animate={{ y:[0,-5,0] }}
                transition={{ duration:2.5, repeat:Infinity }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/40 shadow-lg shrink-0"
                loading="lazy" />
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5">
                  Creative Studio
                </p>
                <h1 className="font-baloo font-black text-white text-[22px] sm:text-[28px] leading-tight drop-shadow-md">
                  Create with Nimi!
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[12px] text-white/80 font-bold">
                    ⭐ {todayStars} stars today
                  </span>
                  {childName && (
                    <span className="text-[11px] text-white/60 font-semibold">
                      · {childName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </HeroBanner>

          {/* ── TABS ── */}
          <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {TABS.map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[13px] font-black transition-all"
                style={{
                  background: activeTab === tab.id ? "var(--nimi-green,#15803D)" : "var(--ds-surface-card,#fff)",
                  color:      activeTab === tab.id ? "#fff" : "var(--ds-text-secondary,#6B7280)",
                  border:     `1px solid ${activeTab === tab.id ? "transparent" : "var(--ds-border-primary,#E5E7EB)"}`,
                  boxShadow:  activeTab === tab.id ? "0 4px 12px rgba(21,128,61,0.3)" : "none",
                }}>
                <span>{tab.emoji}</span> {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB CONTENT ── */}
          {!childId ? (
            <div className="py-16 text-center">
              <p className="text-[14px] font-nunito" style={{ color: "#9CA3AF" }}>
                Add a child to your account to start creating!
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                transition={{ duration:0.2 }}
                className="bg-ds-surface border border-ds-border shadow-ds-card p-5"
                style={{ borderRadius:"var(--leaf-r-lg)" }}>

                {activeTab === "challenges" && (
                  <CreativityChallengesView
                    childId={childId}
                    childName={childName}
                    childAge={childAge}
                    childLanguage={childLanguage}
                    storyTitle={storyTitle}
                    onStarsEarned={handleStarsEarned}
                  />
                )}

                {activeTab === "color" && (
                  <ColoringCoachView
                    childId={childId}
                    childName={childName}
                    childAge={childAge}
                    childLanguage={childLanguage}
                    storyId={storyId}
                    storyTitle={storyTitle}
                    storyEmoji={storyEmoji}
                    onStarsEarned={handleStarsEarned}
                  />
                )}

                {activeTab === "draw" && (
                  <DrawingCoachView
                    childId={childId}
                    childName={childName}
                    childAge={childAge}
                    childLanguage={childLanguage}
                    onStarsEarned={handleStarsEarned}
                  />
                )}

                {activeTab === "story" && (
                  <StoryCreatorView
                    childId={childId}
                    childName={childName}
                    childAge={childAge}
                    childLanguage={childLanguage}
                    onStarsEarned={handleStarsEarned}
                  />
                )}

              </motion.div>
            </AnimatePresence>
          )}

        </main>
      </PageSurface>
    </AppShell>
  );
}

export default function CreativeStudioPageWrapper() {
  return (
    <Suspense>
      <CreativeStudioPage />
    </Suspense>
  );
}
