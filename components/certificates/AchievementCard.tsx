"use client";

import { Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fillTemplate, type AchievementItem, type AchievementTier } from "@/app/_achievementData";

interface Props {
  item: AchievementItem;
  earnedAt: string | null;
  childName: string;
}

const TIER_STYLES: Record<AchievementTier, { border: string; iconBg: string; text: string }> = {
  languageExplorer: { border: "border-amber-300", iconBg: "bg-amber-500", text: "text-amber-600" },
  explorer: { border: "border-purple-300", iconBg: "bg-purple-500", text: "text-purple-600" },
  categoryMaster: { border: "border-blue-300", iconBg: "bg-blue-500", text: "text-blue-600" },
};

export default function AchievementCard({ item, earnedAt, childName }: Props) {
  const { t } = useLanguage();
  const earned = earnedAt !== null;
  const style = TIER_STYLES[item.tier];

  return (
    <div
      className={`relative bg-white rounded-2xl border-4 border-dashed shadow-sm p-5 text-center ${
        earned ? style.border : "border-gray-200 grayscale opacity-80"
      }`}
    >
      <span className="absolute top-2 left-2 text-yellow-400 text-sm">⭐</span>
      <span className="absolute top-2 right-2 text-yellow-400 text-sm">⭐</span>

      {earned ? (
        <div className={`w-16 h-16 rounded-full ${style.iconBg} flex items-center justify-center text-3xl mx-auto shadow-md`}>
          {item.emoji}
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto shadow-md">
          <Lock className="w-7 h-7 text-gray-400" />
        </div>
      )}
      <p className={`font-black text-xs uppercase tracking-wide mt-3 ${earned ? style.text : "text-gray-400"}`}>
        {fillTemplate(t(item.titleKey), item.titleParams)}
      </p>
      {earned ? (
        <p className="text-gray-700 font-bold text-sm mt-1">
          {t("awardedTo").replace("{name}", childName.toUpperCase())}
        </p>
      ) : (
        <p className="text-gray-400 font-bold text-sm mt-1">{t("certLockedMessage")}</p>
      )}
      <p className="text-gray-400 text-xs mt-1 px-1">{fillTemplate(t(item.descKey), item.descParams)}</p>
    </div>
  );
}
