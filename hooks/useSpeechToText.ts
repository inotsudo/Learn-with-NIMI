"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "@/contexts/LanguageContext";
import { speechLangFor } from "@/lib/speech";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechErrorCode = "not-allowed" | "no-speech" | "network" | "other";

const ERROR_I18N_KEYS: Record<SpeechErrorCode, string> = {
  "not-allowed": "micErrorNotAllowed",
  "no-speech": "micErrorNoSpeech",
  network: "micErrorNetwork",
  other: "micErrorOther",
};

export function speechErrorKey(code: SpeechErrorCode): string {
  return ERROR_I18N_KEYS[code];
}

const ERROR_AUTO_CLEAR_MS = 4000;

export function useSpeechToText(language: Language, onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<SpeechErrorCode | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), ERROR_AUTO_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    setError(null);
    setInterimText("");

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = speechLangFor(language);
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      if (finalTranscript.trim()) {
        setInterimText("");
        onResultRef.current(finalTranscript.trim());
      } else {
        setInterimText(interim);
      }
    };

    recognition.onend = () => {
      setListening(false);
      setInterimText("");
    };

    recognition.onerror = (event) => {
      const code: SpeechErrorCode =
        event.error === "not-allowed" || event.error === "service-not-allowed" ? "not-allowed"
        : event.error === "no-speech" ? "no-speech"
        : event.error === "network" ? "network"
        : "other";
      setError(code);
      setListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [language]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop, interimText, error };
}
