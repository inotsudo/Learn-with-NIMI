"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getChildren, getActiveStories, getCompletedMissionIds,
  getMissionsForDay, getMissionsForDayByCategory,
  getWeekStreak, getWeekActivityCounts, getChildAchievements, getTotalStars,
  getActivityDates,
} from "@/lib/queries";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import AppShell from "@/components/layout/AppShell";
import ProgressHeader, { type ProgressTab } from "@/components/profile/ProgressHeader";
import GreetingCard from "@/components/profile/GreetingCard";
import StatsRow from "@/components/profile/StatsRow";
import TodaysProgressCard from "@/components/profile/TodaysProgressCard";
import WeekStreakCard from "@/components/profile/WeekStreakCard";
import WeeklyActivityChart from "@/components/profile/WeeklyActivityChart";
import RecentBadgesCard from "@/components/profile/RecentBadgesCard";
import ActivityProgressTab from "@/components/profile/ActivityProgressTab";
import SkillsTab from "@/components/profile/SkillsTab";
import StreaksTab from "@/components/profile/StreaksTab";
import AuthBackground from "@/components/auth/AuthBackground";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";
const ACTIVITIES_TARGET = ACTIVITIES.length * 7;

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

export default function UserProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [hasChildren, setHasChildren] = useState(true);
  const [activeTab, setActiveTab] = useState<ProgressTab>("overview");
  const [childName, setChildName] = useState("Explorer");
  const [activitiesCompleted, setActivitiesCompleted] = useState(0);
  const [stepsCompleted, setStepsCompleted] = useState<number[]>([]);
  const [completedCategories, setCompletedCategories] = useState<Set<ActivityCategory>>(new Set());
  const [categoryProgress, setCategoryProgress] = useState<Record<ActivityCategory, { completed: number; total: number }>>(emptyCategoryProgress());
  const [weekStreak, setWeekStreak] = useState<boolean[]>(Array(7).fill(false));
  const [weekCounts, setWeekCounts] = useState<number[]>(Array(7).fill(0));
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());
  const [badgeCount, setBadgeCount] = useState(0);
  const [totalStars, setTotalStars] = useState(0);

  useEffect(() => {
    setMounted(true);
    void loadProgress();
  }, []);

  const loadProgress = async () => {
    const list = await getChildren();
    if (list.length === 0) {
      setHasChildren(false);
      return;
    }

    const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    const child = list.find(c => c.id === savedId) ?? list[0];
    setChildName(child.name);

    const completedIds = new Set(await getCompletedMissionIds(child.id, child.language));
    setActivitiesCompleted(completedIds.size);

    const stories = await getActiveStories();
    const steps: number[] = [];
    const progress = emptyCategoryProgress();
    if (stories.length) {
      const storyId = stories[0].id;
      for (let day = 1; day <= 6; day++) {
        const missions = await getMissionsForDay(storyId, day);
        for (const m of missions) {
          const cat = m.category as ActivityCategory | undefined;
          if (cat && cat in progress) {
            progress[cat].total++;
            if (completedIds.has(m.id)) progress[cat].completed++;
          }
        }
        if (missions.length > 0 && missions.every(m => completedIds.has(m.id))) {
          steps.push(day);
        }
      }

      const todayDay = steps.length < 6 ? steps.length + 1 : 6;
      const todaysMissions = await getMissionsForDayByCategory(storyId, todayDay);
      const completed = new Set<ActivityCategory>();
      for (const activity of ACTIVITIES) {
        const m = todaysMissions.find(x => x.category === activity.category);
        if (m && completedIds.has(m.id)) completed.add(activity.category);
      }
      setCompletedCategories(completed);
    }
    setStepsCompleted(steps);
    setCategoryProgress(progress);

    setWeekStreak(await getWeekStreak(child.id, child.language));
    setWeekCounts(await getWeekActivityCounts(child.id, child.language));
    setTotalStars(await getTotalStars(child.id, child.language));
    setActivityDates(await getActivityDates(child.id, child.language));
    const achievements = await getChildAchievements(child.id);
    setBadgeCount(achievements.filter(a => a.type === "badge" && a.language === child.language).length);
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
          <ProgressHeader activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "overview" && (
            <div className="space-y-4 mt-4">
              <GreetingCard childName={childName} />
              <StatsRow
                activitiesCompleted={activitiesCompleted}
                activitiesTotal={ACTIVITIES_TARGET}
                starsCollected={totalStars}
                badgesEarned={badgeCount}
                certificates={Math.floor(stepsCompleted.length / 6)}
              />
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
                <TodaysProgressCard completedCategories={completedCategories} />
                <WeekStreakCard weekStreak={weekStreak} activityDates={activityDates} />
              </div>
              <WeeklyActivityChart weekCounts={weekCounts} />
              <RecentBadgesCard stepsCompleted={stepsCompleted} />
            </div>
          )}
          {activeTab === "activity" && <ActivityProgressTab categoryProgress={categoryProgress} />}
          {activeTab === "skills" && <SkillsTab categoryProgress={categoryProgress} />}
          {activeTab === "streaks" && <StreaksTab activityDates={activityDates} weekStreak={weekStreak} />}
        </main>
      </div>
    </AppShell>
  );
}
