"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import supabase from "@/lib/supabaseClient";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { getThemeEffects } from "@/lib/design-system/themeEffects";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STAR_POSITIONS = [
  { top: "10%", left: "8%",  size: "16px" },
  { top: "70%", left: "6%",  size: "13px" },
  { top: "32%", left: "16%", size: "12px" },
  { top: "82%", left: "20%", size: "16px" },
  { top: "14%", left: "40%", size: "13px" },
  { top: "60%", left: "46%", size: "14px" },
  { top: "20%", left: "60%", size: "17px" },
  { top: "75%", left: "66%", size: "12px" },
  { top: "10%", left: "78%", size: "14px" },
  { top: "55%", left: "86%", size: "15px" },
  { top: "85%", left: "92%", size: "11px" },
  { top: "30%", left: "92%", size: "13px" },
];

export default function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const { t } = useLanguage();
  const { themeId, theme } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const cv = getComponentVariant(themeId);
  const { particles } = getThemeEffects(themeId);
  const stars = STAR_POSITIONS.map((p, i) => ({
    ...p,
    shape: particles.shapes[i % particles.shapes.length],
    color: particles.colors[i % particles.colors.length],
  }));
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-br ${theme.gradients.pageBg}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Decorative star field */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            {stars.map((s, i) => (
              <motion.span
                key={i}
                className="absolute font-bold leading-none"
                style={{ top: s.top, left: s.left, color: s.color, fontSize: s.size }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
              >
                {s.shape}
              </motion.span>
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center px-4 py-10 sm:py-14 min-h-full">

            {/* Header */}
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 text-center drop-shadow-sm">
              {t("logoutTakeCare")}
            </h1>
            <p className="text-gray-500 text-sm sm:text-base font-semibold mt-2 text-center max-w-md">
              {t("logoutSubtitle")}
            </p>

            {/* Nimi waving */}
            <div className="relative mt-6">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-yellow-400 shadow-2xl ring-4 ring-yellow-100/30">
                <Image src={assets.nimiCircle} alt="NIMI" fill className="object-cover" />
              </div>
              <motion.span
                className="absolute -top-3 -right-2 text-3xl drop-shadow"
                animate={{ rotate: [0, 30, 0, 30, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }}
              >
                👋
              </motion.span>
            </div>

            {/* Confirmation card */}
            <div className={`${cv.dialogStyle.background} ${cv.dialogStyle.border} ${cv.dialogStyle.shadow} ${cv.dialogStyle.radius} p-6 sm:p-8 max-w-md w-full mt-6 text-center`}>
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl shadow-inner"
                style={{ background: "linear-gradient(145deg, #e9d5ff, #c084fc)" }}
              >
                🚪
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-4">
                {t("logoutConfirmTitle")}
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                {t("logoutConfirmSubtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black rounded-full py-3 text-sm shadow-md transition disabled:opacity-60"
                >
                  {t("logoutConfirmYes")}
                </button>
                <button
                  onClick={onClose}
                  disabled={signingOut}
                  className="flex-1 border-2 border-gray-200 text-gray-700 font-black rounded-full py-3 text-sm hover:bg-gray-50 transition disabled:opacity-60"
                >
                  {t("logoutConfirmCancel")}
                </button>
              </div>
            </div>

            {/* Farewell speech bubble + Nimi BYE illustration */}
            <div className="flex items-end gap-4 mt-8">
              <div className={`relative ${cv.panelStyle.background} ${cv.panelStyle.border} ${cv.panelStyle.shadow} ${cv.panelStyle.radius} px-4 py-3 max-w-[220px]`}>
                <span className="absolute top-2 right-2 text-yellow-400 text-sm leading-none">★</span>
                <span className="absolute bottom-2 left-2 text-gray-500 text-xs leading-none">✦</span>
                <p className="text-sm font-bold text-gray-800 leading-snug">
                  {t("logoutFarewell")}
                </p>
                <span
                  className="absolute -right-[12px] top-1/2 -translate-y-1/2 w-0 h-0"
                  style={{ borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: "12px solid #E5E7EB" }}
                />
                <span
                  className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-0 h-0"
                  style={{ borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "9px solid #ffffff" }}
                />
              </div>

              <div className="relative shrink-0">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-4 border-yellow-400 shadow-xl">
                  <Image src={assets.nimiCircle} alt="NIMI" fill className="object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-3 bg-white text-gray-800 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm border border-gray-200 rotate-6">
                  BYE!
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
