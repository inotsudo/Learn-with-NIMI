// lib/knowledgeRouter/index.ts
//
// ── Knowledge Router ──────────────────────────────────────────────────────────
//
// Central service that every AI feature calls before building its prompt.
//
// Resolution order (stops as soon as sufficient trusted knowledge found):
//   1. Learner Context  — storyId, active curriculum, memories
//   2. Story Knowledge Base — story_knowledge_cache
//   3. Curriculum Knowledge — published lessons / units
//   4. Learner Knowledge Graph — per-child concept + skill state
//   5. Nimipiko Knowledge Articles — curated internal articles
//   6. Live Web Search — Tavily → Brave (if internal insufficient)
//   7. General LLM Knowledge — always available; no external fetch
//
// The router never web-searches for story, vocabulary, reading, or
// conversation intents — those are always internal.
//
// Usage:
//   const result = await routeKnowledge(supabase, {
//     question: lastUserMessage,
//     learner:  { childId, childName, age, readingLevel, language, role },
//     storyId,
//   });
//   systemPrompt += result.knowledgeBlock;

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RouterRequest, RouterResult, KnowledgeSource } from './types';
import { INTERNAL_ONLY_INTENTS, ALWAYS_FRESH_INTENTS } from './types';
import { classifyIntent }                    from './intentClassifier';
import { retrieveInternal }                  from './internalRetriever';
import { searchWeb }                         from './webSearchRetriever';
import { getCached, setCached, normalizeQuery, shouldGenerateArticle } from './knowledgeCache';
import { buildAdaptationBlock, adaptKnowledgeForPrompt } from './learnerAdapter';

// ── Confidence threshold below which web search activates ─────────────────────

const WEB_SEARCH_THRESHOLD = 0.65;

// ── Block builder ─────────────────────────────────────────────────────────────

function buildKnowledgeBlock(
  internal:     Awaited<ReturnType<typeof retrieveInternal>>,
  webSources:   KnowledgeSource[],
  intent:       string,
  adaptation:   ReturnType<typeof buildAdaptationBlock>,
  role:         'child' | 'parent' | 'teacher',
): string {
  const parts: string[] = [];

  // Internal knowledge sections
  if (internal.storyContext) {
    parts.push(`## Story Knowledge\n${internal.storyContext}`);
  }
  if (internal.nimipikArticle) {
    parts.push(`## Nimipiko Knowledge\n${internal.nimipikArticle}`);
  }
  if (internal.curriculumContent) {
    parts.push(`## Curriculum Context\n${internal.curriculumContent}`);
  }
  if (internal.knowledgeGraph) {
    parts.push(`## Learner Knowledge State\n${internal.knowledgeGraph}`);
  }
  if (internal.conversationCtx) {
    parts.push(`## Recent Context\n${internal.conversationCtx}`);
  }

  // External web sources
  if (webSources.length > 0) {
    const adapted = adaptKnowledgeForPrompt(
      webSources.map(s => ({ title: s.title, snippet: s.snippet, url: s.url })),
      adaptation,
      role,
    );
    if (adapted) {
      parts.push(`## External Knowledge\n${adapted}`);
    }
  }

  // Adaptation instruction always appended so the LLM knows how to write
  parts.push(`## Response Guidance\n${adaptation.instruction}`);

  return parts.join('\n\n');
}

function buildAttributionBlock(
  webSources:  KnowledgeSource[],
  cacheHit:    boolean,
  intent:      string,
  role:        'child' | 'parent' | 'teacher',
): string {
  if (role === 'child' || webSources.length === 0) return '';

  const lines = webSources.map(s =>
    `• ${s.title} (${new URL(s.url).hostname}) — ${s.reasonSelected}${cacheHit ? ' [cached]' : ''}`
  );
  const retrieved = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `**Sources consulted (${retrieved})**\n${lines.join('\n')}`;
}

// ── Article generation (fire-and-forget) ─────────────────────────────────────

