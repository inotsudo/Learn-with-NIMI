"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getCurriculumMissions, completeCurriculumMission, getColoringPages, getStoryPages, notifyPushOnCompletion,
} from "@/lib/queries";
import { queueOfflineCompletion } from "@/lib/offlineQueue";
import type { CurriculumMission, ColoringPage, StoryPage } from "@/lib/queries";
import { ACTIVITIES } from "@/app/_activityData";
import { useLanguage } from "@/contexts/LanguageContext";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import MissionShell from "@/components/missions/MissionShell";
import SingAlongContent from "@/components/missions/SingAlongContent";
import MoveGrooveContent from "@/components/missions/MoveGrooveContent";
import WatchContent from "@/components/missions/WatchContent";
import ReadContent from "@/components/missions/ReadContent";
import ColoringContent from "@/components/missions/ColoringContent";
import StoryContent from "@/components/missions/StoryContent";
import { ContentSurface } from "@/components/layout/primitives";
import { emitReadingSessionStarted } from "@/lib/ai/eventBus";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function MissionCategoryPage() {
  const { t, language } = useLanguage();
  const params = useParams<{ category: string }>();
  const router = useRouter();
  const activity = ACTIVITIES.find(a => a.category === params.category);

  const [mission, setMission]             = useState<CurriculumMission | null>(null);
  const [level, setLevel]                 = useState(1);
  const [completedCount, setCompletedCount] = useState(0);
  const [completed, setCompleted]         = useState(false);
  const [pendingSync, setPendingSync]     = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [loading, setLoading]             = useState(true);
  const [pagesLoading, setPagesLoading]   = useState(false);
  const [loadError, setLoadError]         = useState(false);
  const [childId, setChildId]             = useState<string | null>(null);
  const [coloringPages, setColoringPages] = useState<ColoringPage[]>([]);
  const [storyPages, setStoryPages]       = useState<StoryPage[]>([]);
  const [reloadKey, setReloadKey]         = useState(0);
  const readingEmittedRef                 = useRef(false);

  useEffect(() => {
    if (!activity) { router.replace("/missions"); return; }

    const cid = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    setChildId(cid);

    const load = async () => {
      if (!cid) { setLoading(false); return; }

      setLoading(true);
      setLoadError(false);
      try {
        const curriculumMissions = await getCurriculumMissions(cid);
        const m = curriculumMissions.find(x => x.category === activity.category) ?? null;
        setMission(m);
        setLevel(curriculumMissions[0]?.level ?? 1);
        setCompleted(!!m?.completed);
        setLevelComplete(!!m?.level_complete);
        setCompletedCount(curriculumMissions.filter(x => x.completed).length);

        // Show mission UI immediately — pages load in the background
        setLoading(false);

        if (m?.story_id) {
          setPagesLoading(true);
          try {
            if (m.type === "color") {
              setColoringPages(await getColoringPages(m.story_id));
            } else if (m.type === "story" || m.type === "listen") {
              setStoryPages(await getStoryPages(m.story_id, language));
            }
          } finally {
            setPagesLoading(false);
          }
        }
      } catch (err) {
        console.error("[MissionCategoryPage]", err);
        setLoadError(true);
        setLoading(false);
        setPagesLoading(false);
      }
    };
    void load();
  }, [activity, router, language, reloadKey]);

  // Emit reading_session_started once when a read-type mission is active
  useEffect(() => {
    if (mission?.type === 'read' && childId && !readingEmittedRef.current) {
      readingEmittedRef.current = true;
      emitReadingSessionStarted(childId, {
        missionId: mission.id,
        storyId:   mission.story_id ?? undefined,
        language,
      });
    }
  }, [mission, childId, language]);

  const handleComplete = async () => {
    if (saving || completed || !mission || !childId) return;
    setSaving(true);

    const queueForLaterSync = () => {
      queueOfflineCompletion({
        childId, missionId: mission.id, category: activity!.category, queuedAt: Date.now(),
      });
      setCompleted(true);
      setCompletedCount(c => Math.min(ACTIVITIES.length, c + 1));
      setPendingSync(true);
      setSaving(false);
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueForLaterSync();
      return;
    }

    const result = await completeCurriculumMission(childId, mission.id);
    if (!result) {
      queueForLaterSync();
      return;
    }
    setCompleted(true);
    setCompletedCount(c => Math.min(ACTIVITIES.length, c + 1));
    setLevelComplete(result.level_complete);
    setSaving(false);
    void notifyPushOnCompletion(childId, activity!.category, result);
  };

  if (!activity) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4 py-2">
          <Bone className="h-12 leaf-lg" />
          <Bone className="h-64 leaf-lg" />
          <div className="grid grid-cols-2 gap-3">
            <Bone className="h-16 leaf-lg" />
            <Bone className="h-16 leaf-lg" />
          </div>
        </div>
      );
    }

    if (loadError) {
      return (
        <ContentSurface className="p-6 text-center">
          <p className="text-5xl mb-3">😵</p>
          <p className="font-bold text-ds-text">{t("missionLoadErrorTitle")}</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">{t("missionLoadErrorHint")}</p>
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="px-6 py-3 min-h-[44px] text-white font-black text-sm shadow-md transition" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}
          >
            {t("tryAgainBtn")}
          </button>
        </ContentSurface>
      );
    }

    if (!mission) {
      return (
        <ContentSurface className="p-6 text-center">
          <p className="text-5xl mb-3">{activity.emoji}</p>
          <p className="font-bold text-ds-text">{t("noPagesTitle")}</p>
          <p className="text-sm text-gray-500 mt-1">{t("noPagesHint")}</p>
        </ContentSurface>
      );
    }

    switch (mission.type) {
      case "sing":
        return <SingAlongContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />;
      case "move":
        return <MoveGrooveContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />;
      case "watch":
        return <WatchContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />;
      case "read":
        return <ReadContent mission={mission} onComplete={handleComplete} completed={completed} saving={saving} />;
      case "color":
        return <ColoringContent mission={mission} coloringPages={coloringPages} onComplete={handleComplete} completed={completed} saving={saving} pagesLoading={pagesLoading} />;
      case "story":
      case "listen":
        return <StoryContent mission={mission} storyPages={storyPages} onComplete={handleComplete} completed={completed} saving={saving} pagesLoading={pagesLoading} />;
      default:
        return (
          <ContentSurface className="p-6 text-center">
            <p className="text-5xl mb-3">{activity.emoji}</p>
            <p className="font-bold text-ds-text">{t("noPagesTitle")}</p>
            <p className="text-sm text-gray-500 mt-1">{t("noPagesHint")}</p>
          </ContentSurface>
        );
    }
  };

  return (
    <AppShell>
      <MissionShell
        activity={activity}
        mission={mission}
        completedCount={completedCount}
        completed={completed}
        level={level}
        levelComplete={levelComplete}
      >
        {renderContent()}
        {pendingSync && (
          <p className="text-center text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1.5 mt-2">
            ⏳ {t("pendingSyncNote")}
          </p>
        )}
      </MissionShell>
    </AppShell>
  );
}
