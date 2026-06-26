"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityConfig } from "@/app/_activityData";
import type { CurriculumMission } from "@/lib/queries";
import AuthBackground from "@/components/auth/AuthBackground";

interface MissionShellProps {
  activity: ActivityConfig;
  mission: CurriculumMission | null;
  completedCount: number;
  completed: boolean;
  level: number;
  levelComplete?: boolean;
  children: ReactNode;
}

export default function MissionShell({ activity, mission, completedCount, completed, level, levelComplete, children }: MissionShellProps) {
  const { t } = useLanguage();
  const [soundOn, setSoundOn] = useState(true);

  const title = mission?.title || t(activity.titleKey);
  const subtitle = mission?.subtitle || t(activity.subtitleKey);
  const stars = mission?.stars ?? activity.stars;
  const tip = mission?.tip_text || t("defaultNimiTip");

  const nextActivity = ACTIVITIES.find(a => a.number === activity.number + 1);
  const nextHref = nextActivity ? `/missions/${nextActivity.category}` : "/missions";
  const nextLabel = nextActivity ? t("nextMissionBtn") : `← ${t("backToAdventure")}`;

  const progressPct = Math.min(100, (completedCount / ACTIVITIES.length) * 100);

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col">
        <AuthBackground />
        <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full space-y-4">

          {/* Header row */}
          <div className="flex items-center gap-3">
            <Link href="/missions"
              className="flex items-center gap-1 theme-text font-bold text-sm hover:text-white transition shrink-0">
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t("backToAdventure")}</span>
            </Link>

            <div className="flex-1 text-center min-w-0">
              <h1 className="font-black text-lg sm:text-2xl text-white truncate">
                {activity.emoji} {title}
              </h1>
              {subtitle && (
                <p className="theme-text text-xs sm:text-sm font-semibold truncate">{subtitle}</p>
              )}
            </div>

            <button onClick={() => setSoundOn(s => !s)}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border-2 border-white/15 shadow-sm flex items-center justify-center theme-text hover:bg-white/20 transition shrink-0"
              aria-label={soundOn ? t("pauseLabel") : t("playSongLabel")}>
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Level-complete / mission-complete banner */}
          {levelComplete ? (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl shadow-md p-3 text-center text-white font-black text-sm">
              {t("curriculumLevelMastered").replace("{level}", String(level))}
            </div>
          ) : completed ? (
            <div className="bg-green-400/20 backdrop-blur border border-green-300/30 rounded-2xl p-3 text-center text-green-200 font-bold text-sm">
              {t("missionCompletedLabel")}
            </div>
          ) : null}

          {/* Content + progress */}
          <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-4 lg:items-start space-y-4 lg:space-y-0">
            <div>{children}</div>

            <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4 space-y-3">
              <p className="font-black text-white text-sm">{t("missionProgressTitle")}</p>

              <div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                    style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-center font-black text-white text-lg mt-2">
                  {completedCount}/{ACTIVITIES.length}
                </p>
              </div>

              <p className="theme-text-muted text-xs text-center">{t("missionProgressDesc")}</p>

              <div className={`rounded-xl p-2.5 text-center border backdrop-blur ${completed ? "bg-green-400/20 border-green-300/30" : "bg-yellow-400/20 border-yellow-300/30"}`}>
                <p className="text-[10px] font-black uppercase tracking-wide theme-text">{t("rewardLabel")}</p>
                <p className="text-lg font-black text-yellow-200">⭐ {stars}</p>
              </div>
            </div>
          </div>

          {/* Nimi Says banner */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl shadow-md p-4 sm:p-5 text-white flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/nimi-logo-circle.png" alt="NIMI"
                className="w-12 h-12 rounded-full object-cover border-4 border-white/30 shrink-0" />
              <div className="min-w-0">
                <p className="font-black text-sm">{t("nimiSaysLabel")}</p>
                <p className="theme-text text-sm mt-0.5">{tip}</p>
              </div>
            </div>
            <Link href={nextHref}
              className="bg-white/15 backdrop-blur border border-white/25 text-white font-black rounded-full px-5 py-2.5 text-sm shrink-0 hover:bg-white/25 transition">
              {nextLabel}
            </Link>
          </div>

        </main>
      </div>
    </AppShell>
  );
}
