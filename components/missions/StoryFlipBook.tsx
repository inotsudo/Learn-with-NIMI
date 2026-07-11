"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { BookOpen, X } from "lucide-react";
import HTMLFlipBook from "react-pageflip";
import { getStorageUrl } from "@/lib/queries";
import { isSoundEffectsEnabled } from "@/lib/soundEffects";
import type { Page } from "./types";
import { useAppTheme } from "@/contexts/AppThemeProvider";

interface StoryFlipBookProps {
  pages: Page[];
  onClose: () => void;
  t: (key: string) => string;
}

export default function StoryFlipBook({ pages, onClose, t }: StoryFlipBookProps) {
  const { theme } = useAppTheme();
  const m = useThemeMotion();
  const [processedPages, setProcessedPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const flipBookRef = useRef<any>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [, setIsPlayingAudio] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // Tracks whether the flipbook is showing one page (portrait) or a
  // two-page spread (landscape) — used to draw the spine between pages
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(isMobile ? 'portrait' : 'landscape');

  // Audio controls
  const playAudioForPage = (page: Page) => {
    stopAudio();
    if (!page.audio_url || !isSoundEffectsEnabled()) return;

    const audio = new Audio(page.audio_url);
    audio.preload = "auto";
    audio.onended = () => setIsPlayingAudio(false);
    audio.play().catch((error) => {
      console.warn("Audio play failed:", error);
      setIsPlayingAudio(false);
    });
    setCurrentAudio(audio);
    setIsPlayingAudio(true);
  };

  const stopAudio = () => {
    if (!currentAudio) return;
    currentAudio.pause();
    currentAudio.currentTime = 0;
    setCurrentAudio(null);
    setIsPlayingAudio(false);
  };

  const handlePageChange = (newIndex: number) => {
    setCurrentPage(newIndex);
    if (processedPages[newIndex]) {
      playAudioForPage(processedPages[newIndex]);
    }
  };

  // Process pages
  useEffect(() => {
    const processPages = async () => {
      const all = await Promise.all(
        pages.map(async (page) => {
          const imageUrl = getStorageUrl(page.image_url);
          const audioUrl = page.audio_url ? getStorageUrl(page.audio_url) : page.audio_url;
          return { ...page, image_url: imageUrl, audio_url: audioUrl };
        })
      );
      const processed = all.filter(p => !!p.image_url);   // drop pages with no image

      setProcessedPages(processed);
      setIsLoading(false);

      if (processed[0]?.audio_url) {
        playAudioForPage(processed[0]);
      }
    };

    processPages();

    return () => {
      stopAudio();
    };
  }, [pages]);

  if (isLoading) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-br ${theme.gradients.storyReader}`}>
        <div className="w-14 h-14 border-4 theme-border-strong border-t-transparent rounded-full animate-spin" />
        <p className="text-white/80 font-medium text-sm">{t("loadingStory")}</p>
      </div>
    );
  }

  if (processedPages.length === 0) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-gradient-to-br ${theme.gradients.storyReader}`}>
        <div className="text-5xl">📚</div>
        <p className="text-white text-lg font-semibold">{t("noPagesTitle")}</p>
        <p className="text-gray-400 text-sm">{t("noPagesHint")}</p>
        <button
          onClick={onClose}
          className="mt-4 bg-white/10 text-white px-6 py-2.5 rounded-full border border-white/10 hover:bg-white/20 transition-colors font-medium"
        >
          {t("closeReader")}
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`fixed inset-0 z-50 flex flex-col bg-gradient-to-br ${theme.gradients.storyReader}`}
    >
      {/* Header */}
      <div className={`flex justify-between items-center px-4 py-3 bg-gradient-to-r ${theme.gradients.storyReaderHeader} backdrop-blur-md border-b border-white/10 z-40`}>
        <h2 className="flex items-center gap-2 text-white text-lg font-semibold">
          <BookOpen className="h-5 w-5 text-pink-300" />
          {t("storyTime")}
        </h2>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={m.buttonPress}
          onClick={onClose}
          className="flex items-center justify-center text-white bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm rounded-full p-2.5 transition-colors touch-target"
        >
          <X className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Flipbook Container */}
      <div
        className="flex-1 flex flex-col items-center justify-center overflow-hidden p-4 gap-4"
        style={{ background: "radial-gradient(ellipse at center, rgba(168,85,247,0.18) 0%, transparent 60%)" }}
      >
        <div className="relative">
        <HTMLFlipBook
          ref={flipBookRef}
          width={isMobile ? 320 : 420}
          height={isMobile ? 480 : 600}
          showCover={true}
          usePortrait={isMobile}
          mobileScrollSupport={true}
          flippingTime={isMobile ? 1000 : 600}
          size="fixed"
          className="shadow-2xl"
          onFlip={(e: any) => handlePageChange(e.data)}
          onChangeOrientation={(e: any) => setOrientation(e.data)}
          style={{}}
          startPage={0}
          minWidth={300}
          maxWidth={500}
          minHeight={400}
          maxHeight={720}
          drawShadow={true}
          autoSize={true}
          clickEventForward={true}
          useMouseEvents={!isMobile}
          swipeDistance={isMobile ? 30 : 0}
          showPageCorners={true}
          disableFlipByClick={false}
          startZIndex={0}
          maxShadowOpacity={0.5}
        >
          {processedPages.map((page, index) => (
            <div
              key={index}
              className={`relative flex flex-col justify-between overflow-hidden bg-transparent page-container ${
                isMobile || orientation !== "landscape"
                  ? "rounded-lg"
                  : index % 2 === 0
                    ? "rounded-l-lg"
                    : "rounded-r-lg"
              }`}
            >
              {/* No white background - completely transparent */}
              <div className="relative z-20 flex flex-col justify-between h-full page-content">
                <div className="flex-1 flex items-center justify-center relative">
                  <img
                    src={page.image_url}
                    alt={page.image_alt || `Page ${index + 1}`}
                    className="object-contain max-h-full max-w-full select-none"
                    draggable={false}
                    style={{
                      background: 'transparent'
                    }}
                  />

                </div>

                {page.text && (
                  <div className="mt-4 p-3 bg-black/50 backdrop-blur-sm rounded-lg border border-gray-600">
                    <p className="text-sm text-white text-center">{page.text}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </HTMLFlipBook>
        </div>
      </div>
    </motion.div>
  );
}
