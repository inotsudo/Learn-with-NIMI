"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

interface Props {
  exchangeCount: number;
  target: number;
  claimed: boolean;
  canClaim: boolean;
  onClaim: () => void;
}

export default function ChatQuestBanner({ exchangeCount, target, claimed, canClaim, onClaim }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  return (
    <div className="bg-ds-surface border border-ds-border shadow-ds-card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 overflow-hidden relative"
      style={{ borderRadius:"var(--leaf-r-lg)" }}>
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-yellow-400/8 pointer-events-none" />

      {/* NIMI avatar */}
      <motion.img
        src={assets.nimiCircle} alt="NIMI"
        className="w-14 h-14 rounded-full object-cover border-4 border-yellow-400 shadow-lg flex-shrink-0"
        animate={claimed ? {} : { y:[0,-5,0] }}
        transition={{ duration:3.5, repeat:Infinity, ease:"easeInOut" }} />

      <div className="flex-1 min-w-0">
        <p className="font-black text-ds-text text-[14px] sm:text-[16px] flex items-center gap-1.5 mb-2">
          <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
          {t("nimiChatQuestTitle")}
        </p>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Goal + progress dots */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-1">
              {t("chatQuestGoalLabel")}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-bold text-ds-text truncate">{t("chatQuestGoalDesc")}</p>
              <div className="flex gap-1 shrink-0">
                {Array.from({ length: target }).map((_, i) => (
                  <motion.div key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                      i < exchangeCount ? "bg-nimi-green" : "bg-gray-200"
                    }`}
                    animate={i === exchangeCount - 1 && exchangeCount <= target ? { scale:[1,1.5,1] } : {}}
                    transition={{ duration:0.4 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Reward / claim */}
          <div className="shrink-0">
            <AnimatePresence mode="wait">
              {claimed ? (
                <motion.div key="claimed"
                  initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
                  className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-[12px] px-3 py-2 rounded-2xl">
                  <CheckCircle2 className="w-4 h-4" />
                  Claimed!
                </motion.div>
              ) : canClaim ? (
                <motion.button key="claim"
                  initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
                  whileTap={{ scale:0.93 }}
                  onClick={onClaim}
                  className="flex items-center gap-1.5 text-white font-black text-[13px] px-4 py-2 rounded-2xl shadow-md"
                  style={{ backgroundColor:"var(--nimi-green)" }}
                >
                  <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                  Claim +10 ⭐
                </motion.button>
              ) : (
                <motion.div key="pending"
                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                  className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-2xl">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-yellow-600">{t("chatQuestRewardLabel")}</p>
                    <p className="text-[13px] font-black text-yellow-700">{t("chatQuestRewardValue")}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
