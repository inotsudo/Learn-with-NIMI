"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit } from "lucide-react";
import {
  getChildren, getCurrentLevel, getCurriculumMissions, getCompletedMissionIds,
  getTotalStars, getChildAchievements,
} from "@/lib/queries";
import type { Child } from "@/lib/queries";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileStatsGrid from "@/components/profile/ProfileStatsGrid";
import ProfileBadgesRow from "@/components/profile/ProfileBadgesRow";
import AccountSettingsCard from "@/components/profile/AccountSettingsCard";
import AppPreferencesCard from "@/components/profile/AppPreferencesCard";
import EditChildModal from "@/components/profile/EditChildModal";
import type { Language } from "@/contexts/LanguageContext";
import AuthBackground from "@/components/auth/AuthBackground";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function MyProfilePage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [hasChildren, setHasChildren] = useState(true);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [level, setLevel] = useState(1);
  const [activitiesCompleted, setActivitiesCompleted] = useState(0);
  const [starsCollected, setStarsCollected] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState(0);
  const [completedInLevel, setCompletedInLevel] = useState<Set<ActivityCategory>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    void load();
  }, []);

  const load = async () => {
    const list = await getChildren();
    if (list.length === 0) {
      setHasChildren(false);
      return;
    }

    const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    const child = list.find(c => c.id === savedId) ?? list[0];
    setActiveChild(child);

    setLevel(await getCurrentLevel(child.id, child.language));

    const completedIds = await getCompletedMissionIds(child.id, child.language);
    setActivitiesCompleted(completedIds.length);
    setStarsCollected(await getTotalStars(child.id, child.language));

    const achievements = await getChildAchievements(child.id);
    setBadgesEarned(achievements.filter(a => a.type === "badge" && a.language === child.language).length);

    const curriculumMissions = await getCurriculumMissions(child.id);
    setCompletedInLevel(new Set(curriculumMissions.filter(m => m.completed).map(m => m.category)));
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

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col">
        <AuthBackground />
        <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-black text-2xl sm:text-3xl text-white">{t("myProfileTitle")}</h1>
              <p className="text-purple-200 text-sm mt-1">{t("myProfileSubtitle")}</p>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="border-2 border-white/20 text-purple-100 bg-white/10 backdrop-blur font-black rounded-full px-5 py-2.5 text-sm hover:bg-white/20 transition flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> {t("editProfile")}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 mt-4 items-stretch">
            <ProfileCard
              avatar={activeChild?.avatar_url ?? null}
              childName={activeChild?.name ?? "Explorer"}
              level={level}
              categoriesCompleted={completedInLevel.size}
              categoriesTotal={ACTIVITIES.length}
            />
            <ProfileStatsGrid
              activitiesCompleted={activitiesCompleted}
              starsCollected={starsCollected}
              badgesEarned={badgesEarned}
              certificates={Math.max(0, level - 1)}
            />
          </div>

          <div className="mt-4">
            <ProfileBadgesRow completedInLevel={completedInLevel} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {activeChild && (
              <AccountSettingsCard
                childId={activeChild.id}
                childName={activeChild.name}
                avatarUrl={activeChild.avatar_url}
                onChildUpdated={updates => setActiveChild(prev => prev ? { ...prev, ...updates } : prev)}
              />
            )}
            <AppPreferencesCard
              activeChild={activeChild}
              onLanguageChanged={(lang: Language) =>
                setActiveChild(prev => prev ? { ...prev, language: lang } : prev)
              }
            />
          </div>
        </main>

        {showEditModal && activeChild && (
          <EditChildModal
            childId={activeChild.id}
            initialName={activeChild.name}
            initialAvatar={activeChild.avatar_url}
            onSaved={updates => { setActiveChild(prev => prev ? { ...prev, ...updates } : prev); setShowEditModal(false); }}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </div>
    </AppShell>
  );
}
