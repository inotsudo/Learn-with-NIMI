"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import supabase from "@/lib/supabaseClient";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STARS = [
  { top: "10%", left: "8%",  color: "#FFD700", shape: "✦", size: "16px" },
  { top: "70%", left: "6%",  color: "#F94D8C", shape: "★", size: "13px" },
  { top: "32%", left: "16%", color: "#9C27B0", shape: "✶", size: "12px" },
  { top: "82%", left: "20%", color: "#FF5722", shape: "✦", size: "16px" },
  { top: "14%", left: "40%", color: "#4CAF50", shape: "★", size: "13px" },
  { top: "60%", left: "46%", color: "#5C9EFF", shape: "✦", size: "14px" },
  { top: "20%", left: "60%", color: "#FFD700", shape: "★", size: "17px" },
  { top: "75%", left: "66%", color: "#FF9800", shape: "✶", size: "12px" },
  { top: "10%", left: "78%", color: "#9C27B0", shape: "✦", size: "14px" },
  { top: "55%", left: "86%", color: "#F94D8C", shape: "★", size: "15px" },
  { top: "85%", left: "92%", color: "#4CAF50", shape: "✦", size: "11px" },
  { top: "30%", left: "92%", color: "#5C9EFF", shape: "★", size: "13px" },
];

export default function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const { t } = useLanguage();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-br from-indigo-900 via-purple-900 to-sidebar-purple"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Decorative star field */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            {STARS.map((s, i) => (
              <motion.span key={i} className="absolute font-bold leading-none"
                style={{ top: s.top, left: s.left, color: s.color, fontSize: s.size }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}>
                {s.shape}
              </motion.span>
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center px-4 py-10 sm:py-14 min-h-full">

            {/* Header */}
            <h1 className="text-3xl sm:text-4xl font-black text-white text-center drop-shadow-lg">
              {t("logoutTakeCare")}
            </h1>
            <p className="text-indigo-200 text-sm sm:text-base font-semibold mt-2 text-center max-w-md">
              {t("logoutSubtitle")}
            </p>

            {/* Nimi waving */}
            <div className="relative mt-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-yellow-400 shadow-2xl ring-4 ring-yellow-100/30">
                <img src="/nimi-logo-circle.png" alt="NIMI" className="w-full h-full object-cover" />
              </div>
              <motion.span className="absolute -top-3 -right-2 text-3xl drop-shadow"
                animate={{ rotate: [0, 30, 0, 30, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }}>
                👋
              </motion.span>
            </div>

            {/* White confirmation card */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full mt-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl shadow-inner"
                style={{ background: "linear-gradient(145deg, #e9d5ff, #c084fc)" }}>
                🚪
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-gray-800 mt-4">
                {t("logoutConfirmTitle")}
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                {t("logoutConfirmSubtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white font-black rounded-full py-3 text-sm shadow-lg hover:opacity-90 transition disabled:opacity-60"
                >
                  {t("logoutConfirmYes")}
                </button>
                <button
                  onClick={onClose}
                  disabled={signingOut}
                  className="flex-1 border-2 border-purple-300 text-purple-700 font-black rounded-full py-3 text-sm hover:bg-purple-50 transition disabled:opacity-60"
                >
                  {t("logoutConfirmCancel")}
                </button>
              </div>
            </div>

            {/* Farewell speech bubble + Nimi BYE illustration */}
            <div className="flex items-end gap-4 mt-8">
              <div className="relative bg-white border-2 border-purple-300 rounded-2xl px-4 py-3 shadow-xl max-w-[220px]">
                <span className="absolute top-2 right-2 text-yellow-400 text-sm leading-none">★</span>
                <span className="absolute bottom-2 left-2 text-purple-400 text-xs leading-none">✦</span>
                <p className="text-sm font-bold text-gray-800 leading-snug">
                  {t("logoutFarewell")}
                </p>
                <span className="absolute -right-[12px] top-1/2 -translate-y-1/2 w-0 h-0"
                  style={{ borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: "12px solid #d8b4fe" }} />
                <span className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-0 h-0"
                  style={{ borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "9px solid white" }} />
              </div>

              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-yellow-400 shadow-xl">
                  <img src="/nimi-logo-circle.png" alt="NIMI" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-3 bg-white text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-md shadow-md border-2 border-purple-300 rotate-6">
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
