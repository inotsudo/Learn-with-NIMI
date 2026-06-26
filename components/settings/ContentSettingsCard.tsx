"use client";

import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { getChildren, updateChildLanguage, type Child } from "@/lib/queries";
import LanguageSwitchDialog from "@/components/LanguageSwitchDialog";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "en" },
  { code: "fr", label: "Français", flag: "fr" },
  { code: "rw", label: "Kinyarwanda", flag: "rw" },
];

export default function ContentSettingsCard() {
  const { t, language, setLanguage } = useLanguage();
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [switching, setSwitching] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const currentLabel = LANGS.find(l => l.code === language)?.label ?? "English";

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      setActiveChild(list.find(c => c.id === savedId) ?? list[0] ?? null);
    })();
  }, []);

  const confirmSwitch = async () => {
    if (!pendingLanguage) return;
    setSwitching(true);
    if (activeChild) await updateChildLanguage(activeChild.id, pendingLanguage);
    setLanguage(pendingLanguage);
    setSwitching(false);
    setPendingLanguage(null);
  };

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-white mb-2">{t("contentSettingsTitle")}</h3>

      <div className="relative flex items-center justify-between py-3 border-b border-white/15">
        <span className="font-bold text-sm theme-text">{t("languageLabel")}</span>
        <button
          onClick={() => setShowLangDropdown(v => !v)}
          className="flex items-center gap-1.5 text-sm font-bold theme-text-muted hover:theme-text transition"
        >
          <span>{currentLabel}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        {showLangDropdown && (
          <div className="absolute right-0 top-full mt-1 theme-darker backdrop-blur-md border-2 border-white/15 rounded-xl shadow-xl overflow-hidden z-50 w-40">
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setShowLangDropdown(false);
                  if (lang.code !== language) setPendingLanguage(lang.code);
                }}
                className="flex items-center gap-2 px-3 py-2.5 w-full hover:bg-white/10 transition text-sm"
              >
                <span>{lang.flag}</span>
                <span className="font-medium theme-text">{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between py-3 border-b border-white/15">
        <span className="font-bold text-sm theme-text">{t("readingLevelLabel")}</span>
        <div className="flex items-center gap-1.5 text-sm font-bold theme-text-muted">
          <span>{t("readingLevelValue")}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>

      <div className="flex items-center justify-between py-3 last:border-0">
        <span className="font-bold text-sm theme-text">{t("contentFilterLabel")}</span>
        <div className="flex items-center gap-1.5 text-sm font-bold theme-text-muted">
          <span>{t("contentFilterValue")}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
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
