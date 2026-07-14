"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { getStorageUrl } from "@/lib/queries";
import type { BookPage } from "./types";

interface StoryBookCtx {
  currentPage: number;
  totalPages: number;
  isPlaying: boolean;
  reachedEnd: boolean;
  pageHasAudio: boolean;
  play: () => void;
  pause: () => void;
  replay: () => void;
  onPageChange: (pageIdx: number) => void;
}

const Ctx = createContext<StoryBookCtx>({
  currentPage: 0, totalPages: 0, isPlaying: false, reachedEnd: false, pageHasAudio: false,
  play: () => {}, pause: () => {}, replay: () => {}, onPageChange: () => {},
});

export const useStoryBook = () => useContext(Ctx);

export function StoryBookProvider({ pages, children }: {
  pages: BookPage[];
  children: React.ReactNode;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const totalPages = pages.length;

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playPageAudio = useCallback((pageIdx: number) => {
    stopAudio();
    const page = pages[pageIdx];
    if (!page?.narrationAudio) return;

    const url = getStorageUrl(page.narrationAudio);
    const au = new Audio(url);
    audioRef.current = au;
    setIsPlaying(true);
    au.onended = () => { setIsPlaying(false); audioRef.current = null; };
    au.onerror = () => { setIsPlaying(false); audioRef.current = null; };
    au.play().catch((error) => {
      console.warn("StoryBook audio play failed", { error, pageIdx: pageIdx, url, page });
      setIsPlaying(false);
      audioRef.current = null;
    });
  }, [pages, stopAudio]);

  const onPageChange = useCallback((pageIdx: number) => {
    stopAudio();
    setCurrentPage(pageIdx);
    if (pageIdx >= totalPages - 2) setReachedEnd(true);
    // Play immediately — setTimeout breaks the browser's user-gesture chain
    // on iOS/Safari, causing audio.play() to be rejected.
    playPageAudio(pageIdx);
  }, [totalPages, stopAudio, playPageAudio]);

  const pageHasAudio = Boolean(pages[currentPage]?.narrationAudio);

  const play = useCallback(() => {
    if (!pageHasAudio) {
      console.warn("StoryBook play requested but current page has no narration audio", currentPage, pages[currentPage]);
      return;
    }
    playPageAudio(currentPage);
  }, [currentPage, pageHasAudio, pages, playPageAudio]);

  const pause = useCallback(() => stopAudio(), [stopAudio]);
  const replay = useCallback(() => {
    if (!pageHasAudio) {
      console.warn("StoryBook replay requested but current page has no narration audio", currentPage, pages[currentPage]);
      return;
    }
    stopAudio();
    playPageAudio(currentPage);
  }, [currentPage, pageHasAudio, pages, stopAudio, playPageAudio]);

  // Always point to the latest playPageAudio so the auto-play timeout below isn't stale.
  // Without this, the [] effect captures an empty-pages closure (pages load async after mount).
  const playPageAudioRef = useRef(playPageAudio);
  playPageAudioRef.current = playPageAudio;

  // Auto-play first page — fires 800ms after mount; by then pages are loaded
  // and playPageAudioRef.current points to the version with real pages.
  useEffect(() => {
    const t = setTimeout(() => playPageAudioRef.current(0), 800);
    return () => { clearTimeout(t); stopAudio(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preload next page assets
  useEffect(() => {
    const next = pages[currentPage + 1];
    if (!next) return;
    const links: HTMLLinkElement[] = [];
    const prefetch = (url: string) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = getStorageUrl(url);
      document.head.appendChild(link);
      links.push(link);
    };
    if (next.imageUrl) prefetch(next.imageUrl);
    if (next.narrationAudio) prefetch(next.narrationAudio);
    return () => links.forEach(l => { try { document.head.removeChild(l); } catch {} });
  }, [currentPage, pages]);

  // Cleanup on unmount
  useEffect(() => () => stopAudio(), [stopAudio]);

  return (
    <Ctx.Provider value={{ currentPage, totalPages, isPlaying, reachedEnd, pageHasAudio, play, pause, replay, onPageChange }}>
      {children}
    </Ctx.Provider>
  );
}
