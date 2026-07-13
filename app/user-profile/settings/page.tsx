"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Edit } from "lucide-react";
import {
  getChildren, getCurrentLevel, getCurriculumMissions, getCompletedMissionIds,
  getTotalStars, getChildAchievements,
} from "@/lib/queries";
import type { Child } from "@/lib/queries";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { PageSurface } from "@/components/layout/primitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileStatsGrid from "@/components/profile/ProfileStatsGrid";
import ProfileBadgesRow from "@/components/profile/ProfileBadgesRow";
import AccountSettingsCard from "@/components/profile/AccountSettingsCard";
import AppPreferencesCard from "@/components/profile/AppPreferencesCard";
import EditChildModal from "@/components/profile/EditChildModal";
import type { Language } from "@/contexts/LanguageContext";
import ThemePicker from "@/components/settings/ThemePicker";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function MyProfilePage() {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const [loading, setLoading] = useState(true);
  const [hasChildren, setHasChildren] = useState(true);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [level, setLevel] = useState(1);
  const [activitiesCompleted, setActivitiesCompleted] = useState(0);
  const [starsCollected, setStarsCollected] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState(0);
  const [completedInLevel, setCompletedInLevel] = useState<Set<ActivityCategory>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
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

    // All independent queries fire in parallel — previously 5 sequential round-trips.
    const [level, completedIds, stars, achievements, curriculumMissions] = await Promise.all([
      getCurrentLevel(child.id, child.language),
      getCompletedMissionIds(child.id, child.language),
      getTotalStars(child.id, child.language),
      getChildAchievements(child.id),
      getCurriculumMissions(child.id),
    ]);

    setLevel(level);
    setActivitiesCompleted(completedIds.length);
    setStarsCollected(stars);
    setBadgesEarned(achievements.filter(a => a.type === "badge" && a.language === child.language).length);
    setCompletedInLevel(new Set(curriculumMissions.filter(m => m.completed).map(m => m.category)));
    setLoading(false);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-4 py-6 pb-24 space-y-4">
          <Bone className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
            <Bone className="h-48 leaf-lg" />
            <Bone className="h-48 leaf-lg" />
          </div>
          <Bone className="h-24 leaf-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Bone className="h-40 leaf-lg" />
            <Bone className="h-40 leaf-lg" />
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
              <span className="absolute -bottom-1 -right-1 text-3xl">🌟</span>
            </div>
            <div className="bg-white border border-ds-border rounded-2xl rounded-tl-none px-5 py-3 shadow-ds-card">
              <p className="font-baloo font-black text-ds-text text-[16px] leading-snug">{t("noChildrenYet")}</p>
            </div>
            <Link href="/home" className="text-white font-baloo font-black px-8 py-3 shadow-md transition hover:-translate-y-0.5 active:scale-95" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}>
              🏠 {t("goHomeBtn")}
            </Link>
          </div>
        </PageSurface>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full content-enter">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-black text-2xl sm:text-3xl text-ds-text">{t("myProfileTitle")}</h1>
              <p className="text-gray-500 text-sm mt-1">{t("myProfileSubtitle")}</p>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="border border-ds-border bg-white text-ds-text font-black rounded-full px-5 py-2.5 text-sm hover:bg-gray-50 shadow-ds-card transition flex items-center gap-2"
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

          {/* Theme Picker */}
          <div className="mt-4 bg-white border border-ds-border shadow-ds-card p-5" style={{ borderRadius: 'var(--leaf-r)' }}>
            <ThemePicker />
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
      </PageSurface>
    </AppShell>
  );
}
