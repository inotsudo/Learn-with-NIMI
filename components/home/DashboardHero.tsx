"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getThemeEffects } from "@/lib/design-system/themeEffects";
import FloatingParticles from "@/components/effects/FloatingParticles";
import HeroDecoration from "@/components/effects/HeroDecoration";
import DecorativeOverlay from "@/components/effects/DecorativeOverlay";
import { useMotion } from "@/hooks/useMotion";

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
  const { themeId } = useAppTheme();
  const assets  = getThemeAssets(themeId);
  const effects = getThemeEffects(themeId);
  const m = useMotion();

  return (
    <div className="relative bg-white border border-ds-border shadow-ds-card p-4 sm:p-6 overflow-hidden" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
      {/* Layer 0 — theme card overlay (inset glow + shimmer) */}
      <DecorativeOverlay effects={effects} overlayZ={0} />

      {/* Current level pill */}
      {level !== undefined && (
        <div className="relative z-10 flex justify-end mb-2">
          <span
            className="text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-full px-3 py-1 shadow"
            style={{ backgroundColor: "var(--ds-brand-primary)" }}
          >
            {t("levelAdventureTitle").replace("{level}", String(level))}
          </span>
        </div>
      )}

      {/* Decorative background — particles + hero shapes + static stars */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <FloatingParticles effects={effects} />
        <HeroDecoration   effects={effects} />
        {HERO_STARS.map((s, i) => {
          const pulse = m.starPulse(i * 0.18);
          return (
            <motion.span
              key={i}
              className="absolute font-bold leading-none"
              style={{ top: s.top, left: s.left, color: s.color, fontSize: s.size }}
              animate={pulse.animate}
              transition={{ ...pulse.transition, duration: 2.5 + i * 0.3 }}
            >
              {s.shape}
            </motion.span>
          );
        })}
      </div>

      {/* Greeting row */}
      <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-5">
        <motion.div
          className="flex-shrink-0"
          animate={m.floatMd.animate}
          transition={m.floatMd.transition}
        >
          <img
            src={assets.nimiCircle}
            alt="NIMI"
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-yellow-400 shadow-lg shadow-yellow-400/25"
           loading="lazy" />
        </motion.div>

        <div className="text-center">
          <h1 className="font-black text-ds-text text-xl sm:text-3xl leading-tight">
            {t(greetingKey()).replace("{name}", childName)}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm font-bold mt-1">
            {t("dashboardSubtitle")}
          </p>
        </div>

        <motion.div
          className="flex-shrink-0"
          animate={m.floatMd.animate}
          transition={{ ...m.floatMd.transition, delay: 1.8 }}
        >
          <img
            src={assets.pikoCircle}
            alt="PIKO"
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-blue-300 shadow-lg shadow-blue-300/25"
           loading="lazy" />
        </motion.div>
      </div>

      {/* Theme banner — ribbon shape with pointed ends */}
      <div className="relative z-10 mt-4 sm:mt-5 mx-auto max-w-md text-center py-3 px-8 sm:px-10"
        style={{
          background: "linear-gradient(135deg, var(--ds-brand-primary) 0%, var(--ds-brand-hover) 100%)",
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
