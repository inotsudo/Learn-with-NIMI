"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { shareCertificate, type ShareCertificateInput } from "@/lib/shareCertificate";

/** Shares the story certificate with family (phone share sheet or WhatsApp). */
export default function ShareCertificateButton(props: ShareCertificateInput) {
  const { t } = useLanguage();
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    // Safety net: never stay stuck if the share sheet never resolves.
    const safety = setTimeout(() => setSharing(false), 20_000);
    try {
      await shareCertificate(props);
    } finally {
      clearTimeout(safety);
      setSharing(false);
    }
  };

  return (
    <motion.button
      onClick={onShare}
      disabled={sharing}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className="relative w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl overflow-hidden disabled:opacity-60 transition-opacity"
      style={{ background: "linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 shadow-sm">
        {sharing ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full"
          />
        ) : (
          <Share2 className="w-4 h-4 text-white" strokeWidth={2.5} aria-hidden="true" />
        )}
      </div>
      <span className="flex-1 text-left relative text-white text-sm font-baloo font-black leading-snug">
        {sharing ? t("sharingLabel") : t("shareFriendsBtn")}
      </span>
      {!sharing && <span className="text-white/80 text-lg relative shrink-0" aria-hidden="true">🏆</span>}
    </motion.button>
  );
}
