"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  getChildren,
  getWeekStreak, getWeekActivityCounts, getTotalStars,
  getActivityDates, getChildBadges, updateChild,
  getConsecutiveStreak, getCompletedStoriesCount, awardMilestoneBadges,
  type Child,
} from "@/lib/queries";

import { MILESTONE_BADGES } from "@/lib/milestoneBadges";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { RefreshingBadge } from "@/components/layout/RefreshingBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import ProgressHeader, { type ProgressTab } from "@/components/profile/ProgressHeader";
import StatsRow from "@/components/profile/StatsRow";
import WeeklyActivityChart from "@/components/profile/WeeklyActivityChart";
import StreaksTab from "@/components/profile/StreaksTab";
import { PageSurface } from "@/components/layout/primitives";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import EditProfileSheet from "@/components/profile/EditProfileSheet";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

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
  const { t } = useLanguage();
  const earnedCount = MILESTONE_BADGES.filter(b => earnedSlugs.includes(b.slug)).length;
  const allLocked = earnedCount === 0;

  return (
    <div className="bg-ds-card border border-ds-border shadow-ds-card p-5" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-baloo font-black text-ds-text text-[17px]">🏅 {t("myBadgesTitle") || "My Badges"}</h2>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
          earnedCount > 0
            ? "text-amber-600 bg-amber-50 border border-amber-200"
            : "text-ds-muted"
        }`}>
          {earnedCount} / {MILESTONE_BADGES.length}
        </span>
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

      <div className="grid grid-cols-5 gap-2">
        {MILESTONE_BADGES.map((badge, i) => {
          const earned = earnedSlugs.includes(badge.slug);
          return (
            <motion.div
              key={badge.slug}
              initial={{ opacity: 0, scale: 0.7, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col items-center gap-1.5 text-center"
              title={badge.desc}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ring-2 transition-all relative ${
                earned
                  ? "ring-amber-400 bg-gradient-to-b from-amber-300 to-yellow-500 shadow-[0_4px_14px_rgba(251,191,36,0.4)]"
                  : "ring-ds-border bg-ds-page opacity-40 grayscale"
              }`}>
                {badge.emoji}
                {earned && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-[7px] text-white font-black">✓</span>
                  </div>
                )}
              </div>
              <p className={`font-nunito font-bold text-[10px] leading-tight ${earned ? "text-ds-text" : "text-ds-muted"}`}>
                {badge.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Zero-state prompt */}
      {allLocked && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 pt-3 border-t border-ds-border text-center"
        >
          <p className="text-ds-muted text-[11px] font-semibold">
            🚀 {t("badgesHintMsg") || "Complete stories to unlock your first badge!"}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [hasChildren, setHasChildren] = useState(true);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [activeTab, setActiveTab] = useState<ProgressTab>("overview");
  const [childName, setChildName] = useState("Explorer");
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [weekStreak, setWeekStreak] = useState<boolean[]>(Array(7).fill(false));
  const [weekCounts, setWeekCounts] = useState<number[]>(Array(7).fill(0));
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());
  const [badgeCount, setBadgeCount] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [storiesCompleted, setStoriesCompleted] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [earnedBadgeSlugs, setEarnedBadgeSlugs] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const activeChildRef = useRef<Child | null>(null);
  const switchGenRef   = useRef(0);

  const loadProgress = useCallback(async (targetChildId?: string, silent = false) => {
    const gen = silent ? ++switchGenRef.current : 0;
    if (silent) setRefreshing(true); else setLoading(true);
    const list = await getChildren();
    if (list.length === 0) {
      setHasChildren(false);
      setLoading(false);
      return;
    }

    const savedId = targetChildId
      ?? (typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null);
    const child = list.find(c => c.id === savedId) ?? list[0];
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_CHILD_KEY, child.id);

    // Ensure milestone badges are up-to-date before reading child_badges.
    // This is idempotent — safe to call on every profile load.
    await awardMilestoneBadges(child.id, child.language);

    const [wStreak, wCounts, stars, dates, badges, streak, stories] = await Promise.all([
      getWeekStreak(child.id, child.language),
      getWeekActivityCounts(child.id, child.language),
      getTotalStars(child.id, child.language),
      getActivityDates(child.id, child.language),
      getChildBadges(child.id),
      getConsecutiveStreak(child.id, child.language),
      getCompletedStoriesCount(child.id, child.language),
    ]);

    if (silent && gen !== switchGenRef.current) return;

    setAllChildren(list);
    setChildName(child.name);
    setActiveChild(child);
    activeChildRef.current = child;

    setWeekStreak(wStreak);
    setWeekCounts(wCounts);
    setTotalStars(stars);
    setActivityDates(dates);
    setBadgeCount(badges.length);
    setEarnedBadgeSlugs(badges.map(b => b.badge_slug));
    setCurrentStreak(streak);
    setStoriesCompleted(stories);
    if (silent) setRefreshing(false); else setLoading(false);
  }, []);

  const handleSaveProfile = async (newName: string, newAvatarUrl: string) => {
    if (!activeChild) return;
    await updateChild(activeChild.id, { name: newName, avatar_url: newAvatarUrl });
    await loadProgress(activeChild.id);
  };

  useEffect(() => {
    void loadProgress();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadProgress();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadProgress]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const child = activeChildRef.current;
        if (!child) return;
        await loadProgress(child.id, true);
      }, 200);
    };
    window.addEventListener("app:languageChange", handler as EventListener);
    return () => {
      window.removeEventListener("app:languageChange", handler as EventListener);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [loadProgress]);

  const handleChildSwitch = (childId: string) => {
    void loadProgress(childId);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto w-full pb-24 px-4 space-y-4 pt-2">
          <div className="rounded-3xl border border-gray-100 p-5 flex items-center gap-4">
            <Bone className="w-16 h-16 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-5 w-36" />
              <Bone className="h-3 w-24" />
            </div>
          </div>
          <div className="rounded-3xl border border-gray-100 p-5 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <Bone className="h-7 w-12 mx-auto" />
                <Bone className="h-2.5 w-10 mx-auto" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-9 flex-1 rounded-full" />)}
          </div>
          <div className="rounded-3xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-4">
              <Bone className="w-[72px] h-[72px] rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-28" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-1">
                <Bone className="w-6 h-6 rounded-lg shrink-0" />
                <Bone className="h-3 flex-1" />
                <Bone className="w-5 h-5 rounded-full shrink-0" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Bone className="h-28 rounded-3xl" />
            <Bone className="h-28 rounded-3xl" />
          </div>
          <div className="rounded-3xl border border-gray-100 p-5 space-y-3">
            <Bone className="h-4 w-28" />
            <Bone className="h-2 w-full rounded-full" />
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <Bone key={i} className="aspect-square rounded-full" />)}
            </div>
          </div>
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
      <RefreshingBadge show={refreshing} />
      <PageSurface>
        <main className={`max-w-lg mx-auto px-4 sm:px-5 py-4 pb-28 flex-1 w-full content-enter transition-opacity duration-300${refreshing ? " opacity-50 pointer-events-none" : ""}`}>
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
                  storiesCompleted={storiesCompleted}
                  currentStreak={currentStreak}
                />
                <WeeklyActivityChart weekCounts={weekCounts} />
                <MilestoneBadgesCard earnedSlugs={earnedBadgeSlugs} />
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
