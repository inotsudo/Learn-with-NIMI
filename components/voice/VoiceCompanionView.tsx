"use client";

/**
 * VoiceCompanionView — Phase 6 Voice Companion
 *
 * Pronunciation practice UI. The student reads a passage aloud; the component
 * records via useSpeechRecognition (practice mode), runs the algorithmic diff
 * in pronunciationAnalyzer, then calls /api/pronunciation-coach for an
 * LLM-generated encouragement message. Results are spoken back via
 * useSpeechSynthesis.
 *
 * Flow:  idle → listening → analyzing → result → (idle to retry)
 *
 * Props:
 *   passage     — the text the student should read (from story or teacher)
 *   language    — en | fr | rw
 *   childName   — for personalised feedback
 *   childAge    — for age-appropriate feedback
 *   onClose?    — optional back button callback
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authedFetch } from "@/lib/authedFetch";
import { useSpeechRecognition, type VoiceSpeechResult } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis   } from "@/hooks/useSpeechSynthesis";
import { analysePronunciation, scoreToStars } from "@/lib/pronunciationAnalyzer";
import { getPhoneticGuide, ttsIsNative  } from "@/lib/voiceLanguages";
import type { PronunciationAnalysis, WordResult } from "@/lib/pronunciationAnalyzer";
import type { PronunciationCoachResponse } from "@/app/api/pronunciation-coach/route";
import type { VoiceLang } from "@/lib/voiceLanguages";

// ── Design tokens ─────────────────────────────────────────────────────────────

const G = "var(--nimi-green,#15803D)";

const WORD_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  correct: { bg: "#F0FDF4", text: "#15803D", border: "#86EFAC" },
  close:   { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  missed:  { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
};

// ── Star display ──────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.span key={i}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 300 }}
          className="text-[28px] select-none"
          style={{ filter: i < count ? "none" : "grayscale(1) opacity(0.3)" }}>
          ⭐
        </motion.span>
      ))}
    </div>
  );
}

// ── Word chip (passage display + result overlay) ──────────────────────────────

function WordChip({
  word, result, active,
}: { word: string; result?: WordResult; active?: boolean }) {
  const style = result ? WORD_STYLE[result.status] : undefined;
  return (
    <span
      className="inline-block px-2 py-1 m-0.5 rounded-lg text-[15px] font-bold transition-all"
      style={{
        background:  active   ? "#E0F2FE"        : style?.bg    ?? "transparent",
        color:       active   ? "#0369A1"        : style?.text  ?? "var(--ds-text-primary,#111827)",
        border:      (active || style)
          ? `1px solid ${active ? "#7DD3FC" : style?.border}`
          : "1px solid transparent",
        outline:     active   ? "2px solid #38BDF8" : "none",
      }}>
      {word}
      {result?.status === "close" && result.spoken && (
        <span className="text-[10px] font-normal ml-1 opacity-70">({result.spoken})</span>
      )}
    </span>
  );
}

// ── Waveform pulse (listening animation) ─────────────────────────────────────

function WaveformPulse() {
  return (
    <div className="flex items-end gap-1 h-10">
      {[0.4, 0.7, 1, 0.7, 0.4, 0.6, 0.9, 0.6].map((h, i) => (
        <motion.div key={i}
          className="w-1.5 rounded-full"
          style={{ background: G, height: "40%" }}
          animate={{ height: `${h * 100}%` }}
          transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse", delay: i * 0.05 }} />
      ))}
    </div>
  );
}

// ── Phonetic guide panel (Kinyarwanda) ────────────────────────────────────────

function PhoneticGuidePanel({ language }: { language: VoiceLang }) {
  const guide = getPhoneticGuide(language);
  if (guide.length === 0) return null;

  return (
    <div className="mt-4 p-4 rounded-2xl" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "#15803D" }}>
        🇷🇼 Kinyarwanda Pronunciation Guide
      </p>
      <div className="grid grid-cols-2 gap-2">
        {guide.slice(0, 6).map(entry => (
          <div key={entry.grapheme} className="flex items-start gap-2">
            <span className="font-black text-[13px] shrink-0 w-8" style={{ color: "#15803D" }}>
              {entry.grapheme}
            </span>
            <span className="text-[11px] font-nunito leading-relaxed" style={{ color: "#374151" }}>
              {entry.soundLike} <span className="opacity-60">e.g. {entry.example}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type PracticeStep = "idle" | "listening" | "analyzing" | "result";

interface Props {
  passage:   string;
  language:  VoiceLang;
  childName: string;
  childAge:  number | null;
  onClose?:  () => void;
}

export default function VoiceCompanionView({
  passage, language, childName, childAge, onClose,
}: Props) {

  const [step,        setStep]      = useState<PracticeStep>("idle");
  const [spokenText,  setSpoken]    = useState("");
  const [analysis,    setAnalysis]  = useState<PronunciationAnalysis | null>(null);
  const [feedback,    setFeedback]  = useState<PronunciationCoachResponse | null>(null);
  const [fetchError,  setFetchErr]  = useState<string | null>(null);
  const [activeWord,  setActiveWord] = useState(-1);
  const [rwText,      setRwText]    = useState("");

  const passageWords = passage.trim().split(/\s+/).filter(Boolean);

  const ageRange: "5-7" | "8-10" | "11+" =
    childAge === null ? "8-10" :
    childAge <= 7 ? "5-7" :
    childAge <= 10 ? "8-10" : "11+";

  const { speak, stop: stopSpeak, isPlaying, currentWord } = useSpeechSynthesis();

  // Sync highlighted word while Nimi is reading back the passage
  useEffect(() => { setActiveWord(currentWord); }, [currentWord]);

  // ── Shared result handler (STT and Kinyarwanda text-input both use this) ─────
  const processSpoken = useCallback(async (transcript: string) => {
    setSpoken(transcript);
    setStep("analyzing");

    const ana = analysePronunciation(passage, transcript);
    setAnalysis(ana);

    try {
      const ttsLang = language === "rw" ? "en" : language;
      const res = await authedFetch("/api/pronunciation-coach", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expected: passage, spoken: transcript, childName, language,
          ageRange, analysis: ana,
        }),
      });
      if (res.ok) {
        const data = await res.json() as PronunciationCoachResponse;
        setFeedback(data);
        if (data.encouragement) speak(data.encouragement, ttsLang);
        if (data.practice_tip && data.practice_word) speak(data.practice_tip, ttsLang);
        if (data.invite_retry) speak(data.invite_retry, ttsLang);
      }
    } catch { /* feedback is optional */ }

    setStep("result");
  }, [passage, childName, language, ageRange, speak]);

  // ── Speech recognition — practice mode ──────────────────────────────────────
  const [micError, setMicError] = useState<string | null>(null);

  const { status: srStatus, supported, interimText, confidence, start, stop, reset } =
    useSpeechRecognition({
      language,
      mode: "practice",
      silenceMs: 1500,
      onResult: ({ transcript }: VoiceSpeechResult) => { void processSpoken(transcript); },
      onError: (err) => {
        setStep("idle");
        if (err === "not-allowed") {
          setMicError("Microphone or speech service unavailable. Allow mic in browser settings and use Google Chrome.");
        } else if (err === "not-supported") {
          setMicError("Voice recording not supported. Please use Google Chrome.");
        } else if (err === "no-speech") {
          setMicError("No speech detected. Please speak clearly and try again.");
        } else {
          setMicError("Microphone error. Please check your mic and try again.");
        }
        setTimeout(() => setMicError(null), 7000);
      },
    });

  const handleStart = useCallback(() => {
    setAnalysis(null);
    setFeedback(null);
    setFetchErr(null);
    setMicError(null);
    setSpoken("");
    stopSpeak();
    setStep("listening");
    start();
  }, [start, stopSpeak]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleRetry = useCallback(() => {
    stopSpeak();
    reset();
    setStep("idle");
    setAnalysis(null);
    setFeedback(null);
    setSpoken("");
  }, [reset, stopSpeak]);

  const handleReadPassage = useCallback(() => {
    if (isPlaying) { stopSpeak(); return; }
    speak(passage, language === "rw" ? "en" : language, {
      onWord: (idx) => setActiveWord(idx),
      onEnd:  () => setActiveWord(-1),
    });
  }, [isPlaying, stopSpeak, speak, passage, language]);

  const isListening = step === "listening" || srStatus === "listening";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        {onClose && (
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-[18px]"
            style={{ color: "#6B7280" }}>
            ←
          </button>
        )}
        <div>
          <p className="font-black text-[18px]" style={{ color: "var(--ds-text-primary,#111827)" }}>
            🎤 Practice Reading
          </p>
          <p className="text-[12px] font-nunito" style={{ color: "#6B7280" }}>
            Read the passage aloud — Nimi will listen and give feedback
          </p>
        </div>
      </div>

      {/* Passage card */}
      <div className="p-5 rounded-3xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>
            Read this aloud
          </p>
          {ttsIsNative(language) && (
            <button onClick={handleReadPassage}
              className="text-[11px] font-black px-3 py-1 rounded-full transition"
              style={{ background: isPlaying ? "#FFF1F2" : "#F0FDF4",
                       color:      isPlaying ? "#BE123C" : G,
                       border:     isPlaying ? "1px solid #FECDD3" : "1px solid #BBF7D0" }}>
              {isPlaying ? "⏹ Stop" : "🔊 Listen first"}
            </button>
          )}
        </div>

        {/* Passage with word highlighting */}
        <div className="leading-relaxed font-nunito" style={{ fontSize: ageRange === "5-7" ? "20px" : "16px" }}>
          {step === "result" && analysis
            ? analysis.words.map((r, i) => <WordChip key={i} word={r.expected} result={r} />)
            : passageWords.map((w, i) => <WordChip key={i} word={w} active={activeWord === i} />)
          }
        </div>
      </div>

      {/* State panels */}
      <AnimatePresence mode="wait">

        {/* ── idle ── */}
        {step === "idle" && (
          <motion.div key="idle"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-6">

            {language === "rw" ? (
              /* Kinyarwanda: voice STT not supported — offer text input instead */
              <div className="w-full flex flex-col gap-3">
                <div className="p-4 rounded-2xl text-center"
                  style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
                  <p className="text-[13px] font-bold" style={{ color: "#92400E" }}>
                    🎙️ Voice recognition isn&apos;t available yet for Kinyarwanda
                  </p>
                  <p className="text-[11px] font-nunito mt-1.5" style={{ color: "#B45309" }}>
                    Type what you read below — Nimi will still check your reading!
                  </p>
                </div>
                <textarea
                  value={rwText}
                  onChange={e => setRwText(e.target.value)}
                  placeholder="Andika ivyo wasomye hano… (Type the passage here as you read it)"
                  rows={3}
                  className="w-full text-[14px] font-nunito p-3 rounded-2xl border focus:outline-none resize-none"
                  style={{ borderColor: "#D1D5DB", color: "#111827", background: "#FAFAFA" }} />
                <button
                  onClick={() => { void processSpoken(rwText); setRwText(""); }}
                  disabled={!rwText.trim()}
                  className="w-full py-3 rounded-2xl font-black text-[14px] text-white hover:opacity-90 transition disabled:opacity-30"
                  style={{ background: G }}>
                  ✓ Check my reading
                </button>
              </div>
            ) : !supported ? (
              <p className="text-[13px] font-nunito text-center" style={{ color: "#BE123C" }}>
                Your browser doesn&apos;t support voice recording. Try Chrome or Edge.
              </p>
            ) : (
              <>
                <motion.button onClick={handleStart}
                  whileTap={{ scale: 0.95 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg text-3xl hover:opacity-90 transition"
                  style={{ background: G }}>
                  🎤
                </motion.button>
                <p className="text-[13px] font-bold" style={{ color: "#6B7280" }}>
                  Tap to start reading
                </p>
              </>
            )}
          </motion.div>
        )}

        {/* ── listening ── */}
        {step === "listening" && (
          <motion.div key="listening"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-6">
            <WaveformPulse />
            <p className="font-black text-[16px]" style={{ color: G }}>Listening…</p>
            {interimText && (
              <p className="text-[13px] font-nunito italic text-center px-4" style={{ color: "#6B7280" }}>
                &ldquo;{interimText}&rdquo;
              </p>
            )}
            <button onClick={handleStop}
              className="px-6 py-2 rounded-full text-[13px] font-black border hover:bg-gray-50 transition"
              style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>
              ⏹ Done reading
            </button>
          </motion.div>
        )}

        {/* ── analyzing ── */}
        {step === "analyzing" && (
          <motion.div key="analyzing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8">
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${G} transparent transparent transparent` }} />
            <p className="font-black text-[15px]" style={{ color: G }}>Nimi is checking…</p>
          </motion.div>
        )}

        {/* ── result ── */}
        {step === "result" && analysis && (
          <motion.div key="result"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            {/* Score card */}
            <div className="p-5 rounded-3xl text-center"
              style={{ background: G }}>
              <p className="text-green-200 text-[10px] font-black uppercase tracking-widest mb-2">
                Your Score
              </p>
              <p className="font-baloo font-black text-[42px] text-white leading-none mb-2">
                {analysis.score}
                <span className="text-[22px] text-green-200">/100</span>
              </p>
              <Stars count={analysis.stars} />
              <div className="flex justify-center gap-4 mt-3">
                <span className="text-[11px] font-bold text-white/80">
                  ✅ {analysis.correctCount} correct
                </span>
                {analysis.closeCount > 0 && (
                  <span className="text-[11px] font-bold text-white/80">
                    🟡 {analysis.closeCount} almost
                  </span>
                )}
                {analysis.missedCount > 0 && (
                  <span className="text-[11px] font-bold text-white/80">
                    ❌ {analysis.missedCount} missed
                  </span>
                )}
              </div>
            </div>

            {/* Nimi feedback */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="p-4 rounded-2xl"
                style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                <p className="text-[13px] font-nunito leading-relaxed" style={{ color: "#166534" }}>
                  💬 {feedback.encouragement}
                </p>
                {feedback.practice_word && feedback.practice_tip && (
                  <div className="mt-2.5 px-3 py-2 rounded-xl"
                    style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                    <p className="text-[11px] font-black mb-0.5" style={{ color: "#92400E" }}>
                      Word to practise: <span className="font-black">{feedback.practice_word}</span>
                    </p>
                    <p className="text-[12px] font-nunito" style={{ color: "#78350F" }}>
                      {feedback.practice_tip}
                    </p>
                  </div>
                )}
                {feedback.invite_retry && (
                  <p className="text-[12px] font-bold mt-2" style={{ color: "#15803D" }}>
                    {feedback.invite_retry}
                  </p>
                )}
              </motion.div>
            )}

            {/* What you said */}
            {spokenText && (
              <div className="px-4 py-3 rounded-2xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#9CA3AF" }}>
                  What Nimi heard
                </p>
                <p className="text-[13px] font-nunito italic" style={{ color: "#6B7280" }}>
                  &ldquo;{spokenText}&rdquo;
                </p>
                {confidence > 0 && (
                  <p className="text-[10px] font-semibold mt-1" style={{ color: "#9CA3AF" }}>
                    Recognition confidence: {Math.round(confidence * 100)}%
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleRetry}
                className="flex-1 py-3 rounded-2xl font-black text-[14px] text-white hover:opacity-90 transition"
                style={{ background: G }}>
                🔄 Try Again
              </button>
              {isPlaying ? (
                <button onClick={stopSpeak}
                  className="px-5 py-3 rounded-2xl font-black text-[13px] border hover:bg-gray-50 transition"
                  style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>
                  ⏹ Stop
                </button>
              ) : (
                feedback?.encouragement && (
                  <button onClick={() => speak(feedback.encouragement, language === "rw" ? "en" : language)}
                    className="px-5 py-3 rounded-2xl font-black text-[13px] border hover:bg-gray-50 transition"
                    style={{ borderColor: "#BBF7D0", color: G }}>
                    🔊 Replay
                  </button>
                )
              )}
            </div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* Legend */}
      {step === "result" && (
        <div className="flex gap-4 justify-center flex-wrap">
          {(["correct","close","missed"] as const).map(s => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] font-bold"
              style={{ color: WORD_STYLE[s].text }}>
              <span className="w-3 h-3 rounded inline-block" style={{ background: WORD_STYLE[s].bg, border: `1px solid ${WORD_STYLE[s].border}` }} />
              {s === "correct" ? "Correct" : s === "close" ? "Close" : "Missed"}
            </span>
          ))}
        </div>
      )}

      {/* Kinyarwanda phonetic guide — shown in idle and after result */}
      {language === "rw" && (step === "idle" || step === "result") && (
        <PhoneticGuidePanel language="rw" />
      )}

      {micError && (
        <div className="px-4 py-3 rounded-2xl text-center" style={{ background: "#FFF1F2", border: "1px solid #FECDD3" }}>
          <p className="text-[13px] font-bold" style={{ color: "#BE123C" }}>🎤 {micError}</p>
        </div>
      )}

      {fetchError && (
        <p className="text-[12px] text-center font-nunito" style={{ color: "#9CA3AF" }}>
          {fetchError}
        </p>
      )}

    </div>
  );
}
