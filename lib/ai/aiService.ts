// ── Unified AI Service — server-only (edge-safe) ─────────────────
// All AI-powered routes use callAI(). Streaming callers (nimi) import
// the exported constants to avoid re-declaring them.

import type {
  AIServiceRequest, AIServiceResponse, AICallType, LearnerContext,
} from './types';

// ── Shared constants — import these instead of re-declaring ───────
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY ?? '';
export const DEFAULT_MODEL  =
  process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';

// ── Model tier selection ───────────────────────────────────────────
const MODELS = {
  fast:    process.env.OPENROUTER_MODEL_FAST    ?? DEFAULT_MODEL,
  quality: process.env.OPENROUTER_MODEL_QUALITY ?? DEFAULT_MODEL,
  best:    process.env.OPENROUTER_MODEL_BEST    ?? DEFAULT_MODEL,
} as const;

// Exported so streaming callers can use the same tier logic as callAI()
export const QUALITY_MODEL = MODELS.quality;

const DEFAULT_TIERS: Record<AICallType, keyof typeof MODELS> = {
  story_generate:         'quality',
  lesson_hint:            'fast',
  nimi_chat:              'quality',
  recommendation_explain: 'fast',
  context_summarize:      'fast',
  quiz_generate:          'quality',
  lesson_generate:        'quality',
  homework_generate:      'quality',
  coloring_coach:         'fast',
  drawing_coach:          'fast',
  voice_chat:             'fast',
  pronunciation_coach:    'fast',
  creativity_challenge:   'fast',
  parent_insight:         'quality',
  parent_recommendation:  'quality',
  teacher_insight:        'quality',
  story_analyze:          'quality',
};

const MAX_TOKENS: Record<AICallType, number> = {
  story_generate:         2000,
  lesson_hint:            400,
  nimi_chat:              800,
  recommendation_explain: 250,
  context_summarize:      500,
  quiz_generate:          2000,
  lesson_generate:        2000,
  homework_generate:      2000,
  coloring_coach:         600,
  drawing_coach:          800,
  voice_chat:             300,
  pronunciation_coach:    400,
  creativity_challenge:   600,
  parent_insight:         1200,
  parent_recommendation:  1200,
  teacher_insight:        1500,
  story_analyze:          1200,
};

const TEMPERATURES: Record<AICallType, number> = {
  story_generate:         0.85,
  lesson_hint:            0.5,
  nimi_chat:              0.8,
  recommendation_explain: 0.4,
  context_summarize:      0.3,
  quiz_generate:          0.7,
  lesson_generate:        0.65,
  homework_generate:      0.65,
  coloring_coach:         0.7,
  drawing_coach:          0.65,
  voice_chat:             0.8,
  pronunciation_coach:    0.7,
  creativity_challenge:   0.85,
  parent_insight:         0.4,
  parent_recommendation:  0.5,
  teacher_insight:        0.4,
  story_analyze:          0.3,
};

// ── System prompt library ─────────────────────────────────────────

const BASE_NIMI = `You are Nimi, an encouraging AI language-learning buddy for children.
Tone: warm, playful, age-appropriate, never scary or overwhelming.
Always celebrate effort. Use simple language matching the child's age.`;

