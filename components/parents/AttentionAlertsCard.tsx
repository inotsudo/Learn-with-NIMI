"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { fillTemplate, LANGUAGE_META } from "@/app/_achievementData";
import type { DashboardAlert } from "@/lib/parentInsights";

interface Props {
  alerts: DashboardAlert[];
}

const ALERT_STYLE: Record<DashboardAlert["type"], { emoji: string; border: string; bg: string; text: string }> = {
  languageInactive: { emoji: "😴", border: "border-amber-300/40", bg: "bg-amber-400/20", text: "text-amber-200" },
  levelIncomplete: { emoji: "⏳", border: "border-amber-300/40", bg: "bg-amber-400/20", text: "text-amber-200" },
  streakAtRisk: { emoji: "🔥", border: "border-red-300/40", bg: "bg-red-400/20", text: "text-red-200" },
};

function alertMessage(alert: DashboardAlert, t: (key: string) => string): string {
  switch (alert.type) {
    case "languageInactive":
      return fillTemplate(t("alertLanguageInactive"), {
        flag: LANGUAGE_META[alert.language!].flag,
        language: LANGUAGE_META[alert.language!].label,
        days: String(alert.daysSince ?? 0),
      });
    case "levelIncomplete":
      return fillTemplate(t("alertLevelIncomplete"), {
        level: String(alert.level ?? ""),
        flag: LANGUAGE_META[alert.language!].flag,
        language: LANGUAGE_META[alert.language!].label,
        days: String(alert.daysSince ?? 0),
      });
    case "streakAtRisk":
      return fillTemplate(t("alertStreakAtRisk"), { streak: String(alert.currentStreak ?? 0) });
  }
}

export default function AttentionAlertsCard({ alerts }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
      <p className="font-black text-white mb-2">{t("attentionAlertsTitle")}</p>
      <div className="flex flex-col gap-2">
        {alerts.map((alert, i) => {
          const style = ALERT_STYLE[alert.type];
          return (
            <div key={i} className={`flex items-start gap-2 rounded-xl border-2 backdrop-blur ${style.border} ${style.bg} px-3 py-2`}>
              <span className="text-lg shrink-0">{style.emoji}</span>
              <p className={`text-sm font-bold ${style.text}`}>{alertMessage(alert, t)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
