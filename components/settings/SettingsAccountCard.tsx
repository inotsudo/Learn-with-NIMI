"use client";

import { KeyRound, Link2, Trash2, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ROWS = [
  { icon: KeyRound, bg: "bg-blue-400/20", color: "text-blue-200", textColor: "text-purple-100", labelKey: "changePasswordLabel" },
  { icon: Link2, bg: "bg-purple-400/20", color: "text-purple-200", textColor: "text-purple-100", labelKey: "linkedAccountsLabel" },
  { icon: Trash2, bg: "bg-red-400/20", color: "text-red-300", textColor: "text-red-400", labelKey: "deleteAccountLabel" },
];

export default function SettingsAccountCard() {
  const { t } = useLanguage();

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-white mb-2">{t("accountTitle")}</h3>
      {ROWS.map(row => (
        <div key={row.labelKey} className="flex items-center gap-3 py-3 border-b border-white/15 last:border-0">
          <div className={`w-9 h-9 ${row.bg} rounded-full flex items-center justify-center shrink-0`}>
            <row.icon className={`w-4 h-4 ${row.color}`} />
          </div>
          <span className={`font-bold text-sm flex-1 ${row.textColor}`}>{t(row.labelKey)}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      ))}
    </div>
  );
}
