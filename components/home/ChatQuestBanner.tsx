"use client";

import { motion } from "framer-motion";
import { Sparkles, MessageCircle, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ChatQuestBanner() {
  const { t } = useLanguage();

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-3xl shadow-md p-4 sm:p-5 flex items-center gap-3 sm:gap-5">
      <motion.img
        src="/nimi-logo-circle.png" alt="NIMI"
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-yellow-400 shadow-lg flex-shrink-0"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />

      <div className="flex-1 min-w-0">
        <p className="font-black text-purple-200 text-sm sm:text-lg flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          {t("nimiChatQuestTitle")}
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
        </p>
        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wide text-purple-300">{t("chatQuestGoalLabel")}</p>
              <p className="text-sm font-bold text-purple-100 truncate">{t("chatQuestGoalDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-yellow-400/20 backdrop-blur border border-white/20 rounded-xl px-3 py-1.5 flex-shrink-0">
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-yellow-200">{t("chatQuestRewardLabel")}</p>
              <p className="text-sm font-black text-yellow-200">{t("chatQuestRewardValue")}</p>
            </div>
          </div>
        </div>
      </div>

      <motion.img
        src="/piko-logo-circle.png.png" alt="PIKO"
        className="hidden sm:block w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-blue-300 shadow-lg flex-shrink-0"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.8 }} />
    </div>
  );
}
