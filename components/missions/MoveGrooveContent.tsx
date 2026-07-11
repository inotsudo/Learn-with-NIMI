"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { Check, Lock, Play, Volume2 } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
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
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoWatched, setVideoWatched] = useState(false);
  const [tappedCards, setTappedCards] = useState<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  const mainVideoUrl = mission.media_url ? getStorageUrl(mission.media_url) : null;
  const defaultPrompts: VisualPrompt[] = PROMPT_KEYS.map((k, i) => ({ order: i + 1, emoji: PROMPT_EMOJIS[i], label: t(k) }));
  const rawPrompts: VisualPrompt[] = mission.content?.prompts?.length ? mission.content.prompts : defaultPrompts;
  const prompts = [...rawPrompts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasVisuals = prompts.some(p => p.image_url || p.video_url);
  const requiredCardTaps = Math.max(3, Math.ceil(prompts.length * 0.6));
  const lockRateMain = () => {
    if (mainVideoRef.current && mainVideoRef.current.playbackRate !== 1) mainVideoRef.current.playbackRate = 1;
  };
  const onMainTimeUpdate = () => {
    if (!mainVideoRef.current) return;
    const pct = (mainVideoRef.current.currentTime / (mainVideoRef.current.duration || 1)) * 100;
    setVideoProgress(pct);
    if (pct >= 85) setVideoWatched(true);
  };
  const canComplete = mainVideoUrl ? videoWatched : tappedCards.size >= requiredCardTaps;

  const playAudio = (url: string) => {
    audioRef.current?.pause();
    const au = new Audio(getStorageUrl(url));
    audioRef.current = au;
    au.play().catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden leaf border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-orange-50/70 p-5 shadow-sm text-center">
        <motion.span
          className="absolute left-3 top-2 select-none text-xl opacity-50"
          animate={{ scale: [1, 1.3, 1], rotate: [-5, 5, -5] }}
          transition={{ duration: 1.5, repeat: Infinity }}>💪</motion.span>
        <motion.span
          className="absolute right-3 top-2 select-none text-xl opacity-50"
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}>🕺</motion.span>

        <motion.img
          src={assets.nimiHappy}
          alt="NIMI"
          animate={{ y: [0, -6, 0], rotate: [-4, 4, -4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 mx-auto mb-3 h-16 w-16 rounded-full border-4 border-pink-300 object-cover shadow-lg"
        />

        <div className="relative z-10 mb-2 flex items-center justify-center gap-1.5">
          {["🤸", "🎶", "💃"].map((e, i) => (
            <motion.span key={i} className="select-none text-lg"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}>
              {e}
            </motion.span>
          ))}
        </div>

        <p className="relative z-10 font-baloo font-black text-ds-text text-[20px]">{mission.title}</p>
        {mission.subtitle && (
          <p className="relative z-10 font-nunito text-gray-500 text-[14px] mt-1">{mission.subtitle}</p>
        )}
      </div>

      {/* Main demo video */}
      {mainVideoUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-pink-200 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Watch &amp; Move! 🎬</span>
            <div className="h-[2px] flex-1 rounded-full bg-gradient-to-l from-orange-200 to-transparent" />
          </div>
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
            <video
              ref={mainVideoRef}
              src={mainVideoUrl}
              controls
              playsInline
              controlsList="nodownload noremoteplayback noplaybackrate"
              disablePictureInPicture
              onRateChange={lockRateMain}
              onTimeUpdate={onMainTimeUpdate}
              onEnded={() => setVideoWatched(true)}
              className="w-full rounded-2xl"
            />
          </div>
          {!videoWatched && (
            <div className="flex items-center gap-3 px-1">
              <Lock className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
              <div className="flex-1 h-1.5 bg-pink-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-400 to-orange-400 rounded-full transition-all" style={{ width: `${videoProgress}%` }} />
              </div>
              <span className="font-baloo font-black text-[11px] text-pink-500">{Math.round(videoProgress)}%</span>
            </div>
          )}
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
            if (!mainVideoUrl) setTappedCards(prev => new Set(prev).add(i));
          };

          return (
            <motion.div key={i}
              whileHover={{ scale: 1.03 }} whileTap={m.buttonPress}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              onClick={handleCardTap}
              className={`overflow-hidden leaf border text-center transition cursor-pointer shadow-sm ${
                !mainVideoUrl && tappedCards.has(i)
                  ? 'border-pink-400 bg-gradient-to-br from-pink-50 via-white to-orange-50'
                  : imgUrl ? 'border-pink-100 bg-gradient-to-br from-white via-pink-50/70 to-amber-50/60 hover:border-pink-300'
                  : 'border-pink-100 bg-white p-4 hover:border-pink-300'
              }`}>

              {/* Visual card with image */}
              {imgUrl ? (
                <>
                  <div className="relative aspect-square bg-gray-100">
                    <img src={imgUrl} alt={p.label ?? ''} className="w-full h-full object-cover"  loading="lazy" />
                    {vidUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play size={18} className="text-gray-500 ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                  {(p.label || audioUrl) && (
                    <div className="flex items-center justify-center gap-1.5 px-2 py-2.5">
                      {audioUrl && <Volume2 size={12} className="text-pink-500 shrink-0" />}
                      {p.label && <p className="font-nunito font-bold text-gray-600 text-[12px] sm:text-[13px]">{p.label}</p>}
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
                    {audioUrl && <Volume2 size={11} className="text-pink-500" />}
                    <p className="font-nunito font-bold text-gray-700 text-[13px]">{p.label}</p>
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Card progress (no-video mode) */}
      {!mainVideoUrl && !canComplete && (
        <div className="leaf border border-pink-100 bg-pink-50/50 px-4 py-3 flex items-center gap-3">
          <Lock className="w-4 h-4 text-pink-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-nunito font-bold text-[11px] text-pink-500 mb-1">{t("moveToUnlock")} ({tappedCards.size}/{requiredCardTaps})</p>
            <div className="h-2 w-full bg-pink-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-400 to-orange-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, (tappedCards.size / requiredCardTaps) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {!completed ? (
        canComplete ? (
          <motion.button
            onClick={onComplete}
            disabled={saving}
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 }}
            whileTap={{ scale: 0.96 }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 py-4 font-baloo font-black text-[18px] text-white shadow-[0_10px_24px_rgba(236,72,153,0.28)] transition disabled:opacity-50"
          >
            {saving ? t("saving") : <><Check className="w-5 h-5" /> {t("iDidItBtn")}</>}
          </motion.button>
        ) : (
          <button disabled
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 py-4 font-baloo font-black text-[18px] text-gray-400 cursor-not-allowed border border-gray-200">
            <Lock className="w-5 h-5" /> {t("moveToUnlock")}
          </button>
        )
      ) : (
        <MissionCompleteBanner />
      )}
    </div>
  );
}
