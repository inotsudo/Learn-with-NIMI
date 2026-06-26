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
  languageExplorer: { border: "border-amber-300", iconBg: "bg-amber-500", text: "text-amber-300" },
  explorer: { border: "theme-border-strong", iconBg: "theme-accent", text: "theme-text-muted" },
  categoryMaster: { border: "border-blue-300", iconBg: "bg-blue-500", text: "text-blue-300" },
};

export default function AchievementCard({ item, earnedAt, childName }: Props) {
  const { t } = useLanguage();
  const earned = earnedAt !== null;
  const style = TIER_STYLES[item.tier];

  return (
    <div
      className={`relative bg-white/10 backdrop-blur rounded-2xl border-4 border-dashed shadow-sm p-5 text-center ${
        earned ? style.border : "border-white/20 grayscale opacity-80"
      }`}
    >
      <span className="absolute top-2 left-2 text-yellow-400 text-sm">⭐</span>
      <span className="absolute top-2 right-2 text-yellow-400 text-sm">⭐</span>

      {earned ? (
        <div className={`w-16 h-16 rounded-full ${style.iconBg} flex items-center justify-center text-3xl mx-auto shadow-md`}>
          {item.emoji}
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center mx-auto shadow-md">
          <Lock className="w-7 h-7 theme-text" />
        </div>
      )}
      <p className={`font-black text-xs uppercase tracking-wide mt-3 ${earned ? style.text : "theme-text-muted"}`}>
        {fillTemplate(t(item.titleKey), item.titleParams)}
      </p>
      {earned ? (
        <p className="theme-text font-bold text-sm mt-1">
          {t("awardedTo").replace("{name}", childName.toUpperCase())}
        </p>
      ) : (
        <p className="theme-text-muted font-bold text-sm mt-1">{t("certLockedMessage")}</p>
      )}
      <p className="theme-text-muted text-xs mt-1 px-1">{fillTemplate(t(item.descKey), item.descParams)}</p>
    </div>
  );
}
