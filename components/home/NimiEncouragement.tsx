"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { useThemeMotion } from "@/hooks/useThemeMotion";

interface Props { childName: string; }

export default function NimiEncouragement({ childName }: Props) {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const cv = getComponentVariant(themeId);
  const m = useThemeMotion();

  return (
    <div className={`relative ${cv.backgroundStyle.accent} ${cv.backgroundStyle.accentBorder} ${cv.cardStyle.radius} overflow-hidden shadow-[0_16px_34px_rgba(15,23,42,0.08)]`}>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.75),transparent_45%)]" />
      <Image src={assets.storyCard.background} alt="" aria-hidden="true" fill
        className="object-cover pointer-events-none opacity-[0.08]" />

      {/* Themed sparkle ornaments */}
      {[
        { top: "10%", left: "30%", delay: 0 }, { top: "20%", right: "25%", delay: 0.5 },
        { bottom: "15%", left: "50%", delay: 1 }, { top: "50%", right: "15%", delay: 1.5 },
        { bottom: "30%", left: "20%", delay: 0.8 },
      ].map(({ delay, ...pos }, i) => {
        const glow = m.glowPulse;
        return (
          <motion.span key={i}
            className="absolute text-[var(--ds-brand-primary)] opacity-40 text-[10px] pointer-events-none"
            style={pos}
            animate={glow.animate}
            transition={{ ...glow.transition, delay }}>✦</motion.span>
        );
      })}

      <div className="relative z-10 p-5 sm:p-6 flex items-center gap-4">
        <div className="absolute right-4 top-4 rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--ds-brand-primary)] shadow-sm">
          You’ve got this
        </div>
        {/* LEFT — NIMI mascot */}
        <motion.div
          animate={m.floatSoft.animate}
          transition={m.floatSoft.transition}
          className="shrink-0"
        >
          <Image src={assets.nimiCircle} alt="NIMI" width={80} height={80}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-[var(--ds-brand-primary)]/50 shadow-xl" />
        </motion.div>

        {/* CENTER — message */}
        <div className="flex-1 min-w-0">
          <p className="font-black font-baloo text-[var(--ds-brand-primary)] text-[24px] sm:text-[28px] leading-tight">
            You&apos;re doing amazing, {childName}! 🌟
          </p>
          <p className="font-nunito text-gray-700 text-[16px] mt-1.5 leading-snug">
            Keep learning, keep smiling, and remember...<br/>
            <span className="font-black text-[var(--ds-brand-primary)]">you can do big things!</span> 💪
          </p>
        </div>

        {/* RIGHT — star characters + trophy */}
        <div className="hidden sm:flex items-end gap-3 shrink-0">
          <motion.img src={assets.starMascot} alt="" className="w-12 h-12" loading="lazy"
            animate={m.floatRotate(8).animate}
            transition={m.floatRotate(8).transition} />
          <motion.img src={assets.trophy} alt="" className="w-10 h-10" loading="lazy"
            animate={m.floatMd.animate}
            transition={{ ...m.floatMd.transition, delay: 0.3 }} />
          <motion.img src={assets.starMascot} alt="" className="w-10 h-10" loading="lazy"
            animate={m.floatRotate(-8, 0.6).animate}
            transition={m.floatRotate(-8, 0.6).transition} />
          <motion.img src={assets.pikoCircle} alt="PIKO" loading="lazy"
            className="w-10 h-10 rounded-full border-2 border-[var(--ds-brand-primary)]/30 shadow-lg"
            animate={m.floatSoft.animate}
            transition={{ ...m.floatSoft.transition, delay: 0.8 }} />
        </div>
      </div>
    </div>
  );
}
