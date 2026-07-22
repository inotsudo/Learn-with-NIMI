// lib/knowledgeRouter/sourceEvaluator.ts
//
// Evaluates authority, safety, freshness, and educational value of web sources.
// Pure functions — no I/O, no DB.

import type { SourceTier, KnowledgeSource } from './types';
import { TIER_AUTHORITY } from './types';

// ── Domain → tier map ─────────────────────────────────────────────────────────

const DOMAIN_TIERS: Array<{ pattern: RegExp; tier: SourceTier }> = [
  // Tier 1: Government education / international orgs
  { pattern: /\.(gov|edu)\b/i,                  tier: 'government_education' },
  { pattern: /\bunesco\.org\b/i,                 tier: 'government_education' },
  { pattern: /\bwho\.int\b/i,                    tier: 'government_education' },
  { pattern: /\bunicef\.org\b/i,                 tier: 'government_education' },
  { pattern: /\bnasa\.gov\b/i,                   tier: 'government_education' },
  { pattern: /\bsmithsonian\.(com|org|edu)\b/i,  tier: 'government_education' },
  { pattern: /\bcdc\.gov\b/i,                    tier: 'government_education' },
  { pattern: /\bnih\.gov\b/i,                    tier: 'government_education' },
  { pattern: /\bworldbank\.org\b/i,              tier: 'government_education' },

  // Tier 2: Recognized educational publishers
  { pattern: /\bkhanacademy\.org\b/i,            tier: 'recognized_educational' },
  { pattern: /\bnationalgeographic\.(com|org)\b/i, tier: 'recognized_educational' },
  { pattern: /\bbrainly\.(com|co)\b/i,           tier: 'recognized_educational' },
  { pattern: /\bbritannica\.com\b/i,             tier: 'recognized_educational' },
  { pattern: /\bscholastic\.com\b/i,             tier: 'recognized_educational' },
  { pattern: /\bpbs\.org\b/i,                    tier: 'recognized_educational' },
  { pattern: /\bbbcgoodfood\b/i,                 tier: 'recognized_educational' },
  { pattern: /\bbbc\.co\.(uk|com)\b/i,           tier: 'recognized_educational' },
  { pattern: /\bnpr\.org\b/i,                    tier: 'recognized_educational' },
  { pattern: /\bsciencenews\.(org|com)\b/i,      tier: 'recognized_educational' },
  { pattern: /\bsciencedaily\.com\b/i,           tier: 'recognized_educational' },
  { pattern: /\bpubmed\.ncbi\.nlm\.nih\.gov\b/i, tier: 'recognized_educational' },
  { pattern: /\bnature\.com\b/i,                 tier: 'recognized_educational' },

  // Tier 3: Trusted reference
  { pattern: /\bwikipedia\.org\b/i,              tier: 'trusted_reference' },
  { pattern: /\bwikipedia\b/i,                   tier: 'trusted_reference' },
  { pattern: /\bmerriam-webster\.com\b/i,        tier: 'trusted_reference' },
  { pattern: /\bdictionary\.com\b/i,             tier: 'trusted_reference' },
  { pattern: /\bhistory\.com\b/i,                tier: 'trusted_reference' },

  // Tier 4: Quality web — major journalism & trusted reference
  { pattern: /\breuters\.com\b/i,                tier: 'quality_web' },
  { pattern: /\bapnews\.com\b/i,                 tier: 'quality_web' },
  { pattern: /\btheguardian\.com\b/i,            tier: 'quality_web' },
  { pattern: /\bwashingtonpost\.com\b/i,         tier: 'quality_web' },
  { pattern: /\bnytimes\.com\b/i,                tier: 'quality_web' },
  { pattern: /\btime\.com\b/i,                   tier: 'quality_web' },
  { pattern: /\batlas-obscura\.com\b/i,          tier: 'quality_web' },
  { pattern: /\bhowstuffworks\.com\b/i,          tier: 'quality_web' },
];

function classifyDomain(url: string): SourceTier {
  for (const { pattern, tier } of DOMAIN_TIERS) {
    if (pattern.test(url)) return tier;
  }
  return 'general_web';
}

// ── Unsafe content signals ────────────────────────────────────────────────────

const UNSAFE_PATTERNS = [
  /\bviolence\b/i, /\bweapon\b/i, /\bdrug\b/i, /\balcohol\b/i,
  /\bporn\b/i,     /\bsex\b/i,   /\bgambl\b/i, /\bhate\b.*\bgroup\b/i,
  /\bsuicid\b/i,   /\bself[-\s]harm\b/i, /\bkill\b.*\bpeople\b/i,
];

const LOW_QUALITY_SIGNALS = [
  /\bclickbait\b/i, /\byou won['']?t believe\b/i,
  /\bshocking\b/i,  /\bsecret\b.*\bthey\b.*\bdon['']?t want\b/i,
];

// ── Reading level estimate ─────────────────────────────────────────────────────

