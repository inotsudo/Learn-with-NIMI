"use client";

import { ListChecks, Star, Award, GraduationCap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  activitiesCompleted: number;
  activitiesTotal: number;
  starsCollected: number;
  badgesEarned: number;
  certificates: number;
}

export default function StatsRow({
  activitiesCompleted, activitiesTotal, starsCollected, badgesEarned, certificates,
}: Props) {
  const { t } = useLanguage();

  const stats = [
    {
      icon: ListChecks,
      iconBg: "bg-indigo-400/20",
      iconColor: "text-indigo-200",
      borderColor: "border-indigo-100",
      value: activitiesCompleted,
      suffix: t("statOfTotal").replace("{total}", String(activitiesTotal)),
      label: t("statActivitiesLabel"),
    },
    {
      icon: Star,
      iconBg: "bg-yellow-400/20",
      iconColor: "text-yellow-200",
      borderColor: "border-yellow-100",
      value: starsCollected,
      suffix: "",
      label: t("statStarsLabel"),
    },
    {
      icon: Award,
      iconBg: "theme-accent-muted",
      iconColor: "theme-text",
      borderColor: "theme-border",
      value: badgesEarned,
      suffix: "",
      label: t("statBadgesLabel"),
    },
    {
      icon: GraduationCap,
      iconBg: "bg-green-400/20",
      iconColor: "text-green-200",
      borderColor: "border-green-100",
      value: certificates,
      suffix: "",
      label: t("statCertificatesLabel"),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className={`bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4`}>
          <div className={`w-10 h-10 ${stat.iconBg} rounded-full flex items-center justify-center mb-2`}>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <p className="font-black text-2xl text-white">
            {stat.value}
            {stat.suffix && <span className="text-sm theme-text-muted font-bold">{stat.suffix}</span>}
          </p>
          <p className="theme-text text-xs font-semibold mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
