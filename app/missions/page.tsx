"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getChildren, getActiveStories, getCurriculumMissions,
} from "@/lib/queries";
import { FALLBACK_THEME, type ActivityCategory } from "@/app/_activityData";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import DailyAdventureBanner from "@/components/missions/DailyAdventureBanner";
import DailyAdventureGrid, { DailyChampionCTA } from "@/components/missions/DailyAdventureGrid";
import DailyAdventureSidebar from "@/components/missions/DailyAdventureSidebar";
import { PageSurface } from "@/components/layout/primitives";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";


const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function MissionsPage() {
  const [loading, setLoading] = useState(true);
  const [hasChildren, setHasChildren] = useState(true);
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const [theme, setTheme] = useState(FALLBACK_THEME);
  const [level, setLevel] = useState(1);
  const [completedInLevel, setCompletedInLevel] = useState<Set<ActivityCategory>>(new Set());

  useEffect(() => {
    void loadProgress();
  }, []);

  const loadProgress = async () => {
    const list = await getChildren();
    if (list.length === 0) {
      setHasChildren(false);
      setLoading(false);
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
    setLoading(false);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 pb-24">
          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
            <div className="space-y-4">
              <Bone className="h-36 leaf-lg" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="h-36 leaf" />)}
              </div>
              <Bone className="h-20 leaf" />
            </div>
            <div className="hidden lg:block space-y-4 mt-0">
              <Bone className="h-64 leaf-lg" />
              <Bone className="h-40 leaf-lg" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!hasChildren) {
    return (
      <AppShell>
        <PageSurface className="items-center justify-center px-4">
          <div className="flex flex-col items-center text-center max-w-xs gap-4 py-12">
            <div className="relative">
              <Image src={assets.nimiCircle} alt="NIMI" width={112} height={112} className="rounded-full object-cover border-4 border-yellow-400 shadow-xl" />
              <span className="absolute -bottom-1 -right-1 text-3xl">⭐</span>
            </div>
            <div className="bg-white border border-ds-border rounded-2xl rounded-tl-none px-5 py-3 shadow-ds-card">
              <p className="font-baloo font-black text-ds-text text-[16px] leading-snug">Add a learner first to unlock your Daily Adventure!</p>
            </div>
            <p className="text-gray-500 text-sm">Create a learner profile so your child can start earning stars and badges.</p>
            <Link href="/home" className="text-white font-baloo font-black px-8 py-3 shadow-md transition hover:-translate-y-0.5 active:scale-95" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}>
              🏠 Go to Home
            </Link>
          </div>
        </PageSurface>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full page-shell p-4 sm:p-5 lg:p-6 content-enter">
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
      </PageSurface>
    </AppShell>
  );
}