function estimateReadingLevel(text: string): number {
  if (!text || text.length < 20) return 8; // default mid-school
  const words     = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordLen    = words.reduce((s, w) => s + w.replace(/\W/g, '').length, 0) / (words.length || 1);
  const avgSentLen    = words.length / (sentences.length || 1);
  // Simplified Flesch-Kincaid grade level
  const grade = 0.39 * avgSentLen + 11.8 * (avgWordLen / 4.5) - 15.59;
  return Math.max(1, Math.min(16, Math.round(grade)));
}

// ── Freshness ─────────────────────────────────────────────────────────────────

function computeFreshness(publishedDate?: string): number {
  if (!publishedDate) return 0.6; // unknown = moderate
  const ageDays = (Date.now() - new Date(publishedDate).getTime()) / 86400000;
  if (ageDays <= 1)   return 1.0;
  if (ageDays <= 7)   return 0.90;
  if (ageDays <= 30)  return 0.75;
  if (ageDays <= 180) return 0.60;
  if (ageDays <= 365) return 0.45;
  return 0.30;
}

// ── Educational value ─────────────────────────────────────────────────────────

const EDU_SIGNALS = [
  /\b(learn|teach|educat|explain|understand|how to|why|what is|definition)\b/i,
  /\b(student|teacher|classroom|school|curriculum|lesson|academic)\b/i,
  /\b(research|study|experiment|discover|science|history|math)\b/i,
];

function computeEducationalValue(snippet: string, tier: SourceTier): number {
  let base = TIER_AUTHORITY[tier] * 0.7;
  let hits = 0;
  for (const pat of EDU_SIGNALS) {
    if (pat.test(snippet)) hits++;
  }
  base += (hits / EDU_SIGNALS.length) * 0.3;
  return Math.min(1, base);
}

// ── Safety score ──────────────────────────────────────────────────────────────

function computeSafety(snippet: string, url: string, targetAge: number): number {
  let safety = 1.0;

  for (const pat of UNSAFE_PATTERNS) {
    if (pat.test(snippet) || pat.test(url)) {
      safety -= 0.4;
    }
  }
  for (const pat of LOW_QUALITY_SIGNALS) {
    if (pat.test(snippet)) safety -= 0.2;
  }

  // Very young children — tighter threshold
  if (targetAge <= 5 && safety < 0.8) safety -= 0.2;

  return Math.max(0, Math.min(1, safety));
}

// ── Relevance ─────────────────────────────────────────────────────────────────

function computeRelevance(snippet: string, query: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (queryWords.length === 0) return 0.5;
  const snip = snippet.toLowerCase();
  const hits = queryWords.filter(w => snip.includes(w)).length;
  return Math.min(1, hits / queryWords.length + 0.2);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface RawWebResult {
  url:           string;
  title:         string;
  snippet:       string;
  publishedDate?: string;
}

export function evaluateSource(
  raw:          RawWebResult,
  query:        string,
  targetAge:    number,
  language:     string,
): KnowledgeSource {
  const tier       = classifyDomain(raw.url);
  const authority  = TIER_AUTHORITY[tier];
  const freshness  = computeFreshness(raw.publishedDate);
  const safety     = computeSafety(raw.snippet, raw.url, targetAge);
  const eduValue   = computeEducationalValue(raw.snippet, tier);
  const readLevel  = estimateReadingLevel(raw.snippet);
  const relevance  = computeRelevance(raw.snippet, query);
  const reliability = Math.min(1, authority * 0.6 + safety * 0.4);

  return {
    url:             raw.url,
    title:           raw.title,
    snippet:         raw.snippet.slice(0, 600),
    sourceType:      'web',
    tier,
    authority,
    freshness,
    educationalValue: eduValue,
    safety,
    readingLevel:    readLevel,
    language,
    reliability,
    relevance,
    retrievedAt:     new Date().toISOString(),
    cacheStatus:     'live',
    reasonSelected:  buildReasonSelected(tier, relevance, safety),
  };
}

function buildReasonSelected(tier: SourceTier, relevance: number, safety: number): string {
  const tierLabel: Record<SourceTier, string> = {
    government_education:   'Government or accredited educational institution',
    recognized_educational: 'Recognized educational publisher',
    trusted_reference:      'Trusted reference site',
    quality_web:            'Quality web source',
    general_web:            'General web result',
  };
  const parts = [tierLabel[tier]];
  if (relevance >= 0.8) parts.push('highly relevant');
  if (safety >= 0.95) parts.push('age-safe');
  return parts.join(', ');
}

// Filter to only sources safe and relevant enough for the learner
export function filterSources(
  sources:      KnowledgeSource[],
  targetAge:    number,
  maxSources:   number,
): KnowledgeSource[] {
  const safetyThreshold = targetAge <= 5 ? 0.9 : 0.7;
  return sources
    .filter(s => s.safety >= safetyThreshold && s.relevance >= 0.3)
    .sort((a, b) => {
      const scoreA = a.authority * 0.35 + a.relevance * 0.35 + a.safety * 0.20 + a.freshness * 0.10;
      const scoreB = b.authority * 0.35 + b.relevance * 0.35 + b.safety * 0.20 + b.freshness * 0.10;
      return scoreB - scoreA;
    })
    .slice(0, maxSources);
}
