"use client";

import { BookOpen, HelpCircle, AlertTriangle, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HelpActionCards() {
  const { t } = useLanguage();

  const scrollToFaq = () => {
    document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const CARDS = [
    { icon: BookOpen, color: "theme-accent-muted theme-text", titleKey: "howToUseTitle", descKey: "howToUseDesc", action: scrollToFaq },
    { icon: HelpCircle, color: "bg-blue-400/20 text-blue-200", titleKey: "faqsTitle", descKey: "faqsDesc", action: scrollToFaq },
    { icon: AlertTriangle, color: "bg-red-400/20 text-red-300", titleKey: "reportIssueTitle", descKey: "reportIssueDesc", action: () => window.open("mailto:support@nimipiko.com?subject=Bug Report", "_self") },
    { icon: Mail, color: "bg-green-400/20 text-green-200", titleKey: "contactUsTitle", descKey: "contactUsDesc", action: () => window.open("mailto:support@nimipiko.com", "_self") },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map(card => (
        <button
          key={card.titleKey}
          onClick={card.action}
          className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4 flex flex-col items-center text-center gap-2 hover:bg-white/15 active:scale-[0.97] transition"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${card.color}`}>
            <card.icon className="w-6 h-6" />
          </div>
          <p className="font-black text-white text-sm">{t(card.titleKey)}</p>
          <p className="theme-text-muted text-xs">{t(card.descKey)}</p>
        </button>
      ))}
    </div>
  );
}
