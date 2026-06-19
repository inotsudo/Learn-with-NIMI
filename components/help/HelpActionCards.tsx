"use client";

import { BookOpen, HelpCircle, AlertTriangle, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CARDS = [
  { icon: BookOpen, color: "bg-purple-400/20 text-purple-200", titleKey: "howToUseTitle", descKey: "howToUseDesc" },
  { icon: HelpCircle, color: "bg-blue-400/20 text-blue-200", titleKey: "faqsTitle", descKey: "faqsDesc" },
  { icon: AlertTriangle, color: "bg-red-400/20 text-red-300", titleKey: "reportIssueTitle", descKey: "reportIssueDesc" },
  { icon: Mail, color: "bg-green-400/20 text-green-200", titleKey: "contactUsTitle", descKey: "contactUsDesc" },
] as const;

export default function HelpActionCards() {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map(card => (
        <div
          key={card.titleKey}
          className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4 flex flex-col items-center text-center gap-2"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${card.color}`}>
            <card.icon className="w-6 h-6" />
          </div>
          <p className="font-black text-white text-sm">{t(card.titleKey)}</p>
          <p className="text-purple-300 text-xs">{t(card.descKey)}</p>
        </div>
      ))}
    </div>
  );
}
