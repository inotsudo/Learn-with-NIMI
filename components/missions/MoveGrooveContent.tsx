"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Play, Volume2 } from "lucide-react";
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

interface VisualPrompt {
  order?: number;
  emoji?: string;
  label?: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const PROMPT_KEYS = ["moveClap", "moveJump", "moveHug", "moveSpin", "moveStretch", "moveDance"] as const;
const PROMPT_EMOJIS = ["👏", "🦵", "🤗", "🌀", "💪", "🕺"];

export default function MoveGrooveContent({ mission, onComplete, completed, saving }: MoveGrooveContentProps) {
  const { t } = useLanguage();
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const mainVideoUrl = mission.media_url ? getStorageUrl(mission.media_url) : null;
  const defaultPrompts: VisualPrompt[] = PROMPT_KEYS.map((k, i) => ({ order: i + 1, emoji: PROMPT_EMOJIS[i], label: t(k) }));
  const rawPrompts: VisualPrompt[] = mission.content?.prompts?.length ? mission.content.prompts : defaultPrompts;
  const prompts = [...rawPrompts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasVisuals = prompts.some(p => p.image_url || p.video_url);

  const playAudio = (url: string) => {
    audioRef.current?.pause();
    const au = new Audio(getStorageUrl(url));
    audioRef.current = au;
    au.play().catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="font-baloo font-black text-white text-[20px]">{mission.title}</p>
        {mission.subtitle && <p className="font-nunito theme-text text-[14px] mt-1">{mission.subtitle}</p>}
      </div>

      {/* Main demo video */}
      {mainVideoUrl && (
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
          <video src={mainVideoUrl} controls playsInline className="w-full rounded-2xl" />
        </div>
      )}

      {/* Inline video player for prompt videos */}
      {activeVideo && (
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative">
          <video src={getStorageUrl(activeVideo)} controls autoPlay playsInline className="w-full rounded-2xl"
            onEnded={() => setActiveVideo(null)} />
          <button onClick={() => setActiveVideo(null)}
            className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-[13px] font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Activity cards — visual or emoji-based */}
      <div className={hasVisuals ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 sm:grid-cols-3 gap-3"}>
        {prompts.map((p, i) => {
          const imgUrl = p.image_url ? getStorageUrl(p.image_url) : null;
          const vidUrl = p.video_url;

          const audioUrl = p.audio_url;

          const handleCardTap = () => {
            if (audioUrl) playAudio(audioUrl);
            if (vidUrl) setActiveVideo(vidUrl);
          };

          return (
            <motion.div key={i}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              onClick={handleCardTap}
              className={`rounded-2xl border theme-border overflow-hidden text-center transition cursor-pointer hover:border-pink-400/30 ${
                imgUrl ? 'theme-card' : 'theme-card-hover p-4'
              }`}>

              {/* Visual card with image */}
              {imgUrl ? (
                <>
                  <div className="relative aspect-square theme-darker">
                    <img src={imgUrl} alt={p.label ?? ''} className="w-full h-full object-cover" />
                    {vidUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play size={18} className="theme-text-muted ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                  {(p.label || audioUrl) && (
                    <div className="flex items-center justify-center gap-1.5 px-2 py-2.5">
                      {audioUrl && <Volume2 size={12} className="text-pink-300 shrink-0" />}
                      {p.label && <p className="font-nunito font-bold theme-text text-[12px] sm:text-[13px]">{p.label}</p>}
                    </div>
                  )}
                </>
              ) : (
                /* Emoji fallback card */
                <>
                  <motion.span className="text-4xl block mb-2"
                    animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
                    {p.emoji}
                  </motion.span>
                  <div className="flex items-center justify-center gap-1">
                    {audioUrl && <Volume2 size={11} className="text-pink-300" />}
                    <p className="font-nunito font-bold theme-text text-[13px]">{p.label}</p>
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {!completed ? (
        <button onClick={onComplete} disabled={saving}
          className="w-full font-baloo font-black bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-[18px] rounded-full py-4 shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {saving ? t("saving") : <><Check className="w-5 h-5" /> {t("iDidItBtn")}</>}
        </button>
      ) : (
        <MissionCompleteBanner />
      )}
    </div>
  );
}
