"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  getChildren, getCurriculumMissions, getCurrentLevel,
  getWeekStreak, getWeekActivityCounts, getChildAchievements, getTotalStars,
  getActivityDates, getChildBadges, awardMilestoneBadges, updateChild,
  type Child,
} from "@/lib/queries";
import { MILESTONE_BADGES } from "@/lib/milestoneBadges";
import { type ActivityCategory } from "@/app/_activityData";
import AppShell from "@/components/layout/AppShell";
import MagicLoader from "@/components/magic/MagicLoader";
import { useLanguage } from "@/contexts/LanguageContext";
import ProgressHeader, { type ProgressTab } from "@/components/profile/ProgressHeader";
import StatsRow from "@/components/profile/StatsRow";
import TodaysProgressCard from "@/components/profile/TodaysProgressCard";
import WeekStreakCard from "@/components/profile/WeekStreakCard";
import WeeklyActivityChart from "@/components/profile/WeeklyActivityChart";
import ActivityProgressTab from "@/components/profile/ActivityProgressTab";
import SkillsTab from "@/components/profile/SkillsTab";
import StreaksTab from "@/components/profile/StreaksTab";
import { PageSurface } from "@/components/layout/primitives";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import EditProfileSheet from "@/components/profile/EditProfileSheet";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

function emptyCategoryProgress(): Record<ActivityCategory, { completed: number; total: number }> {
  return {
    morning: { completed: 0, total: 0 },
    movement: { completed: 0, total: 0 },
    artistic: { completed: 0, total: 0 },
    histoire: { completed: 0, total: 0 },
    zoom: { completed: 0, total: 0 },
    discovery: { completed: 0, total: 0 },
    flipflop: { completed: 0, total: 0 },
    coloring: { completed: 0, total: 0 },
  };
}

