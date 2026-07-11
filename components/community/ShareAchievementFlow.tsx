"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { SPRING, DURATION } from "@/lib/design-system/motion";
import { Share2 } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

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

export default function ShareAchievementFlow({ childId, childName, shareType, title, description, imageUrl, onShared }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const m = useThemeMotion();

  const DEFAULT_IMAGES: Record<ShareType, string> = {
    certificate: assets.trophy,
    challenge:   assets.badgeHero,
    sticker:     assets.badgeExplorer,
  };

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
          {...m.scaleIn}
          className="relative bg-gradient-to-r from-[var(--ds-brand-primary)]/20 to-[var(--ds-brand-hover)]/10 border-2 border-[var(--ds-border-brand)]/30 leaf p-5 text-center overflow-hidden">

          {["🎉", "⭐", "✨", "💫", "🌟", "🎊"].map((emoji, i) => (
            <motion.span key={i} className="absolute text-[14px]"
              style={{ left: `${10 + (i * 15) % 80}%`, top: `${20 + (i * 13) % 50}%` }}
              initial={{ opacity: 0, y: 10, scale: 0 }}
              animate={{ opacity: [0, 1, 0], y: [10, -15, -30], scale: [0, 1.2, 0.5], rotate: [0, 180, 360] }}
              transition={{ duration: DURATION.loopBase, delay: 0.2 + i * 0.15, repeat: Infinity, repeatDelay: 1 }}>
              {emoji}
            </motion.span>
          ))}

          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...SPRING.modal, delay: 0.1 }}
            className="relative z-10">
            <motion.span className="text-4xl block mb-2"
              animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: DURATION.loopFast, repeat: Infinity }}>
              🚀
            </motion.span>
          </motion.div>

          <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DURATION.base, delay: 0.3 }}
            className="font-baloo font-black text-green-300 text-[16px] relative z-10">
            {t("sharedSuccess") || "Shared!"}
          </motion.p>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DURATION.base, delay: 0.5 }}
            className="text-green-400/50 text-[11px] font-bold mt-1 relative z-10">
            Nimi & Piko will share it soon! 🌟
          </motion.p>

          <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.3, duration: DURATION.loopFast }}
            className="h-1 bg-cta-gradient rounded-full mt-3 mx-auto max-w-[120px]" />
        </motion.div>
      ) : (
        <motion.button key="share"
          onClick={handleShare}
          disabled={sharing}
          whileTap={m.dangerPress}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-3 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-400/20 leaf px-4 py-3 transition w-full disabled:opacity-50">
          {sharing ? (
            <>
              <motion.div animate={m.spinLoop.animate} transition={m.spinLoop.transition}
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
