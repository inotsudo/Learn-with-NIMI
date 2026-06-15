"use client";

import { BookOpen, ListChecks, Award, GraduationCap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STATS = [
  { icon: BookOpen, iconBg: "bg-blue-100", iconColor: "text-blue-600", borderColor: "border-blue-100", value: 15, labelKey: "statStoriesReadLabel" },
  { icon: ListChecks, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", borderColor: "border-indigo-100", value: 48, labelKey: "statActivitiesLabel" },
  { icon: Award, iconBg: "bg-purple-100", iconColor: "text-purple-600", borderColor: "border-purple-100", value: 18, labelKey: "statBadgesLabel" },
  { icon: GraduationCap, iconBg: "bg-green-100", iconColor: "text-green-600", borderColor: "border-green-100", value: 6, labelKey: "statCertificatesLabel" },
];

export default function ProfileStatsGrid() {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {STATS.map((stat, i) => (
        <div key={i} className={`bg-white border-2 ${stat.borderColor} rounded-2xl shadow-sm p-4`}>
          <div className={`w-10 h-10 ${stat.iconBg} rounded-full flex items-center justify-center mb-2`}>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <p className="font-black text-2xl text-gray-800">{stat.value}</p>
          <p className="text-gray-500 text-xs font-semibold mt-0.5">{t(stat.labelKey)}</p>
        </div>
      ))}
    </div>
  );
}
