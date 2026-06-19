"use client";

import { ImagePlus, Pencil, Bell, Shield, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ROWS = [
  { icon: ImagePlus, bg: "bg-purple-400/20", color: "text-purple-200", labelKey: "changeAvatarLabel" },
  { icon: Pencil, bg: "bg-blue-400/20", color: "text-blue-200", labelKey: "editNameLabel" },
  { icon: Bell, bg: "bg-orange-400/20", color: "text-orange-200", labelKey: "notificationSettingsLabel" },
  { icon: Shield, bg: "bg-green-400/20", color: "text-green-200", labelKey: "privacySettingsLabel" },
];

export default function AccountSettingsCard() {
  const { t } = useLanguage();

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-white mb-2">{t("accountSettingsTitle")}</h3>
      {ROWS.map((row, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-white/15 last:border-0">
          <div className={`w-9 h-9 ${row.bg} rounded-full flex items-center justify-center shrink-0`}>
            <row.icon className={`w-4 h-4 ${row.color}`} />
          </div>
          <span className="font-bold text-sm text-purple-100 flex-1">{t(row.labelKey)}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      ))}
    </div>
  );
}
