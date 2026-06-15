import type { Language } from "@/contexts/LanguageContext";

const SPEECH_LANG_MAP: Record<Language, string> = {
  en: "en-US",
  fr: "fr-FR",
  rw: "rw-RW",
};

export function speechLangFor(language: Language): string {
  return SPEECH_LANG_MAP[language] ?? "en-US";
}

// Names of voices that sound young/playful on common platforms (macOS/iOS "fun" voices, etc.)
const KID_VOICE_KEYWORDS = ["child", "kid", "junior", "bubbles", "princess", "girl", "boy"];

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve([]);
  const synth = window.speechSynthesis;

  const existing = synth.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  if (!voicesPromise) {
    voicesPromise = new Promise(resolve => {
      const handle = () => {
        synth.removeEventListener("voiceschanged", handle);
        resolve(synth.getVoices());
      };
      synth.addEventListener("voiceschanged", handle);
      setTimeout(() => resolve(synth.getVoices()), 500);
    });
  }
  return voicesPromise;
}

function pickKidVoice(voices: SpeechSynthesisVoice[], langPrefix: string): SpeechSynthesisVoice | undefined {
  const matching = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
  const pool = matching.length > 0 ? matching : voices;

  const named = pool.find(v => KID_VOICE_KEYWORDS.some(keyword => v.name.toLowerCase().includes(keyword)));
  if (named) return named;

  const female = pool.find(v => /female/i.test(v.name));
  if (female) return female;

  return pool[0];
}

interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

export async function speakText(text: string, language: Language, options: SpeakOptions = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (language === "rw") return; // Kinyarwanda not reliably supported by browser TTS voices
  if (!text.trim()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLangFor(language);
  utterance.pitch = 1.4; // higher pitch for a friendly, kid-like voice
  utterance.rate = 1;

  const voices = await loadVoices();
  const kidVoice = pickKidVoice(voices, speechLangFor(language).split("-")[0].toLowerCase());
  if (kidVoice) utterance.voice = kidVoice;

  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
