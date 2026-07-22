"use client";

/**
 * useSpeechRecognition — Phase 6.1
 *
 * Enhanced speech recognition hook that extends the capabilities of the
 * existing useSpeechToText hook. Adds:
 *
 *   - mode: "chat"     — one-shot, submits on final result (same as before)
 *           "practice" — captures a single reading attempt, records confidence
 *                        scores per word, then calls onResult with the full
 *                        transcript and average confidence.
 *
 *   - confidence       — average confidence (0–1) from the recognition engine
 *   - wordCount        — number of words recognised in the last result
 *   - silenceTimeout   — practice mode auto-stops after N ms of silence
 *
 * The existing useSpeechToText hook is unchanged; this is an additive layer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { speechLangFor } from "@/lib/speech";

// ── Browser interface stubs (avoids lib: dom requirement in tsconfig) ─────────

interface SRAlternative { transcript: string; confidence: number }
interface SRResult      { isFinal: boolean; length: number; [i: number]: SRAlternative }
interface SRResultList  { length: number; [i: number]: SRResult }
interface SREvent       { resultIndex: number; results: SRResultList }
interface SRErrorEvent  { error: string }
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult:    ((e: SREvent)      => void) | null;
  onend:       (() => void) | null;
  onerror:     ((e: SRErrorEvent) => void) | null;
  onspeechend: (() => void) | null;
  start: () => void;
  stop:  () => void;
  abort: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSR(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as SpeechRecognitionConstructor | null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SpeechMode = "chat" | "practice";

export type SpeechRecognitionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "error";

export type SpeechRecognitionError =
  | "not-allowed"
  | "no-speech"
  | "network"
  | "not-supported"
  | "other";

export interface VoiceSpeechResult {
  transcript:  string;
  confidence:  number;   // 0–1 average across recognised words
  wordCount:   number;
  interimText: string;
}

export interface UseSpeechRecognitionReturn {
  status:       SpeechRecognitionStatus;
  supported:    boolean;
  interimText:  string;
  confidence:   number;
  error:        SpeechRecognitionError | null;
  start:        () => void;
  stop:         () => void;
  reset:        () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface Options {
  language?:       "en" | "fr" | "rw";
  mode?:           SpeechMode;
  silenceMs?:      number;   // practice mode: auto-stop after this many ms of silence
  onResult:        (result: VoiceSpeechResult) => void;
  onError?:        (error: SpeechRecognitionError) => void;
}

export function useSpeechRecognition({
  language = "en",
  mode     = "chat",
  silenceMs = 1800,
  onResult,
  onError,
}: Options): UseSpeechRecognitionReturn {

  const [status,      setStatus]      = useState<SpeechRecognitionStatus>("idle");
  const [supported,   setSupported]   = useState(false);
  const [interimText, setInterimText] = useState("");
  const [confidence,  setConfidence]  = useState(0);
  const [error,       setError]       = useState<SpeechRecognitionError | null>(null);

  const recognitionRef   = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef      = useRef(onResult);
  const onErrorRef       = useRef(onError);
  const finalTranscripts = useRef<string[]>([]);
  const confidences      = useRef<number[]>([]);
  const activeRef        = useRef(false);

  onResultRef.current = onResult;
  onErrorRef.current  = onError;

  useEffect(() => { setSupported(!!getSR()); }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearSilenceTimer();
    recognitionRef.current?.stop();
    setStatus("processing");
    setInterimText("");

    const transcript = finalTranscripts.current.join(" ").trim();
    const avgConf    = confidences.current.length > 0
      ? confidences.current.reduce((a, b) => a + b, 0) / confidences.current.length
      : 0;
    const wordCount  = transcript ? transcript.split(/\s+/).length : 0;

    setConfidence(avgConf);
    setStatus("idle");

    if (transcript) {
      onResultRef.current({ transcript, confidence: avgConf, wordCount, interimText: "" });
    }
  }, [clearSilenceTimer]);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) { setError("not-supported"); return; }
    if (activeRef.current) return;

    setError(null);
    setInterimText("");
    setConfidence(0);
    finalTranscripts.current = [];
    confidences.current      = [];

    const recognition = new SR();
    recognition.lang             = speechLangFor(language as "en" | "fr" | "rw");
    recognition.interimResults   = true;
    recognition.continuous       = mode === "practice"; // practice needs continuous to catch full reading
    recognition.maxAlternatives  = 1;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const alt = res[0];
          finalTranscripts.current.push(alt.transcript.trim());
          confidences.current.push(alt.confidence ?? 1);
          // In chat mode, one final result is enough → finish
          if (mode === "chat") { finish(); return; }
        } else {
          interim += res[0].transcript;
        }
      }
      setInterimText(interim);

      // Practice mode: reset silence timer on any speech activity
      if (mode === "practice") {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(finish, silenceMs);
      }
    };

    recognition.onspeechend = () => {
      // In practice mode let the silence timer handle termination
      if (mode === "chat") finish();
    };

    recognition.onend = () => {
      if (activeRef.current && mode === "practice") {
        // Recognition engine stopped on its own — finish gracefully
        finish();
      } else if (!activeRef.current) {
        setStatus("idle");
      }
    };

    recognition.onerror = (event) => {
      activeRef.current = false;
      clearSilenceTimer();
      const code = event.error as string;
      const mapped: SpeechRecognitionError =
        code === "not-allowed" ? "not-allowed" :
        code === "no-speech"   ? "no-speech"   :
        code === "network"     ? "network"      : "other";
      setError(mapped);
      setStatus("error");
      onErrorRef.current?.(mapped);
      setTimeout(() => setStatus("idle"), 4000);
    };

    recognitionRef.current = recognition;
    activeRef.current      = true;

    try {
      recognition.start();
      setStatus("listening");
      // Practice mode: start a silence timer immediately in case student never speaks
      if (mode === "practice") {
        silenceTimerRef.current = setTimeout(finish, silenceMs * 3);
      }
    } catch {
      activeRef.current = false;
      setError("other");
      setStatus("idle");
    }
  }, [language, mode, silenceMs, finish, clearSilenceTimer]);

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    finish();
  }, [finish]);

  const reset = useCallback(() => {
    activeRef.current = false;
    clearSilenceTimer();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    finalTranscripts.current = [];
    confidences.current      = [];
    setStatus("idle");
    setInterimText("");
    setConfidence(0);
    setError(null);
  }, [clearSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => () => {
    activeRef.current = false;
    clearSilenceTimer();
    recognitionRef.current?.abort();
  }, [clearSilenceTimer]);

  return { status, supported, interimText, confidence, error, start, stop, reset };
}
