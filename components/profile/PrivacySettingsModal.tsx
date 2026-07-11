"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  onClose: () => void;
}

export default function PrivacySettingsModal({ onClose }: Props) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white border border-ds-border shadow-2xl w-full max-w-sm overflow-hidden" style={{ borderRadius: 'var(--leaf-r-lg)' }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--nimi-green)' }}>
            <p className="text-white font-black text-lg tracking-wide">{t("privacySettingsModalTitle")}</p>
            <button onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-3">
            <Shield className="w-10 h-10 text-[var(--ds-brand-primary)] mx-auto" />
            <p className="text-ds-text text-sm leading-relaxed">{t("privacyBody1")}</p>
            <p className="text-ds-text text-sm leading-relaxed">{t("privacyBody2")}</p>
            <button
              onClick={onClose}
              className="w-full text-white font-black py-2.5 text-sm transition mt-2"
              style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}
            >
              {t("gotItBtn")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
