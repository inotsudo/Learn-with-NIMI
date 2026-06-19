"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission, ColoringPage } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import MissionCompleteBanner from "./MissionCompleteBanner";
import ColoringStudio from "./ColoringStudio";

interface ColoringContentProps {
  mission: Mission;
  coloringPages: ColoringPage[];
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
}

export default function ColoringContent({ mission, coloringPages, onComplete, completed }: ColoringContentProps) {
  const { t } = useLanguage();
  const [showStudio, setShowStudio] = useState(false);

  const handleOpen = () => {
    setShowStudio(true);
    if (!completed) onComplete();
  };

  return (
    <div className="space-y-4">
      {mission.subtitle && (
        <p className="text-purple-200 font-bold text-sm text-center">{mission.subtitle}</p>
      )}

      {coloringPages.length === 0 ? (
        <div className="bg-white/10 backdrop-blur rounded-3xl shadow-md p-6 text-center">
          <p className="text-5xl mb-3">🎨</p>
          <p className="font-bold text-white">{t("noPagesTitle")}</p>
          <p className="text-sm text-purple-300 mt-1">{t("noPagesHint")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {coloringPages.map((cp, idx) => (
              <motion.div key={cp.id}
                whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}
                onClick={handleOpen}
                className="bg-white/10 backdrop-blur rounded-2xl shadow-md overflow-hidden border-2 border-white/15 cursor-pointer">
                {cp.template_image_url && (
                  <img src={getStorageUrl(cp.template_image_url)} alt={t("pageNumberLabel").replace("{number}", String(cp.page_number))}
                    className="w-full aspect-[3/4] object-cover" />
                )}
                <div className="p-2 text-center">
                  <p className="font-black text-orange-200 text-xs uppercase">{t("pageNumberLabel").replace("{number}", String(idx + 1))}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <Button onClick={handleOpen}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-full py-4 shadow-lg flex items-center justify-center gap-2">
            <Palette className="w-5 h-5" /> {t("openColoringBtn")}
          </Button>

          {completed && <MissionCompleteBanner />}
        </>
      )}

      {showStudio && (
        <ColoringStudio
          pages={coloringPages.map(cp => ({ image_url: cp.template_image_url ?? "", page_number: cp.page_number }))}
          onClose={() => setShowStudio(false)}
          t={t}
        />
      )}
    </div>
  );
}
