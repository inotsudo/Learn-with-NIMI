"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export type ProgressTab = "overview" | "activity" | "skills" | "streaks" | "settings";

interface Props {
  activeTab: ProgressTab;
  onTabChange: (tab: ProgressTab) => void;
}

export default function ProgressHeader({ activeTab, onTabChange }: Props) {
  const { t } = useLanguage();

  const tabs: { id: ProgressTab; label: string }[] = [
    { id: "overview", label: t("overview") },
    { id: "activity", label: t("tabActivityProgress") },
    { id: "skills", label: t("tabSkills") },
    { id: "streaks", label: t("tabStreaks") },
    { id: "settings", label: "⚙️ " + t("settingsTitle") },
  ];

  return (
    <div>
      <div>
        <h1 className="font-black text-2xl sm:text-3xl text-white">{t("myProgressTitle")}</h1>
        <p className="theme-text text-sm mt-1">{t("myProgressSubtitle")}</p>
      </div>

      <div className="mt-4 inline-flex flex-wrap bg-white/10 backdrop-blur rounded-full p-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-black transition-colors ${
              activeTab === tab.id
                ? "bg-white/20 text-white shadow"
                : "theme-text-muted hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
