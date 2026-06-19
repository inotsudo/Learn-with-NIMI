"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES } from "@/app/_activityData";

interface Props {
  stepsCompleted: number[];
}

const BADGE_TITLES: Record<number, string> = {
  1: "Morning Star",
  2: "Movement Master",
  3: "Creative Artist",
  4: "History Explorer",
  5: "Zoom Detective",
  6: "Discovery Champ",
  7: "Story Reader",
  8: "Coloring Star",
};

const BADGE_MAP = ACTIVITIES.map(a => ({
  step: a.number,
  title: BADGE_TITLES[a.number] ?? a.titleKey,
  icon: a.emoji,
  bg: a.numBgGlass,
}));

export default function RecentBadgesCard({ stepsCompleted }: Props) {
  const { t } = useLanguage();

  const recentSteps = stepsCompleted.slice(-3).reverse();
  const recentBadges = recentSteps
    .map(step => BADGE_MAP.find(b => b.step === step))
    .filter((b): b is typeof BADGE_MAP[number] => !!b);

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
      <p className="font-black text-white mb-3">{t("recentBadgesTitle")}</p>

      {recentBadges.length === 0 ? (
        <p className="text-purple-300 text-sm text-center py-2">{t("noBadgesYet")}</p>
      ) : (
        <div className="flex items-center gap-4 flex-wrap">
          {recentBadges.map(badge => (
            <div key={badge.step} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 ${badge.bg} rounded-full flex items-center justify-center text-2xl shadow-md`}>
                {badge.icon}
              </div>
              <p className="text-[10px] text-center leading-tight font-semibold text-purple-200 max-w-[64px]">
                {badge.title}
              </p>
              <span className="text-xs leading-none text-yellow-500">⭐</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
