"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useKidTheme } from "@/contexts/ThemeProvider";

export default function ThemePicker() {
  const { themeId, setThemeId, allThemes } = useKidTheme();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <h3 className="font-baloo font-black text-white text-[18px]">Pick Your Theme!</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {allThemes.map((t, i) => {
          const active = t.id === themeId;
          return (
            <motion.button key={t.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 150 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setThemeId(t.id)}
              className={`relative rounded-2xl overflow-hidden transition-all ${
                active ? "ring-3 ring-white shadow-2xl shadow-white/10" : "ring-1 ring-white/10 hover:ring-white/30"
              }`}>
              {/* Big gradient preview */}
              <div className={`bg-gradient-to-br ${t.preview} h-24 sm:h-28 flex items-center justify-center relative`}>
                <motion.span className="text-4xl sm:text-5xl drop-shadow-lg"
                  animate={active ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}>
                  {t.emoji}
                </motion.span>

                {/* Decorative sparkles */}
                <span className="absolute top-2 left-3 text-white/25 text-[10px]">✦</span>
                <span className="absolute top-3 right-4 text-white/20 text-[8px]">⭐</span>
                <span className="absolute bottom-3 left-5 text-white/15 text-[12px]">✨</span>
                <span className="absolute bottom-2 right-3 text-white/20 text-[9px]">🌟</span>

                {active && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
                    className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </motion.div>
                )}
              </div>

              {/* Theme name */}
              <div className="py-2.5 text-center" style={{ background: t.bgCard }}>
                <p className={`font-baloo font-bold text-[13px] ${active ? "text-white" : "text-white/50"}`}>{t.name}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
