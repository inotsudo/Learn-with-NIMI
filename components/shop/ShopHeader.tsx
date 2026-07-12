"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { HeroBanner } from "@/components/layout/primitives";

interface Props {
  balance: number;
  gems: number;
}

export default function ShopHeader({ balance, gems }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const router = useRouter();

  return (
    <HeroBanner zone="treasureRoom">
      {/* Decorative bubbles */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute top-3 left-1/3 w-12 h-12 rounded-full bg-white/10" />

      {/* Floating emoji decorations */}
      {([
        { top: "15%", left: "5%",  emoji: "⭐", size: 16, delay: 0 },
        { top: "70%", left: "10%", emoji: "💎", size: 14, delay: 0.5 },
        { top: "20%", right: "5%", emoji: "🎁", size: 18, delay: 0.3 },
        { top: "65%", right: "8%", emoji: "⭐", size: 12, delay: 0.9 },
      ] as Array<{ top: string; emoji: string; size: number; delay: number; left?: string; right?: string }>).map((d, i) => (
        <motion.span
          key={i}
          className="absolute pointer-events-none select-none"
          style={{ top: d.top, left: d.left, right: d.right, fontSize: d.size }}
          animate={{ opacity: [0.3, 0.9, 0.3], y: [0, -6, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: d.delay, ease: "easeInOut" }}
          aria-hidden
        >
          {d.emoji}
        </motion.span>
      ))}

      {/* Content */}
      <div className="relative z-10 px-5 py-5 sm:px-7 sm:py-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-[13px] font-bold mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Top row: icon + title */}
        <div className="flex items-center gap-4 mb-4">
          <motion.div
            animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-lg border-2 border-white/30"
          >
            <span className="text-3xl sm:text-4xl">🛍️</span>
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className="text-white/55 text-[10px] font-nunito font-bold uppercase tracking-[0.14em] mb-0.5">The Treasure Room</p>
            <h1 className="font-baloo font-black text-white text-[24px] sm:text-[32px] leading-tight drop-shadow-md">
              {t("rewardShopTitle")}
            </h1>
            <p className="text-white/75 text-[12px] sm:text-[13px] font-nunito font-semibold mt-0.5">
              {t("rewardShopSubtitle")}
            </p>
          </div>

          <motion.img
            src={assets.pikoCircle}
            alt=""
            aria-hidden
            className="w-12 h-12 rounded-full border-2 border-white/40 shadow-lg shrink-0 hidden sm:block"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </div>

        {/* Currency chips */}
        <div className="flex gap-2.5 flex-wrap">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260 }}
            className="flex items-center gap-2 bg-white/20 border border-white/30 text-white font-baloo font-black text-[14px] px-4 py-2 rounded-full backdrop-blur-sm"
          >
            <span className="text-[18px]">⭐</span>
            <span>{balance}</span>
            <span className="text-[10px] uppercase font-bold text-white/70 tracking-wide">{t("shopStarsAvailable")}</span>
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 260 }}
            className="flex items-center gap-2 bg-white/20 border border-white/30 text-white font-baloo font-black text-[14px] px-4 py-2 rounded-full backdrop-blur-sm"
          >
            <span className="text-[18px]">💎</span>
            <span>{gems}</span>
            <span className="text-[10px] uppercase font-bold text-white/70 tracking-wide">{t("shopBadgesEarned")}</span>
          </motion.div>
        </div>
      </div>
    </HeroBanner>
  );
}
