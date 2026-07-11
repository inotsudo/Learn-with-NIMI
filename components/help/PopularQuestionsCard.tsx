"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const FAQ_ITEMS = [
  { questionKey: "faqEarnStars", answerKey: "faqEarnStarsAnswer" },
  { questionKey: "faqUnlockActivities", answerKey: "faqUnlockActivitiesAnswer" },
  { questionKey: "faqOffline", answerKey: "faqOfflineAnswer" },
  { questionKey: "faqResetPassword", answerKey: "faqResetPasswordAnswer" },
] as const;

export default function PopularQuestionsCard() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div id="faq-section" className="bg-white border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
      <h3 className="font-black text-ds-text mb-2">{t("popularQuestionsTitle")}</h3>
      {FAQ_ITEMS.map((item, i) => (
        <div key={item.questionKey} className="border-b border-ds-border last:border-0">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex items-center gap-3 py-3 w-full text-left"
          >
            <span className="font-bold text-sm text-ds-text flex-1">{t(item.questionKey)}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${openIndex === i ? "rotate-180 text-[var(--ds-brand-primary)]" : ""}`}
            />
          </button>
          {openIndex === i && (
            <p className="text-gray-600 text-sm pb-3 pl-1 leading-relaxed">
              {t(item.answerKey)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
