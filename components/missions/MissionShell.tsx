"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityConfig } from "@/app/_activityData";
import type { CurriculumMission } from "@/lib/queries";

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full space-y-4">

          {/* Header row */}
          <div className="flex items-center gap-3">
            <Link href="/missions"
              className="flex items-center gap-1 text-purple-700 font-bold text-sm hover:text-purple-900 transition shrink-0">
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t("backToAdventure")}</span>
            </Link>

            <div className="flex-1 text-center min-w-0">
              <h1 className="font-black text-lg sm:text-2xl text-gray-800 truncate">
                {activity.emoji} {title}
              </h1>
              {subtitle && (
                <p className="text-gray-500 text-xs sm:text-sm font-semibold truncate">{subtitle}</p>
              )}
            </div>

            <button onClick={() => setSoundOn(s => !s)}
              className="w-9 h-9 rounded-full bg-white border-2 border-purple-100 shadow-sm flex items-center justify-center text-purple-600 hover:bg-purple-50 transition shrink-0"
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
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center text-green-700 font-bold text-sm">
              {t("missionCompletedLabel")}
            </div>
          ) : null}

          {/* Content + progress */}
          <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-4 lg:items-start space-y-4 lg:space-y-0">
            <div>{children}</div>

            <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-md p-4 space-y-3">
              <p className="font-black text-gray-800 text-sm">{t("missionProgressTitle")}</p>

              <div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                    style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-center font-black text-purple-700 text-lg mt-2">
                  {completedCount}/{ACTIVITIES.length}
                </p>
              </div>

              <p className="text-gray-500 text-xs text-center">{t("missionProgressDesc")}</p>

              <div className={`rounded-xl p-2.5 text-center border ${completed ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
                <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">{t("rewardLabel")}</p>
                <p className="text-lg font-black text-yellow-600">⭐ {stars}</p>
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
                <p className="text-purple-100 text-sm mt-0.5">{tip}</p>
              </div>
            </div>
            <Link href={nextHref}
              className="bg-white text-purple-700 font-black rounded-full px-5 py-2.5 text-sm shrink-0 hover:bg-purple-50 transition">
              {nextLabel}
            </Link>
          </div>

        </main>
      </div>
    </AppShell>
  );
}
