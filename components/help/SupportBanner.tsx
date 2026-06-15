"use client";

import { Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SupportBanner() {
  const { t } = useLanguage();

  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-md p-5 text-white flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4">
        <img
          src="/nimi-logo-circle.png"
          alt="NIMI"
          className="w-14 h-14 rounded-full object-cover border-4 border-white/30 shrink-0"
        />
        <div>
          <h3 className="font-black text-lg">{t("stillNeedHelpTitle")}</h3>
          <p className="text-purple-100 text-sm mt-0.5">{t("stillNeedHelpDesc")}</p>
        </div>
      </div>
      <button className="flex items-center gap-2 bg-white text-purple-700 font-black rounded-full px-5 py-2.5 text-sm shrink-0 hover:bg-purple-50 transition">
        <Mail className="w-4 h-4" />
        {t("emailSupportBtn")}
      </button>
    </div>
  );
}
