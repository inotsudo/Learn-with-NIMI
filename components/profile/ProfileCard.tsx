"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const XP_CURRENT = 850;
const XP_TARGET = 1200;

interface Props {
  avatar: string | null;
  childName: string;
  level: number;
}

export default function ProfileCard({ avatar, childName, level }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-md p-6 flex flex-col items-center text-center">
      {avatar && !avatar.startsWith("http") ? (
        <div className="w-24 h-24 rounded-full border-4 border-purple-300 shadow-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-5xl select-none">
          {avatar}
        </div>
      ) : (
        <img
          src={avatar ?? "/default-avatar.png"} alt={childName}
          className="w-24 h-24 rounded-full object-cover border-4 border-purple-300 shadow-lg"
          onError={e => { (e.target as HTMLImageElement).src = "/avatar.png"; }} />
      )}

      <p className="font-black text-xl text-gray-800 mt-3">{childName}</p>
      <p className="text-yellow-600 font-bold text-sm uppercase tracking-wide mt-1">
        ⭐ {t("superStarBadge")} ⭐
      </p>
      <span className="inline-block mt-2 bg-yellow-400 text-indigo-900 font-black text-xs px-3 py-1 rounded-full">
        {t("levelExplorer").replace("{level}", String(level))}
      </span>

      <div className="w-full mt-4">
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(XP_CURRENT / XP_TARGET) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }} />
        </div>
        <p className="text-xs text-gray-400 font-semibold mt-1.5">
          {t("xpProgressLabel").replace("{current}", String(XP_CURRENT)).replace("{target}", String(XP_TARGET))}
        </p>
      </div>
    </div>
  );
}
