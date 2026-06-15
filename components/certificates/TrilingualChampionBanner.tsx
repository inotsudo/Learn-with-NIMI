"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGE_META, LANGUAGES, type TrilingualStatus } from "@/app/_achievementData";

// Same confetti recipe as components/home/CertificatePanel.tsx's "all complete" state.
const CONFETTI = [
  { color: "#FFD700", top: "18%", left: "5%"  },
  { color: "#FF6B6B", top: "55%", left: "3%"  },
  { color: "#4ECDC4", top: "80%", left: "8%"  },
  { color: "#45B7D1", top: "10%", left: "18%" },
  { color: "#96CEB4", top: "70%", left: "20%" },
  { color: "#FFEAA7", top: "30%", left: "88%" },
  { color: "#DDA0DD", top: "15%", left: "75%" },
  { color: "#FF9800", top: "60%", left: "92%" },
  { color: "#4CAF50", top: "85%", left: "80%" },
  { color: "#E91E63", top: "40%", left: "95%" },
];

interface Props {
  status: TrilingualStatus;
  childName: string;
}

export default function TrilingualChampionBanner({ status, childName }: Props) {
  const { t } = useLanguage();

  if (status.earned) {
    return (
      <div
        className="relative overflow-hidden rounded-3xl shadow-2xl border-4 border-yellow-300 text-center py-6 px-4 mb-5"
        style={{ background: "linear-gradient(180deg, #5b21b6 0%, #4c1d95 100%)" }}
      >
        {CONFETTI.map((c, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{ background: c.color, top: c.top, left: c.left, width: i % 2 === 0 ? 8 : 5, height: i % 2 === 0 ? 8 : 5 }}
            animate={{ y: [-4, 4, -4], rotate: [0, 180, 360], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8 + i * 0.15, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
        <span className="relative z-10 text-5xl drop-shadow-lg">🌍🏆</span>
        <motion.p
          className="relative z-10 font-black text-yellow-300 tracking-widest uppercase mt-2"
          style={{ fontSize: "clamp(1.1rem, 3vw, 1.5rem)", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {t("trilingualChampionTitle")}
        </motion.p>
        <p className="relative z-10 text-white font-bold text-sm mt-1">
          {t("awardedTo").replace("{name}", childName.toUpperCase())}
        </p>
        <p className="relative z-10 text-purple-200 text-xs mt-1 px-4">{t("trilingualChampionDesc")}</p>
        <div className="relative z-10 flex justify-center gap-2 mt-3">
          {LANGUAGES.map(lang => (
            <span key={lang} className="text-2xl">{LANGUAGE_META[lang].flag}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-4 border-dashed border-gray-200 rounded-3xl shadow-sm p-5 text-center mb-5">
      <span className="text-4xl">🌍</span>
      <p className="font-black text-gray-700 text-sm uppercase tracking-wide mt-2">{t("trilingualChampionTitle")}</p>
      <p className="text-gray-400 text-xs mt-1 px-2">{t("trilingualChampionDesc")}</p>
      <div className="flex justify-center gap-4 mt-3">
        {LANGUAGES.map(lang => (
          <div key={lang} className={`flex flex-col items-center gap-1 ${status.languages[lang] ? "" : "opacity-40 grayscale"}`}>
            <span className="text-2xl">{LANGUAGE_META[lang].flag}</span>
            <span className={`text-xs ${status.languages[lang] ? "text-green-500" : "text-gray-300"}`}>
              {status.languages[lang] ? "✓" : "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-purple-600 font-bold text-xs mt-2">
        {t("trilingualChampionProgress").replace("{progress}", String(status.progress))}
      </p>
      <p className="text-gray-400 font-bold text-sm mt-0.5">{childName}</p>
    </div>
  );
}
