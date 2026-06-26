"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ChevronDown } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useNimiReader } from "@/contexts/NimiReaderContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getQueuedCompletions, flushOfflineQueue } from "@/lib/offlineQueue";
import { updateChildLanguage } from "@/lib/queries";
import type { Child } from "@/lib/queries";
import LanguageSwitchDialog from "@/components/LanguageSwitchDialog";

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English",     flag: "en" },
  { code: "fr", label: "Français",    flag: "fr" },
  { code: "rw", label: "Kinyarwanda", flag: "rw" },
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
  const { isReaderActive, toggleReader } = useNimiReader();
  const isOnline = useOnlineStatus();
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [switching, setSwitching] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const currentLang = LANGS.find(l => l.code === language) ?? LANGS[0];

  useEffect(() => {
    setPendingCount(getQueuedCompletions().length);
  }, [isOnline]);

  const confirmSwitch = async () => {
    if (!pendingLanguage) return;
    setSwitching(true);
    if (activeChild) await updateChildLanguage(activeChild.id, pendingLanguage);
    setLanguage(pendingLanguage);
    onLanguageChanged?.(pendingLanguage);
    setSwitching(false);
    setPendingLanguage(null);
  };

  const syncNow = async () => {
    setSyncing(true);
    await flushOfflineQueue();
    setPendingCount(getQueuedCompletions().length);
    setSyncing(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-white mb-2">{t("appPreferencesTitle")}</h3>

      <div className="flex items-center justify-between py-3 border-b border-white/15">
        <span className="font-bold text-sm theme-text">{t("soundLabel")}</span>
        <ToggleSwitch on={isReaderActive} onClick={toggleReader} />
      </div>

      <div className="flex items-center justify-between py-3 border-b border-white/15">
        <span className="font-bold text-sm theme-text">{t("languageLabel")}</span>
        <div className="relative">
          <button
            onClick={() => setShowLangDropdown(v => !v)}
            className="flex items-center gap-1.5 bg-white/5 border-2 border-white/15 rounded-full px-3 py-1.5 text-sm font-bold theme-text hover:bg-white/10 transition"
          >
            <span>{currentLang.flag} {currentLang.label}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showLangDropdown && (
            <div className="absolute right-0 mt-2 theme-darker backdrop-blur-md border-2 border-white/15 rounded-xl shadow-xl overflow-hidden z-50 w-40">
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
      </div>

      <div className="flex items-center justify-between py-3 last:border-0 gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? "bg-green-400" : "bg-orange-400"}`} />
          <span className="font-bold text-sm theme-text">
            {isOnline ? t("onlineLabel") : t("offlineLabel")}
          </span>
        </div>
        {pendingCount > 0 ? (
          <button
            onClick={syncNow}
            disabled={syncing || !isOnline}
            className="flex items-center gap-1.5 theme-accent-muted theme-text font-bold text-xs px-3 py-1.5 rounded-full hover:theme-accent-muted transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing
              ? t("syncingLabel")
              : `${t("pendingSyncCountLabel").replace("{count}", String(pendingCount))} · ${t("syncNowBtn")}`}
          </button>
        ) : (
          <span className="text-green-300 text-xs font-bold">{t("allSyncedLabel")}</span>
        )}
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
