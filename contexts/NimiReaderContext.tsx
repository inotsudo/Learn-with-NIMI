"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface NimiReaderContextType {
  isReaderActive: boolean;
  toggleReader: () => void;
  currentContent: string;
  setCurrentContent: (content: string) => void;
  isReading: boolean;
  startReading: () => void;
  stopReading: () => void;
}

const NimiReaderContext = createContext<NimiReaderContextType | undefined>(undefined);

const READER_ACTIVE_KEY = "nimi_reader_active";

export function NimiReaderProvider({ children }: { children: React.ReactNode }) {
  const [isReaderActive, setIsReaderActive] = useState(true);
  const [currentContent, setCurrentContent] = useState("");
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(READER_ACTIVE_KEY);
    if (saved !== null) setIsReaderActive(saved === "true");
  }, []);

  const toggleReader = () =>
    setIsReaderActive((prev) => {
      const next = !prev;
      localStorage.setItem(READER_ACTIVE_KEY, String(next));
      return next;
    });

  const startReading = () => {
    if (!currentContent || !isReaderActive) return;

    const utterance = new SpeechSynthesisUtterance(currentContent);

    // Toddler-style voice
    const voices = window.speechSynthesis.getVoices();
    const childVoice = voices.find(
      (v) =>
        v.name.toLowerCase().includes("child") ||
        v.name.toLowerCase().includes("boy") ||
        v.name.toLowerCase().includes("kid")
    );

    if (childVoice) {
      utterance.voice = childVoice;
      utterance.pitch = 1.0;
      utterance.rate = 0.8;
    } else {
      // fallback to higher pitch
      utterance.pitch = 1.5;
      utterance.rate = 0.8;
    }

    utterance.lang = "en-US";
    utterance.onend = () => setIsReading(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsReading(true);
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setIsReading(false);
  };

  // Preload voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Auto-read when content changes
  useEffect(() => {
    if (isReaderActive && currentContent) startReading();
  }, [currentContent, isReaderActive]);

  return (
    <NimiReaderContext.Provider
      value={{
        isReaderActive,
        toggleReader,
        currentContent,
        setCurrentContent,
        isReading,
        startReading,
        stopReading,
      }}
    >
      {children}
    </NimiReaderContext.Provider>
  );
}

export function useNimiReader() {
  const context = useContext(NimiReaderContext);
  if (!context) throw new Error("useNimiReader must be used within a NimiReaderProvider");
  return context;
}
