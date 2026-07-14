"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { getStorageUrl } from "@/lib/queries";
import type { BookPage } from "./types";

interface StoryBookCtx {
  currentPage: number;
  totalPages: number;
  isPlaying: boolean;
  reachedEnd: boolean;
  play: () => void;
  pause: () => void;
  replay: () => void;
  onPageChange: (pageIdx: number) => void;
}

const Ctx = createContext<StoryBookCtx>({
  currentPage: 0, totalPages: 0, isPlaying: false, reachedEnd: false,
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
  const [autoPlayed, setAutoPlayed] = useState(false);
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

    const au = new Audio(getStorageUrl(page.narrationAudio));
    audioRef.current = au;
    setIsPlaying(true);
    au.onended = () => { setIsPlaying(false); audioRef.current = null; };
    au.onerror = () => { setIsPlaying(false); audioRef.current = null; };
    au.play().catch(() => { setIsPlaying(false); audioRef.current = null; });
  }, [pages, stopAudio]);

  const onPageChange = useCallback((pageIdx: number) => {
    stopAudio();
    setCurrentPage(pageIdx);
    if (pageIdx >= totalPages - 2) setReachedEnd(true);
    setTimeout(() => playPageAudio(pageIdx), 400);
  }, [totalPages, stopAudio, playPageAudio]);

  const play = useCallback(() => playPageAudio(currentPage), [currentPage, playPageAudio]);
  const pause = useCallback(() => stopAudio(), [stopAudio]);
  const replay = useCallback(() => { stopAudio(); playPageAudio(currentPage); }, [currentPage, stopAudio, playPageAudio]);

  // Auto-play first page — runs once pages are loaded (avoids stale closure on empty initial pages)
  useEffect(() => {
    if (totalPages === 0 || autoPlayed) return;
    setAutoPlayed(true);
    const t = setTimeout(() => playPageAudio(0), 600);
    return () => clearTimeout(t);
  }, [totalPages, autoPlayed, playPageAudio]);

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
    <Ctx.Provider value={{ currentPage, totalPages, isPlaying, reachedEnd, play, pause, replay, onPageChange }}>
      {children}
    </Ctx.Provider>
  );
}
