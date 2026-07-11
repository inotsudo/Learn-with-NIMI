"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  url: string;
  title: string;
  onClose: () => void;
  onLastPage?: () => void;
}

const MAX_DOTS = 16;

export default function PdfViewer({ url, title, onClose, onLastPage }: PdfViewerProps) {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const [numPages, setNumPages]   = useState(0);
  const [page, setPage]           = useState(1);
  const [pageWidth, setPageWidth] = useState(320);
  const [direction, setDirection] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX  = useRef(0);

  const isLastPage = numPages > 0 && page === numPages;
  useEffect(() => { if (isLastPage) onLastPage?.(); }, [isLastPage]); // eslint-disable-line react-hooks/exhaustive-deps
  const showDots   = numPages > 0 && numPages <= MAX_DOTS;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const obs = new ResizeObserver(([e]) => {
      setPageWidth(Math.min(e.contentRect.width - 48, 720));
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages]);

  const goPrev = () => { setDirection(-1); setPage(p => Math.max(p - 1, 1)); };
  const goNext = () => { setDirection(1);  setPage(p => Math.min(p + 1, numPages)); };
  const goTo   = (n: number) => { setDirection(n > page ? 1 : -1); setPage(n); };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const d = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(d) > 48) d > 0 ? goNext() : goPrev();
  };

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 34 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#e9e2d8]"
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex-shrink-0 z-10">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-[18px] h-[18px] text-gray-500" />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <motion.img
            src={assets.nimiCircle}
            alt=""
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-8 h-8 rounded-full border-2 border-yellow-300 shadow-sm flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-baloo font-black text-gray-800 text-[15px] truncate leading-tight">{title}</p>
            <p className="font-nunito text-gray-400 text-[11px] leading-none mt-0.5">Story Book</p>
          </div>
        </div>

        {/* Page x / n — shows only after load */}
        <AnimatePresence>
          {numPages > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-shrink-0 text-right"
            >
              <p className="font-baloo font-black text-gray-700 text-[15px] leading-tight">{page}</p>
              <p className="font-nunito text-gray-400 text-[10px] leading-none">of {numPages}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── "You finished!" celebration ─────────────────── */}
      <AnimatePresence>
        {isLastPage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="overflow-hidden flex-shrink-0 z-10"
          >
            <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400">
              <motion.span
                animate={{ rotate: [0, -18, 18, -18, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.55, delay: 0.15 }}
                className="text-xl select-none">🎉</motion.span>
              <p className="font-baloo font-black text-amber-900 text-[14px] tracking-wide">
                You read the whole story — amazing!
              </p>
              <motion.span
                animate={{ rotate: [0, 18, -18, 18, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.55, delay: 0.35 }}
                className="text-xl select-none">⭐</motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PDF area ────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Side tap zones */}
        <button
          onClick={goPrev}
          disabled={page <= 1 || numPages === 0}
          aria-label="Previous page"
          className="absolute left-0 top-0 bottom-0 w-12 z-10 flex items-center justify-start pl-2
            disabled:pointer-events-none group"
        >
          <div className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-sm
            flex items-center justify-center
            opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </div>
        </button>

        <button
          onClick={goNext}
          disabled={page >= numPages || numPages === 0}
          aria-label="Next page"
          className="absolute right-0 top-0 bottom-0 w-12 z-10 flex items-center justify-end pr-2
            disabled:pointer-events-none group"
        >
          <div className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-sm
            flex items-center justify-center
            opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>
        </button>

        {/* Scrollable canvas */}
        <div
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="h-full overflow-auto flex justify-center items-start px-6 py-5 select-none"
        >
          <Document
            file={url}
            onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
            loading={
              <div className="flex flex-col items-center gap-4 mt-16">
                <motion.img
                  src={assets.nimiHappy}
                  alt=""
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-full border-4 border-yellow-300 shadow-lg"
                />
                <p className="font-baloo font-black text-gray-600 text-[16px]">
                  Loading your story…
                </p>
              </div>
            }
            error={
              <div className="flex flex-col items-center gap-3 mt-16 text-center px-6">
                <span className="text-5xl">😕</span>
                <p className="font-baloo font-black text-gray-800 text-[18px]">
                  Couldn't load the story
                </p>
                <a href={url} target="_blank" rel="noreferrer"
                  className="font-nunito text-amber-600 underline text-sm">
                  Open in browser instead
                </a>
              </div>
            }
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={page}
                custom={direction}
                variants={{
                  enter:  (d: number) => ({ opacity: 0, x: d * 56 }),
                  center: { opacity: 1, x: 0 },
                  exit:   (d: number) => ({ opacity: 0, x: d * -56 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Page
                  pageNumber={page}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="rounded-xl overflow-hidden
                    shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.10),0_20px_48px_rgba(0,0,0,0.07)]"
                />
              </motion.div>
            </AnimatePresence>
          </Document>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100
        shadow-[0_-1px_3px_rgba(0,0,0,0.06)] px-5 pt-3 pb-5 space-y-3">

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap min-h-[14px]">
          {numPages === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
              ))
            : showDots
              ? Array.from({ length: numPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i + 1)}
                    aria-label={`Page ${i + 1}`}
                    className={`rounded-full transition-all duration-200 ${
                      i + 1 === page
                        ? "w-5 h-2.5 bg-[var(--nimi-green)] rounded-full"
                        : i + 1 < page
                        ? "w-2 h-2 bg-gray-300"
                        : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                    }`}
                  />
                ))
              : null
          }
        </div>

        {/* Back / Next */}
        <div className="flex items-center gap-3">
          <motion.button
            onClick={goPrev}
            disabled={page <= 1 || numPages === 0}
            whileTap={{ scale: 0.95 }}
            className="flex-1 h-12 flex items-center justify-center gap-1.5
              rounded-2xl border-2 border-gray-200
              font-baloo font-black text-[15px] text-gray-500
              hover:border-gray-300 hover:text-gray-700
              disabled:opacity-25 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </motion.button>

          <motion.button
            onClick={goNext}
            disabled={page >= numPages || numPages === 0}
            whileTap={{ scale: 0.95 }}
            className="flex-1 h-12 flex items-center justify-center gap-1.5
              rounded-2xl bg-[var(--nimi-green)] text-white
              font-baloo font-black text-[15px]
              shadow-[0_4px_14px_rgba(0,150,80,0.28)]
              hover:opacity-90
              disabled:opacity-25 disabled:cursor-not-allowed transition"
          >
            Next <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
