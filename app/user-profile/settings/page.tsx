"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Edit } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import {
  getChildren, getCurrentLevel,
  getTotalStars, getChildBadges, getTodayMissions,
} from "@/lib/queries";
import type { Child } from "@/lib/queries";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { PageSurface } from "@/components/layout/primitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileStatsGrid from "@/components/profile/ProfileStatsGrid";
import AccountSettingsCard from "@/components/profile/AccountSettingsCard";
import AppPreferencesCard from "@/components/profile/AppPreferencesCard";
import EditChildModal from "@/components/profile/EditChildModal";
import type { Language } from "@/contexts/LanguageContext";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function MyProfilePage() {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasChildren, setHasChildren] = useState(true);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [level, setLevel] = useState(1);
  const [activitiesCompleted, setActivitiesCompleted] = useState(0);
  const [starsCollected, setStarsCollected] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/loginpage"); return; }
    try {
      const list = await getChildren();
      if (list.length === 0) {
        setHasChildren(false);
        return;
      }

      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      setActiveChild(child);

      const [level, stars, badges, todayMissions] = await Promise.all([
        getCurrentLevel(child.id, child.language),
        getTotalStars(child.id, child.language),
        getChildBadges(child.id, child.language),
        getTodayMissions(child.id, child.language),
      ]);

      setLevel(level);
      setActivitiesCompleted(todayMissions.length);
      setStarsCollected(stars);
      setBadgesEarned(badges.length);
    } catch (err) {
      console.error("[MyProfilePage] load error:", err);
    } finally {
      setLoading(false);
    }
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
            <div className="bg-[var(--ds-surface-card)] border border-ds-border rounded-2xl rounded-tl-none px-5 py-3 shadow-ds-card">
              <p className="font-baloo font-black text-ds-text text-base leading-snug">{t("noChildrenYet")}</p>
            </div>
            <Link href="/home" className="text-white font-baloo font-black px-8 py-3 shadow-md transition hover:-translate-y-0.5 active:scale-95" style={{ backgroundColor: 'var(--ds-brand-primary)', borderRadius: 'var(--leaf-r)' }}>
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
              <p className="text-[var(--ds-text-secondary)] text-sm mt-1">{t("myProfileSubtitle")}</p>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="border border-ds-border bg-[var(--ds-surface-card)] text-ds-text font-black rounded-full px-5 py-2.5 text-sm hover:bg-[var(--ds-surface-card-hover)] shadow-ds-card transition flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> {t("editProfile")}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 mt-4 items-stretch">
            <ProfileCard
              avatar={activeChild?.avatar_url ?? null}
              childName={activeChild?.name ?? "Explorer"}
              level={level}
            />
            <ProfileStatsGrid
              activitiesCompleted={activitiesCompleted}
              starsCollected={starsCollected}
              badgesEarned={badgesEarned}
              certificates={Math.max(0, level - 1)}
            />
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
