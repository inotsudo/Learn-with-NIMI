"use client";

import { BookOpen, HelpCircle, AlertTriangle, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CARDS = [
  { icon: BookOpen, color: "bg-purple-100 text-purple-600", titleKey: "howToUseTitle", descKey: "howToUseDesc" },
  { icon: HelpCircle, color: "bg-blue-100 text-blue-600", titleKey: "faqsTitle", descKey: "faqsDesc" },
  { icon: AlertTriangle, color: "bg-red-100 text-red-600", titleKey: "reportIssueTitle", descKey: "reportIssueDesc" },
  { icon: Mail, color: "bg-green-100 text-green-600", titleKey: "contactUsTitle", descKey: "contactUsDesc" },
] as const;

export default function HelpActionCards() {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map(card => (
        <div
          key={card.titleKey}
          className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col items-center text-center gap-2"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${card.color}`}>
            <card.icon className="w-6 h-6" />
          </div>
          <p className="font-black text-gray-800 text-sm">{t(card.titleKey)}</p>
          <p className="text-gray-400 text-xs">{t(card.descKey)}</p>
        </div>
      ))}
    </div>
  );
}
