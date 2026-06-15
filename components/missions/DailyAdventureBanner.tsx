"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const BANNER_STARS = [
  { top: "8%",  left: "8%",  color: "#FFD700", shape: "✦", size: "14px" },
  { top: "75%", left: "5%",  color: "#E91E63", shape: "★", size: "12px" },
  { top: "10%", left: "92%", color: "#9C27B0", shape: "✶", size: "13px" },
  { top: "78%", left: "94%", color: "#4CAF50", shape: "✦", size: "14px" },
  { top: "85%", left: "50%", color: "#2196F3", shape: "★", size: "11px" },
  { top: "5%",  left: "50%", color: "#FF9800", shape: "✦", size: "12px" },
];

interface Props {
  themeTitle: string;
  themeEmoji: string;
  level: number;
}

export default function DailyAdventureBanner({ themeTitle, themeEmoji, level }: Props) {
  const { t } = useLanguage();

  return (
    <div className="relative bg-white border-2 border-purple-200 rounded-3xl shadow-md p-4 sm:p-6 overflow-hidden">
      {/* Decorative background stars */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {BANNER_STARS.map((s, i) => (
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

      {/* Ribbon row with mascots */}
      <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-6">
        <motion.div
          className="flex-shrink-0"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <img
            src="/nimi-logo-circle.png"
            alt="NIMI"
            className="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-yellow-400 shadow-lg"
          />
        </motion.div>

        <div
          className="flex-1 max-w-2xl text-center py-3 sm:py-5 px-6 sm:px-10"
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #7c3aed 100%)",
            clipPath: "polygon(2% 0%, 98% 0%, 100% 50%, 98% 100%, 2% 100%, 0% 50%)",
          }}
        >
          <p className="text-white font-black text-base sm:text-2xl md:text-3xl tracking-widest uppercase">
            ⭐ {t("levelAdventureTitle").replace("{level}", String(level))} ⭐
          </p>
        </div>

        <motion.div
          className="flex-shrink-0"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
        >
          <img
            src="/piko-logo-circle.png.png"
            alt="PIKO"
            className="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-blue-300 shadow-lg"
          />
        </motion.div>
      </div>

      {/* Subtitle */}
      <p className="relative z-10 text-center text-gray-600 text-xs sm:text-sm font-semibold mt-4 max-w-xl mx-auto">
        {t("levelAdventureSubtitle")}
      </p>

      {/* Today's Theme box */}
      <div className="relative z-10 mt-3 mx-auto max-w-sm bg-yellow-50 border-2 border-yellow-300 rounded-2xl py-2 px-4 text-center">
        <p className="text-purple-700 font-black text-sm sm:text-base">
          ⭐ {t("todaysThemeLabel").replace("{title}", themeTitle).replace("{emoji}", themeEmoji)} ⭐
        </p>
      </div>

      {/* Divider */}
      <div className="relative z-10 mt-4 flex items-center justify-center">
        <div className="bg-purple-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-full px-4 py-1.5 shadow">
          {t("activitiesDivider")}
        </div>
      </div>
    </div>
  );
}
