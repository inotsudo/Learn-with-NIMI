"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

interface Props {
  activitiesCompleted: number;
}

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function DailyAdventureSidebar({ activitiesCompleted }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const pct = (activitiesCompleted / 8) * 100;
  const dashoffset = RING_CIRCUMFERENCE * (1 - pct / 100);
  const filledStars = Math.round((activitiesCompleted / 8) * 5);
  const champion = activitiesCompleted === 8;

  return (
    <div className="flex flex-col gap-4">
      {/* Today's Progress */}
      <div className="bg-white border border-ds-border shadow-ds-card p-4 text-center" style={{ borderRadius: 'var(--leaf-r)' }}>
        <div className="relative w-24 h-24 mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r={RING_RADIUS} fill="none"
              stroke="var(--ds-progress-fill)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black text-ds-text text-lg">{activitiesCompleted}/8</span>
          </div>
          <img
            src={assets.nimiCircle}
            alt="NIMI"
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full object-cover border-2 border-white shadow"
          />
        </div>
        <p className="font-black text-ds-text text-sm mt-3">
          {t("activitiesCompletedLabel").replace("{count}", String(activitiesCompleted))}
        </p>
        <p className="text-gray-500 text-xs mt-1">🏅 {t("completeAllEarnStars")}</p>
      </div>

      {/* Activity Stars */}
      <div className="bg-white border border-ds-border shadow-ds-card p-4 text-center" style={{ borderRadius: 'var(--leaf-r)' }}>
        <p className="font-black text-ds-text text-sm mb-2">{t("activityStarsTitle")}</p>
        <div className="flex items-center justify-center gap-1 text-2xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < filledStars ? "" : "text-gray-300"}>
              {i < filledStars ? "⭐" : "☆"}
            </span>
          ))}
        </div>
        <p className="text-gray-500 text-xs mt-2">
          🎁 {t("activityStarsCount").replace("{count}", String(activitiesCompleted))}
        </p>
      </div>

      {/* Daily Champion Reward */}
      <div className="bg-gradient-to-br from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)] shadow-[0_16px_34px_rgba(22,163,74,0.16)] p-4 text-white text-center" style={{ borderRadius: 'var(--leaf-r)' }}>
        <p className="font-black text-sm mb-2">🏆 {t("dailyChampionRewardTitle")}</p>
        {champion ? (
          <div className="bg-yellow-400 text-white font-black text-xs uppercase py-2 px-3 shadow border border-yellow-500" style={{ borderRadius: 'var(--leaf-r-sm)' }}>
            {t("claimRewardBtn")}
          </div>
        ) : (
          <div className="bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)] font-black text-xs uppercase py-2 px-3 flex items-center justify-center gap-1.5" style={{ borderRadius: 'var(--leaf-r-sm)' }}>
            🔒 {t("dailyChampionRewardLocked")}
          </div>
        )}
      </div>

      {/* Nimi encouragement */}
      <div className="bg-white/95 border border-ds-border shadow-[0_14px_32px_rgba(15,23,42,0.06)] p-3 flex items-center gap-3" style={{ borderRadius: 'var(--leaf-r)' }}>
        <img
          src={assets.nimiCircle}
          alt="Nimi"
          className="w-12 h-12 rounded-full object-cover border-2 shadow shrink-0" style={{ borderColor: 'var(--nimi-green)' }}
        />
        <div className="bg-emerald-50 rounded-xl rounded-tl-none px-3 py-2">
          <p className="text-emerald-800 text-xs font-semibold">{t("pikoEncouragement")}</p>
        </div>
      </div>
    </div>
  );
}
