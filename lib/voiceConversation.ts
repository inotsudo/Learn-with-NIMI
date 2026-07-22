/**
 * voiceConversation — Phase 6.2
 *
 * Types, prompt builder, and response validator for the voice-optimised
 * conversation engine. Designed for a student talking to Nimi aloud:
 *
 *   - Responses are short (1–2 sentences) — easy to read back / listen to
 *   - No markdown, no bullet points — pure natural speech
 *   - Optional pronunciation_tip when the student's STT confidence is low
 *   - Optional follow_up question to keep the conversation going
 *   - Age-calibrated vocabulary
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type VoiceConvLanguage = "en" | "fr" | "rw";
export type VoiceConvAgeRange = "5-7" | "8-10" | "11+";

export interface VoiceMessage {
  role:       "user" | "assistant";
  content:    string;
  confidence?: number;   // STT confidence (0–1) — assistant can comment on low values
}

export interface VoiceConversationRequest {
  messages:      VoiceMessage[];
  childName:     string;
  language:      VoiceConvLanguage;
  ageRange:      VoiceConvAgeRange;
  storyTitle?:   string;   // current story context, optional
  sttConfidence?: number;  // overall confidence of the last user message (0–1)
}

export interface VoiceConversationResponse {
  response:          string;            // Nimi's spoken reply (plain text, no markdown)
  pronunciation_tip?: string | null;    // set when sttConfidence < 0.55
  follow_up?:        string | null;     // optional question to continue the conversation
}

// ── System prompt ─────────────────────────────────────────────────────────────

const AGE_GUIDANCE: Record<VoiceConvAgeRange, string> = {
  "5-7":  "Use very simple words. Max 1 short sentence per reply. Lots of encouragement.",
  "8-10": "Use clear, simple sentences. Max 2 sentences. Be warm and encouraging.",
  "11+":  "Use natural, friendly language. Max 2–3 sentences. Be engaging and curious.",
};

const LANG_GUIDANCE: Record<VoiceConvLanguage, string> = {
  en: "Respond in English.",
  fr: "Réponds en français.",
  rw: "Réponds en anglais ou Kinyarwanda selon la question de l'enfant. Keep it very simple.",
};

export function buildVoiceSystemPrompt(
  childName: string,
  language:  VoiceConvLanguage,
  ageRange:  VoiceConvAgeRange,
  storyTitle?: string,
): string {
  const storyLine = storyTitle
    ? `The child is currently learning from the story: "${storyTitle}".`
    : "";

  return `\
You are Nimi, a kind and encouraging AI reading companion for African children.
You are having a VOICE conversation with ${childName}.

LANGUAGE RULE: ${LANG_GUIDANCE[language]}
AGE RULE: ${AGE_GUIDANCE[ageRange]}
${storyLine}

CRITICAL RULES:
- NO markdown (no **, no *, no #, no lists, no bullet points)
- Plain, spoken language only — your reply will be read aloud by a text-to-speech engine
- Keep responses SHORT: the child is speaking to you, not reading
- Be warm, playful, and encouraging — celebrate every attempt
- If the child seems to have mispronounced something, gently model the correct pronunciation naturally
  (e.g., "You said 'elefant' — I say 'elephant'! Say it with me!")

OUTPUT FORMAT — respond ONLY with valid JSON, no markdown fences:
{
  "response": "...",
  "pronunciation_tip": null,
  "follow_up": "..."
}

pronunciation_tip: set ONLY when you want to highlight a specific word the child may have said wrong
follow_up: a short, open question to invite the child to keep talking (or null if not needed)`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function isStr(x: unknown): x is string {
  return typeof x === "string" && String(x).trim().length > 0;
}

export function validateVoiceResponse(raw: unknown): VoiceConversationResponse | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const response = typeof r.response === "string" ? r.response.trim().slice(0, 400) : null;
  if (!response) return null;

  // Strip any accidental markdown
  const clean = response
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#+\s/g, "");

  return {
    response:          clean,
    pronunciation_tip: isStr(r.pronunciation_tip) ? r.pronunciation_tip.slice(0, 200) : null,
    follow_up:         isStr(r.follow_up)         ? r.follow_up.slice(0, 150)         : null,
  };
}
