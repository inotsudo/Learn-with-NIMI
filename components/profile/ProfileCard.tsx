"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  avatar: string | null;
  childName: string;
  level: number;
  categoriesCompleted: number;
  categoriesTotal: number;
}

export default function ProfileCard({ avatar, childName, level, categoriesCompleted, categoriesTotal }: Props) {
  const { t } = useLanguage();
  const pct = categoriesTotal > 0 ? (categoriesCompleted / categoriesTotal) * 100 : 0;

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-6 flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        {avatar && !avatar.startsWith("http") ? (
          <div className="w-24 h-24 rounded-full border-4 border-purple-300 shadow-lg bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center text-5xl select-none">
            {avatar}
          </div>
        ) : (
          <img
            src={avatar ?? "/default-avatar.png"} alt={childName}
            className="w-24 h-24 rounded-full object-cover border-4 border-purple-300 shadow-lg"
            onError={e => { (e.target as HTMLImageElement).src = "/avatar.png"; }} />
        )}
      </motion.div>

      <p className="font-black text-xl text-white mt-3">{childName}</p>
      <p className="text-yellow-300 font-bold text-sm uppercase tracking-wide mt-1">
        ⭐ {t("superStarBadge")} ⭐
      </p>
      <motion.span
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="inline-block mt-2 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur border border-yellow-300/30 text-yellow-200 font-black text-xs px-4 py-1.5 rounded-full"
      >
        {t("levelExplorer").replace("{level}", String(level))}
      </motion.span>

      <div className="w-full mt-4">
        <div className="w-full bg-white/10 rounded-full h-3.5 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-purple-300 font-semibold mt-1.5">
          {t("levelProgressLabel").replace("{current}", String(categoriesCompleted)).replace("{total}", String(categoriesTotal))}
        </p>
      </div>
    </div>
  );
}
