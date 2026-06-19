"use client";

import { useState } from "react";
import { Volume2, Music, Mic, Vibrate } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ROWS = [
  { icon: Volume2, bg: "bg-purple-400/20", color: "text-purple-200", labelKey: "soundEffectsLabel", defaultOn: true },
  { icon: Music, bg: "bg-blue-400/20", color: "text-blue-200", labelKey: "backgroundMusicLabel", defaultOn: true },
  { icon: Mic, bg: "bg-green-400/20", color: "text-green-200", labelKey: "voiceNarrationLabel", defaultOn: true },
  { icon: Vibrate, bg: "bg-orange-400/20", color: "text-orange-200", labelKey: "vibrationLabel", defaultOn: false },
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

export default function GeneralSettingsCard() {
  const { t } = useLanguage();
  const [states, setStates] = useState(ROWS.map(row => row.defaultOn));

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-white mb-2">{t("generalSettingsTitle")}</h3>
      {ROWS.map((row, i) => (
        <div key={row.labelKey} className="flex items-center gap-3 py-3 border-b border-white/15 last:border-0">
          <div className={`w-9 h-9 ${row.bg} rounded-full flex items-center justify-center shrink-0`}>
            <row.icon className={`w-4 h-4 ${row.color}`} />
          </div>
          <span className="font-bold text-sm text-purple-100 flex-1">{t(row.labelKey)}</span>
          <ToggleSwitch
            on={states[i]}
            onClick={() => setStates(prev => prev.map((v, idx) => (idx === i ? !v : v)))}
          />
        </div>
      ))}
    </div>
  );
}
