"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, CheckSquare, Play, Volume2 } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";

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
    <div className="theme-card border-2 theme-border rounded-[20px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] h-full">
      <div className="px-5 pt-4 pb-0">
        <p className="font-baloo font-black text-white text-[20px] sm:text-[24px] uppercase tracking-wider">
          {t("weeklyChallenge") || "Champion Challenge"} 🌿
        </p>
      </div>

      {/* Visual example — image or video */}
      {(imgUrl || vidUrl) && (
        <div className="px-5 pt-3">
          {showVideo && vidUrl ? (
            <div className="bg-black rounded-2xl overflow-hidden relative">
              <video src={vidUrl} controls autoPlay playsInline className="w-full rounded-2xl"
                onEnded={() => setShowVideo(false)} />
            </div>
          ) : imgUrl ? (
            <div className="relative rounded-2xl overflow-hidden cursor-pointer" onClick={() => vidUrl && setShowVideo(true)}>
              <img src={imgUrl} alt={title} className="w-full h-40 sm:h-48 object-cover rounded-2xl" />
              {vidUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play size={22} className="theme-text-muted ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          ) : vidUrl ? (
            <button onClick={() => setShowVideo(true)}
              className="w-full theme-darker border theme-border rounded-2xl py-6 flex flex-col items-center gap-2 hover:theme-card-active transition">
              <Play size={28} className="theme-text-muted" />
              <span className="theme-text text-[13px] font-bold">{t("readyToWatch")}</span>
            </button>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-4 p-5 pt-3">
        {/* Trophy SVG — hide when visual example shown */}
        {!imgUrl && !vidUrl && (
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}
            className="shrink-0">
            <img src="/assets/trophy.svg" alt="Trophy" className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg" />
          </motion.div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-baloo font-black text-white text-[22px] sm:text-[26px] leading-tight flex-1">{title}</h3>
            {audUrl && (
              <button onClick={playAudio}
                className="shrink-0 mt-1 w-9 h-9 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center hover:bg-pink-500/30 transition">
                <Volume2 size={16} className="text-pink-300" />
              </button>
            )}
          </div>
          <p className="font-nunito theme-text text-[14px] sm:text-[16px] mt-1.5 leading-relaxed">{description}</p>

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-yellow-300 text-[12px] font-black flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-300" /> +{stars}
            </span>
            <span className="theme-accent/60 border theme-border-strong/25 theme-text text-[10px] font-bold px-2 py-0.5 rounded-full">
              🏅 {reward}
            </span>
            {difficulty && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                difficulty === 'easy' ? 'bg-green-500/20 text-green-300 border border-green-400/20' :
                difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/20' :
                'bg-red-500/20 text-red-300 border border-red-400/20'
              }`}>
                {'⭐'.repeat(difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3)}
              </span>
            )}
          </div>

          {completed ? (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-500 text-white font-black rounded-xl px-6 py-3 text-[15px] shadow-lg">
              ✅ {t("iDidItBtn")}
            </div>
          ) : (
            <motion.button onClick={onDidIt} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              className="mt-4 inline-flex items-center gap-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-baloo font-black rounded-xl px-7 py-3.5 text-[20px] sm:text-[22px] shadow-[0_6px_24px_rgba(34,197,94,0.35)] transition-shadow">
              <CheckSquare className="w-5 h-5" />
              {t("iDidItBtn")}
            </motion.button>
          )}
        </div>

        {/* NIMI — only when no visual */}
        {!imgUrl && !vidUrl && (
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
            className="hidden sm:block shrink-0">
            <div className="relative">
              <img src="/nimi-logo-circle.png" alt="NIMI"
                className="w-20 h-20 rounded-full border-[3px] border-yellow-400/50 shadow-xl" />
              <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 bg-red-500 rounded-full flex items-center justify-center text-lg shadow-lg border-2 border-white/20">
                ❤️
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
