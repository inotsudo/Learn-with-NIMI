"use client";

import React, { useRef, useCallback } from "react";
import HTMLFlipBook from "react-pageflip";
import { StoryBookProvider, useStoryBook } from "./StoryBookContext";
import IllustrationPage from "./IllustrationPage";
import BookControls from "./BookControls";
import BookToolbar from "./BookToolbar";
import type { StoryBookData } from "./types";

const PageImage = React.forwardRef<HTMLDivElement, { imageUrl: string }>(({ imageUrl }, ref) => {
  return <IllustrationPage ref={ref} imageUrl={imageUrl} side="right" />;
});
PageImage.displayName = "PageImage";

function BookInner({ story, onComplete, completed, onExit }: {
  story: StoryBookData; onComplete: () => void; completed: boolean; onExit?: () => void;
}) {
  const { onPageChange, reachedEnd } = useStoryBook();
  const flipBookRef = useRef<any>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);

  const handleFlip = useCallback((e: any) => {
    onPageChange(e.data);
  }, [onPageChange]);

  const flipPrev = () => flipBookRef.current?.pageFlip()?.flipPrev();
  const flipNext = () => flipBookRef.current?.pageFlip()?.flipNext();

  return (
    <div ref={bookContainerRef} className="flex flex-col h-full theme-bg">
      <BookToolbar title={story.title} onExit={onExit} />

      <div className="flex-1 flex items-center justify-center px-2 sm:px-4 overflow-hidden">
        <div className="w-full max-w-4xl" style={{ aspectRatio: "16/10" }}>
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
              <PageImage key={pg.id || i} imageUrl={pg.imageUrl} />
            ))}

            {/* Back cover — The End */}
            <div style={{ background: "linear-gradient(135deg, #1a0e3e 0%, #2d1b69 50%, #1a0e3e 100%)" }}>
              <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="absolute text-yellow-400/20" style={{
                    left: `${10 + (i * 11) % 80}%`, top: `${8 + (i * 13) % 75}%`,
                    fontSize: 8 + (i % 4) * 4, transform: `rotate(${i * 40}deg)`,
                  }}>✦</span>
                ))}
                <div className="relative z-10 flex items-end justify-center gap-0 mb-4">
                  <img src="/nimi-logo-circle.png" alt="Nimi"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-yellow-400 shadow-2xl shadow-yellow-500/30 -mr-3 relative z-10" />
                  <img src="/piko-logo-circle.png.png" alt="Piko"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-400 shadow-2xl shadow-blue-500/30 -ml-3" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="font-baloo font-black text-yellow-300 text-[28px] sm:text-[34px] drop-shadow-lg">The End</p>
                  <p className="font-nunito font-bold theme-text-faint text-[14px] sm:text-[15px] mt-1">See you next time! 🌟</p>
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

      <BookControls onPrev={flipPrev} onNext={flipNext} bookRef={bookContainerRef} />

      {reachedEnd && !completed && (
        <div className="px-4 pb-4">
          <button onClick={onComplete}
            className="w-full font-baloo font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[18px] rounded-full py-4 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
            ✅ I Finished Reading!
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
