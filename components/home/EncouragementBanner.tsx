"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

interface Props { childName: string; }

const ACTIVITY_EMOJIS = ["📖", "🎵", "🎨", "🤸", "🎬"];
const ACTIVITY_KEYS   = ["encourageRead", "encourageSing", "encourageCreate", "encourageMove", "encourageWatch"] as const;

export default function EncouragementBanner({ childName }: Props) {
  const { themeId } = useAppTheme();
  const { t } = useLanguage();
  const assets = getThemeAssets(themeId);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-ds-border leaf shadow-ds-card p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
      <motion.div className="relative shrink-0"
        animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity }}>
        <Image src={assets.nimiCircle} alt="NIMI" width={56} height={56}
          className="rounded-full border-[3px] border-yellow-400 shadow-lg" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-[8px]">💬</span>
        </div>
      </motion.div>
      <div className="flex-1 text-center sm:text-left">
        <h3 className="font-black text-ds-text text-[15px]">
          {t("encourageAmazingMsg").replace("{name}", childName)}
        </h3>
        <p className="text-gray-400 text-[12px] mt-0.5">
          {t("encourageKeepLearning")}
        </p>
      </div>
      <div className="flex gap-2.5 shrink-0">
        {ACTIVITY_KEYS.map((key, i) => (
          <motion.div key={key}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.07, type: "spring", stiffness: 300 }}
            className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 bg-gray-50 border border-ds-border rounded-xl flex items-center justify-center text-lg">
              {ACTIVITY_EMOJIS[i]}
            </div>
            <span className="text-[8px] font-bold text-gray-400">{t(key)}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
