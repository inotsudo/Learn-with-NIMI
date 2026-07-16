"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission, ColoringPage } from "@/lib/queries";
import MissionCompleteBanner from "./MissionCompleteBanner";
import ColoringStudio from "./ColoringStudio";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

interface ColoringContentProps {
  mission: Mission;
  coloringPages: ColoringPage[];
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
  pagesLoading?: boolean;
  storySlug?: string;
}

const CRAYON_COLORS = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF6FC8", "#FF9F45"];

export default function ColoringContent({ mission, coloringPages, onComplete, completed, saving, storySlug }: ColoringContentProps) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const [showStudio, setShowStudio] = useState(false);
  const [hasColored, setHasColored] = useState(false);

  const handleOpen = () => setShowStudio(true);

  const handleCloseStudio = () => {
    setShowStudio(false);
    setHasColored(true);
  };

  return (
    <div className="space-y-4">
      {/* Art Studio header */}
      <div className="relative overflow-hidden leaf border border-orange-200/60 bg-gradient-to-br from-orange-50 via-pink-50/50 to-purple-50/60 p-5 text-center shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
        {/* Animated crayon tops */}
        {CRAYON_COLORS.map((color, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute top-0 w-3 rounded-b-sm"
            style={{ background: color, left: `${8 + i * 15}%`, height: 20 + (i % 3) * 6 }}
            animate={{ y: [0, i % 2 === 0 ? 4 : -3, 0] }}
            transition={{ duration: 1.6 + i * 0.25, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Nimi with art supplies */}
        <motion.img
          src={assets.nimiHappy}
          alt="NIMI"
          animate={{ y: [0, -5, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 mx-auto mb-3 mt-3 h-16 w-16 rounded-full border-4 object-cover shadow-lg"
          style={{ borderColor: "#FF9F45" }}
        />

        <div className="relative z-10 mb-2 flex items-center justify-center gap-1">
          {["🖌️", "🎨", "✏️"].map((e, i) => (
            <motion.span key={i} className="select-none text-lg"
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}>
              {e}
            </motion.span>
          ))}
        </div>

        <p className="relative z-10 font-baloo font-black text-ds-text text-[20px]">{mission.title}</p>
        {mission.subtitle && (
          <p className="relative z-10 mt-1 font-nunito text-gray-500 text-[14px]">{mission.subtitle}</p>
        )}
      </div>

      {/* Pages grid or empty state */}
      {coloringPages.length === 0 ? (
        <div className="leaf-lg border border-orange-100 p-8 text-center bg-white shadow-sm">
          <div className="flex justify-center gap-2 mb-3">
            {["🖌️", "🎨", "✏️", "🖍️"].map((e, i) => (
              <motion.span key={i} className="select-none text-3xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}>
                {e}
              </motion.span>
            ))}
          </div>
          <p className="font-baloo font-black text-ds-text text-[18px]">{t("storyColorComingSoon")}</p>
          <p className="font-nunito text-gray-500 text-[13px] mt-1">{t("storyColorComingSoonDesc")}</p>
          <p className="font-nunito text-gray-500 text-[12px] mt-2">{t("storyColorCanComplete")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {coloringPages.map((cp, idx) => {
            const accent = CRAYON_COLORS[idx % CRAYON_COLORS.length];
            return (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleOpen}
                className="overflow-hidden leaf cursor-pointer group relative bg-white"
                style={{ borderColor: accent, borderWidth: 2, borderStyle: "solid" }}
              >
                {cp.template_image_url ? (
                  <img
                    src={getStorageUrl(cp.template_image_url)}
                    alt={`Page ${idx + 1}`}
                    className="w-full aspect-[3/4] object-cover"
                   loading="lazy" />
                ) : (
                  <div
                    className="w-full aspect-[3/4] flex items-center justify-center"
                    style={{ background: `${accent}18` }}
                  >
                    <Palette className="w-10 h-10" style={{ color: accent }} />
                  </div>
                )}
                {/* Hover brush overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg text-2xl select-none"
                  >🖌️</motion.div>
                </div>
                <div className="p-2 text-center">
                  <p className="font-nunito font-bold text-[11px]" style={{ color: accent }}>
                    Page {idx + 1}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Post-coloring celebration */}
      <AnimatePresence>
        {hasColored && !completed && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="leaf border border-pink-200 bg-gradient-to-r from-orange-50 via-pink-50 to-yellow-50 p-3 flex items-center justify-center gap-2 shadow-sm"
          >
            <motion.span
              animate={{ rotate: [0, -20, 20, -20, 0] }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="select-none text-2xl"
            >🎨</motion.span>
            <p className="font-baloo font-black text-orange-700 text-[15px]">{t("beautifulArtworkMsg")}</p>
            <motion.span
              animate={{ rotate: [0, 20, -20, 20, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="select-none text-2xl"
            >⭐</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {!completed ? (
        hasColored ? (
          <motion.button
            onClick={onComplete}
            disabled={saving}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            whileTap={{ scale: 0.96 }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 py-4 font-baloo font-black text-[18px] text-white shadow-[0_10px_24px_rgba(249,115,22,0.30)] transition disabled:opacity-50"
          >
            {saving ? t("saving") : <><Check className="h-5 w-5" /> {t("iColoredItBtn")}</>}
          </motion.button>
        ) : (
          <motion.button
            onClick={coloringPages.length > 0 ? handleOpen : onComplete}
            disabled={saving}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.25 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="group flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 px-5 py-4 text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)] transition disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl select-none">
                🎨
              </div>
              <div className="text-left">
                <p className="font-baloo font-black text-[17px] leading-tight">{t("letsCreateLabel")}</p>
                <p className="font-nunito text-[11px] text-white/80">
                  {coloringPages.length > 0 ? t("tapPageHint") : t("markAsDoneLabel")}
                </p>
              </div>
            </div>
            <span className="select-none text-xl text-white/70 group-hover:translate-x-1 transition-transform">→</span>
          </motion.button>
        )
      ) : (
        <MissionCompleteBanner storySlug={storySlug} />
      )}

      {showStudio && (
        <ColoringStudio
          pages={coloringPages.map(cp => ({ id: cp.id, image_url: cp.template_image_url ?? "", page_number: cp.page_number }))}
          childId={typeof window !== "undefined" ? localStorage.getItem("nimipiko_active_child") : null}
          onClose={handleCloseStudio}
          t={t}
        />
      )}
    </div>
  );
}
