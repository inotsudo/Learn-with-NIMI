"use client";

import { ImagePlus, Pencil, Bell, Shield, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ROWS = [
  { icon: ImagePlus, bg: "bg-purple-100", color: "text-purple-600", labelKey: "changeAvatarLabel" },
  { icon: Pencil, bg: "bg-blue-100", color: "text-blue-600", labelKey: "editNameLabel" },
  { icon: Bell, bg: "bg-orange-100", color: "text-orange-600", labelKey: "notificationSettingsLabel" },
  { icon: Shield, bg: "bg-green-100", color: "text-green-600", labelKey: "privacySettingsLabel" },
];

export default function AccountSettingsCard() {
  const { t } = useLanguage();

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-gray-800 mb-2">{t("accountSettingsTitle")}</h3>
      {ROWS.map((row, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
          <div className={`w-9 h-9 ${row.bg} rounded-full flex items-center justify-center shrink-0`}>
            <row.icon className={`w-4 h-4 ${row.color}`} />
          </div>
          <span className="font-bold text-sm text-gray-700 flex-1">{t(row.labelKey)}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      ))}
    </div>
  );
}
