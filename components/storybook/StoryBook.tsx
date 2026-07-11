"use client";

import React, { useRef, useCallback, useState } from "react";
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

function BookInner({ story, onComplete, completed, onExit }: {
  story: StoryBookData; onComplete: () => void; completed: boolean; onExit?: () => void;
}) {
  const { onPageChange, reachedEnd } = useStoryBook();
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const flipBookRef = useRef<any>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const [showText, setShowText] = useState(true);
  const hasAnyText = story.pages.some(p => !!p.text);

  const handleFlip = useCallback((e: any) => {
    onPageChange(e.data);
    playPageTurn();
  }, [onPageChange]);

  const flipPrev = () => flipBookRef.current?.pageFlip()?.flipPrev();
  const flipNext = () => flipBookRef.current?.pageFlip()?.flipNext();

  return (
    <div ref={bookContainerRef} className="flex flex-col h-full">
      <BookToolbar title={story.title} onExit={onExit} />

      <div className="flex-1 flex items-center justify-center px-2 sm:px-4 overflow-hidden">
        <div className="w-full max-w-4xl leaf-lg border border-emerald-100 bg-gradient-to-br from-white/70 via-emerald-50/50 to-amber-50/50 p-2 shadow-[0_16px_34px_rgba(15,23,42,0.08)]" style={{ aspectRatio: "16/10" }}>
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
            {/* Each page is one image */}
            {story.pages.map((pg, i) => (
              <PageImage key={pg.id || i} imageUrl={pg.imageUrl} text={pg.text} showText={showText} />
            ))}

            {/* Back cover — The End */}
            <div style={{ background: "linear-gradient(135deg, #1a0e3e 0%, #2d1b69 50%, #1a0e3e 100%)" }}>
              <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* World completion art — golden starburst (HP) / treasure chest + bubbles (Ocean) */}
                <img src={assets.reader.completion} alt="" aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-[0.22]" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="absolute text-yellow-400/20" style={{
                    left: `${10 + (i * 11) % 80}%`, top: `${8 + (i * 13) % 75}%`,
                    fontSize: 8 + (i % 4) * 4, transform: `rotate(${i * 40}deg)`,
                  }}>✦</span>
                ))}
                <div className="relative z-10 flex items-end justify-center gap-0 mb-4">
                  <img src={assets.nimiCircle} alt="Nimi"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-yellow-400 shadow-2xl shadow-yellow-500/30 -mr-3 relative z-10" />
                  <img src={assets.pikoCircle} alt="Piko"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-400 shadow-2xl shadow-blue-500/30 -ml-3" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="font-baloo font-black text-yellow-300 text-[28px] sm:text-[34px] drop-shadow-lg">{ t("storyBookTheEnd") }</p>
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

      <BookControls
        onPrev={flipPrev} onNext={flipNext} bookRef={bookContainerRef}
        showText={showText} onToggleText={() => setShowText(v => !v)} hasText={hasAnyText}
      />

      {reachedEnd && !completed && (
        <div className="px-4 pb-4">
          <button onClick={() => { playSuccess(); onComplete(); }}
            className="w-full font-baloo font-black bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-hover)] text-white text-[18px] rounded-full py-4 shadow-lg shadow-ds-cta flex items-center justify-center gap-2 transition">
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
