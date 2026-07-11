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
    <div className="relative overflow-hidden leaf border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/35 to-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <h3 className="font-black text-ds-text mb-3">{t("contentSettingsTitle")}</h3>

      <div className="relative flex items-center justify-between py-3 border-b border-ds-border/70">
        <span className="font-bold text-sm text-ds-text">{t("languageLabel")}</span>
        <button
          onClick={() => setShowLangDropdown(v => !v)}
          className="flex items-center gap-1.5 rounded-full border border-[var(--ds-border-brand)]/20 bg-white/80 px-2.5 py-1 text-sm font-bold text-gray-500 hover:text-[var(--ds-brand-primary)] transition shadow-sm"
        >
          <span>{currentLabel}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        {showLangDropdown && (
          <div className="absolute right-0 top-full mt-1 border border-[var(--ds-border-brand)]/20 bg-white/95 shadow-[0_12px_28px_rgba(15,23,42,0.10)] rounded-xl overflow-hidden z-50 w-40">
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setShowLangDropdown(false);
                  if (lang.code !== language) setPendingLanguage(lang.code);
                }}
                className="flex items-center gap-2 px-3 py-2.5 w-full hover:bg-[var(--ds-brand-soft)] transition text-sm"
              >
                <span>{lang.flag}</span>
                <span className="font-medium text-ds-text">{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between py-3 border-b border-ds-border/70">
        <span className="font-bold text-sm text-ds-text">{t("readingLevelLabel")}</span>
        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
          <span>{t("readingLevelValue")}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>

      <div className="flex items-center justify-between py-3 last:border-0">
        <span className="font-bold text-sm text-ds-text">{t("contentFilterLabel")}</span>
        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
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
