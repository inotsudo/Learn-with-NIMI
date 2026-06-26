"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Mic, Pause, Play, RotateCcw } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import MissionCompleteBanner from "./MissionCompleteBanner";

interface SingAlongContentProps {
  mission: Mission;
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
}

const SPEECH_LANG: Record<string, string> = { en: "en-US", fr: "fr-FR", rw: "rw-RW" };

export default function SingAlongContent({ mission, onComplete, completed, saving }: SingAlongContentProps) {
  const { t, language } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [karaoke, setKaraoke] = useState(false);
  const [readingLine, setReadingLine] = useState(-1);
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
          onEnded={() => setPlaying(false)}
        />
      )}

      <div className="bg-white/10 backdrop-blur rounded-3xl shadow-xl p-6 border-2 border-white/15 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <motion.img src="/nimi-logo-circle.png" alt="NIMI"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-full object-cover border-4 border-yellow-400 shadow-lg" />
          <motion.img src="/piko-logo-circle.png.png" alt="PIKO"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
            className="w-16 h-16 rounded-full object-cover border-4 border-blue-300 shadow-lg" />
        </div>

        <p className="font-black text-white text-lg">{mission.title}</p>
        {mission.subtitle && <p className="theme-text text-sm">{mission.subtitle}</p>}

        {songUrl ? (
          <>
            <div className="w-full bg-white/10 rounded-full h-2.5 my-4 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-center justify-center gap-4">
              <button onClick={repeat}
                className="w-12 h-12 rounded-full theme-accent-muted hover:theme-accent-muted flex items-center justify-center theme-text transition"
                aria-label={t("repeatLabel")}>
                <RotateCcw className="w-5 h-5" />
              </button>

              <button onClick={togglePlay}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${
                  playing ? "theme-accent hover:theme-accent scale-105" : "bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-105"
                }`}
                aria-label={playing ? t("pauseLabel") : t("playSongLabel")}>
                {playing
                  ? <Pause className="w-7 h-7 text-white fill-white" />
                  : <Play className="w-7 h-7 text-white fill-white ml-1" />}
              </button>

              <button onClick={readAlong}
                className="w-12 h-12 rounded-full bg-pink-400/20 hover:bg-pink-400/30 flex items-center justify-center text-pink-200 transition"
                aria-label={t("readToMeLabel")}>
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-2">
            <button onClick={readAlong}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-105 flex items-center justify-center shadow-xl transition-all"
              aria-label={t("readToMeLabel")}>
              <Mic className="w-7 h-7 text-white" />
            </button>
            <p className="text-xs font-black text-white uppercase">{t("readToMeLabel")}</p>
          </div>
        )}
      </div>

      {lyrics.length > 0 && (
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <p className="font-black text-white text-xs uppercase">🎵 {t("songLyricsTitle")}</p>
            <button onClick={() => setKaraoke(k => !k)}
              className={`text-xs font-black rounded-full px-3 py-1 transition ${
                karaoke ? "theme-accent text-white" : "bg-white/10 text-white border border-white/20"
              }`}>
              🎤 {t("karaokeModeLabel")}
            </button>
          </div>
          <div className="space-y-1">
            {lyrics.map((line, i) => (
              <p key={i}
                className={`text-sm font-semibold rounded-lg px-2 py-1 transition-colors ${
                  karaoke && i === activeLine ? "theme-accent-muted text-white" : "theme-text"
                }`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {!completed ? (
        <Button onClick={onComplete} disabled={saving}
          className="w-full theme-accent hover:theme-accent text-white font-black text-lg rounded-full py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
          {saving ? t("savingLabel") : <><Check className="w-5 h-5" /> {t("markCompleteBtn")}</>}
        </Button>
      ) : (
        <MissionCompleteBanner />
      )}
    </div>
  );
}
