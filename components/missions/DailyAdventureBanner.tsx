"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useMotion } from "@/hooks/useMotion";
import { HeroBanner } from "@/components/layout/primitives";

const BANNER_FLOATS = [
  { top:"10%", left:"6%",  emoji:"⭐", size:14, delay:0   },
  { top:"72%", left:"5%",  emoji:"✨", size:12, delay:0.6 },
  { top:"8%",  left:"92%", emoji:"🌟", size:16, delay:0.3 },
  { top:"75%", left:"93%", emoji:"⭐", size:11, delay:1.0 },
  { top:"5%",  left:"50%", emoji:"✦",  size:12, delay:0.4 },
  { top:"80%", left:"50%", emoji:"✦",  size:10, delay:0.8 },
];

interface Props {
  themeTitle: string;
  themeEmoji: string;
  level: number;
}

export default function DailyAdventureBanner({ themeTitle, themeEmoji, level }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useMotion();

  return (
    <HeroBanner zone="activityGrounds" className="overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-8 w-44 h-44 rounded-full bg-white/10" />

      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {BANNER_FLOATS.map((s, i) => {
          const pulse = m.starPulse(i * 0.18);
          return (
            <motion.span
              key={i}
              className="absolute leading-none"
              style={{ top: s.top, left: s.left, fontSize: s.size }}
              animate={pulse.animate}
              transition={{ ...pulse.transition, duration: 2.5 + i * 0.3, delay: s.delay }}
            >
              {s.emoji}
            </motion.span>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6">
        {/* Ribbon row with mascots */}
        <div className="flex items-center justify-center gap-2 sm:gap-6">
          <motion.div
            className="flex-shrink-0"
            animate={m.floatLg.animate}
            transition={m.floatLg.transition}
          >
            <img
              src={assets.nimiCircle}
              alt="NIMI"
              className="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-yellow-400 shadow-lg"
             loading="lazy" />
          </motion.div>

          <div
            className="flex-1 max-w-2xl text-center py-3 sm:py-5 px-6 sm:px-10 shadow-[0_16px_34px_rgba(15,23,42,0.14)]"
            style={{
              background: "linear-gradient(135deg, #e89b2a 0%, #f46058 50%, #e84e4e 100%)",
              clipPath: "polygon(2% 0%, 98% 0%, 100% 50%, 98% 100%, 2% 100%, 0% 50%)",
            }}
          >
            <p className="text-white/60 text-[9px] sm:text-[10px] font-nunito font-bold uppercase tracking-[0.14em] mb-1">The Activity Grounds</p>
            <p className="text-white font-black text-base sm:text-2xl md:text-3xl tracking-widest uppercase">
              ⭐ {t("levelAdventureTitle").replace("{level}", String(level))} ⭐
            </p>
          </div>

          <motion.div
            className="flex-shrink-0 w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center shadow-lg text-3xl sm:text-5xl select-none"
            animate={m.floatLg.animate}
            transition={{ ...m.floatLg.transition, delay: 1.8 }}
          >
            {themeEmoji}
          </motion.div>
        </div>

        {/* Subtitle */}
        <p className="text-center text-white/80 text-xs sm:text-sm font-semibold mt-4 max-w-xl mx-auto">
          {t("levelAdventureSubtitle")}
        </p>

        {/* Today's Theme box */}
        <div className="mt-3 mx-auto max-w-sm bg-white/20 border border-white/30 py-2 px-4 text-center backdrop-blur-sm" style={{ borderRadius: 'var(--leaf-r)' }}>
          <p className="text-white font-black text-sm sm:text-base">
            ⭐ {t("todaysThemeLabel").replace("{title}", themeTitle).replace("{emoji}", themeEmoji)} ⭐
          </p>
        </div>

        {/* Divider */}
        <div className="mt-4 flex items-center justify-center">
          <div className="bg-white/20 border border-white/30 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-full px-4 py-1.5 shadow">
            {t("activitiesDivider")}
          </div>
        </div>
      </div>
    </HeroBanner>
  );
}
