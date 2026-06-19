"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MissionCompleteBanner() {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      className="bg-green-400/20 backdrop-blur border-2 border-green-300/30 rounded-2xl p-4 text-center"
    >
      <div className="text-4xl mb-2">🎉</div>
      <p className="font-black text-green-200 text-lg">{t("missionCompleteTitle")}</p>
      <p className="text-green-300 text-sm mt-1">{t("missionCompleteDesc")}</p>
    </motion.div>
  );
}