async function maybeGenerateArticle(
  supabase:    SupabaseClient,
  query:       string,
  intent:      string,
  language:    string,
  sources:     KnowledgeSource[],
  confidence:  number,
): Promise<void> {
  if (sources.length === 0) return;
  try {
    // Build a simple combined article from the top sources
    const topSource = sources[0];
    const content = [
      `# ${topSource.title}`,
      '',
      sources.map(s => s.snippet).join('\n\n'),
    ].join('\n');

    await supabase.rpc('upsert_nimipiko_article', {
      p_topic:         query,
      p_intent:        intent,
      p_language:      language,
      p_content:       content.slice(0, 4000),
      p_sources:       sources.map(s => ({ url: s.url, title: s.title })),
      p_confidence:    confidence,
      p_age_min:       2,
      p_age_max:       15,
      p_trigger_count: 1,
    });
  } catch {
    // Non-fatal
  }
}

// ── Main public API ───────────────────────────────────────────────────────────

export async function routeKnowledge(
  supabase: SupabaseClient,
  request:  RouterRequest,
): Promise<RouterResult> {
  const { question, context, learner, storyId, forceWeb = false, maxSources = 3 } = request;
  const { language, role } = learner;

  // 1. Classify intent
  const classified = classifyIntent(question, context);
  const { intent, confidence: intentConfidence, needsWeb, timeSensitive } = classified;

  // 2. Build learner adaptation
  const adaptation = buildAdaptationBlock(learner);

  const normalizedQ = normalizeQuery(question);

  // 3. Check cache (skip for time-sensitive or always-fresh intents)
  let cacheHit = false;
  let webSources: KnowledgeSource[] = [];

  if (!timeSensitive && !forceWeb) {
    const cached = await getCached(supabase, normalizedQ, language, intent);
    if (cached) {
      cacheHit = true;

      // Trigger article generation if this topic is frequently searched
      if (shouldGenerateArticle(cached) && cached.sources.length > 0) {
        void maybeGenerateArticle(
          supabase, normalizedQ, intent, language,
          cached.sources, cached.confidence,
        );
      }

      // Build result from cache
      webSources = cached.sources;
      const knowledgeBlock = buildKnowledgeBlock(
        { storyContext: null, curriculumContent: null, knowledgeGraph: null, conversationCtx: null, nimipikArticle: cached.aiSummary, confidence: cached.confidence },
        webSources,
        intent,
        adaptation,
        role,
      );

      return {
        intent,
        intentConfidence,
        knowledgeBlock,
        sources:            webSources,
        usedWebSearch:      false,
        cacheHit:           true,
        internalSufficient: true,
        confidence:         cached.confidence,
        attributionBlock:   buildAttributionBlock(webSources, true, intent, role),
        adaptedSummary:     cached.aiSummary,
      };
    }
  }

  // 4. Retrieve internal knowledge (always)
  const internal = await retrieveInternal(
    supabase, question, intent,
    learner.childId, language, storyId ?? null,
  );

  // 5. Decide whether to web-search
  const canWebSearch  = !INTERNAL_ONLY_INTENTS.has(intent);
  const shouldSearch  = forceWeb
    || timeSensitive
    || (needsWeb && canWebSearch && internal.confidence < WEB_SEARCH_THRESHOLD);

  let usedWebSearch      = false;
  let internalSufficient = !shouldSearch;

  if (shouldSearch) {
    const targetAge = learner.age ?? 8;
    webSources = await searchWeb(question, intent, language, targetAge, maxSources);
    usedWebSearch = webSources.length > 0;

    // Cache result (non-blocking)
    if (webSources.length > 0) {
      void setCached(
        supabase, normalizedQ, intent, language,
        webSources, null,
        Math.min(0.9, internal.confidence + (webSources.length > 0 ? 0.2 : 0)),
      );
    }

    // Auto-article seeding if we got good coverage
    const avgAuthority = webSources.reduce((s, w) => s + w.authority, 0) / (webSources.length || 1);
    if (webSources.length >= 3 && avgAuthority >= 0.7) {
      void maybeGenerateArticle(
        supabase, normalizedQ, intent, language,
        webSources, avgAuthority,
      );
    }
  }

  const overallConfidence = Math.min(0.95,
    internal.confidence * 0.6 +
    (webSources.length > 0 ? 0.35 : 0) +
    intentConfidence * 0.05
  );

  const knowledgeBlock = buildKnowledgeBlock(
    internal, webSources, intent, adaptation, role,
  );

  return {
    intent,
    intentConfidence,
    knowledgeBlock,
    sources:            [...webSources],
    usedWebSearch,
    cacheHit:           false,
    internalSufficient,
    confidence:         overallConfidence,
    attributionBlock:   buildAttributionBlock(webSources, false, intent, role),
    adaptedSummary:     null,
  };
}
