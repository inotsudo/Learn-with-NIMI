"use client";

import { BookOpen, HelpCircle, AlertTriangle, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HelpActionCards() {
  const { t } = useLanguage();

  const scrollToFaq = () => {
    document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const CARDS = [
    { icon: BookOpen, color: "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]", titleKey: "howToUseTitle", descKey: "howToUseDesc", action: scrollToFaq },
    { icon: HelpCircle, color: "bg-blue-100 text-blue-600", titleKey: "faqsTitle", descKey: "faqsDesc", action: scrollToFaq },
    { icon: AlertTriangle, color: "bg-red-100 text-red-600", titleKey: "reportIssueTitle", descKey: "reportIssueDesc", action: () => window.open("mailto:support@nimipiko.com?subject=Bug Report", "_self") },
    { icon: Mail, color: "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]", titleKey: "contactUsTitle", descKey: "contactUsDesc", action: () => window.open("mailto:support@nimipiko.com", "_self") },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map(card => (
        <button
          key={card.titleKey}
          onClick={card.action}
          className="bg-white border border-ds-border shadow-ds-card p-4 flex flex-col items-center text-center gap-2 hover:bg-gray-50 active:scale-[0.97] transition" style={{ borderRadius: 'var(--leaf-r)' }}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${card.color}`}>
            <card.icon className="w-6 h-6" />
          </div>
          <p className="font-black text-ds-text text-sm">{t(card.titleKey)}</p>
          <p className="text-gray-500 text-xs">{t(card.descKey)}</p>
        </button>
      ))}
    </div>
  );
}
