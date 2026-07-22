// ── Conversation Memory ───────────────────────────────────────────
// Extracts and persists key facts from Nimi chat sessions.
// Called by the Nimi route after the child's session ends (or every N turns).
//
// Stored in: conversation_summaries (migration 135)
// Surfaces in: Nimi system prompt on the NEXT session as cross-session memory
//
// Privacy: raw messages are NEVER stored — only AI-inferred summaries.
// The summary RPC uses security-definer; the parent can see it via RLS.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConversationSummary } from '@/lib/ai/types';
import { callAI, stripJson } from '@/lib/ai/aiService';

// ── Types ─────────────────────────────────────────────────────────

interface Message {
  role:    'user' | 'assistant';
  content: string;
}

interface SummarizationResult {
  summary:       string;
  keyTopics:     string[];
  masteredVocab: string[];
  mistakes:      { word: string; errorType: string }[];
}

// ── AI-powered summarisation ──────────────────────────────────────

const SUMMARY_SYSTEM_PROMPT = `You are a learning-analytics assistant that extracts educational insights from a child's AI chat session.

Given a conversation between a child and Nimi (their AI learning companion), return a JSON object:

{
  "summary": "2-3 sentence factual summary of what was discussed and learned",
  "keyTopics": ["topic1", "topic2"],
  "masteredVocab": ["word1", "word2"],
  "mistakes": [{"word": "...", "errorType": "spelling|meaning|pronunciation|grammar"}]
}

RULES:
- summary: plain language, factual, max 3 sentences — what the child talked about and what skills they demonstrated
- keyTopics: up to 5 topic strings — story names, vocabulary themes, activities
- masteredVocab: words the child correctly used or defined during the session (max 10)
- mistakes: ONLY words the child got wrong that Nimi corrected (max 5); omit if none
- Return ONLY the JSON object. No explanation. No markdown.`;

async function summariseConversation(
  messages:      Message[],
  language:      string,
  signal?:       AbortSignal
): Promise<SummarizationResult> {
  // Format conversation for the LLM
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Child' : 'Nimi'}: ${m.content}`)
    .join('\n');

  const prompt = `Language: ${language}\n\nConversation:\n${transcript}`;

  const raw = stripJson((await callAI({
    type:        'context_summarize',
    system:      SUMMARY_SYSTEM_PROMPT,
    prompt,
    temperature: 0.2,
    maxTokens:   600,
    signal,
  })).content);

  const parsed = JSON.parse(raw) as Partial<SummarizationResult>;

  return {
    summary:       typeof parsed.summary       === 'string'  ? parsed.summary       : '',
    keyTopics:     Array.isArray(parsed.keyTopics)            ? parsed.keyTopics.filter((t): t is string => typeof t === 'string').slice(0, 5) : [],
    masteredVocab: Array.isArray(parsed.masteredVocab)        ? parsed.masteredVocab.filter((w): w is string => typeof w === 'string').slice(0, 10) : [],
    mistakes:      Array.isArray(parsed.mistakes)             ? parsed.mistakes.slice(0, 5) : [],
  };
}

// ── Persist to DB ─────────────────────────────────────────────────

export async function persistConversationSummary(
  supabase:      SupabaseClient,
  childId:       string,
  sessionId:     string,
  messages:      Message[],
  language:      string,
  storyId?:      string | null,
  signal?:       AbortSignal
): Promise<void> {
  if (messages.length < 4) return;  // too short to be worth summarising

  let result: SummarizationResult;
  try {
    result = await summariseConversation(messages, language, signal);
  } catch {
    return;  // best-effort; don't surface errors to the user
  }

  if (!result.summary) return;

  const mistakesJson = result.mistakes.map(m => ({
    word:        m.word,
    errorType:   m.errorType,
    correctedAt: new Date().toISOString(),
  }));

  await supabase.rpc('upsert_conversation_summary', {
    p_child_id:       childId,
    p_session_id:     sessionId,
    p_summary:        result.summary,
    p_key_topics:     result.keyTopics,
    p_mastered_vocab: result.masteredVocab,
    p_mistakes:       mistakesJson,
    p_language:       language,
    p_story_id:       storyId ?? null,
    p_exchange_count: messages.filter(m => m.role === 'user').length,
  });

  // Persist mastered vocab to learner_memories (fire-and-forget)
  for (const word of result.masteredVocab) {
    void supabase.rpc('upsert_learner_memory', {
      p_child_id:   childId,
      p_type:       'skill',
      p_key:        `vocab_mastered_${word.toLowerCase().replace(/\s+/g, '_')}`,
      p_value:      { word, language, masteredAt: new Date().toISOString() },
      p_confidence: 0.75,
      p_source:     'ai_inferred',
    });
  }
}

// ── Retrieve for Nimi context injection ───────────────────────────

export async function getRecentConversationContext(
  supabase:  SupabaseClient,
  childId:   string,
  limit      = 3
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('get_conversation_history', {
    p_child_id: childId,
    p_limit:    limit,
  });

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map(row => ({
    sessionId:     String(row.session_id ?? ''),
    summary:       String(row.summary ?? ''),
    keyTopics:     (row.key_topics as string[] | null) ?? [],
    masteredVocab: (row.mastered_vocab as string[] | null) ?? [],
    mistakes:      (row.mistakes as { word: string; errorType: string; correctedAt: string }[] | null) ?? [],
    language:      String(row.language ?? 'en'),
    storyId:       row.story_id ? String(row.story_id) : null,
    exchangeCount: Number(row.exchange_count ?? 0),
    createdAt:     String(row.created_at ?? ''),
  }));
}

// ── Format for Nimi system prompt ────────────────────────────────

export function formatConversationHistoryForPrompt(
  history: ConversationSummary[]
): string {
  if (history.length === 0) return '';

  const lines: string[] = ['## Previous Conversations (memory)'];

  for (const session of history.slice(0, 3)) {
    lines.push(`- ${session.summary}`);
    if (session.masteredVocab.length > 0) {
      lines.push(`  Vocab mastered: ${session.masteredVocab.join(', ')}`);
    }
    if (session.keyTopics.length > 0) {
      lines.push(`  Topics covered: ${session.keyTopics.join(', ')}`);
    }
  }

  // Surface unresolved mistakes from last session
  const lastMistakes = history.at(0)?.mistakes ?? [];
  if (lastMistakes.length > 0) {
    const words = lastMistakes.map(m => m.word).join(', ');
    lines.push(`\nWords to revisit gently (from last session): ${words}`);
    lines.push('If these words come up naturally, celebrate when the child gets them right.');
  }

  return lines.join('\n');
}

// ── Session ID helper (client-side) ──────────────────────────────
// Generates a stable session ID based on child + date so the same
// session within a calendar day maps to the same DB row.

export function getSessionId(childId: string): string {
  const date = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
  return `${childId}-${date}`;
}
