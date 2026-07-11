"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { SHOP_ITEM_MAP } from "@/components/shop/_shopData";
import type { ChildCosmetics } from "@/lib/queries";

interface Props {
  childName: string;
  cosmetics?: ChildCosmetics;
}

const EMPTY: ChildCosmetics = { nimi_outfit: null, piko_outfit: null, frame: null, title_badge: null };

// Fixed deco positions to avoid hydration mismatch
const DECO_POSITIONS = [
  { top: "8%",  left: "6%",  size: "text-2xl", delay: 0 },
  { top: "12%", left: "78%", size: "text-xl",  delay: 0.4 },
  { top: "55%", left: "82%", size: "text-2xl", delay: 0.7 },
  { top: "68%", left: "4%",  size: "text-xl",  delay: 0.2 },
  { top: "34%", left: "90%", size: "text-lg",  delay: 1.1 },
];

export default function GreetingCard({ childName, cosmetics = EMPTY }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const frame      = cosmetics.frame       ? SHOP_ITEM_MAP[cosmetics.frame]       : null;
  const nimiOutfit = cosmetics.nimi_outfit  ? SHOP_ITEM_MAP[cosmetics.nimi_outfit]  : null;
  const pikoOutfit = cosmetics.piko_outfit  ? SHOP_ITEM_MAP[cosmetics.piko_outfit]  : null;
  const titleBadge = cosmetics.title_badge  ? SHOP_ITEM_MAP[cosmetics.title_badge]  : null;

  const heroGradient = frame?.heroGradient
    ?? "linear-gradient(135deg, var(--ds-brand-primary) 0%, var(--ds-brand-hover) 100%)";
  const decos = frame?.heroDecos ?? [];

  return (
    <motion.div
      layout
      className="relative w-full overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
      style={{ borderRadius: "var(--leaf-r)", background: heroGradient, minHeight: 160 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Floating frame decorations */}
      <AnimatePresence>
        {decos.map((deco, i) => {
          const pos = DECO_POSITIONS[i % DECO_POSITIONS.length];
          return (
            <motion.span
              key={`${frame?.id}-${i}`}
              className={`pointer-events-none select-none absolute leading-none ${pos.size}`}
              style={{ top: pos.top, left: pos.left, opacity: 0.55 }}
              animate={{ y: [0, -8, 0], rotate: [0, 6, -4, 0] }}
              transition={{ duration: 3.5 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: pos.delay }}
            >
              {deco}
            </motion.span>
          );
        })}
      </AnimatePresence>

      {/* Subtle inner shimmer overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

      {/* Content row */}
      <div className="relative z-10 flex items-center gap-5 px-5 py-5">

        {/* Mascots */}
        <div className="flex items-end gap-2 shrink-0">
          {/* NIMI */}
          <div className="relative">
            <motion.img
              src={assets.nimiCircle}
              alt="NIMI"
              className="w-24 h-24 rounded-full object-cover border-[3px] border-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* NIMI costume badge — large and prominent */}
            <AnimatePresence>
              {nimiOutfit && (
                <motion.span
                  key={nimiOutfit.id}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="absolute -bottom-2 -right-2 text-4xl leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
                  title={t(nimiOutfit.nameKey)}
                >
                  {nimiOutfit.emoji}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* PIKO */}
          <div className="relative -ml-2">
            <motion.img
              src={assets.pikoCircle}
              alt="PIKO"
              className="w-[72px] h-[72px] rounded-full object-cover border-[3px] border-white/60 shadow-[0_8px_24px_rgba(0,0,0,0.35)] opacity-90"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.9, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            />
            <AnimatePresence>
              {pikoOutfit && (
                <motion.span
                  key={pikoOutfit.id}
                  initial={{ scale: 0, rotate: 20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="absolute -bottom-2 -right-2 text-3xl leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
                  title={t(pikoOutfit.nameKey)}
                >
                  {pikoOutfit.emoji}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Text block */}
        <div className="min-w-0 flex flex-col gap-1.5">
          <p className="font-black text-white text-[22px] sm:text-[26px] leading-tight drop-shadow-sm">
            {t("progressGreatJob").replace("{name}", childName)}
          </p>

          {/* Title badge — large and proud */}
          <AnimatePresence>
            {titleBadge ? (
              <motion.span
                key={titleBadge.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="inline-flex items-center gap-1.5 self-start text-[13px] font-black px-3 py-1 rounded-full bg-white/25 text-white backdrop-blur-sm border border-white/30 shadow-sm"
              >
                {titleBadge.emoji} {t(titleBadge.nameKey)}
              </motion.span>
            ) : (
              <motion.p
                key="encouragement"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/80 text-[13px] font-bold"
              >
                {t("progressEncouragement")}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Encouragement line shows when title badge is on */}
          {titleBadge && (
            <p className="text-white/75 text-[12px] font-semibold leading-tight">
              {t("progressEncouragement")}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
