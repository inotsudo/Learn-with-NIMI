"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Mic, PlayCircle } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission, StoryPage } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import { speakText, stopSpeaking } from "@/lib/speech";
import { useSpeechToText, speechErrorKey } from "@/hooks/useSpeechToText";
import MissionCompleteBanner from "./MissionCompleteBanner";

interface StoryContentProps {
  mission: Mission;
  storyPages: StoryPage[];
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
}

export default function StoryContent({ mission, storyPages, onComplete, completed }: StoryContentProps) {
  const { t, language } = useLanguage();
  const [pageIndex, setPageIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayRef = useRef(false);

  const { listening, supported: micSupported, start: startListening, stop: stopListening, error: micError } =
    useSpeechToText(language, () => {});
  const showMic = micSupported && language !== "rw";

  useEffect(() => {
    if (!completed) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      audioRef.current?.pause();
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, []);

  const currentPage = storyPages[pageIndex];

  const stopAll = () => {
    autoPlayRef.current = false;
    setAutoPlay(false);
    if (autoPlayTimerRef.current) { clearTimeout(autoPlayTimerRef.current); autoPlayTimerRef.current = null; }
    stopSpeaking();
    if (audioRef.current) { audioRef.current.onended = null; audioRef.current.pause(); }
    setIsSpeaking(false);
  };

  const playPage = (index: number, chained: boolean) => {
    const page = storyPages[index];
    if (!page) return;

    if (page.audio_url) {
      const audio = new Audio(getStorageUrl(page.audio_url));
      audioRef.current = audio;
      setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        if (chained && autoPlayRef.current) advance(index);
      };
      audio.play().catch(() => setIsSpeaking(false));
    } else if (page.text && language !== "rw") {
      setIsSpeaking(true);
      speakText(page.text, language, {
        onEnd: () => {
          setIsSpeaking(false);
          if (chained && autoPlayRef.current) advance(index);
        },
      });
    } else if (chained) {
      autoPlayTimerRef.current = setTimeout(() => {
        if (autoPlayRef.current) advance(index);
      }, 2200);
    }
  };

  const advance = (fromIndex: number) => {
    const next = fromIndex + 1;
    if (next >= storyPages.length) { stopAll(); return; }
    setPageIndex(next);
    playPage(next, true);
  };

  const goTo = (index: number) => {
    if (index < 0 || index >= storyPages.length || index === pageIndex) return;
    stopAll();
    setPageIndex(index);
  };

  const handleReadToMe = () => {
    if (isSpeaking) { stopAll(); return; }
    if (listening) stopListening();
    playPage(pageIndex, false);
  };

  const toggleAutoPlay = () => {
    if (autoPlay) { stopAll(); return; }
    if (listening) stopListening();
    autoPlayRef.current = true;
    setAutoPlay(true);
    playPage(pageIndex, true);
  };

  const toggleReadMyself = () => {
    if (listening) { stopListening(); return; }
    stopAll();
    startListening();
  };

  return (
    <div className="space-y-4">
      {mission.subtitle && (
        <p className="text-gray-600 font-bold text-sm text-center">{mission.subtitle}</p>
      )}

      {storyPages.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-md p-6 text-center">
          <p className="text-4xl mb-3">📖</p>
          <p className="font-bold text-gray-600">{t("noPagesTitle")}</p>
          <p className="text-sm text-gray-400 mt-1">{t("noPagesHint")}</p>
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-blue-100">

            {/* Header */}
            <div className="px-5 pt-4 pb-2 text-center">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{t("todaysStoryLabel")}</p>
              <p className="font-black text-gray-800">{mission.title}</p>
            </div>

            {/* Page image + nav arrows */}
            <div className="relative bg-gray-50 px-2">
              {currentPage?.image_url && (
                <img src={getStorageUrl(currentPage.image_url)}
                  alt={t("pageNumberLabel").replace("{number}", String(pageIndex + 1))}
                  className="w-full object-contain max-h-[360px] mx-auto" />
              )}

              <motion.button whileHover={pageIndex === 0 ? {} : { scale: 1.08 }} whileTap={pageIndex === 0 ? {} : { scale: 0.92 }}
                onClick={() => goTo(pageIndex - 1)} disabled={pageIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-blue-600 disabled:opacity-30 transition">
                ◀
              </motion.button>
              <motion.button whileHover={pageIndex >= storyPages.length - 1 ? {} : { scale: 1.08 }} whileTap={pageIndex >= storyPages.length - 1 ? {} : { scale: 0.92 }}
                onClick={() => goTo(pageIndex + 1)} disabled={pageIndex >= storyPages.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-blue-600 disabled:opacity-30 transition">
                ▶
              </motion.button>
            </div>

            {/* Page-dot indicators */}
            <div className="flex items-center justify-center gap-1.5 pt-3">
              {storyPages.map((_, i) => (
                <button key={i} onClick={() => goTo(i)}
                  aria-label={t("pageNumberLabel").replace("{number}", String(i + 1))}
                  className={`rounded-full transition-all ${i === pageIndex ? "w-2.5 h-2.5 bg-blue-500" : "w-2 h-2 bg-blue-100 hover:bg-blue-200"}`} />
              ))}
            </div>
            <p className="text-center text-[10px] text-gray-400 font-bold mt-1">
              {t("pageOfLabel").replace("{current}", String(pageIndex + 1)).replace("{total}", String(storyPages.length))}
            </p>

            {/* Page narration text */}
            {currentPage?.text && (
              <p className="px-5 pt-2 text-sm text-gray-600 text-center leading-relaxed">{currentPage.text}</p>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 px-4 py-4">
              <button onClick={handleReadToMe}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 font-black text-[10px] uppercase transition ${
                  isSpeaking ? "bg-blue-600 text-white shadow-md" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}>
                <Volume2 className="w-5 h-5" />
                {t("readToMeLabel")}
              </button>

              <button onClick={toggleReadMyself} disabled={!showMic}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 font-black text-[10px] uppercase transition disabled:opacity-40 ${
                  listening ? "bg-pink-600 text-white shadow-md" : "bg-pink-50 text-pink-700 hover:bg-pink-100"
                }`}>
                <Mic className="w-5 h-5" />
                {listening ? t("listeningLabel") : t("readMyselfLabel")}
              </button>

              <button onClick={toggleAutoPlay}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 font-black text-[10px] uppercase transition ${
                  autoPlay ? "bg-purple-600 text-white shadow-md" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}>
                <PlayCircle className="w-5 h-5" />
                {t("autoPlayLabel")}
              </button>
            </div>

            {micError && (
              <p className="px-4 pb-3 text-[11px] font-bold text-red-500 text-center">
                {t(speechErrorKey(micError))}
              </p>
            )}

            <p className="text-center text-[10px] text-gray-400 pb-4 px-4">{t("storyReaderHint")}</p>
          </motion.div>

          {completed && <MissionCompleteBanner />}
        </>
      )}
    </div>
  );
}
