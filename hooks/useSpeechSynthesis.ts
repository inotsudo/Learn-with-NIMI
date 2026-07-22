"use client";

/**
 * useSpeechSynthesis — Phase 6.4
 *
 * Queue-based TTS hook with word-boundary tracking for text highlighting.
 *
 * Queue model: calls to speak() are serialised — each utterance waits for
 * the previous one to finish. Calling stop() clears the queue immediately.
 *
 * Word highlighting: on browsers that fire SpeechSynthesisEvent.charIndex
 * (Chrome/Edge), onWord is called with the current word index. Safari
 * doesn't fire boundary events, so highlighting degrades gracefully.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceLang } from "@/lib/voiceLanguages";
import { pickBestVoice, ttsCodeFor, ttsIsNative } from "@/lib/voiceLanguages";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpeakOptions {
  pitch?:  number;   // 0.1–2, default 1.3 (friendly)
  rate?:   number;   // 0.1–10, default 0.9 (slightly slow for kids)
  volume?: number;   // 0–1, default 1
  onWord?: (wordIndex: number) => void;
  onStart?: () => void;
  onEnd?:   () => void;
}

interface QueueEntry {
  text:     string;
  lang:     VoiceLang;
  options:  SpeakOptions;
}

export interface UseSpeechSynthesisReturn {
  speak:        (text: string, lang: VoiceLang, options?: SpeakOptions) => void;
  stop:         () => void;
  isPlaying:    boolean;
  currentWord:  number;   // index of word being spoken (-1 when idle)
  supported:    boolean;
}

// ── Word index from charIndex ─────────────────────────────────────────────────

function wordIndexAtChar(text: string, charIndex: number): number {
  const before = text.slice(0, charIndex);
  return before.split(/\s+/).filter(Boolean).length;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentWord, setCurrentWord] = useState(-1);
  const [supported,   setSupported]   = useState(false);

  const queueRef     = useRef<QueueEntry[]>([]);
  const playingRef   = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Voices kept in a ref so playNext can read them synchronously (no await,
  // which would break the browser's user-gesture chain for speechSynthesis).
  const voicesRef    = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  // Pre-load voices into voicesRef so they're available synchronously on first speak().
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const update = () => { voicesRef.current = synth.getVoices(); };
    update();
    synth.addEventListener("voiceschanged", update);
    return () => synth.removeEventListener("voiceschanged", update);
  }, []);

  const playNext = useCallback(() => {
    if (playingRef.current || queueRef.current.length === 0) return;

    const entry = queueRef.current.shift()!;
    const { text, lang, options } = entry;

    if (lang === "rw" && !ttsIsNative("rw")) {
      // Kinyarwanda: no browser voice — skip TTS, fire onEnd immediately
      options.onStart?.();
      options.onEnd?.();
      setTimeout(playNext, 0);
      return;
    }

    // Read voices synchronously — no await, preserves user-gesture chain.
    const voice = pickBestVoice(voicesRef.current, lang);

    const utterance    = new SpeechSynthesisUtterance(text);
    utterance.lang     = ttsCodeFor(lang);
    utterance.pitch    = options.pitch  ?? 1.3;
    utterance.rate     = options.rate   ?? 0.9;
    utterance.volume   = options.volume ?? 1;
    if (voice) utterance.voice = voice;

    const words = text.split(/\s+/).filter(Boolean);

    // Track whether onboundary fires at all; start timer fallback if it doesn't.
    let boundaryFired = false;
    let timerFallback: ReturnType<typeof setInterval> | null = null;

    const clearFallback = () => {
      if (timerFallback !== null) { clearInterval(timerFallback); timerFallback = null; }
    };

    utterance.onboundary = (event) => {
      const evtName = (event as SpeechSynthesisEvent & { name?: string }).name;
      // Skip explicit sentence boundaries; accept "word" and absent/undefined name
      // (Linux speech-dispatcher omits the name property entirely).
      if (evtName === "sentence") return;
      boundaryFired = true;
      clearFallback();
      const idx = wordIndexAtChar(text, (event as SpeechSynthesisEvent).charIndex);
      setCurrentWord(Math.min(idx, words.length - 1));
      options.onWord?.(Math.min(idx, words.length - 1));
    };

    utterance.onstart = () => {
      playingRef.current = true;
      setIsPlaying(true);
      setCurrentWord(0);
      options.onStart?.();
      // If no boundary events fire within 600 ms, fall back to timed word advancement.
      // This covers Linux TTS backends (speech-dispatcher) that don't emit boundary events.
      setTimeout(() => {
        if (!boundaryFired && words.length > 1) {
          // Estimate ms per word: ~140 wpm at rate=1.0, scaled by utterance.rate
          const msPerWord = Math.round(60_000 / (140 * utterance.rate));
          let wordIdx = 1;
          timerFallback = setInterval(() => {
            setCurrentWord(Math.min(wordIdx, words.length - 1));
            options.onWord?.(Math.min(wordIdx, words.length - 1));
            wordIdx += 1;
            if (wordIdx >= words.length) clearFallback();
          }, msPerWord);
        }
      }, 600);
    };

    utterance.onend = () => {
      clearFallback();
      playingRef.current = false;
      setCurrentWord(-1);
      options.onEnd?.();
      if (queueRef.current.length > 0) {
        playNext();
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = () => {
      clearFallback();
      playingRef.current = false;
      setIsPlaying(false);
      setCurrentWord(-1);
      options.onEnd?.();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback((text: string, lang: VoiceLang, options: SpeakOptions = {}) => {
    if (!text.trim()) return;
    queueRef.current.push({ text, lang, options });
    playNext();
  }, [playNext]);

  const stop = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentWord(-1);
  }, []);

  useEffect(() => () => {
    queueRef.current = [];
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop, isPlaying, currentWord, supported };
}
