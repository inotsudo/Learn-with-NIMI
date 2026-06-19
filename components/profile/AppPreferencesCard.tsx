"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { updateChildLanguage } from "@/lib/queries";
import type { Child } from "@/lib/queries";
import LanguageSwitchDialog from "@/components/LanguageSwitchDialog";

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English",     flag: "🇬🇧" },
  { code: "fr", label: "Français",    flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-green-500" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

interface Props {
  activeChild: Child | null;
  onLanguageChanged?: (language: Language) => void;
}

export default function AppPreferencesCard({ activeChild, onLanguageChanged }: Props) {
  const { t, language, setLanguage } = useLanguage();
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [switching, setSwitching] = useState(false);

  const confirmSwitch = async () => {
    if (!pendingLanguage) return;
    setSwitching(true);
    if (activeChild) await updateChildLanguage(activeChild.id, pendingLanguage);
    setLanguage(pendingLanguage);
    onLanguageChanged?.(pendingLanguage);
    setSwitching(false);
    setPendingLanguage(null);
  };

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-white mb-2">{t("appPreferencesTitle")}</h3>

      <div className="flex items-center justify-between py-3 border-b border-white/15">
        <span className="font-bold text-sm text-purple-100">{t("soundLabel")}</span>
        <ToggleSwitch on={soundOn} onClick={() => setSoundOn(v => !v)} />
      </div>

      <div className="flex items-center justify-between py-3 border-b border-white/15">
        <span className="font-bold text-sm text-purple-100">{t("musicLabel")}</span>
        <ToggleSwitch on={musicOn} onClick={() => setMusicOn(v => !v)} />
      </div>

      <div className="flex items-center justify-between py-3 border-b border-white/15">
        <span className="font-bold text-sm text-purple-100">{t("languageLabel")}</span>
        <select
          value={language}
          onChange={e => {
            const newLang = e.target.value as Language;
            if (newLang !== language) setPendingLanguage(newLang);
          }}
          className="bg-white/5 border-2 border-white/15 rounded-full px-3 py-1.5 text-sm font-bold text-purple-200"
        >
          {LANGS.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between py-3 last:border-0">
        <span className="font-bold text-sm text-purple-100">{t("appThemeLabel")}</span>
        <div className="flex items-center gap-1.5 bg-white/5 border-2 border-white/15 rounded-full px-3 py-1.5 text-sm font-bold text-purple-200">
          <span>🎨 {t("themeColorful")}</span>
          <ChevronDown className="w-4 h-4" />
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
