"use client";

import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type ProgressTab = "overview" | "activity" | "skills" | "streaks";

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
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-2xl sm:text-3xl text-gray-800">{t("myProgressTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("myProgressSubtitle")}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border-2 border-gray-100 rounded-full px-4 py-2 shadow-sm text-sm font-bold text-gray-600 shrink-0">
          <span>{t("thisWeek")}</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 inline-flex flex-wrap bg-gray-100 rounded-full p-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-black transition-colors ${
              activeTab === tab.id
                ? "bg-white text-gray-800 shadow"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
