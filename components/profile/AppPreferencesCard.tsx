"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Volume2, VolumeX, Wifi, WifiOff, Settings2 } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useNimiReader } from "@/contexts/NimiReaderContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getQueuedCompletions, flushOfflineQueue } from "@/lib/offlineQueue";
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
      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-[var(--nimi-green)]" : "bg-gray-200"}`}
    >
      <motion.span
        animate={{ x: on ? 24 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md block"
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
    <div className="bg-ds-card border border-ds-border shadow-ds-card overflow-hidden" style={{ borderRadius: 'var(--leaf-r)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-ds-border">
        <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
          <Settings2 size={15} className="text-gray-500" />
        </div>
        <div>
          <p className="font-baloo font-black text-ds-text text-[14px] leading-tight">{t("appPreferencesTitle")}</p>
          <p className="text-ds-muted text-[11px]">{t("appPreferencesSubtitle")}</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Sound / read-aloud */}
        <div className="flex items-center gap-4 px-5 py-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isReaderActive ? "bg-emerald-100" : "bg-gray-100"}`}>
            {isReaderActive
              ? <Volume2 size={18} className="text-emerald-600" />
              : <VolumeX size={18} className="text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[13px] text-ds-text">{t("soundLabel")}</p>
            <p className="text-[11px] text-ds-muted">{t("soundDesc")}</p>
          </div>
          <ToggleSwitch on={isReaderActive} onClick={toggleReader} />
        </div>

        {/* Language */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🌍</span>
            <div>
              <p className="font-bold text-[13px] text-ds-text">{t("languageLabel")}</p>
              <p className="text-[11px] text-ds-muted">{t("languageDesc")}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map(lang => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => { if (lang.code !== language) setPendingLanguage(lang.code); }}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-center transition-all ${
                    active
                      ? "border-[var(--nimi-green)] bg-[var(--ds-brand-subtle)] shadow-sm"
                      : "border-ds-border hover:border-gray-300 bg-ds-card"
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className={`text-[10px] font-black leading-tight ${active ? "text-[var(--ds-brand-primary)]" : "text-ds-muted"}`}>
                    {lang.label}
                  </span>
                  {active && (
                    <span className="text-[8px] font-black text-[var(--ds-brand-primary)] bg-[var(--nimi-green)]/10 px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Online status + sync */}
        <div className="flex items-center gap-4 px-5 py-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOnline ? "bg-emerald-100" : "bg-orange-100"}`}>
            {isOnline
              ? <Wifi size={18} className="text-emerald-600" />
              : <WifiOff size={18} className="text-orange-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500" : "bg-orange-400"}`} />
              <p className="font-bold text-[13px] text-ds-text">
                {isOnline ? t("onlineLabel") : t("offlineLabel")}
              </p>
            </div>
            <p className="text-[11px] text-ds-muted mt-0.5">
              {pendingCount > 0
                ? t("activitiesWaitingSyncLabel").replace("{count}", String(pendingCount))
                : t("allProgressSavedLabel")}
            </p>
          </div>
          <AnimatePresence>
            {pendingCount > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={syncNow}
                disabled={syncing || !isOnline}
                className="flex items-center gap-1.5 bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)] border border-[var(--ds-border-brand)]/30 font-bold text-[11px] px-3 py-1.5 rounded-full transition disabled:opacity-50 shrink-0"
              >
                <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                {syncing ? t("syncingLabel") : t("syncNowBtn")}
              </motion.button>
            )}
          </AnimatePresence>
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
