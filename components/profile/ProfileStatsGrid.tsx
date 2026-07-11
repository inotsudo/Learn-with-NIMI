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
    { icon: ListChecks, iconBg: "bg-blue-100", iconColor: "text-blue-600", value: activitiesCompleted, labelKey: "statActivitiesLabel" },
    { icon: Star, iconBg: "bg-yellow-100", iconColor: "text-yellow-600", value: starsCollected, labelKey: "statStarsLabel" },
    { icon: Award, iconBg: "bg-[var(--ds-brand-subtle)]", iconColor: "text-[var(--ds-brand-primary)]", value: badgesEarned, labelKey: "statBadgesLabel" },
    { icon: GraduationCap, iconBg: "bg-[var(--ds-brand-subtle)]", iconColor: "text-[var(--ds-brand-primary)]", value: certificates, labelKey: "statCertificatesLabel" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
          <div className={`w-10 h-10 ${stat.iconBg} rounded-full flex items-center justify-center mb-2`}>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <p className="font-black text-2xl text-ds-text">{stat.value}</p>
          <p className="text-gray-500 text-xs font-semibold mt-0.5">{t(stat.labelKey)}</p>
        </div>
      ))}
    </div>
  );
}
