// lib/knowledgeRouter/webSearchRetriever.ts
//
// Live web search via Tavily (primary) or Brave Search (fallback).
// Gracefully returns empty array if no API key is configured.
// Never called unless intentClassifier.needsWeb === true AND internal
// knowledge was insufficient.

import type { KnowledgeIntent } from './types';
import { evaluateSource, filterSources } from './sourceEvaluator';
import type { KnowledgeSource } from './types';

const TAVILY_URL  = 'https://api.tavily.com/search';
const BRAVE_URL   = 'https://api.search.brave.com/res/v1/web/search';

// ── Search depth per intent ────────────────────────────────────────────────────

function searchDepth(intent: KnowledgeIntent): 'basic' | 'advanced' {
  const ADVANCED: Partial<Record<KnowledgeIntent, true>> = {
    science:          true,
    health:           true,
    history:          true,
    homework:         true,
    lesson_planning:  true,
    parent_guidance:  true,
    teacher_support:  true,
    programming:      true,
  };
  return ADVANCED[intent] ? 'advanced' : 'basic';
}

// ── Trusted-domain hint for each intent ──────────────────────────────────────

function trustedDomains(intent: KnowledgeIntent): string[] {
  const map: Partial<Record<KnowledgeIntent, string[]>> = {
    health:           ['who.int', 'cdc.gov', 'nih.gov', 'unicef.org'],
    science:          ['nasa.gov', 'sciencedaily.com', 'nature.com', 'nationalgeographic.com'],
    history:          ['britannica.com', 'history.com', 'smithsonian.com'],
    math:             ['khanacademy.org', 'mathworld.wolfram.com'],
    general_knowledge:['britannica.com', 'khanacademy.org', 'wikipedia.org'],
    homework:         ['khanacademy.org', 'britannica.com', 'scholastic.com'],
    lesson_planning:  ['pbs.org', 'scholastic.com', 'teacherspayteachers.com'],
    parent_guidance:  ['unicef.org', 'pbs.org', 'scholastic.com'],
    current_events:   ['bbc.co.uk', 'npr.org', 'reuters.com', 'apnews.com'],
    news:             ['bbc.co.uk', 'npr.org', 'reuters.com', 'apnews.com'],
  };
  return map[intent] ?? [];
}

// ── Tavily search ─────────────────────────────────────────────────────────────

interface TavilyResult {
  url:              string;
  title:            string;
  content:          string;
  published_date?:  string;
  score:            number;
}

async function searchTavily(
  query:    string,
  intent:   KnowledgeIntent,
  language: string,
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const domains = trustedDomains(intent);

  const resp = await fetch(TAVILY_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      api_key:         apiKey,
      query,
      search_depth:    searchDepth(intent),
      include_answer:  false,
      max_results:     7,
      ...(domains.length > 0 && { include_domains: domains }),
      topic:           intent === 'news' || intent === 'current_events' ? 'news' : 'general',
    }),
    signal: ((): AbortSignal => { const c = new AbortController(); setTimeout(() => c.abort(), 6000); return c.signal; })(),
  });

  if (!resp.ok) return [];
  const data = await resp.json() as { results?: TavilyResult[] };
  return data.results ?? [];
}

// ── Brave Search fallback ─────────────────────────────────────────────────────

interface BraveWebResult {
  url:         string;
  title:       string;
  description: string;
  age?:        string;
}

async function searchBrave(
  query:    string,
  intent:   KnowledgeIntent,
): Promise<TavilyResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const freshness = intent === 'weather' || intent === 'news' || intent === 'current_events'
    ? 'pd' // past day
    : undefined;

  const params = new URLSearchParams({ q: query, count: '7' });
  if (freshness) params.set('freshness', freshness);

  const resp = await fetch(`${BRAVE_URL}?${params.toString()}`, {
    headers: {
      'Accept':                'application/json',
      'X-Subscription-Token':  apiKey,
    },
    signal: ((): AbortSignal => { const c = new AbortController(); setTimeout(() => c.abort(), 6000); return c.signal; })(),
  });

  if (!resp.ok) return [];
  const data = await resp.json() as { web?: { results?: BraveWebResult[] } };
  const results = data.web?.results ?? [];

  return results.map(r => ({
    url:     r.url,
    title:   r.title,
    content: r.description ?? '',
    score:   0.5,
    published_date: r.age,
  }));
}

// ── Query enhancement per intent ──────────────────────────────────────────────

function enhanceQuery(query: string, intent: KnowledgeIntent, language: string): string {
  const qualifiers: Partial<Record<KnowledgeIntent, string>> = {
    health:           'for children health education',
    science:          'educational explanation for kids',
    history:          'educational overview',
    math:             'math explanation for students',
    homework:         'homework help explanation',
    parent_guidance:  'parenting advice children',
    teacher_support:  'teaching resources classroom',
    lesson_planning:  'lesson plan classroom',
    general_knowledge:'educational explanation',
    technology:       'how it works educational',
    programming:      'programming tutorial beginner',
  };
  const lang = language === 'fr' ? 'en français ' : language === 'rw' ? 'en Kinyarwanda ' : '';
  const qual = qualifiers[intent] ?? '';
  return `${query} ${lang}${qual}`.trim();
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function searchWeb(
  query:      string,
  intent:     KnowledgeIntent,
  language:   string,
  targetAge:  number,
  maxSources: number,
): Promise<KnowledgeSource[]> {
  const enhanced = enhanceQuery(query, intent, language);

  // Try Tavily first, fall back to Brave
  let rawResults: TavilyResult[] = [];
  try {
    rawResults = await searchTavily(enhanced, intent, language);
  } catch {
    // silent — try Brave
  }

  if (rawResults.length === 0) {
    try {
      rawResults = await searchBrave(enhanced, intent);
    } catch {
      return [];
    }
  }

  const evaluated = rawResults.map(r =>
    evaluateSource(
      { url: r.url, title: r.title, snippet: r.content, publishedDate: r.published_date },
      query,
      targetAge,
      language,
    )
  );

  return filterSources(evaluated, targetAge, maxSources);
}
