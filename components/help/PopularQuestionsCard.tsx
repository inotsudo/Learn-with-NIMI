"use client";

import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const QUESTION_KEYS = ["faqEarnStars", "faqUnlockActivities", "faqOffline", "faqResetPassword"] as const;

export default function PopularQuestionsCard() {
  const { t } = useLanguage();

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-gray-800 mb-2">{t("popularQuestionsTitle")}</h3>
      {QUESTION_KEYS.map(key => (
        <div key={key} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
          <span className="font-bold text-sm text-gray-700 flex-1">{t(key)}</span>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </div>
      ))}
    </div>
  );
}
