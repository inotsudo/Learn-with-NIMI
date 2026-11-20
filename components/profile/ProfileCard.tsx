"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import ChildAvatar from "@/components/avatar/ChildAvatar";

interface Props {
  avatar: string | null;
  childName: string;
  level: number;
  /** Optional progress bar; hidden when not provided. */
  categoriesCompleted?: number;
  categoriesTotal?: number;
}

export default function ProfileCard({ avatar, childName, level, categoriesCompleted = 0, categoriesTotal = 0 }: Props) {
  const { t } = useLanguage();
  const pct = categoriesTotal > 0 ? (categoriesCompleted / categoriesTotal) * 100 : 0;

  return (
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/35 to-white p-6 flex flex-col items-center text-center shadow-card-2xl" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <div className="w-24 h-24 rounded-full border-4 shadow-lg overflow-hidden flex items-center justify-center bg-[var(--ds-surface-card-active)]" style={{ borderColor: 'var(--ds-brand-primary)' }}>
          <ChildAvatar avatarUrl={avatar} name={childName} size={96} />
        </div>
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

      {categoriesTotal > 0 && <div className="w-full mt-4">
        <div className="w-full bg-[var(--ds-surface-card-active)] rounded-full h-3.5 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-yellow-400 via-green-400 to-sky-400 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-[var(--ds-text-secondary)] font-semibold mt-1.5">
          {t("levelProgressLabel").replace("{current}", String(categoriesCompleted)).replace("{total}", String(categoriesTotal))}
        </p>
      </div>}
    </div>
  );
}
