"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import MissionCompleteBanner from "./MissionCompleteBanner";

interface MoveGrooveContentProps {
  mission: Mission;
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
}

export default function MoveGrooveContent({ mission, onComplete, completed, saving }: MoveGrooveContentProps) {
  const { t } = useLanguage();
  const videoUrl = getStorageUrl(mission.media_url);
  const defaultPrompts = [
    { emoji: "👏", label: t("moveGroovePromptClap") },
    { emoji: "🦵", label: t("moveGroovePromptJump") },
    { emoji: "🤗", label: t("moveGroovePromptHug") },
    { emoji: "🌀", label: t("moveGroovePromptSpin") },
  ];
  const prompts = mission.content?.prompts?.length ? mission.content.prompts : defaultPrompts;

  return (
    <div className="space-y-4">
      {videoUrl && (
        <div className="bg-black rounded-3xl overflow-hidden shadow-2xl">
          <video src={videoUrl} controls playsInline
            onEnded={onComplete}
            className="w-full rounded-3xl" />
        </div>
      )}

      {mission.subtitle && (
        <p className="text-purple-200 font-bold text-sm text-center">{mission.subtitle}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {prompts.map((p) => (
          <motion.div key={p.label}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="bg-white/10 backdrop-blur rounded-2xl p-3 border-2 border-white/15 shadow-sm text-center cursor-pointer">
            <div className="text-3xl mb-1">{p.emoji}</div>
            <p className="font-black text-pink-200 text-xs uppercase">{p.label}</p>
          </motion.div>
        ))}
      </div>

      {!completed ? (
        <Button onClick={onComplete} disabled={saving}
          className="w-full bg-pink-600 hover:bg-pink-700 text-white font-black text-lg rounded-full py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
          {saving ? t("savingLabel") : <><Check className="w-5 h-5" /> {t("markCompleteBtn")}</>}
        </Button>
      ) : (
        <MissionCompleteBanner />
      )}
    </div>
  );
}