// ── Child switcher ─────────────────────────────────────────────────────
function ChildSwitcher({
  children,
  activeId,
  onSwitch,
}: { children: Child[]; activeId: string; onSwitch: (id: string) => void }) {
  if (children.length < 2) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {children.map(child => {
        const active = child.id === activeId;
        return (
          <button
            key={child.id}
            onClick={() => onSwitch(child.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-black whitespace-nowrap transition-all border ${
              active
                ? "bg-[var(--nimi-green)] text-white border-transparent shadow-md"
                : "bg-ds-card border-ds-border text-ds-muted hover:text-ds-text"
            }`}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
              <ChildAvatar avatarUrl={child.avatar_url} name={child.name} size={20} />
            </div>
            {child.name}
          </button>
        );
      })}
    </div>
  );
}

// ── Milestone badges card ─────────────────────────────────────────────
function MilestoneBadgesCard({ earnedSlugs }: { earnedSlugs: string[] }) {
  const earnedCount = MILESTONE_BADGES.filter(b => earnedSlugs.includes(b.slug)).length;
  return (
    <div className="bg-ds-card border border-ds-border shadow-ds-card p-5" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-baloo font-black text-ds-text text-[17px]">🏅 My Badges</h2>
        <span className="text-[11px] font-bold text-ds-muted">{earnedCount} / {MILESTONE_BADGES.length}</span>
      </div>
      {/* Progress strip */}
      <div className="w-full h-1.5 bg-ds-border rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
          initial={{ width: 0 }}
          animate={{ width: `${(earnedCount / MILESTONE_BADGES.length) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {MILESTONE_BADGES.map((badge, i) => {
          const earned = earnedSlugs.includes(badge.slug);
          return (
            <motion.div
              key={badge.slug}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 280, damping: 20 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ring-[3px] transition-all relative ${
                earned
                  ? "ring-amber-400 bg-gradient-to-b from-amber-300 to-yellow-500 shadow-[0_6px_20px_rgba(251,191,36,0.45)]"
                  : "ring-gray-200 bg-gray-100 opacity-35 grayscale"
              }`}>
                {badge.emoji}
                {earned && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-[8px] text-white font-black">✓</span>
                  </div>
                )}
              </div>
              <p className={`font-nunito font-bold text-[11px] leading-tight ${earned ? "text-ds-text" : "text-ds-muted"}`}>
                {badge.label}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChildren, setHasChildren] = useState(true);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [activeTab, setActiveTab] = useState<ProgressTab>("overview");
  const [childName, setChildName] = useState("Explorer");
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [completedCategories, setCompletedCategories] = useState<Set<ActivityCategory>>(new Set());
  const [categoryProgress, setCategoryProgress] = useState<Record<ActivityCategory, { completed: number; total: number }>>(emptyCategoryProgress());
  const [weekStreak, setWeekStreak] = useState<boolean[]>(Array(7).fill(false));
  const [weekCounts, setWeekCounts] = useState<number[]>(Array(7).fill(0));
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());
  const [badgeCount, setBadgeCount] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [certificates, setCertificates] = useState(0);
  const [earnedBadgeSlugs, setEarnedBadgeSlugs] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  const handleSaveProfile = async (newName: string, newAvatarUrl: string) => {
    if (!activeChild) return;
    await updateChild(activeChild.id, { name: newName, avatar_url: newAvatarUrl });
    await loadProgress(activeChild.id);
  };

  useEffect(() => {
    setMounted(true);
    void loadProgress();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadProgress();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const loadProgress = async (targetChildId?: string) => {
    setLoading(true);
    const list = await getChildren();
    if (list.length === 0) {
      setHasChildren(false);
      setLoading(false);
      return;
    }
    setAllChildren(list);

    const savedId = targetChildId
      ?? (typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null);
    const child = list.find(c => c.id === savedId) ?? list[0];
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_CHILD_KEY, child.id);

    setChildName(child.name);
    setActiveChild(child);

    const curriculumMissions = await getCurriculumMissions(child.id);
    const level = await getCurrentLevel(child.id, child.language);
    setCertificates(Math.max(0, level - 1));

    const completedInLevel = new Set(
      curriculumMissions.filter(m => m.completed).map(m => m.category)
    );
    setCompletedCategories(completedInLevel);

    const progress = emptyCategoryProgress();
    for (const m of curriculumMissions) {
      progress[m.category].total = 1;
      if (m.completed) progress[m.category].completed = 1;
    }
    setCategoryProgress(progress);

    await awardMilestoneBadges(child.id, child.language);

    const [wStreak, wCounts, stars, dates, achievements, badges] = await Promise.all([
      getWeekStreak(child.id, child.language),
      getWeekActivityCounts(child.id, child.language),
      getTotalStars(child.id, child.language),
      getActivityDates(child.id, child.language),
      getChildAchievements(child.id),
      getChildBadges(child.id),
    ]);

    setWeekStreak(wStreak);
    setWeekCounts(wCounts);
    setTotalStars(stars);
    setActivityDates(dates);
    setBadgeCount(achievements.filter(a => a.type === "badge" && a.language === child.language).length);
    setEarnedBadgeSlugs(badges.map(b => b.badge_slug));
    setLoading(false);
  };

  const handleChildSwitch = (childId: string) => {
    void loadProgress(childId);
  };

  if (!mounted || loading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center min-h-[80vh]">
          <MagicLoader variant="default" fullPage={false} />
        </div>
      </AppShell>
    );
  }

  if (!hasChildren) {
    return (
      <AppShell>
        <PageSurface className="relative overflow-hidden items-center justify-center gap-4 text-center px-4">
          <p className="relative z-10 text-ds-text font-semibold">{t("noChildrenYet")}</p>
          <Link href="/home" className="relative z-10 text-white font-black px-6 py-2.5 shadow transition" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}>
            {t("goHomeBtn")}
          </Link>
        </PageSurface>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-lg mx-auto px-4 sm:px-5 py-4 pb-28 flex-1 w-full">
          <ProgressHeader
            activeTab={activeTab}
            onTabChange={setActiveTab}
            childName={childName}
            avatarUrl={activeChild?.avatar_url}
            onEditProfile={() => setEditOpen(true)}
          />

          {/* Child switcher — shown below tabs when family has multiple children */}
          {allChildren.length >= 2 && (
            <div className="mt-4">
              <ChildSwitcher
                children={allChildren}
                activeId={activeChild?.id ?? ""}
                onSwitch={handleChildSwitch}
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 mt-5"
              >
                <StatsRow
                  starsCollected={totalStars}
                  badgesEarned={badgeCount}
                  certificates={certificates}
                />
                <TodaysProgressCard completedCategories={completedCategories} />
                <WeekStreakCard weekStreak={weekStreak} activityDates={activityDates} />
                <WeeklyActivityChart weekCounts={weekCounts} />
                <MilestoneBadgesCard earnedSlugs={earnedBadgeSlugs} />
              </motion.div>
            )}

            {activeTab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <ActivityProgressTab categoryProgress={categoryProgress} />
              </motion.div>
            )}

            {activeTab === "skills" && (
              <motion.div key="skills" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <SkillsTab categoryProgress={categoryProgress} />
              </motion.div>
            )}

            {activeTab === "streaks" && activeChild && (
              <motion.div key="streaks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <StreaksTab
                  activityDates={activityDates}
                  weekStreak={weekStreak}
                  childId={activeChild.id}
                  language={activeChild.language as "en" | "fr" | "rw"}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </PageSurface>
      <EditProfileSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveProfile}
        initialName={childName}
        initialAvatarUrl={activeChild?.avatar_url}
      />
    </AppShell>
  );
}
