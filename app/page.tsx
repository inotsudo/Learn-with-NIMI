"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadVoices } from "@/lib/speak";
import supabase from "@/lib/supabaseClient";
import {
  getChildren, getActiveStories, ensureParentRow,
  getCurriculumMissions, getTodayStars, getWeekStreak, getActivityDates, getChildAchievements,
} from "@/lib/queries";
import type { Child } from "@/lib/queries";
import { computeStreaks } from "@/lib/parentInsights";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { ACTIVITIES, FALLBACK_THEME, type ActivityCategory } from "@/app/_activityData";

import DashboardHero       from "@/components/home/DashboardHero";
import ActivityGrid from "@/components/home/ActivityGrid";
import StatsSidebar     from "@/components/home/StatsSidebar";
import CertificatePanel from "@/components/home/CertificatePanel";
import LanguageBadges   from "@/components/home/LanguageBadges";
import WhatsNext        from "@/components/home/WhatsNext";
import MyProfile        from "@/components/home/MyProfile";
import MyBadges         from "@/components/home/MyBadges";
import NimiCommunity    from "@/components/home/NimiCommunity";
import TalkToNimi       from "@/components/home/TalkToNimi";
import HomeFooter       from "@/components/home/HomeFooter";
import AuthBackground   from "@/components/auth/AuthBackground";
import ChildSelector    from "@/components/home/ChildSelector";
import WhoIsPlaying     from "@/components/home/WhoIsPlaying";
import CreateChildModal from "@/components/home/CreateChildModal";
import CreateExplorerProfile from "@/components/home/CreateExplorerProfile";
import AppShell         from "@/components/layout/AppShell";
// import AppFooterBar     from "@/components/layout/AppFooterBar";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function HomePage() {
  const router = useRouter();
  const { setLanguage } = useLanguage();
  const activeChildRef = useRef<Child | null>(null);
  const [mounted, setMounted]               = useState(false);
  const [children, setChildren]             = useState<Child[]>([]);
  const [activeChild, setActiveChild]       = useState<Child | null>(null);
  const [showPicker, setShowPicker]         = useState(false);
  const [noChildrenYet, setNoChildrenYet]   = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categoriesMastered, setCategoriesMastered] = useState(0);
  const [theme, setTheme] = useState(FALLBACK_THEME);
  const [level, setLevel] = useState(1);
  const [completedInLevel, setCompletedInLevel] = useState<Set<ActivityCategory>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [todayStars, setTodayStars] = useState(0);
  const [weekStreak, setWeekStreak] = useState<boolean[]>(Array(7).fill(false));
  const [streakCount, setStreakCount] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [earnedLanguages, setEarnedLanguages] = useState<Set<Language>>(new Set());

  useEffect(() => {
    setMounted(true);
    loadVoices();
    void loadChildren();
  }, []);

  const loadChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/loginpage"); return; }
    await ensureParentRow();
    const list = await getChildren();
    setChildren(list);

    if (list.length === 0) {
      // No children yet — show the full "Create Your Explorer Profile" page
      setNoChildrenYet(true);
      return;
    }

    // Restore last-selected child from localStorage, else show picker
    const savedId = typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_CHILD_KEY)
      : null;
    const saved = list.find(c => c.id === savedId);
    if (saved) {
      await selectChild(saved, list);
    } else {
      // No remembered child — show the "Who's playing?" screen
      setChildren(list);
      setShowPicker(true);
    }
  };

  const selectChild = async (child: Child, childList?: Child[]) => {
    activeChildRef.current = child;
    setActiveChild(child);
    setShowPicker(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_CHILD_KEY, child.id);
    }
    setLanguage(child.language);
    await loadProgress(child.id, child.language);
    if (childList) setChildren(childList);
  };

  // Listens for language switches fired from anywhere in the app (header
  // picker, settings, language badges) and reloads this child's journey
  // state for the newly-selected language.
  useEffect(() => {
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<{ language: "en" | "fr" | "rw" }>).detail?.language;
      const current = activeChildRef.current;
      if (!lang || !current) return;
      setActiveChild({ ...current, language: lang });
      void loadProgress(current.id, lang);
    };
    window.addEventListener("app:languageChange", handler);
    return () => window.removeEventListener("app:languageChange", handler);
  }, []);

  const loadProgress = async (childId: string, language: "en" | "fr" | "rw") => {
    const [curriculumMissions, stories] = await Promise.all([
      getCurriculumMissions(childId),
      getActiveStories(),
    ]);

    if (stories[0]?.theme_title && stories[0]?.theme_emoji) {
      setTheme({ title: stories[0].theme_title, emoji: stories[0].theme_emoji });
    }

    setLevel(curriculumMissions[0]?.level ?? 1);

    const completedInLevel = new Set(
      curriculumMissions.filter(m => m.completed).map(m => m.category)
    );
    setCompletedInLevel(completedInLevel);
    setCategoriesMastered(completedInLevel.size);
    setCompletedSteps(
      ACTIVITIES.filter(a => completedInLevel.has(a.category)).map(a => a.number)
    );

    setTodayStars(await getTodayStars(childId, language));
    setWeekStreak(await getWeekStreak(childId, language));
    setStreakCount(computeStreaks(await getActivityDates(childId, language)).current);

    const achievements = await getChildAchievements(childId);
    setBadgeCount(achievements.filter(a => a.type === "badge" && a.language === language).length);
    setEarnedLanguages(new Set(
      achievements
        .filter(a => a.type === "certificate" && a.slug.startsWith("curriculum-complete-"))
        .map(a => a.language)
    ));
  };

  const handleChildCreated = async (child: Child) => {
    setShowCreateModal(false);
    setNoChildrenYet(false);
    const list = [...children, child];
    setChildren(list);
    await selectChild(child, list);
  };

  if (!mounted) return null;

  // ── First-time onboarding: no explorer profile yet ──
  if (noChildrenYet) {
    return (
      <AppShell>
        <CreateExplorerProfile onCreated={handleChildCreated} />
      </AppShell>
    );
  }

  // ── "Who's playing today?" full-screen picker ──
  if (showPicker) {
    return (
      <>
        <WhoIsPlaying
          children={children}
          onSelect={child => selectChild(child)}
          onAddChild={() => { setShowPicker(false); setShowCreateModal(true); }}
        />
        {showCreateModal && (
          <CreateChildModal
            onCreated={handleChildCreated}
            onClose={() => { setShowCreateModal(false); setShowPicker(true); }}
          />
        )}
      </>
    );
  }

  // ── Main homepage (child selected) ──
  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col">
        <AuthBackground />

        <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">

          {/* Child switcher — shown when parent has multiple children */}
          {children.length > 1 && activeChild && (
            <ChildSelector
              children={children}
              activeChild={activeChild}
              onSelect={child => selectChild(child)}
              onAddChild={() => setShowCreateModal(true)}
            />
          )}

          {/* Mobile welcome banner */}
          <div className="sm:hidden bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-3 mb-4 text-white text-center shadow-lg">
            <p className="text-sm font-bold">Welcome to your learning adventure! 🌟</p>
            <p className="text-xs opacity-90">Have fun and earn your certificate!</p>
          </div>

          <div id="certificate-panel" className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start">

            <div className="space-y-4">
              <DashboardHero
                childName={activeChild?.name ?? "Explorer"}
                themeTitle={theme.title}
                themeEmoji={theme.emoji}
                level={level}
              />
              <ActivityGrid completedCategories={completedInLevel} />

              <div className="lg:hidden space-y-4">
                <StatsSidebar
                  weekStreak={weekStreak}
                  streakCount={streakCount}
                  badgeCount={badgeCount}
                  todayStars={todayStars}
                  activitiesCompleted={completedInLevel.size}
                />
                <CertificatePanel completedSteps={completedSteps} level={level} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LanguageBadges activeChild={activeChild} earnedLanguages={earnedLanguages} />
                <WhatsNext completedSteps={completedSteps} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
                <MyProfile
                  childName={activeChild?.name ?? "Explorer"}
                  avatar={activeChild?.avatar_url ?? null}
                  categoriesMastered={categoriesMastered}
                />
                <MyBadges completedSteps={completedSteps} />
                <NimiCommunity />
                <TalkToNimi childName={activeChild?.name ?? "Explorer"} />
              </div>
            </div>

            <div className="hidden lg:flex lg:flex-col lg:gap-4 sticky top-4">
              <StatsSidebar
                weekStreak={weekStreak}
                streakCount={streakCount}
                badgeCount={badgeCount}
                todayStars={todayStars}
                activitiesCompleted={completedInLevel.size}
              />
              <CertificatePanel completedSteps={completedSteps} level={level} />
            </div>

          </div>
        </main>

        {/* <AppFooterBar /> */}
        <HomeFooter />

        {showCreateModal && (
          <CreateChildModal
            onCreated={handleChildCreated}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </div>
    </AppShell>
  );
}
