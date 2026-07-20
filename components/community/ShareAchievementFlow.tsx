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
  storySlug?: string;
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

export default function ShareAchievementFlow({ childId, childName, childLanguage, storySlug, shareType, title, description, imageUrl, onShared }: Props) {
  const { t } = useLanguage();
  const [sharing, setSharing] = useState(false);
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

    let shareImage = (imageUrl && imageUrl.startsWith("http")) ? imageUrl : "";
    if (shareType === "certificate") {
      const lang = childLanguage ?? "en";
      const certUrl = await generateCertificateImageUrl(childName, lang, childId ?? undefined, storySlug);
      if (certUrl) shareImage = certUrl;
    }

    const { error } = await supabase.from("creations").insert({
      parent_id:        user.id,
      child_id:         childId,
      child_name:       childName,
      description:      shareDescription,
      type:             shareType,
      status:           "approved",
      is_public:        true,
      image_url:        shareImage,
    });

    if (error) { console.error("[ShareAchievementFlow]", error.message); }
    setSharing(false);
    onShared?.();
  };

  return (
    <motion.button
      onClick={handleShare}
      disabled={sharing}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className="relative w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl overflow-hidden disabled:opacity-60 transition-opacity"
      style={{ background: "linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)" }}
    >
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
            {t("sharingLabel")}
          </span>
        </>
      ) : (
        <>
          <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 text-left relative">
            <span className="text-white text-[14px] font-baloo font-black block leading-snug">
              {t("shareToComm")}
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
  );
}
