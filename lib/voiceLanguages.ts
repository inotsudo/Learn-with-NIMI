/**
 * voiceLanguages — Phase 6.5
 *
 * Rich language configuration for voice features. Covers:
 *   - BCP 47 speech recognition codes
 *   - TTS support and fallback strategy
 *   - Kinyarwanda phonetic guidance (browser TTS doesn't support rw)
 *   - Voice quality preference lists per language/platform
 */

// ── Language codes ────────────────────────────────────────────────────────────

export type VoiceLang = "en" | "fr" | "rw";

export interface VoiceLanguageConfig {
  bcp47:        string;           // BCP 47 tag used for SpeechRecognition.lang
  ttsCode:      string;           // lang tag used for SpeechSynthesisUtterance
  ttsSupported: boolean;          // false = browser TTS has no rw voices
  ttsFallback:  string | null;    // fallback ttsCode when !ttsSupported
  label:        string;
  flag:         string;
  voiceKeywords: string[];        // preferred voice name substrings (best → worst)
  phoneticGuide: PhoneticEntry[]; // rw-only: common sounds with pronunciation hints
}

export interface PhoneticEntry {
  grapheme:    string;   // written form
  ipa:         string;   // IPA symbol
  example:     string;   // example word
  soundLike:   string;   // English sound-like description for kids
}

export const VOICE_LANGUAGES: Record<VoiceLang, VoiceLanguageConfig> = {
  en: {
    bcp47:        "en-US",
    ttsCode:      "en-US",
    ttsSupported: true,
    ttsFallback:  null,
    label:        "English",
    flag:         "🇬🇧",
    voiceKeywords: ["junior", "child", "kid", "samantha", "alex", "google us english"],
    phoneticGuide: [],
  },
  fr: {
    bcp47:        "fr-FR",
    ttsCode:      "fr-FR",
    ttsSupported: true,
    ttsFallback:  null,
    label:        "Français",
    flag:         "🇫🇷",
    voiceKeywords: ["amelie", "julie", "thomas", "google français"],
    phoneticGuide: [],
  },
  rw: {
    bcp47:        "rw-RW",
    ttsCode:      "rw-RW",
    ttsSupported: false,
    ttsFallback:  "en-US",   // speak in English when no rw voice available
    label:        "Kinyarwanda",
    flag:         "🇷🇼",
    voiceKeywords: [],
    // Key Kinyarwanda phonemes that differ from English
    phoneticGuide: [
      { grapheme: "cy",  ipa: "tʃ",  example: "cyangwa",  soundLike: "'ch' as in 'church'"  },
      { grapheme: "ny",  ipa: "ɲ",   example: "nyuma",    soundLike: "'ny' as in 'canyon'"  },
      { grapheme: "ry",  ipa: "rj",  example: "ryari",    soundLike: "'ry' rolled r + y"    },
      { grapheme: "nk",  ipa: "ŋk",  example: "nka",      soundLike: "'nk' as in 'ink'"     },
      { grapheme: "ng'", ipa: "ŋ",   example: "ng'oma",   soundLike: "'ng' as in 'song'"    },
      { grapheme: "kw",  ipa: "kw",  example: "kwiga",    soundLike: "'kw' as in 'quick'"   },
      { grapheme: "mu",  ipa: "mu",  example: "muntu",    soundLike: "'moo' short"          },
      { grapheme: "ibi", ipa: "ibi", example: "ibintu",   soundLike: "'ee-bee' fast"        },
      { grapheme: "aba", ipa: "aba", example: "abantu",   soundLike: "'ah-bah'"             },
      { grapheme: "uka", ipa: "uka", example: "ukana",    soundLike: "'oo-kah'"             },
    ],
  },
};

// ── Voice picker ──────────────────────────────────────────────────────────────

export function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  lang:   VoiceLang,
): SpeechSynthesisVoice | null {
  const cfg = VOICE_LANGUAGES[lang];
  const code = cfg.ttsSupported ? cfg.ttsCode : (cfg.ttsFallback ?? "en-US");
  const prefix = code.split("-")[0].toLowerCase();

  const langMatching = voices.filter(v =>
    v.lang.toLowerCase().startsWith(prefix)
  );
  const pool = langMatching.length > 0 ? langMatching : voices;

  // Try to match preferred voice keywords in order
  for (const kw of cfg.voiceKeywords) {
    const found = pool.find(v => v.name.toLowerCase().includes(kw));
    if (found) return found;
  }

  // Fall back to any female voice (tends to sound friendlier for kids)
  const female = pool.find(v => /female/i.test(v.name));
  if (female) return female;

  return pool[0] ?? null;
}

// ── STT language mapping ──────────────────────────────────────────────────────

export function sttCodeFor(lang: VoiceLang): string {
  return VOICE_LANGUAGES[lang].bcp47;
}

export function ttsCodeFor(lang: VoiceLang): string {
  const cfg = VOICE_LANGUAGES[lang];
  return cfg.ttsSupported ? cfg.ttsCode : (cfg.ttsFallback ?? "en-US");
}

export function ttsIsNative(lang: VoiceLang): boolean {
  return VOICE_LANGUAGES[lang].ttsSupported;
}

export function getPhoneticGuide(lang: VoiceLang): PhoneticEntry[] {
  return VOICE_LANGUAGES[lang].phoneticGuide;
}
