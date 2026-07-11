"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

export default function CertificatesHeader() {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  return (
    <div className="relative leaf-lg overflow-hidden mb-6 shadow-ds-card">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400" />

      {/* Decorative bubbles */}
      <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute top-4 right-24 w-16 h-16 rounded-full bg-white/10" />

      {/* Floating stars */}
      {[
        { top: "18%", left: "8%",  size: 18, delay: 0 },
        { top: "70%", left: "12%", size: 12, delay: 0.6 },
        { top: "30%", right: "6%", size: 22, delay: 0.3 },
        { top: "75%", right: "10%", size: 14, delay: 1 },
        { top: "50%", left: "30%", size: 10, delay: 0.9 },
      ].map((s, i) => (
        <motion.span
          key={i}
          className="absolute pointer-events-none select-none"
          style={{ top: s.top, left: (s as any).left, right: (s as any).right, fontSize: s.size }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.3, 0.7], rotate: [0, 20, -20, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          aria-hidden
        >
          ⭐
        </motion.span>
      ))}

      {/* Content row */}
      <div className="relative z-10 flex items-center gap-4 px-5 py-5 sm:px-7 sm:py-6">
        {/* Trophy */}
        <motion.div
          animate={{ y: [0, -6, 0], rotate: [0, 4, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-lg border-2 border-white/30"
        >
          <span className="text-4xl sm:text-5xl">🏆</span>
        </motion.div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h1 className="font-baloo font-black text-white text-[26px] sm:text-[34px] leading-tight drop-shadow-md">
            {t("achievements")}
          </h1>
          <p className="text-white/80 text-[13px] sm:text-[14px] font-nunito font-semibold mt-0.5">
            {t("achievementsPageSubtitle")}
          </p>
        </div>

        {/* Nimi mascot */}
        <motion.img
          src={assets.nimiCircle}
          alt=""
          aria-hidden
          className="w-14 h-14 rounded-full border-2 border-white/40 shadow-lg shrink-0 hidden sm:block"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
