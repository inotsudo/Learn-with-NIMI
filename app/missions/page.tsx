"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getChildren, getActiveStories, getCurriculumMissions,
} from "@/lib/queries";
import { FALLBACK_THEME, type ActivityCategory } from "@/app/_activityData";
import AppShell from "@/components/layout/AppShell";
import DailyAdventureBanner from "@/components/missions/DailyAdventureBanner";
import DailyAdventureGrid, { DailyChampionCTA } from "@/components/missions/DailyAdventureGrid";
import DailyAdventureSidebar from "@/components/missions/DailyAdventureSidebar";
import MagicBackground from "@/components/magic/MagicBackground";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function MissionsPage() {
  const [mounted, setMounted] = useState(false);
  const [hasChildren, setHasChildren] = useState(true);
  const [theme, setTheme] = useState(FALLBACK_THEME);
  const [level, setLevel] = useState(1);
  const [completedInLevel, setCompletedInLevel] = useState<Set<ActivityCategory>>(new Set());

  useEffect(() => {
    setMounted(true);
    void loadProgress();
  }, []);

  const loadProgress = async () => {
    const list = await getChildren();
    if (list.length === 0) {
      setHasChildren(false);
      return;
    }

    const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    const child = list.find(c => c.id === savedId) ?? list[0];

    const [curriculumMissions, stories] = await Promise.all([
      getCurriculumMissions(child.id),
      getActiveStories(),
    ]);

    if (stories[0]?.theme_title && stories[0]?.theme_emoji) {
      setTheme({ title: stories[0].theme_title, emoji: stories[0].theme_emoji });
    }

    setLevel(curriculumMissions[0]?.level ?? 1);
    setCompletedInLevel(new Set(
      curriculumMissions.filter(m => m.completed).map(m => m.category)
    ));
  };

  if (!mounted) return null;

  if (!hasChildren) {
    return (
      <AppShell>
        <div className="min-h-screen relative overflow-hidden theme-bg flex flex-col items-center justify-center gap-4 text-center px-4">
          <MagicBackground variant="forest" />
          <p className="relative z-10 theme-text font-semibold">Set up a learner profile to start your Daily Adventure!</p>
          <Link href="/" className="relative z-10 theme-accent text-white font-black rounded-full px-6 py-2.5 shadow hover:theme-accent transition">
            Go Home
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden theme-bg flex flex-col">
        <MagicBackground variant="forest" />
        <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start">
            <div className="space-y-4">
              <DailyAdventureBanner themeTitle={theme.title} themeEmoji={theme.emoji} level={level} />
              <DailyAdventureGrid completedInLevel={completedInLevel} />
              <DailyChampionCTA activitiesCompleted={completedInLevel.size} />

              <div className="lg:hidden">
                <DailyAdventureSidebar activitiesCompleted={completedInLevel.size} />
              </div>
            </div>

            <div className="hidden lg:block sticky top-4">
              <DailyAdventureSidebar activitiesCompleted={completedInLevel.size} />
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
