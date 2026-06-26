"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

const LANG_LABELS: Record<Language, string> = {
  en: "English",
  fr: "Français",
  rw: "Kinyarwanda",
};

interface LanguageSwitchDialogProps {
  pendingLanguage: Language | null;
  currentLanguage: Language;
  childName?: string;
  switching: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LanguageSwitchDialog({
  pendingLanguage, currentLanguage, childName, switching, onConfirm, onCancel,
}: LanguageSwitchDialogProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {pendingLanguage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-3xl shadow-2xl w-full max-w-sm p-5 text-center"
          >
            <p className="text-3xl mb-2">🌍</p>
            <h3 className="font-black text-white text-lg">{t("switchLanguageTitle")}</h3>
            <p className="theme-text text-sm mt-2">
              {t("switchLanguageBody")
                .replace("{language}", LANG_LABELS[pendingLanguage])
                .replace("{name}", childName ?? "")
                .replace("{current}", LANG_LABELS[currentLanguage])}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <button
                onClick={onConfirm}
                disabled={switching}
                className="flex-1 theme-accent text-white font-black rounded-full py-2.5 text-sm hover:theme-accent transition disabled:opacity-60"
              >
                {t("switchLanguageConfirm")}
              </button>
              <button
                onClick={onCancel}
                disabled={switching}
                className="flex-1 border-2 border-white/20 theme-text font-black rounded-full py-2.5 text-sm hover:bg-white/10 transition disabled:opacity-60"
              >
                {t("cancel")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
