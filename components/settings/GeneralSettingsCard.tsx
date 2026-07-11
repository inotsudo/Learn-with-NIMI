"use client";

import { useEffect, useState } from "react";
import { Volume2, Mic } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNimiReader } from "@/contexts/NimiReaderContext";
import { isSoundEffectsEnabled, setSoundEffectsEnabled } from "@/lib/soundEffects";

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-[var(--nimi-green)]" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

export default function GeneralSettingsCard() {
  const { t } = useLanguage();
  const { isReaderActive, toggleReader } = useNimiReader();
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isSoundEffectsEnabled());
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEffectsEnabled(next);
  };

  return (
    <div className="relative overflow-hidden leaf border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/35 to-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <h3 className="font-black text-ds-text mb-3">{t("generalSettingsTitle")}</h3>

      <div className="flex items-center gap-3 py-3 border-b border-ds-border/70">
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <Volume2 className="w-4 h-4 text-blue-600" />
        </div>
        <span className="font-bold text-sm text-ds-text flex-1">{t("soundEffectsLabel")}</span>
        <ToggleSwitch on={soundOn} onClick={toggleSound} />
      </div>

      <div className="flex items-center gap-3 py-3 last:border-0">
        <div className="w-9 h-9 bg-[var(--ds-brand-subtle)] rounded-full flex items-center justify-center shrink-0">
          <Mic className="w-4 h-4 text-[var(--ds-brand-primary)]" />
        </div>
        <span className="font-bold text-sm text-ds-text flex-1">{t("voiceNarrationLabel")}</span>
        <ToggleSwitch on={isReaderActive} onClick={toggleReader} />
      </div>
    </div>
  );
}
