"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useMotion } from "@/hooks/useMotion";

export default function KeepGoingCard() {
  const { themeId } = useAppTheme();
  const { t } = useLanguage();
  const assets = getThemeAssets(themeId);
  const m = useMotion();

  return (
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/50 to-white p-4 flex flex-col items-center text-center justify-center h-full shadow-[0_16px_34px_rgba(15,23,42,0.08)]" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_48%)]" />
      <motion.span className="absolute top-3 right-3 text-yellow-400/30 text-[10px]"
        animate={m.glowPulse.animate}
        transition={{ ...m.glowPulse.transition, duration: 2 }}>✦</motion.span>

      <div className="relative z-10 bg-white/80 border border-[var(--ds-border-brand)]/20 rounded-xl px-3 py-1.5 mb-3 shadow-sm">
        <h3 className="font-black text-[var(--ds-brand-primary)] text-[11px] tracking-wide">{t("keepGoingLabel")}</h3>
      </div>

      <p className="text-gray-400 text-[10px] leading-snug max-w-[120px]">
        {t("keepGoingDesc")}
      </p>

      <motion.div
        animate={m.floatRotate(3).animate}
        transition={m.floatRotate(3).transition}
        className="mt-3 relative">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20 border border-yellow-300/30" style={{ borderRadius: 'var(--leaf-r)' }}>
          <Star className="w-6 h-6 text-white fill-white" />
        </div>
        <motion.span className="absolute -top-1 -right-1 text-yellow-300/60 text-[10px]"
          animate={m.starPulse().animate}
          transition={{ ...m.starPulse().transition, duration: 1.5 }}>✦</motion.span>
      </motion.div>

      <motion.img src={assets.nimiCircle} alt="NIMI"
        className="w-9 h-9 rounded-full border-2 border-yellow-400/50 shadow-md mt-2"
        animate={m.scalePulse.animate}
        transition={{ ...m.scalePulse.transition, delay: 1 }} />
    </div>
  );
}
