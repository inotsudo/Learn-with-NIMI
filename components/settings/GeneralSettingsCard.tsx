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
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-green-500" : "bg-gray-300"}`}
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
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-white mb-2">{t("generalSettingsTitle")}</h3>

      <div className="flex items-center gap-3 py-3 border-b border-white/15">
        <div className="w-9 h-9 theme-accent-muted rounded-full flex items-center justify-center shrink-0">
          <Volume2 className="w-4 h-4 theme-text" />
        </div>
        <span className="font-bold text-sm theme-text flex-1">{t("soundEffectsLabel")}</span>
        <ToggleSwitch on={soundOn} onClick={toggleSound} />
      </div>

      <div className="flex items-center gap-3 py-3 last:border-0">
        <div className="w-9 h-9 bg-green-400/20 rounded-full flex items-center justify-center shrink-0">
          <Mic className="w-4 h-4 text-green-200" />
        </div>
        <span className="font-bold text-sm theme-text flex-1">{t("voiceNarrationLabel")}</span>
        <ToggleSwitch on={isReaderActive} onClick={toggleReader} />
      </div>
    </div>
  );
}
