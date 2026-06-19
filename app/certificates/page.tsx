"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getChildren, getChildAchievements, getMaxCurriculumLevel, type ChildAchievement } from "@/lib/queries";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import CertificatesHeader from "@/components/certificates/CertificatesHeader";
import AchievementDashboard from "@/components/certificates/AchievementDashboard";
import type { Lang } from "@/app/_achievementData";
import AuthBackground from "@/components/auth/AuthBackground";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function CertificatesPage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [hasChildren, setHasChildren] = useState(true);
  const [childName, setChildName] = useState("Explorer");
  const [childLanguage, setChildLanguage] = useState<Lang>("en");
  const [achievements, setAchievements] = useState<ChildAchievement[]>([]);
  const [maxLevel, setMaxLevel] = useState(3);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    void loadProgress();
  }, [reloadKey]);

  const loadProgress = async () => {
    setLoadError(false);
    try {
      const list = await getChildren();
      if (list.length === 0) {
        setHasChildren(false);
        return;
      }
      setHasChildren(true);

      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      setChildName(child.name);
      setChildLanguage(child.language);

      const [achievementRows, level] = await Promise.all([
        getChildAchievements(child.id),
        getMaxCurriculumLevel(),
      ]);
      setAchievements(achievementRows);
      setMaxLevel(level);
    } catch (err) {
      console.error("[CertificatesPage]", err);
      setLoadError(true);
    }
  };

  if (!mounted) return null;

  if (!hasChildren) {
    return (
      <AppShell>
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col items-center justify-center gap-4 text-center px-4">
          <AuthBackground />
          <p className="relative z-10 text-purple-100 font-semibold">Set up a learner profile to start your Daily Adventure!</p>
          <Link href="/" className="relative z-10 bg-purple-600 text-white font-black rounded-full px-6 py-2.5 shadow hover:bg-purple-700 transition">
            Go Home
          </Link>
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col items-center justify-center gap-4 text-center px-4">
          <AuthBackground />
          <p className="relative z-10 text-5xl mb-1">😵</p>
          <p className="relative z-10 font-bold text-purple-100">{t("missionLoadErrorTitle")}</p>
          <p className="relative z-10 text-sm text-purple-300 -mt-2">{t("missionLoadErrorHint")}</p>
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="relative z-10 px-6 py-2 rounded-full bg-blue-500 text-white font-black text-sm shadow-md hover:bg-blue-600 transition"
          >
            {t("tryAgainBtn")}
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col">
        <AuthBackground />
        <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <CertificatesHeader />
          <AchievementDashboard
            childName={childName}
            childLanguage={childLanguage}
            achievements={achievements}
            maxLevel={maxLevel}
          />
        </main>
      </div>
    </AppShell>
  );
}
