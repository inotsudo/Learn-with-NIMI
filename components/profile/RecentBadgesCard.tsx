"use client";

import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  stepsCompleted: number[];
}

const BADGE_MAP = [
  { step: 1, titleKey: "badgeStoryExplorer", icon: "📖", bg: "bg-purple-600" },
  { step: 2, titleKey: "badgeShinyReader", icon: "📄", bg: "bg-cyan-500" },
  { step: 3, titleKey: "badgeCreativeArtist", icon: "🎨", bg: "bg-orange-500" },
  { step: 4, titleKey: "badgeMovementMaster", icon: "🎵", bg: "bg-pink-500" },
  { step: 5, titleKey: "badgeMusicFriend", icon: "🎤", bg: "bg-teal-500" },
  { step: 6, titleKey: "badgeJourneyComplete", icon: "🏆", bg: "bg-yellow-500" },
];

export default function RecentBadgesCard({ stepsCompleted }: Props) {
  const { t } = useLanguage();

  const recentSteps = stepsCompleted.slice(-3).reverse();
  const recentBadges = recentSteps
    .map(step => BADGE_MAP.find(b => b.step === step))
    .filter((b): b is typeof BADGE_MAP[number] => !!b);

  return (
    <div className="bg-white border-2 border-yellow-200 rounded-2xl shadow-md p-4">
      <p className="font-black text-gray-800 mb-3">{t("recentBadgesTitle")}</p>

      {recentBadges.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-2">{t("noBadgesYet")}</p>
      ) : (
        <div className="flex items-center gap-4 flex-wrap">
          {recentBadges.map(badge => (
            <div key={badge.step} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 ${badge.bg} rounded-full flex items-center justify-center text-2xl shadow-md`}>
                {badge.icon}
              </div>
              <p className="text-[10px] text-center leading-tight font-semibold text-gray-600 max-w-[64px]">
                {t(badge.titleKey)}
              </p>
              <span className="text-xs leading-none text-yellow-500">⭐</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
