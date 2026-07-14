"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getChildren, getChildAchievements, getMaxCurriculumLevel, getActiveStories, type ChildAchievement } from "@/lib/queries";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { PageSurface } from "@/components/layout/primitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import CertificatesHeader from "@/components/certificates/CertificatesHeader";
import AchievementDashboard from "@/components/certificates/AchievementDashboard";
import type { Lang } from "@/app/_achievementData";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function CertificatesPage() {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const [loading, setLoading] = useState(true);
  const [hasChildren, setHasChildren] = useState(true);
  const [childName, setChildName] = useState("Explorer");
  const [childLanguage, setChildLanguage] = useState<Lang>("en");
  const [achievements, setAchievements] = useState<ChildAchievement[]>([]);
  const [maxLevel, setMaxLevel] = useState(3);
  const [levelSlugs, setLevelSlugs] = useState<Map<number, string>>(new Map());
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    void loadProgress();
  }, [reloadKey]);

  const loadProgress = async () => {
    setLoadError(false);
    try {
      const list = await getChildren();
      if (list.length === 0) {
        setHasChildren(false);
        setLoading(false);
        return;
      }
      setHasChildren(true);

      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      setChildName(child.name);
      setChildLanguage(child.language);

      const [achievementRows, level, stories] = await Promise.all([
        getChildAchievements(child.id),
        getMaxCurriculumLevel(),
        getActiveStories(),
      ]);
      setAchievements(achievementRows);
      setMaxLevel(level);
      setLevelSlugs(new Map(stories.map(s => [s.sort_order, s.slug])));
      setLoading(false);
    } catch (err) {
      console.error("[CertificatesPage]", err);
      setLoadError(true);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-4">
          <Bone className="h-28 leaf-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="h-36 leaf-lg" />)}
          </div>
          <Bone className="h-48 leaf-lg" />
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
              <span className="absolute -bottom-1 -right-1 text-3xl">🏆</span>
            </div>
            <div className="bg-white border border-ds-border rounded-2xl rounded-tl-none px-5 py-3 shadow-ds-card">
              <p className="font-baloo font-black text-ds-text text-[16px] leading-snug">Add a learner to start earning certificates!</p>
            </div>
            <p className="text-gray-500 text-sm">Create a learner profile so your child can collect achievements and badges.</p>
            <Link href="/home" className="text-white font-baloo font-black px-8 py-3 shadow-md transition hover:-translate-y-0.5 active:scale-95" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}>
              🏠 Go to Home
            </Link>
          </div>
        </PageSurface>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell>
        <PageSurface className="items-center justify-center px-4">
          <div className="flex flex-col items-center text-center max-w-xs gap-4 py-12">
            <div className="relative">
              <Image src={assets.nimiCircle} alt="NIMI" width={112} height={112} className="rounded-full object-cover border-4 border-yellow-400 shadow-xl" />
              <span className="absolute -bottom-1 -right-1 text-3xl">😵</span>
            </div>
            <div className="bg-white border border-ds-border rounded-2xl rounded-tl-none px-5 py-3 shadow-ds-card">
              <p className="font-baloo font-black text-ds-text text-[16px] leading-snug">{t("missionLoadErrorTitle")}</p>
              <p className="text-gray-500 text-sm mt-1">{t("missionLoadErrorHint")}</p>
            </div>
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="text-white font-baloo font-black px-8 py-3 shadow-md transition hover:-translate-y-0.5 active:scale-95"
              style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}
            >
              {t("tryAgainBtn")}
            </button>
          </div>
        </PageSurface>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full content-enter">
          <CertificatesHeader />
          <AchievementDashboard
            childName={childName}
            childLanguage={childLanguage}
            achievements={achievements}
            maxLevel={maxLevel}
            levelSlugs={levelSlugs}
          />
        </main>
      </PageSurface>
    </AppShell>
  );
}
