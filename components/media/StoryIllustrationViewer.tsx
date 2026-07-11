"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { DURATION } from "@/lib/design-system/motion";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";

interface Illustration {
  url: string;
  caption?: string;
}

interface Props {
  images: Illustration[];
  title?: string;
}

export default function StoryIllustrationViewer({ images, title }: Props) {
  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const m = useMotion();

  if (images.length === 0) {
    return (
      <div className="leaf bg-white/[0.04] border border-white/[0.08] aspect-[4/3] flex flex-col items-center justify-center gap-2">
        <span className="text-4xl">🖼️</span>
        <p className="text-white/30 text-sm font-bold">Coming Soon</p>
      </div>
    );
  }

  const img = images[current];
  const src = img.url.startsWith("http") ? img.url : getStorageUrl(img.url);
  const hasPrev = current > 0;
  const hasNext = current < images.length - 1;

  return (
    <>
      <div className="leaf overflow-hidden bg-black/20 border border-white/[0.08] shadow-xl relative group">
        <div className="aspect-[4/3] relative">
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={src}
              alt={img.caption ?? title ?? "Illustration"}
              className="absolute inset-0 w-full h-full object-contain"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: DURATION.base }}
              loading="lazy"
              draggable={false}
            />
          </AnimatePresence>

          {/* Zoom button */}
          <button onClick={() => setZoomed(true)}
            className="absolute top-3 right-3 w-10 h-10 bg-black/30 backdrop-blur rounded-full flex items-center justify-center text-white/60 hover:text-white transition opacity-0 group-hover:opacity-100">
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Nav arrows */}
          {hasPrev && (
            <button onClick={() => setCurrent(c => c - 1)}
              aria-label="Previous illustration"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 backdrop-blur rounded-full flex items-center justify-center text-white shadow-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {hasNext && (
            <button onClick={() => setCurrent(c => c + 1)}
              aria-label="Next illustration"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 backdrop-blur rounded-full flex items-center justify-center text-white shadow-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Caption + page indicator */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 pt-6">
            {img.caption && <p className="text-white text-[12px] font-bold text-center">{img.caption}</p>}
            {images.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    aria-label={`Illustration ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition ${i === current ? "bg-white" : "bg-white/30"}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div {...m.overlayFade}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
            <button aria-label="Close zoom" className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
            <motion.img src={src} alt="" className="max-w-full max-h-full object-contain"
              {...m.scaleIn} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
