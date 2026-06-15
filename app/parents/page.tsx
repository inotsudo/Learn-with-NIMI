"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import {
  getChildren, getLevelMissions, getAllChildProgress, getChildAchievements,
  getMaxCurriculumLevel, getCurrentLevel, type ChildAchievement,
} from "@/lib/queries";
import {
  computeLanguageJourney, computeOverview, buildProgressTimeline,
  computeLearningInsights, computeAttentionAlerts,
  type LanguageJourney, type OverviewSummary, type TimelineEvent,
  type LearningInsights, type DashboardAlert,
} from "@/lib/parentInsights";
import { LANGUAGES, type Lang } from "@/app/_achievementData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreationUpload } from "@/hooks/useCreationUpload";
import UploadModal from "@/components/community/UploadModal";
import { CelebrationBanner } from "@/components/community/CelebrationBanner";
import { ErrorToast } from "@/components/community/ErrorToast";
import ParentsZoneHeader from "@/components/parents/ParentsZoneHeader";
import AttentionAlertsCard from "@/components/parents/AttentionAlertsCard";
import ParentOverviewCard from "@/components/parents/ParentOverviewCard";
import LanguageJourneyCard from "@/components/parents/LanguageJourneyCard";
import AchievementCenterCard from "@/components/parents/AchievementCenterCard";
import LearningInsightsCard from "@/components/parents/LearningInsightsCard";
import ProgressTimelineCard from "@/components/parents/ProgressTimelineCard";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const EMPTY_JOURNEYS: Record<Lang, LanguageJourney> = LANGUAGES.reduce((acc, lang) => {
  acc[lang] = computeLanguageJourney(lang, 1, [], []);
  return acc;
}, {} as Record<Lang, LanguageJourney>);

const EMPTY_OVERVIEW: OverviewSummary = computeOverview({ language: "en" }, [], EMPTY_JOURNEYS, 3);
const EMPTY_INSIGHTS: LearningInsights = computeLearningInsights([], [], "en");

export default function ParentsZonePage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [hasChildren, setHasChildren] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [childId, setChildId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [childName, setChildName] = useState("Explorer");
  const [childAvatarUrl, setChildAvatarUrl] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewSummary>(EMPTY_OVERVIEW);
  const [journeys, setJourneys] = useState<Record<Lang, LanguageJourney>>(EMPTY_JOURNEYS);
  const [maxLevel, setMaxLevel] = useState(3);
  const [achievements, setAchievements] = useState<ChildAchievement[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [insights, setInsights] = useState<LearningInsights>(EMPTY_INSIGHTS);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationText, setCelebrationText] = useState("");

  const triggerCelebration = useCallback((text: string) => {
    setCelebrationText(text);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  }, []);

  const { uploadForm, setUploadForm, showUploadModal, setShowUploadModal, handleUploadSubmit } = useCreationUpload({
    parentId: parentId ?? "",
    childId,
    onError: setError,
    onCelebrate: triggerCelebration,
  });

  useEffect(() => {
    setMounted(true);
    void load();
  }, [reloadKey]);

  const load = async () => {
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
      setChildAvatarUrl(child.avatar_url);
      setChildId(child.id);
      setParentId(child.parent_id);

      const [levelMissions, allProgress, achievementRows, max, levelEn, levelFr, levelRw] = await Promise.all([
        getLevelMissions(),
        getAllChildProgress(child.id),
        getChildAchievements(child.id),
        getMaxCurriculumLevel(),
        getCurrentLevel(child.id, "en"),
        getCurrentLevel(child.id, "fr"),
        getCurrentLevel(child.id, "rw"),
      ]);

      const currentLevels: Record<Lang, number> = { en: levelEn, fr: levelFr, rw: levelRw };
      const journeyMap = {} as Record<Lang, LanguageJourney>;
      for (const lang of LANGUAGES) {
        const progressForLang = allProgress.filter(r => r.language === lang);
        journeyMap[lang] = computeLanguageJourney(lang, currentLevels[lang], levelMissions, progressForLang);
      }

      setMaxLevel(max);
      setAchievements(achievementRows);
      setJourneys(journeyMap);
      setOverview(computeOverview(child, achievementRows, journeyMap, max));
      setTimeline(buildProgressTimeline(achievementRows, allProgress));
      setInsights(computeLearningInsights(levelMissions, allProgress, child.language));
      setAlerts(computeAttentionAlerts(child, journeyMap, achievementRows, allProgress));
    } catch (err) {
      console.error("[ParentsZonePage]", err);
      setLoadError(true);
    }
  };

  if (!mounted) return null;

  if (!hasChildren) {
    return (
      <AppShell>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
          <p className="text-gray-600 font-semibold">Set up a learner profile to start your Daily Adventure!</p>
          <Link href="/" className="bg-purple-600 text-white font-black rounded-full px-6 py-2.5 shadow hover:bg-purple-700 transition">
            Go Home
          </Link>
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
          <p className="text-5xl mb-1">😵</p>
          <p className="font-bold text-gray-600">{t("missionLoadErrorTitle")}</p>
          <p className="text-sm text-gray-400 -mt-2">{t("missionLoadErrorHint")}</p>
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="px-6 py-2 rounded-full bg-blue-500 text-white font-black text-sm shadow-md hover:bg-blue-600 transition"
          >
            {t("tryAgainBtn")}
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
        <CelebrationBanner isVisible={showCelebration} text={celebrationText} />
        <ErrorToast error={error} onDismiss={() => setError(null)} />
        <UploadModal
          open={showUploadModal}
          onClose={() => !uploadForm.isUploading && setShowUploadModal(false)}
          onSubmit={handleUploadSubmit}
          formState={uploadForm}
          setFormState={setUploadForm}
        />

        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full flex flex-col gap-4">
          <ParentsZoneHeader onUploadClick={() => setShowUploadModal(true)} />

          {alerts.length > 0 && <AttentionAlertsCard alerts={alerts} />}

          <ParentOverviewCard overview={overview} childName={childName} avatarUrl={childAvatarUrl} />

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {LANGUAGES.map(lang => (
              <LanguageJourneyCard
                key={lang}
                journey={journeys[lang]}
                maxLevel={maxLevel}
                isActive={lang === overview.activeLanguage}
              />
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AchievementCenterCard achievements={achievements} maxLevel={maxLevel} childName={childName} />
            <LearningInsightsCard insights={insights} />
          </div>

          <ProgressTimelineCard events={timeline} />
        </main>
      </div>
    </AppShell>
  );
}
