"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Palette, Check, Download } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission, ColoringPage } from "@/lib/queries";
import MissionCompleteBanner from "./MissionCompleteBanner";
import ColoringStudio from "./ColoringStudio";
import { useLanguage } from "@/contexts/LanguageContext";

interface ColoringContentProps {
  mission: Mission;
  coloringPages: ColoringPage[];
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
}

export default function ColoringContent({ mission, coloringPages, onComplete, completed, saving }: ColoringContentProps) {
  const { t } = useLanguage();
  const [showStudio, setShowStudio] = useState(false);
  const [hasColored, setHasColored] = useState(false);

  const handleOpen = () => {
    setShowStudio(true);
  };

  const handleCloseStudio = () => {
    setShowStudio(false);
    setHasColored(true);
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="font-baloo font-black text-white text-[20px]">{mission.title}</p>
        {mission.subtitle && <p className="font-nunito theme-text text-[14px] mt-1">{mission.subtitle}</p>}
      </div>

      {coloringPages.length === 0 ? (
        <div className="theme-card-hover rounded-2xl border theme-border p-8 text-center">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Palette className="w-8 h-8 text-orange-300" />
          </div>
          <p className="font-baloo font-black text-white text-[18px]">Coloring Pages Coming Soon!</p>
          <p className="font-nunito theme-text-muted text-[13px] mt-1">Beautiful coloring pages are being prepared for you.</p>
          <p className="font-nunito theme-text-muted text-[12px] mt-2">You can still complete this mission!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {coloringPages.map((cp, idx) => (
            <motion.div key={cp.id}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleOpen}
              className="theme-card-hover rounded-2xl overflow-hidden border theme-border cursor-pointer hover:border-orange-400/30 transition">
              {cp.template_image_url ? (
                <img src={getStorageUrl(cp.template_image_url)} alt={`Page ${idx + 1}`} className="w-full aspect-[3/4] object-cover" />
              ) : (
                <div className="w-full aspect-[3/4] theme-card-active flex items-center justify-center">
                  <Palette className="w-10 h-10 theme-text-muted/30" />
                </div>
              )}
              <div className="p-2 text-center">
                <p className="font-nunito font-bold text-orange-200 text-[11px]">Page {idx + 1}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!completed ? (
        hasColored ? (
          <button onClick={onComplete} disabled={saving}
            className="w-full font-baloo font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[18px] rounded-full py-4 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition">
            {saving ? t("saving") : <><Check className="w-5 h-5" /> {t("iColoredItBtn")}</>}
          </button>
        ) : (
          <button onClick={coloringPages.length > 0 ? handleOpen : onComplete} disabled={saving}
            className="w-full font-baloo font-black bg-gradient-to-r from-orange-500 to-pink-600 text-white text-[18px] rounded-full py-4 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition">
            {saving ? t("saving") : coloringPages.length > 0 ? <><Palette className="w-5 h-5" /> {t("openColoringBtn")}</> : <><Check className="w-5 h-5" /> {t("iColoredItBtn")}</>}
          </button>
        )
      ) : (
        <MissionCompleteBanner />
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
