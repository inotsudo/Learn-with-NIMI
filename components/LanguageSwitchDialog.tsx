"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { useMotion } from "@/hooks/useMotion";

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
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);
  const m = useMotion();

  return (
    <AnimatePresence>
      {pendingLanguage && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${cv.dialogStyle.overlay}`}>
          <motion.div
            {...m.scaleIn}
            className={`${cv.dialogStyle.background} ${cv.dialogStyle.border} ${cv.dialogStyle.radius} ${cv.dialogStyle.shadow} w-full max-w-sm p-5 text-center`}
          >
            <p className="text-3xl mb-2">🌍</p>
            <h3 className="font-black text-ds-text text-lg">{t("switchLanguageTitle")}</h3>
            <p className="text-gray-500 text-sm mt-2">
              {t("switchLanguageBody")
                .replace("{language}", LANG_LABELS[pendingLanguage])
                .replace("{name}", childName ?? "")
                .replace("{current}", LANG_LABELS[currentLanguage])}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <button
                onClick={onConfirm}
                disabled={switching}
                className={`flex-1 ${cv.buttonStyle.primaryBg} font-black rounded-full py-2.5 text-sm transition disabled:opacity-60`}
              >
                {t("switchLanguageConfirm")}
              </button>
              <button
                onClick={onCancel}
                disabled={switching}
                className={`flex-1 ${cv.buttonStyle.secondaryBg} font-black rounded-full py-2.5 text-sm transition disabled:opacity-60`}
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
