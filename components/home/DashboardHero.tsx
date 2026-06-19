"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const HERO_STARS = [
  { top: "10%", left: "6%",  color: "#FFD700", shape: "✦", size: "13px" },
  { top: "70%", left: "4%",  color: "#E91E63", shape: "★", size: "11px" },
  { top: "15%", left: "94%", color: "#9C27B0", shape: "✶", size: "12px" },
  { top: "75%", left: "92%", color: "#4CAF50", shape: "✦", size: "13px" },
  { top: "85%", left: "50%", color: "#2196F3", shape: "★", size: "11px" },
  { top: "8%",  left: "50%", color: "#FF9800", shape: "✦", size: "12px" },
];

interface Props {
  childName: string;
  themeTitle: string;
  themeEmoji: string;
  level?: number;
}

function greetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 18) return "goodAfternoon";
  return "goodEvening";
}

export default function DashboardHero({ childName, themeTitle, themeEmoji, level }: Props) {
  const { t } = useLanguage();

  return (
    <div className="relative bg-white/10 backdrop-blur border-2 border-white/15 rounded-3xl shadow-md p-4 sm:p-6 overflow-hidden">
      {/* Current level pill */}
      {level !== undefined && (
        <div className="relative z-10 flex justify-end mb-2">
          <span className="bg-purple-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-full px-3 py-1 shadow">
            {t("levelAdventureTitle").replace("{level}", String(level))}
          </span>
        </div>
      )}

      {/* Decorative background stars */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {HERO_STARS.map((s, i) => (
          <motion.span
            key={i}
            className="absolute font-bold leading-none"
            style={{ top: s.top, left: s.left, color: s.color, fontSize: s.size }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          >
            {s.shape}
          </motion.span>
        ))}
      </div>

      {/* Greeting row */}
      <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-5">
        <motion.div
          className="flex-shrink-0"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <img
            src="/nimi-logo-circle.png"
            alt="NIMI"
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-yellow-400 shadow-lg"
          />
        </motion.div>

        <div className="text-center">
          <h1 className="font-black text-white text-lg sm:text-2xl leading-tight">
            {t(greetingKey()).replace("{name}", childName)}
          </h1>
          <p className="text-purple-300 text-xs sm:text-sm font-semibold mt-0.5">
            {t("dashboardSubtitle")}
          </p>
        </div>

        <motion.div
          className="flex-shrink-0"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
        >
          <img
            src="/piko-logo-circle.png.png"
            alt="PIKO"
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-blue-300 shadow-lg"
          />
        </motion.div>
      </div>

      {/* Theme banner — ribbon shape with pointed ends */}
      <div className="relative z-10 mt-4 sm:mt-5 mx-auto max-w-md text-center py-3 px-8 sm:px-10"
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
          clipPath: "polygon(2.5% 0%, 97.5% 0%, 100% 50%, 97.5% 100%, 2.5% 100%, 0% 50%)",
        }}>
        <p className="text-white font-black text-[11px] sm:text-xs uppercase tracking-widest">
          {t("todaysAdventure")}
        </p>
        <p className="text-yellow-300 font-bold text-sm sm:text-base mt-1">
          {t("themeLabel").replace("{title}", themeTitle).replace("{emoji}", themeEmoji)}
        </p>
      </div>
    </div>
  );
}
