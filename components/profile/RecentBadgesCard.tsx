"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES } from "@/app/_activityData";

interface Props {
  stepsCompleted: number[];
}

const BADGE_KEYS: Record<number, string> = {
  1: "badgeMorningStar", 2: "badgeMovementMaster", 3: "badgeCreativeArtist",
  4: "badgeHistoryExplorer", 5: "badgeZoomDetective", 6: "badgeDiscoveryChamp",
  7: "badgeStoryReader", 8: "badgeColoringStar",
};

export default function RecentBadgesCard({ stepsCompleted }: Props) {
  const { t } = useLanguage();

  const badgeMap = ACTIVITIES.map(a => ({
    step: a.number,
    title: t(BADGE_KEYS[a.number] ?? a.titleKey),
    icon: a.emoji,
    bg: a.numBgGlass,
  }));

  const recentSteps = stepsCompleted.slice(-3).reverse();
  const recentBadges = recentSteps
    .map(step => badgeMap.find(b => b.step === step))
    .filter((b): b is typeof badgeMap[number] => !!b);

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
      <p className="font-black text-white mb-3">{t("recentBadgesTitle")}</p>

      {recentBadges.length === 0 ? (
        <p className="theme-text-muted text-sm text-center py-2">{t("noBadgesYet")}</p>
      ) : (
        <div className="flex items-center gap-4 flex-wrap">
          {recentBadges.map(badge => (
            <div key={badge.step} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 ${badge.bg} rounded-full flex items-center justify-center text-2xl shadow-md`}>
                {badge.icon}
              </div>
              <p className="text-[10px] text-center leading-tight font-semibold theme-text max-w-[64px]">
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
