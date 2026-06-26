"use client";

import { ListChecks, Star, Award, GraduationCap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  activitiesCompleted: number;
  starsCollected: number;
  badgesEarned: number;
  certificates: number;
}

export default function ProfileStatsGrid({ activitiesCompleted, starsCollected, badgesEarned, certificates }: Props) {
  const { t } = useLanguage();

  const stats = [
    { icon: ListChecks, iconBg: "bg-blue-400/20", iconColor: "text-blue-200", value: activitiesCompleted, labelKey: "statActivitiesLabel" },
    { icon: Star, iconBg: "bg-yellow-400/20", iconColor: "text-yellow-200", value: starsCollected, labelKey: "statStarsLabel" },
    { icon: Award, iconBg: "theme-accent-muted", iconColor: "theme-text", value: badgesEarned, labelKey: "statBadgesLabel" },
    { icon: GraduationCap, iconBg: "bg-green-400/20", iconColor: "text-green-200", value: certificates, labelKey: "statCertificatesLabel" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {stats.map((stat, i) => (
        <div key={i} className={`bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4`}>
          <div className={`w-10 h-10 ${stat.iconBg} rounded-full flex items-center justify-center mb-2`}>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <p className="font-black text-2xl text-white">{stat.value}</p>
          <p className="theme-text text-xs font-semibold mt-0.5">{t(stat.labelKey)}</p>
        </div>
      ))}
    </div>
  );
}
