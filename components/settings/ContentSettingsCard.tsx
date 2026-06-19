"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { getChildren, updateChildLanguage, type Child } from "@/lib/queries";
import LanguageSwitchDialog from "@/components/LanguageSwitchDialog";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "rw", label: "Kinyarwanda" },
];

export default function ContentSettingsCard() {
  const { t, language, setLanguage } = useLanguage();
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [switching, setSwitching] = useState(false);
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
        <span className="font-bold text-sm text-purple-100">{t("languageLabel")}</span>
        <div className="flex items-center gap-1.5 text-sm font-bold text-purple-300">
          <span>{currentLabel}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
        <select
          value={language}
          onChange={e => setPendingLanguage(e.target.value as Language)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={t("languageLabel")}
        >
          {LANGS.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between py-3 border-b border-white/15">
        <span className="font-bold text-sm text-purple-100">{t("readingLevelLabel")}</span>
        <div className="flex items-center gap-1.5 text-sm font-bold text-purple-300">
          <span>{t("readingLevelValue")}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>

      <div className="flex items-center justify-between py-3 last:border-0">
        <span className="font-bold text-sm text-purple-100">{t("contentFilterLabel")}</span>
        <div className="flex items-center gap-1.5 text-sm font-bold text-purple-300">
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
