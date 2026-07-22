// lib/knowledgeRouter/knowledgeCache.ts
//
// DB-backed cache for assembled knowledge results.
// TTL is set per-intent (shorter for time-sensitive, longer for stable topics).
// Tracks search_count so repeated queries can trigger article generation.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CacheEntry, KnowledgeIntent, KnowledgeSource } from './types';
import { CACHE_TTL_SECONDS, ALWAYS_FRESH_INTENTS, ARTICLE_GENERATION_THRESHOLD } from './types';

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getCached(
  supabase:  SupabaseClient,
  query:     string,
  language:  string,
  intent:    KnowledgeIntent,
): Promise<CacheEntry | null> {
  // Never cache real-time intents
  if (ALWAYS_FRESH_INTENTS.has(intent) || CACHE_TTL_SECONDS[intent] === 0) return null;

  try {
    const { data } = await supabase.rpc('get_cached_knowledge', {
      p_query:    query,
      p_language: language,
    });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as {
      id:               string;
      intent:           string;
      sources:          unknown;
      ai_summary:       string | null;
      confidence_score: number | null;
      search_count:     number;
      expires_at:       string;
    };

    return {
      id:          row.id,
      intent:      row.intent as KnowledgeIntent,
      sources:     (Array.isArray(row.sources) ? row.sources : []) as KnowledgeSource[],
      aiSummary:   row.ai_summary,
      confidence:  row.confidence_score ?? 0.5,
      searchCount: row.search_count,
      expiresAt:   row.expires_at,
    };
  } catch {
    return null;
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function setCached(
  supabase:    SupabaseClient,
  query:       string,
  intent:      KnowledgeIntent,
  language:    string,
  sources:     KnowledgeSource[],
  aiSummary:   string | null,
  confidence:  number,
): Promise<void> {
  const ttl = CACHE_TTL_SECONDS[intent];
  if (ttl === 0) return; // don't cache

  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  try {
    await supabase.rpc('upsert_cached_knowledge', {
      p_query:       query,
      p_intent:      intent,
      p_language:    language,
      p_sources:     sources,
      p_ai_summary:  aiSummary,
      p_confidence:  confidence,
      p_expires_at:  expiresAt,
    });
  } catch {
    // non-fatal
  }
}

// ── Article generation trigger ────────────────────────────────────────────────

export function shouldGenerateArticle(entry: CacheEntry): boolean {
  return entry.searchCount >= ARTICLE_GENERATION_THRESHOLD;
}

// ── Normalize query for cache key ─────────────────────────────────────────────

export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?!.,;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
