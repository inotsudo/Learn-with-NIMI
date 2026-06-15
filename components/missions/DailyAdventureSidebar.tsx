"use client";

import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  activitiesCompleted: number;
}

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function DailyAdventureSidebar({ activitiesCompleted }: Props) {
  const { t } = useLanguage();

  const pct = (activitiesCompleted / 8) * 100;
  const dashoffset = RING_CIRCUMFERENCE * (1 - pct / 100);
  const filledStars = Math.round((activitiesCompleted / 8) * 5);
  const champion = activitiesCompleted === 8;

  return (
    <div className="flex flex-col gap-4">
      {/* Today's Progress */}
      <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-md p-4 text-center">
        <div className="relative w-24 h-24 mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="#ede9fe" strokeWidth="10" />
            <circle
              cx="50" cy="50" r={RING_RADIUS} fill="none"
              stroke="#9333ea" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black text-purple-700 text-lg">{activitiesCompleted}/8</span>
          </div>
          <img
            src="/nimi-logo-circle.png"
            alt="NIMI"
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full object-cover border-2 border-white shadow"
          />
        </div>
        <p className="font-black text-gray-800 text-sm mt-3">
          {t("activitiesCompletedLabel").replace("{count}", String(activitiesCompleted))}
        </p>
        <p className="text-gray-500 text-xs mt-1">🏅 {t("completeAllEarnStars")}</p>
      </div>

      {/* Activity Stars */}
      <div className="bg-white border-2 border-yellow-200 rounded-2xl shadow-md p-4 text-center">
        <p className="font-black text-gray-800 text-sm mb-2">{t("activityStarsTitle")}</p>
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
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-md p-4 text-white text-center">
        <p className="font-black text-sm mb-2">🏆 {t("dailyChampionRewardTitle")}</p>
        {champion ? (
          <div className="bg-yellow-400 text-purple-900 font-black text-xs uppercase rounded-full py-2 px-3 shadow">
            {t("claimRewardBtn")}
          </div>
        ) : (
          <div className="bg-white/15 text-indigo-100 font-black text-xs uppercase rounded-full py-2 px-3 flex items-center justify-center gap-1.5">
            🔒 {t("dailyChampionRewardLocked")}
          </div>
        )}
      </div>

      {/* PIKO encouragement */}
      <div className="bg-white border-2 border-blue-200 rounded-2xl shadow-md p-3 flex items-center gap-3">
        <img
          src="/piko-logo-circle.png.png"
          alt="PIKO"
          className="w-12 h-12 rounded-full object-cover border-2 border-blue-300 shadow shrink-0"
        />
        <div className="bg-blue-50 rounded-xl rounded-tl-none px-3 py-2">
          <p className="text-gray-700 text-xs font-semibold">{t("pikoEncouragement")}</p>
        </div>
      </div>
    </div>
  );
}
