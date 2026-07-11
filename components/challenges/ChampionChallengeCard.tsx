"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, CheckSquare, Play, Volume2 } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useThemeMotion } from "@/hooks/useThemeMotion";

interface Props {
  title?: string;
  description?: string;
  reward?: string;
  stars?: number;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  onDidIt: () => void;
  completed?: boolean;
}

export default function ChampionChallengeCard({
  title = "Make Someone Smile Today!",
  description = "Share kindness and spread happiness wherever you go.",
  reward = "Kind Heart Badge",
  stars = 50,
  image_url,
  video_url,
  audio_url,
  difficulty,
  onDidIt,
  completed = false,
}: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();
  const [showVideo, setShowVideo] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imgUrl = image_url ? getStorageUrl(image_url) : null;
  const vidUrl = video_url ? getStorageUrl(video_url) : null;
  const audUrl = audio_url ? getStorageUrl(audio_url) : null;

  useEffect(() => () => { audioRef.current?.pause() }, []);

  const playAudio = () => {
    if (!audUrl) return;
    audioRef.current?.pause();
    const au = new Audio(audUrl);
    audioRef.current = au;
    au.play().catch(() => {});
  };

  return (
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/40 to-white shadow-[0_16px_34px_rgba(15,23,42,0.08)] leaf h-full">
      <div className="absolute inset-x-4 top-4 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <div className="px-5 pt-4 pb-0">
        <div className="mb-2 flex items-center justify-start">
          <div className="rounded-full border border-[var(--ds-border-brand)]/20 bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--ds-brand-primary)] shadow-sm">
            Kindness mission
          </div>
        </div>
        <p className="font-baloo font-black text-ds-text text-[20px] sm:text-[24px] uppercase tracking-wider">
          {t("weeklyChallenge") || "Champion Challenge"} 🌿
        </p>
      </div>

      {/* Visual example — image or video */}
      {(imgUrl || vidUrl) && (
        <div className="px-5 pt-3">
          {showVideo && vidUrl ? (
            <div className="bg-black overflow-hidden relative" style={{ borderRadius: 'var(--leaf-r)' }}>
              <video src={vidUrl} controls autoPlay playsInline className="w-full rounded-2xl"
                onEnded={() => setShowVideo(false)} />
            </div>
          ) : imgUrl ? (
            <div className="relative overflow-hidden cursor-pointer" style={{ borderRadius: 'var(--leaf-r)' }} onClick={() => vidUrl && setShowVideo(true)}>
              <img src={imgUrl} alt={title} className="w-full h-40 sm:h-48 object-cover" />
              {vidUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play size={22} className="text-gray-500 ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          ) : vidUrl ? (
            <button onClick={() => setShowVideo(true)}
              className="w-full bg-gray-50 border border-ds-border py-6 flex flex-col items-center gap-2 hover:bg-gray-100 transition"
              style={{ borderRadius: 'var(--leaf-r)' }}>
              <Play size={28} className="text-gray-500" />
              <span className="text-ds-text text-[13px] font-bold">{t("readyToWatch")}</span>
            </button>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-4 p-5 pt-3">
        {/* Trophy SVG — hide when visual example shown */}
        {!imgUrl && !vidUrl && (
          <motion.div animate={m.floatSoft.animate} transition={m.floatSoft.transition}
            className="shrink-0">
            <img src={assets.trophy} alt="Trophy" className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg" />
          </motion.div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-baloo font-black text-ds-text text-[22px] sm:text-[26px] leading-tight flex-1">{title}</h3>
            {audUrl && (
              <button onClick={playAudio}
                className="shrink-0 mt-1 w-9 h-9 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center hover:bg-pink-500/30 transition">
                <Volume2 size={16} className="text-pink-300" />
              </button>
            )}
          </div>
          <p className="font-nunito text-ds-text text-[14px] sm:text-[16px] mt-1.5 leading-relaxed">{description}</p>

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[12px] font-black text-yellow-600 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-yellow-400" /> +{stars}
            </span>
            <span className="rounded-full border border-[var(--ds-border-brand)]/20 bg-white/80 px-2.5 py-1 text-[10px] font-bold text-ds-text shadow-sm">
              🏅 {reward}
            </span>
            {difficulty && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                difficulty === 'easy' ? 'bg-green-100 text-green-700 border border-green-200' :
                difficulty === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {'⭐'.repeat(difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3)}
              </span>
            )}
          </div>

          {completed ? (
            <div className="mt-4 inline-flex items-center gap-2 text-white font-black px-6 py-3 text-[15px] shadow-lg" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}>
              ✅ {t("iDidItBtn")}
            </div>
          ) : (
            <motion.button onClick={onDidIt} whileHover={m.buttonHover} whileTap={m.dangerPress}
              className="mt-4 inline-flex items-center gap-2.5 bg-gradient-to-r from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)] text-white font-baloo font-black leaf px-7 py-3.5 text-[20px] sm:text-[22px] shadow-[0_8px_24px_rgba(22,163,74,0.25)] transition-shadow">
              <CheckSquare className="w-5 h-5" />
              {t("iDidItBtn")}
            </motion.button>
          )}
        </div>

        {/* NIMI — only when no visual */}
        {!imgUrl && !vidUrl && (
          <motion.div animate={m.floatMd.animate} transition={{ ...m.floatMd.transition, delay: 0.5 }}
            className="hidden sm:block shrink-0">
            <div className="relative">
              <img src={assets.nimiCircle} alt="NIMI"
                className="w-20 h-20 rounded-full border-[3px] border-yellow-400 shadow-xl" />
              <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 bg-red-500 rounded-full flex items-center justify-center text-lg shadow-lg border-2 border-white">
                ❤️
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
