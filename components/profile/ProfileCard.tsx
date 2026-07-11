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
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/35 to-white p-6 flex flex-col items-center text-center shadow-[0_16px_34px_rgba(15,23,42,0.08)]" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        {avatar && !avatar.startsWith("http") ? (
          <div className="w-24 h-24 rounded-full border-4 shadow-lg bg-gray-100 flex items-center justify-center text-5xl select-none" style={{ borderColor: 'var(--nimi-green)' }}>
            {avatar}
          </div>
        ) : (
          <img
            src={avatar ?? "/default-avatar.png"} alt={childName}
            className="w-24 h-24 rounded-full object-cover border-4 shadow-lg"
            style={{ borderColor: 'var(--nimi-green)' }}
            onError={e => { (e.target as HTMLImageElement).src = "/avatar.png"; }} />
        )}
      </motion.div>

      <p className="font-black text-xl text-ds-text mt-3">{childName}</p>
      <p className="text-yellow-600 font-bold text-sm uppercase tracking-wide mt-1">
        ⭐ {t("superStarBadge")} ⭐
      </p>
      <motion.span
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="inline-block mt-2 bg-yellow-50 border border-yellow-200 text-yellow-700 font-black text-xs px-4 py-1.5 rounded-full"
      >
        {t("levelExplorer").replace("{level}", String(level))}
      </motion.span>

      <div className="w-full mt-4">
        <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-yellow-400 via-green-400 to-sky-400 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-gray-500 font-semibold mt-1.5">
          {t("levelProgressLabel").replace("{current}", String(categoriesCompleted)).replace("{total}", String(categoriesTotal))}
        </p>
      </div>
    </div>
  );
}