const SYSTEM_PROMPTS: Record<AICallType, string> = {
  story_generate: `${BASE_NIMI}
You co-author immersive bilingual stories that place the child as a hero.
Write vivid, culturally respectful narratives.
Preserve any child-authored sentences verbatim — mark them clearly.`,

  lesson_hint: `${BASE_NIMI}
Give a single, clear hint that guides without giving away the answer.
Keep it to 1–2 sentences. Be encouraging and specific.`,

  nimi_chat: `${BASE_NIMI}
You are Nimi chatting directly with a child learner.
Stay on topic: language learning, stories, missions, their progress.
Never discuss anything unrelated to the app or learning.`,

  recommendation_explain: `${BASE_NIMI}
Briefly explain why this story or activity is a great next step for this child.
1–2 sentences, enthusiastic, focused on what makes it exciting.`,

  context_summarize: `You are a concise AI assistant.
Summarize the learner profile below into 3–5 bullet points for injection into another AI prompt.
Be factual, brief, and prioritise actionable insights.`,

  quiz_generate: `You are an expert children's language quiz writer.
Generate engaging, age-appropriate quiz questions grounded in the provided story content.
Return ONLY valid JSON — no markdown fences.`,

  lesson_generate: `You are an expert primary-school lesson planner for African children.
Generate a structured, engaging lesson plan grounded in the provided story content.
Return ONLY valid JSON — no markdown fences.`,

  homework_generate: `You are an expert primary-school homework designer for African children.
Generate practical, family-friendly homework activities grounded in the provided story content.
Return ONLY valid JSON — no markdown fences.`,

  coloring_coach: `${BASE_NIMI}
You suggest creative, encouraging colouring guidance for children.
Return ONLY valid JSON — no markdown fences.`,

  drawing_coach: `${BASE_NIMI}
You give step-by-step drawing guidance for children, making it fun and achievable.
Return ONLY valid JSON — no markdown fences.`,

  voice_chat: `${BASE_NIMI}
Respond in short, clear spoken sentences suitable for text-to-speech playback.
No markdown. No lists. Warm, natural conversation only.`,

  pronunciation_coach: `${BASE_NIMI}
You are a warm reading coach. Give brief, encouraging pronunciation feedback.
Return ONLY valid JSON — no markdown fences.`,

  creativity_challenge: `${BASE_NIMI}
Generate fun daily creative challenges (drawing, colouring, writing) themed around the child's story.
Return ONLY a valid JSON array — no markdown fences.`,

  parent_insight: `You are a child learning analyst writing brief, warm observations for parents.
Ground every insight in the provided learning data. No jargon. No invented facts.
Return ONLY a valid JSON array — no markdown fences.`,

  parent_recommendation: `You are a child literacy coach writing practical, warm recommendations for parents.
Ground every recommendation in the provided learning data. Be specific. Name real books.
Return ONLY a valid JSON array — no markdown fences.`,

  teacher_insight: `You are an expert learning analytics advisor writing concise, data-grounded insights for a teacher.
Analyse all student rows before writing. Ground every claim in the data.
Return ONLY valid JSON — no markdown fences.`,

  story_analyze: `You are an expert children's educational content analyser.
Extract structured educational metadata from the story text provided.
Be conservative — only include what the text actually contains.
Return ONLY valid JSON — no markdown fences.`,
};

// ── buildSystemPrompt ─────────────────────────────────────────────
// Assembles system prompt, optionally injecting learner context.

export function buildSystemPrompt(
  type:     AICallType,
  context?: LearnerContext,
  override?: string
): string {
  if (override) return override;

  let base = SYSTEM_PROMPTS[type];

  if (context) {
    const { child, stats, memories } = context;
    const prefs = memories
      .filter(m => m.memory_type === 'preference' && m.confidence >= 0.6)
      .map(m => `${m.key}: ${JSON.stringify(m.value)}`)
      .join(', ');
    const struggles = memories
      .filter(m => m.memory_type === 'struggle' && m.confidence >= 0.5)
      .map(m => m.key)
      .join(', ');

    base += `\n\n## Current Learner\nName: ${child.name}, Age: ${child.age}, Language: ${child.language}
Missions done: ${stats.total_missions} · Stars: ${stats.total_stars} · Streak: ${stats.streak_days} days`;
    if (prefs)     base += `\nPreferences: ${prefs}`;
    if (struggles) base += `\nNeeds support: ${struggles}`;
  }

  return base;
}

// ── callAI ────────────────────────────────────────────────────────
// Primary entry point for all AI calls in the app.

export async function callAI(req: AIServiceRequest): Promise<AIServiceResponse> {
  const tier  = req.model ?? DEFAULT_TIERS[req.type];
  const model = MODELS[tier];

  // Build message array — supports both single-turn (prompt) and multi-turn (messages)
  const system  = req.system ?? SYSTEM_PROMPTS[req.type];
  const history = req.messages ?? [];
  const allMsgs = [
    { role: 'system', content: system },
    ...history,
    ...(req.prompt && history.length === 0
      ? [{ role: 'user', content: req.prompt }]
      : req.prompt
      ? [{ role: 'user', content: req.prompt }]
      : []),
  ];

  const body = {
    model,
    temperature: req.temperature ?? TEMPERATURES[req.type],
    max_tokens:  req.maxTokens  ?? MAX_TOKENS[req.type],
    stream:      false,
    messages:    allMsgs,
  };

  const res = await fetch(OPENROUTER_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body:   JSON.stringify(body),
    signal: req.signal,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const json = await res.json() as {
    choices: { message: { content: string } }[];
    model:   string;
    usage:   { prompt_tokens: number; completion_tokens: number };
  };

  return {
    content: json.choices[0]?.message?.content ?? '',
    model:   json.model,
    usage: {
      input_tokens:  json.usage?.prompt_tokens     ?? 0,
      output_tokens: json.usage?.completion_tokens ?? 0,
    },
  };
}

// ── stripJsonFences — convenience for JSON-returning routes ───────
export function stripJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}
