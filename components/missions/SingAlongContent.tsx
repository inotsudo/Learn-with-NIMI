"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { Check, Lock, Mic, Pause, Play, RotateCcw } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import MissionCompleteBanner from "./MissionCompleteBanner";

interface SingAlongContentProps {
  mission: Mission;
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
  storySlug?: string;
}

const SPEECH_LANG: Record<string, string> = { en: "en-US", fr: "fr-FR" };

export default function SingAlongContent({ mission, onComplete, completed, saving, storySlug }: SingAlongContentProps) {
  const { t, language } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useMotion();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [karaoke, setKaraoke] = useState(false);
  const [readingLine, setReadingLine] = useState(-1);
  const [songFinished, setSongFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const songUrl = mission.media_url ? getStorageUrl(mission.media_url) : null;
  const lyrics = mission.content?.lyrics ?? [];
  const activeLine = readingLine >= 0
    ? readingLine
    : (lyrics.length ? Math.min(lyrics.length - 1, Math.floor((progress / 100) * lyrics.length)) : -1);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setPlaying(p => !p);
  };

  const repeat = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    setPlaying(true);
  };

  const readAlong = () => {
    if (typeof window === "undefined" || !window.speechSynthesis || lyrics.length === 0) return;
    window.speechSynthesis.cancel();
    setKaraoke(true);
    let i = 0;
    const speakLine = () => {
      if (i >= lyrics.length) { setReadingLine(-1); return; }
      setReadingLine(i);
      const utter = new SpeechSynthesisUtterance(lyrics[i]);
      utter.lang = SPEECH_LANG[language] ?? "en-US";
      utter.onend = () => { i += 1; speakLine(); };
      window.speechSynthesis.speak(utter);
    };
    speakLine();
  };

  return (
    <div className="space-y-4">
      {songUrl && (
        <audio
          ref={audioRef}
          src={songUrl}
          onTimeUpdate={() => {
            if (!audioRef.current) return;
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
          }}
          onEnded={() => { setPlaying(false); setSongFinished(true); }}
        />
      )}

      <div className="relative overflow-hidden leaf-lg border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-violet-50/60 p-6 text-center shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
        {/* Floating music notes */}
        {["🎵", "🎶", "🎵"].map((e, i) => (
          <motion.span key={i}
            className="pointer-events-none absolute select-none text-lg opacity-30"
            style={{ left: `${15 + i * 35}%`, top: 8 }}
            animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.8 }}>
            {e}
          </motion.span>
        ))}
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <span className="select-none text-xl">🎵</span>
        </div>
        <div className="flex items-center justify-center gap-4 mb-4">
          <motion.img src={assets.nimiCircle} alt="NIMI"
            animate={m.floatLg.animate}
            transition={m.floatLg.transition}
            className="w-16 h-16 rounded-full object-cover border-4 border-yellow-400 shadow-lg" />
          <motion.img src={assets.pikoCircle} alt="PIKO"
            animate={m.floatLg.animate}
            transition={{ ...m.floatLg.transition, delay: 1.8 }}
            className="w-16 h-16 rounded-full object-cover border-4 border-blue-300 shadow-lg" />
        </div>

        <p className="font-black text-ds-text text-lg">{mission.title}</p>
        {mission.subtitle && <p className="text-gray-500 text-sm">{mission.subtitle}</p>}

        {songUrl ? (
          <>
            <div className="w-full bg-gray-100 rounded-full h-2.5 my-4 overflow-hidden">
              <div className="bg-cta-gradient h-full rounded-full transition-all"
                style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-center justify-center gap-4">
              <button onClick={repeat}
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
                aria-label={t("repeatLabel")}>
                <RotateCcw className="w-5 h-5" />
              </button>

              <button onClick={togglePlay}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${
                  playing ? "bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] scale-105" : "bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] hover:scale-105"
                }`}
                aria-label={playing ? t("pauseLabel") : t("playSongLabel")}>
                {playing
                  ? <Pause className="w-7 h-7 text-white fill-white" />
                  : <Play className="w-7 h-7 text-white fill-white ml-1" />}
              </button>

              {language !== "rw" && lyrics.length > 0 && (
                <button onClick={readAlong}
                  className="w-12 h-12 rounded-full bg-purple-400/20 hover:bg-purple-400/30 flex items-center justify-center text-purple-500 transition"
                  aria-label={t("readToMeLabel")}>
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          </>
        ) : language !== "rw" && lyrics.length > 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            <button onClick={readAlong}
              className="w-16 h-16 rounded-full bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] hover:scale-105 flex items-center justify-center shadow-xl transition-all"
              aria-label={t("readToMeLabel")}>
              <Mic className="w-7 h-7 text-white" />
            </button>
            <p className="text-xs font-black text-ds-text uppercase">{t("readToMeLabel")}</p>
          </div>
        ) : null}
      </div>

      {lyrics.length > 0 && (
        <div className="leaf border border-purple-100 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <p className="font-black text-ds-text text-xs uppercase">🎵 {t("songLyricsTitle")}</p>
            <button onClick={() => setKaraoke(k => !k)}
              className={`text-xs font-black rounded-full px-3 py-1 transition ${
                karaoke ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600 border border-gray-200"
              }`}>
              🎤 {t("karaokeModeLabel")}
            </button>
          </div>
          <div className="space-y-1">
            {lyrics.map((line, i) => (
              <p key={i}
                className={`text-sm font-semibold rounded-lg px-2 py-1 transition-colors ${
                  karaoke && i === activeLine ? "bg-purple-50 text-purple-700" : "text-gray-700"
                }`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Song-finished celebration */}
      <AnimatePresence>
        {songFinished && !completed && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="leaf border border-yellow-200 bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 p-3 flex items-center justify-center gap-2 shadow-sm"
          >
            <motion.span animate={{ rotate: [0, -20, 20, -20, 0] }} transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl select-none">🎉</motion.span>
            <p className="font-baloo font-black text-amber-800 text-[15px]">{t("greatSinging")}</p>
            <motion.span animate={{ rotate: [0, 20, -20, 20, 0] }} transition={{ duration: 0.5, delay: 0.3 }}
              className="text-2xl select-none">⭐</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {!completed ? (
        songFinished || !songUrl ? (
          <motion.button
            onClick={onComplete}
            disabled={saving}
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 }}
            whileTap={{ scale: 0.96 }}
            className="w-full bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] text-white font-black text-lg rounded-full py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 transition">
            {saving ? t("saving") : <><Check className="w-5 h-5" /> {t("markCompleteBtn")}</>}
          </motion.button>
        ) : (
          <button disabled
            className="w-full bg-gray-100 text-gray-400 font-black text-lg rounded-full py-4 flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200">
            <Lock className="w-5 h-5" /> {t("singToUnlock")}
          </button>
        )
      ) : (
        <MissionCompleteBanner storySlug={storySlug} />
      )}
    </div>
  );
}
