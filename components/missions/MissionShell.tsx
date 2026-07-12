"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
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
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
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
    <div className="min-h-screen bg-ds-page flex flex-col">
        <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full space-y-4">

          {/* Header row */}
          <div className="flex items-center gap-3">
            <Link href="/missions"
              className="flex items-center gap-1 text-gray-500 font-bold text-sm hover:text-gray-900 transition shrink-0">
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t("backToAdventure")}</span>
            </Link>

            <div className="flex-1 text-center min-w-0">
              <h1 className="font-black text-lg sm:text-2xl text-ds-text truncate">
                {activity.emoji} {title}
              </h1>
              {subtitle && (
                <p className="text-gray-500 text-xs sm:text-sm font-semibold truncate">{subtitle}</p>
              )}
            </div>

            <button onClick={() => setSoundOn(s => !s)}
              className="w-9 h-9 rounded-full bg-white border border-ds-border shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50 transition shrink-0"
              aria-label={soundOn ? t("pauseLabel") : t("playSongLabel")}>
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Level-complete / mission-complete banner */}
          {levelComplete ? (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 shadow-md p-3 text-center text-white font-black text-sm" style={{ borderRadius: 'var(--leaf-r)' }}>
              {t("curriculumLevelMastered").replace("{level}", String(level))}
            </div>
          ) : completed ? (
            <div className="bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/20 p-3 text-center text-[var(--ds-brand-primary)] font-bold text-sm" style={{ borderRadius: 'var(--leaf-r)' }}>
              {t("missionCompletedLabel")}
            </div>
          ) : null}

          {/* Content + progress */}
          <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-4 lg:items-start space-y-4 lg:space-y-0">
            <div>{children}</div>

            <div className="bg-white border border-ds-border shadow-ds-card p-4 space-y-3" style={{ borderRadius: 'var(--leaf-r)' }}>
              <p className="font-black text-ds-text text-sm">{t("missionProgressTitle")}</p>

              <div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-ds-progress-fill h-full rounded-full transition-all"
                    style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-center font-black text-ds-text text-lg mt-2">
                  {completedCount}/{ACTIVITIES.length}
                </p>
              </div>

              <p className="text-gray-500 text-xs text-center">{t("missionProgressDesc")}</p>

              <div className={`leaf p-2.5 text-center border ${completed ? "bg-[var(--ds-brand-subtle)] border-[var(--ds-border-brand)]/30" : "bg-yellow-50 border-yellow-200"}`}>
                <p className="text-[10px] font-black uppercase tracking-wide text-gray-600">{t("rewardLabel")}</p>
                <p className="text-lg font-black text-yellow-600">⭐ {stars}</p>
              </div>
            </div>
          </div>

          {/* Nimi Says banner */}
          <div className="bg-ds-action-subtle border border-ds-border-brand shadow-sm p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap" style={{ borderRadius: 'var(--leaf-r)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <Image src={assets.nimiCircle} alt="NIMI" width={48} height={48}
                className="w-12 h-12 rounded-full object-cover border-4 border-ds-border-brand shrink-0" />
              <div className="min-w-0">
                <p className="font-black text-gray-900 text-sm">{t("nimiSaysLabel")}</p>
                <p className="text-gray-600 text-sm mt-0.5">{tip}</p>
              </div>
            </div>
            <Link href={nextHref}
              className="bg-ds-action hover:opacity-90 text-white font-black rounded-full px-5 py-2.5 text-sm shrink-0 transition">
              {nextLabel}
            </Link>
          </div>

        </main>
      </div>
  );
}
