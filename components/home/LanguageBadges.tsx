"use client";

import Image from "next/image";
import { useState } from "react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { updateChildLanguage } from "@/lib/queries";
import type { Child } from "@/lib/queries";
import LanguageSwitchDialog from "@/components/LanguageSwitchDialog";

const LANG_BADGES: { code: Language; line1: string; line2: string; flag: string; border: string }[] = [
  { code: "fr", line1: "FRENCH",      line2: "EXPLORER", flag: "/flags/fr.svg", border: "border-green-500" },
  { code: "en", line1: "ENGLISH",     line2: "EXPLORER", flag: "/flags/us.svg", border: "border-blue-500"  },
  { code: "rw", line1: "KINYARWANDA", line2: "EXPLORER", flag: "/flags/rw.svg", border: "border-orange-400"},
];

interface LanguageBadgesProps {
  activeChild: Child | null;
  earnedLanguages: Set<Language>;
  onLanguageChanged?: (language: Language) => void;
}

export default function LanguageBadges({ activeChild, earnedLanguages, onLanguageChanged }: LanguageBadgesProps) {
  const { t, language, setLanguage } = useLanguage();
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [switching, setSwitching] = useState(false);

  const confirmSwitch = async () => {
    if (!pendingLanguage) return;
    setSwitching(true);
    if (activeChild) await updateChildLanguage(activeChild.id, pendingLanguage);
    setLanguage(pendingLanguage);
    onLanguageChanged?.(pendingLanguage);
    window.dispatchEvent(
      new CustomEvent("app:languageChange", { detail: { language: pendingLanguage } })
    );
    setSwitching(false);
    setPendingLanguage(null);
  };

  return (
    <div className="bg-white border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
      <h3 className="font-black text-ds-text text-[12px] uppercase mb-3 flex items-center gap-1.5 tracking-wide">
        {t("languageBadgesTitle")}
      </h3>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
        {/* Oval badges — tap to switch language */}
        <div className="flex justify-center gap-2 xl:flex-shrink-0">
          {LANG_BADGES.map(badge => {
            const earned = earnedLanguages.has(badge.code);
            return (
              <button
                key={badge.code}
                type="button"
                onClick={() => { if (badge.code !== language) setPendingLanguage(badge.code) }}
                className={`flex flex-col items-center bg-white border-[3px] ${earned ? badge.border : "border-gray-200"} rounded-[50%] shadow-md overflow-hidden hover:scale-105 transition-transform cursor-pointer ${badge.code === language ? "ring-2 ring-[var(--nimi-green)]" : ""}`}
                style={{ width: 68, height: 92 }}>
                <div className="w-full flex-1 overflow-hidden">
                  <Image src={badge.flag} alt={badge.line1} width={68} height={80} className="w-full h-full object-cover" />
                </div>
                <div className="pb-1 pt-0.5 text-center leading-none">
                  <p className={`text-[7px] font-black uppercase ${earned ? "text-gray-500" : "text-gray-400"}`}>{badge.line1}</p>
                  <p className={`text-[7px] font-black uppercase ${earned ? "text-gray-500" : "text-gray-400"}`}>{badge.line2}</p>
                  <span className="text-[11px] leading-none">⭐</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Description */}
        <div className="bg-gray-50 leaf p-2.5 xl:flex-1 xl:min-w-0">
          <p className="text-[9.5px] font-bold text-ds-text leading-relaxed">
            {t("languageBadgesDesc")}
          </p>
          <p className="text-[9px] text-gray-500 leading-relaxed mt-1">
            {t("languageBadgesHint")}
          </p>
          <p className="mt-1.5 text-[9px] font-black text-ds-text">
            {t("languageBadgesTapHint")}
          </p>
        </div>
      </div>

      <LanguageSwitchDialog
        pendingLanguage={pendingLanguage}
        currentLanguage={language}
        childName={activeChild?.name}
        switching={switching}
        onConfirm={confirmSwitch}
        onCancel={() => setPendingLanguage(null)}
      />
    </div>
  );
}
