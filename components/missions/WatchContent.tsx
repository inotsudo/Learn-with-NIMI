"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import MissionCompleteBanner from "./MissionCompleteBanner";

interface WatchContentProps {
  mission: Mission;
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
  storySlug?: string;
}

export default function WatchContent({ mission, onComplete, completed, saving, storySlug }: WatchContentProps) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [watchProgress, setWatchProgress] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const videoUrl = mission.media_url ? getStorageUrl(mission.media_url) : null;

  const lockRate = () => {
    if (videoRef.current && videoRef.current.playbackRate !== 1) {
      videoRef.current.playbackRate = 1;
    }
  };

  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / (videoRef.current.duration || 1)) * 100;
    setWatchProgress(pct);
    if (pct >= 95) setVideoEnded(true);
  };

  const canComplete = !videoUrl || videoEnded;

  return (
    <div className="space-y-4">
      {/* Cinema header */}
      <div className="relative overflow-hidden leaf border border-indigo-200/60 bg-gradient-to-br from-indigo-900 via-[#1e1b4b] to-blue-950 p-5 text-center shadow-[0_16px_34px_rgba(49,46,129,0.22)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[length:10px_10px]" />
        <motion.span className="absolute left-3 top-2 select-none text-2xl opacity-25"
          animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>🎞️</motion.span>
        <motion.span className="absolute right-3 top-2 select-none text-2xl opacity-25"
          animate={{ rotate: -360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }}>🎬</motion.span>

        <motion.img src={assets.nimiHappy} alt="NIMI"
          animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 mx-auto mb-3 h-16 w-16 rounded-full border-4 border-yellow-400/60 object-cover shadow-[0_0_18px_rgba(251,191,36,0.30)]" />

        <div className="relative z-10 mb-2 flex items-center justify-center gap-2">
          <span className="select-none text-base">🍿</span>
          <span className="rounded-full border border-yellow-400/30 bg-yellow-400/15 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">
            {t("movieTimeLabel")}
          </span>
          <span className="select-none text-base">🎥</span>
        </div>
        <p className="relative z-10 font-baloo font-black text-white text-[20px] leading-snug">{mission.title}</p>
        {mission.subtitle && <p className="relative z-10 mt-1 font-nunito text-indigo-200/70 text-[13px]">{mission.subtitle}</p>}
      </div>

      {/* Video player */}
      {videoUrl ? (
        <div className="overflow-hidden rounded-2xl bg-black shadow-[0_12px_32px_rgba(0,0,0,0.40)]">
          <div className="flex items-center gap-1 bg-gray-900 px-3 py-1.5">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-3 w-3 flex-shrink-0 rounded-sm bg-gray-700" />)}
          </div>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            controlsList="nodownload noremoteplayback noplaybackrate"
            disablePictureInPicture
            onRateChange={lockRate}
            onTimeUpdate={onTimeUpdate}
            onEnded={() => setVideoEnded(true)}
            className="w-full"
          />
          <div className="flex items-center gap-1 bg-gray-900 px-3 py-1.5">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-3 w-3 flex-shrink-0 rounded-sm bg-gray-700" />)}
          </div>
        </div>
      ) : (
        <div className="leaf border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 p-10 text-center shadow-sm">
          <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="mb-3 text-5xl select-none">🎬</motion.div>
          <p className="font-baloo font-black text-ds-text text-[18px]">{t("videoComingSoon")}</p>
          <p className="font-nunito text-gray-500 text-[13px] mt-1">{t("comingSoonTeacher")}</p>
        </div>
      )}

      {/* Watch-progress lock bar — visible while video is loaded but not finished */}
      {videoUrl && !videoEnded && (
        <div className="leaf border border-indigo-100 bg-indigo-50/50 px-4 py-3 flex items-center gap-3">
          <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-nunito font-bold text-[11px] text-indigo-500 mb-1">{t("watchToUnlock")}</p>
            <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${watchProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
          <span className="font-baloo font-black text-[13px] text-indigo-500 w-9 text-right flex-shrink-0">
            {Math.round(watchProgress)}%
          </span>
        </div>
      )}

      {/* Post-watch celebration */}
      <AnimatePresence>
        {videoEnded && !completed && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="leaf border border-indigo-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 p-3 flex items-center justify-center gap-2 shadow-sm"
          >
            <motion.span animate={{ rotate: [0, -20, 20, -20, 0] }} transition={{ duration: 0.5, delay: 0.1 }}
              className="select-none text-2xl">🎉</motion.span>
            <p className="font-baloo font-black text-indigo-800 text-[15px]">{t("watchedItAllMsg")}</p>
            <motion.span animate={{ rotate: [0, 20, -20, 20, 0] }} transition={{ duration: 0.5, delay: 0.3 }}
              className="select-none text-2xl">⭐</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {!completed ? (
        canComplete ? (
          <motion.button
            onClick={onComplete}
            disabled={saving}
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 }}
            whileTap={{ scale: 0.96 }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 py-4 font-baloo font-black text-[18px] text-white shadow-[0_10px_24px_rgba(99,102,241,0.30)] transition disabled:opacity-50"
          >
            {saving ? t("saving") : <><Check className="h-5 w-5" /> {t("iWatchedItBtn")}</>}
          </motion.button>
        ) : (
          <button disabled
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 py-4 font-baloo font-black text-[18px] text-gray-400 cursor-not-allowed border border-gray-200">
            <Lock className="h-5 w-5" /> {t("watchToUnlock")}
          </button>
        )
      ) : (
        <MissionCompleteBanner storySlug={storySlug} />
      )}
    </div>
  );
}
