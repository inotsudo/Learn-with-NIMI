"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { playPageTurn, playSuccess } from "@/lib/sounds";
import HTMLFlipBook from "react-pageflip";
import { StoryBookProvider, useStoryBook } from "./StoryBookContext";
import IllustrationPage from "./IllustrationPage";
import BookControls from "./BookControls";
import BookToolbar from "./BookToolbar";
import type { StoryBookData } from "./types";

const PageImage = React.forwardRef<HTMLDivElement, { imageUrl: string; text?: string; showText?: boolean }>(
  ({ imageUrl, text, showText }, ref) => {
    return <IllustrationPage ref={ref} imageUrl={imageUrl} side="right" text={text} showText={showText} />;
  }
);
PageImage.displayName = "PageImage";

// ── Mobile: one page at a time, swipeable ────────────────────────────────────
function MobilePageViewer({ pages, showText, direction, onPrev, onNext }: {
  pages: StoryBookData["pages"];
  showText: boolean;
  direction: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { currentPage } = useStoryBook();
  const touchStartX = useRef<number | null>(null);
  const page = pages[currentPage];

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 48) delta > 0 ? onNext() : onPrev();
    touchStartX.current = null;
  };

  if (!page) return null;

  const variants = {
    enter:  (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl leaf-lg border border-amber-100 shadow-[0_8px_28px_rgba(15,23,42,0.10)]"
      style={{ aspectRatio: "3/4" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPage}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "tween", duration: 0.26, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <IllustrationPage
            imageUrl={page.imageUrl}
            side="right"
            text={page.text}
            showText={showText}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Main book inner ───────────────────────────────────────────────────────────
function BookInner({ story, onComplete, completed, onExit }: {
  story: StoryBookData; onComplete: () => void; completed: boolean; onExit?: () => void;
}) {
  const { onPageChange, reachedEnd, currentPage, totalPages } = useStoryBook();
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const flipBookRef = useRef<any>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const [showText, setShowText] = useState(true);
  const hasAnyText = story.pages.some(p => !!p.text);
  const [direction, setDirection] = useState(1);

  // Sync to correct value immediately — avoids flash of desktop flipbook on mobile
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : true
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleFlip = useCallback((e: any) => {
    onPageChange(e.data);
    playPageTurn();
  }, [onPageChange]);

  // Mobile navigation — update direction then page
  const mobilePrev = useCallback(() => {
    if (currentPage <= 0) return;
    setDirection(-1);
    onPageChange(currentPage - 1);
    playPageTurn();
  }, [currentPage, onPageChange]);

  const mobileNext = useCallback(() => {
    if (currentPage >= totalPages - 1) return;
    setDirection(1);
    onPageChange(currentPage + 1);
    playPageTurn();
  }, [currentPage, totalPages, onPageChange]);

  // Desktop flipbook navigation
  const flipPrev = useCallback(() => flipBookRef.current?.pageFlip()?.flipPrev(), []);
  const flipNext = useCallback(() => flipBookRef.current?.pageFlip()?.flipNext(), []);

  return (
    <div ref={bookContainerRef} className="flex flex-col gap-3">
      <BookToolbar title={story.title} onExit={onExit} />

      {isMobile ? (
        <MobilePageViewer
          pages={story.pages}
          showText={showText}
          direction={direction}
          onPrev={mobilePrev}
          onNext={mobileNext}
        />
      ) : (
        <div className="flex items-center justify-center px-2 sm:px-4">
          <div
            className="w-full max-w-4xl leaf-lg border border-emerald-100 bg-gradient-to-br from-white/70 via-emerald-50/50 to-amber-50/50 p-2 shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
            style={{ aspectRatio: "16/10" }}
          >
            {/* @ts-ignore react-pageflip types */}
            <HTMLFlipBook
              ref={flipBookRef}
              width={400}
              height={500}
              size="stretch"
              minWidth={280}
              maxWidth={600}
              minHeight={350}
              maxHeight={750}
              showCover={true}
              mobileScrollSupport={false}
              onFlip={handleFlip}
              className="storybook-flip"
              style={{}}
              startPage={0}
              drawShadow={true}
              flippingTime={600}
              usePortrait={false}
              startZIndex={0}
              autoSize={true}
              maxShadowOpacity={0.3}
              showPageCorners={true}
              disableFlipByClick={false}
              useMouseEvents={true}
              swipeDistance={30}
              clickEventForward={true}
              renderOnlyPageLengthChange={false}
            >
              {story.pages.map((pg, i) => (
                <PageImage key={pg.id || i} imageUrl={pg.imageUrl} text={pg.text} showText={showText} />
              ))}

              {/* Back cover — The End */}
              <div style={{ background: "linear-gradient(135deg, #1a0e3e 0%, #2d1b69 50%, #1a0e3e 100%)" }}>
                <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
                  <Image src={assets.reader.completion} alt="" aria-hidden="true" fill
                    className="object-cover pointer-events-none opacity-[0.22]" />
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className="absolute text-yellow-400/20" style={{
                      left: `${10 + (i * 11) % 80}%`, top: `${8 + (i * 13) % 75}%`,
                      fontSize: 8 + (i % 4) * 4, transform: `rotate(${i * 40}deg)`,
                    }}>✦</span>
                  ))}
                  <div className="relative z-10 flex items-end justify-center gap-0 mb-4">
                    <Image src={assets.nimiCircle} alt="Nimi" width={96} height={96}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-yellow-400 shadow-2xl shadow-yellow-500/30 -mr-3 relative z-10" />
                    <Image src={assets.pikoCircle} alt="Piko" width={96} height={96}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-400 shadow-2xl shadow-blue-500/30 -ml-3" />
                  </div>
                  <div className="relative z-10 text-center">
                    <p className="font-baloo font-black text-yellow-300 text-[28px] sm:text-[34px] drop-shadow-lg">{t("storyBookTheEnd")}</p>
                    <p className="font-nunito font-bold theme-text-faint text-[14px] sm:text-[15px] mt-1">{t("storyBookSeeYou")}</p>
                  </div>
                  <div className="relative z-10 flex gap-1 mt-5">
                    {["⭐", "✨", "🌟", "✨", "⭐"].map((s, i) => (
                      <span key={i} className="text-[14px] opacity-40">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </HTMLFlipBook>
          </div>
        </div>
      )}

      <BookControls
        onPrev={isMobile ? mobilePrev : flipPrev}
        onNext={isMobile ? mobileNext : flipNext}
        bookRef={bookContainerRef}
        showText={showText}
        onToggleText={() => setShowText(v => !v)}
        hasText={hasAnyText}
      />

      {reachedEnd && !completed && (
        <div className="px-0 pb-2">
          <button
            onClick={() => { playSuccess(); onComplete(); }}
            className="w-full font-baloo font-black bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-hover)] text-white text-[18px] rounded-full py-4 shadow-lg shadow-ds-cta flex items-center justify-center gap-2 transition"
          >
            {t("storyBookFinished")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function StoryBook({ story, onComplete, completed, onExit }: {
  story: StoryBookData; onComplete: () => void; completed: boolean; onExit?: () => void;
}) {
  return (
    <StoryBookProvider pages={story.pages}>
      <BookInner story={story} onComplete={onComplete} completed={completed} onExit={onExit} />
    </StoryBookProvider>
  );
}
