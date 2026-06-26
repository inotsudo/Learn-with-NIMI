"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2 } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

type ShareType = "challenge" | "certificate" | "sticker";

interface Props {
  childId: string | null;
  childName: string;
  shareType: ShareType;
  title: string;
  description?: string;
  imageUrl?: string | null;
  onShared?: () => void;
}

const DEFAULT_IMAGES: Record<ShareType, string> = {
  certificate: "/assets/trophy.svg",
  challenge: "/assets/badge-hero.svg",
  sticker: "/assets/badge-explorer.svg",
};

export default function ShareAchievementFlow({ childId, childName, shareType, title, description, imageUrl, onShared }: Props) {
  const { t } = useLanguage();
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const shareImage = imageUrl || DEFAULT_IMAGES[shareType];

  const shareDescription = description
    ?? (shareType === "certificate" ? `${childName} completed the story: ${title}! 🏆`
      : shareType === "challenge" ? `${childName} completed a champion challenge: ${title}! 💪`
      : `${childName} earned: ${title}! ⭐`);

  const handleShare = async () => {
    if (!childId) return;
    setSharing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSharing(false); return; }

    await supabase.from("creations").insert({
      parent_id: user.id,
      child_id: childId,
      child_name: childName,
      description: shareDescription,
      type: shareType,
      status: "approved",
      is_public: true,
      image_url: shareImage,
    });

    setSharing(false);
    setShared(true);
    onShared?.();
  };

  return (
    <AnimatePresence mode="wait">
      {shared ? (
        <motion.div key="done"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative bg-gradient-to-r from-green-500/20 to-emerald-500/10 border-2 border-green-400/30 rounded-[20px] p-5 text-center overflow-hidden">

          {["🎉", "⭐", "✨", "💫", "🌟", "🎊"].map((emoji, i) => (
            <motion.span key={i} className="absolute text-[14px]"
              style={{ left: `${10 + (i * 15) % 80}%`, top: `${20 + (i * 13) % 50}%` }}
              initial={{ opacity: 0, y: 10, scale: 0 }}
              animate={{ opacity: [0, 1, 0], y: [10, -15, -30], scale: [0, 1.2, 0.5], rotate: [0, 180, 360] }}
              transition={{ duration: 2, delay: 0.2 + i * 0.15, repeat: Infinity, repeatDelay: 1 }}>
              {emoji}
            </motion.span>
          ))}

          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            className="relative z-10">
            <motion.span className="text-4xl block mb-2"
              animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}>
              🚀
            </motion.span>
          </motion.div>

          <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="font-baloo font-black text-green-300 text-[16px] relative z-10">
            {t("sharedSuccess") || "Shared!"}
          </motion.p>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-green-400/50 text-[11px] font-bold mt-1 relative z-10">
            Nimi & Piko will share it soon! 🌟
          </motion.p>

          <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.3, duration: 1.5 }}
            className="h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mt-3 mx-auto max-w-[120px]" />
        </motion.div>
      ) : (
        <motion.button key="share"
          onClick={handleShare}
          disabled={sharing}
          whileTap={{ scale: 0.95 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-3 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-400/20 rounded-[16px] px-4 py-3 transition w-full disabled:opacity-50">
          {sharing ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-pink-300 border-t-transparent rounded-full shrink-0" />
              <span className="text-pink-200 text-[13px] font-bold flex-1 text-left">{t("sharingLabel")}</span>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-pink-500/20 flex items-center justify-center shrink-0">
                <Share2 className="w-4 h-4 text-pink-300" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-white text-[13px] font-baloo font-bold block">{t("shareToComm")}</span>
                <span className="text-pink-300/40 text-[10px] font-bold">{shareType === "certificate" ? "🏆 Story Certificate" : shareType === "challenge" ? "💪 Challenge Badge" : "⭐ Achievement"}</span>
              </div>
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
