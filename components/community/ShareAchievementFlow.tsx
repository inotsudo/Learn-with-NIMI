"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateCertificateImageUrl } from "@/lib/certificateImage";

type ShareType = "challenge" | "certificate" | "sticker";

interface Props {
  childId: string | null;
  childName: string;
  childLanguage?: string;
  shareType: ShareType;
  title: string;
  description?: string;
  imageUrl?: string | null;
  onShared?: () => void;
}

const TYPE_CONFIG: Record<ShareType, { emoji: string; label: string }> = {
  certificate: { emoji: "🏆", label: "Story Certificate" },
  challenge:   { emoji: "💪", label: "Challenge Badge"  },
  sticker:     { emoji: "⭐", label: "Achievement"       },
};

export default function ShareAchievementFlow({ childId, childName, childLanguage, shareType, title, description, imageUrl, onShared }: Props) {
  const { t } = useLanguage();
  const [sharing, setSharing] = useState(false);
  const [shared,  setShared]  = useState(false);
  const cfg = TYPE_CONFIG[shareType];

  const shareDescription = description
    ?? (shareType === "certificate" ? `${childName} completed the story: ${title}! 🏆`
      : shareType === "challenge"   ? `${childName} completed a champion challenge: ${title}! 💪`
      :                               `${childName} earned: ${title}! ⭐`);

  const handleShare = async () => {
    if (!childId) return;
    setSharing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSharing(false); return; }

    // For certificates: generate personalized image from template + stamped name
    let shareImage = (imageUrl && imageUrl.startsWith("http")) ? imageUrl : "";
    if (shareType === "certificate") {
      const lang = childLanguage ?? "en";
      const certUrl = await generateCertificateImageUrl(childName, lang);
      if (certUrl) shareImage = certUrl;
    }

    const { error } = await supabase.from("creations").insert({
      parent_id:   user.id,
      child_id:    childId,
      child_name:  childName,
      description: shareDescription,
      type:        shareType,
      status:      "approved",
      is_public:   true,
      image_url:   shareImage,
    });

    if (error) { console.error("[ShareAchievementFlow]", error.message); setSharing(false); return; }
    setSharing(false);
    setShared(true);
    onShared?.();
  };

  return (
    <AnimatePresence mode="wait">
      {shared ? (
        /* ── Success state ────────────────────────────────────── */
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 340, damping: 26 }}
          className="relative rounded-2xl overflow-hidden px-5 py-5 text-center"
          style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
        >
          {/* Confetti particles */}
          {["🎉","⭐","✨","💫","🌟","🎊"].map((emoji, i) => (
            <motion.span key={i}
              className="absolute text-[13px] pointer-events-none select-none"
              style={{ left: `${8 + i * 15}%`, top: "10%" }}
              initial={{ opacity: 0, y: 0, scale: 0 }}
              animate={{ opacity: [0,1,0], y: [0,-28,-48], scale: [0,1.3,0.6] }}
              transition={{ duration: 1.4, delay: 0.1 + i * 0.12, repeat: Infinity, repeatDelay: 1.8 }}
            >{emoji}</motion.span>
          ))}

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0,-8,8,0] }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1, rotate: { duration: 1.6, repeat: Infinity, delay: 0.4 } }}
            className="text-4xl mb-2"
          >🚀</motion.div>

          <p className="font-baloo font-black text-white text-[17px] drop-shadow-sm">
            {t("sharedSuccess") || "Posted to Community!"}
          </p>
          <p className="text-white/70 text-[11px] font-semibold mt-1">
            Your friends will cheer for {childName} 🌟
          </p>

          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            className="h-1 bg-white/30 rounded-full mt-4 mx-auto max-w-[100px] origin-left"
          />
        </motion.div>
      ) : (
        /* ── Share button ─────────────────────────────────────── */
        <motion.button
          key="share"
          onClick={handleShare}
          disabled={sharing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl overflow-hidden disabled:opacity-60 transition-opacity"
          style={{ background: "linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)" }}
        >
          {/* Subtle shine */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

          {sharing ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full"
                />
              </div>
              <span className="text-white text-[14px] font-baloo font-bold relative">
                {t("sharingLabel") || "Sharing…"}
              </span>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 shadow-sm">
                <Users className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left relative">
                <span className="text-white text-[14px] font-baloo font-black block leading-snug">
                  {t("shareToComm") || "Share to Community"}
                </span>
                <span className="text-white/65 text-[11px] font-semibold">
                  {cfg.emoji} {cfg.label}
                </span>
              </div>
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="text-white/80 text-[18px] relative shrink-0"
              >→</motion.div>
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
