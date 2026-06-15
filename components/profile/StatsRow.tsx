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
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      borderColor: "border-indigo-100",
      value: activitiesCompleted,
      suffix: t("statOfTotal").replace("{total}", String(activitiesTotal)),
      label: t("statActivitiesLabel"),
    },
    {
      icon: Star,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-500",
      borderColor: "border-yellow-100",
      value: starsCollected,
      suffix: "",
      label: t("statStarsLabel"),
    },
    {
      icon: Award,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      borderColor: "border-purple-100",
      value: badgesEarned,
      suffix: "",
      label: t("statBadgesLabel"),
    },
    {
      icon: GraduationCap,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      borderColor: "border-green-100",
      value: certificates,
      suffix: "",
      label: t("statCertificatesLabel"),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className={`bg-white border-2 ${stat.borderColor} rounded-2xl shadow-sm p-4`}>
          <div className={`w-10 h-10 ${stat.iconBg} rounded-full flex items-center justify-center mb-2`}>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <p className="font-black text-2xl text-gray-800">
            {stat.value}
            {stat.suffix && <span className="text-sm text-gray-400 font-bold">{stat.suffix}</span>}
          </p>
          <p className="text-gray-500 text-xs font-semibold mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
