// lib/knowledgeRouter/types.ts
//
// Shared types for the Knowledge Router system.
// Every router module imports from here — no circular deps.

// ── Intent ────────────────────────────────────────────────────────────────────

export type KnowledgeIntent =
  | 'story_question'
  | 'vocabulary'
  | 'reading_help'
  | 'homework'
  | 'lesson_planning'
  | 'parent_guidance'
  | 'teacher_support'
  | 'general_knowledge'
  | 'current_events'
  | 'science'
  | 'history'
  | 'math'
  | 'health'
  | 'technology'
  | 'programming'
  | 'news'
  | 'weather'
  | 'translation'
  | 'creative_writing'
  | 'conversation';

// ── Source authority tiers ─────────────────────────────────────────────────────

export type SourceTier =
  | 'government_education'  // .gov/.edu portals, UNESCO, WHO, UNICEF, NASA, Smithsonian
  | 'recognized_educational' // Khan Academy, National Geographic, official docs
  | 'trusted_reference'      // Wikipedia, verified publishers, peer-review abstracts
  | 'quality_web'            // High-quality general sites
  | 'general_web';           // Everything else

export const TIER_AUTHORITY: Record<SourceTier, number> = {
  government_education:   1.00,
  recognized_educational: 0.85,
  trusted_reference:      0.70,
  quality_web:            0.55,
  general_web:            0.35,
};

// ── Knowledge Source ──────────────────────────────────────────────────────────

export interface KnowledgeSource {
  url:             string;
  title:           string;
  snippet:         string;        // extracted text relevant to the query
  sourceType:      'internal' | 'web' | 'nimipiko_article';
  tier:            SourceTier;
  authority:       number;        // 0–1
  freshness:       number;        // 0–1 (1 = just retrieved / just published)
  educationalValue: number;       // 0–1
  safety:          number;        // 0–1 (1 = fully safe for target age)
  readingLevel:    number;        // approximate grade level
  language:        string;
  reliability:     number;        // 0–1
  relevance:       number;        // 0–1 (how well does it answer the query)
  retrievedAt:     string;        // ISO string
  cacheStatus:     'live' | 'cached' | 'internal';
  reasonSelected:  string;        // human-readable justification
}

// ── Internal Knowledge (from platform sources) ────────────────────────────────

export interface InternalKnowledge {
  storyContext:      string | null;   // from storyKnowledgeEngine
  curriculumContent: string | null;   // from curriculumKnowledge
  knowledgeGraph:    string | null;   // from learnerKnowledgeGraph
  conversationCtx:   string | null;   // from conversationMemory
  nimipikArticle:    string | null;   // from nimipiko_knowledge_articles
  confidence:        number;          // 0–1 — how well internal sources cover the query
}

// ── Learner Profile (subset needed by router) ─────────────────────────────────

export interface RouterLearnerProfile {
  childId:       string | null;
  childName:     string;
  age:           number | null;        // years
  readingLevel:  number | null;        // grade equivalent (1–12)
  language:      string;
  role:          'child' | 'parent' | 'teacher';
}

// ── Router Request ────────────────────────────────────────────────────────────

export interface RouterRequest {
  question:      string;               // the last user message or AI task description
  context?:      string;               // optional extra context (story title, current lesson…)
  learner:       RouterLearnerProfile;
  storyId?:      string | null;
  forceWeb?:     boolean;              // override internal-first heuristic
  maxSources?:   number;               // max web sources to inject (default 3)
}

// ── Router Result ─────────────────────────────────────────────────────────────

export interface RouterResult {
  intent:              KnowledgeIntent;
  intentConfidence:    number;          // 0–1
  knowledgeBlock:      string;          // ready-to-inject text block for the AI prompt
  sources:             KnowledgeSource[];
  usedWebSearch:       boolean;
  cacheHit:            boolean;
  internalSufficient:  boolean;         // true = web search was skipped because internal was enough
  confidence:          number;          // overall knowledge confidence (0–1)
  attributionBlock:    string;          // for parent/teacher mode: readable source attribution
  adaptedSummary:      string | null;   // age-adapted explanation (set when web knowledge was retrieved)
}

// ── Cache Entry ───────────────────────────────────────────────────────────────

export interface CacheEntry {
  id:              string;
  intent:          KnowledgeIntent;
  sources:         KnowledgeSource[];
  aiSummary:       string | null;
  confidence:      number;
  searchCount:     number;
  expiresAt:       string;
}

// ── TTL policy (seconds) by intent ───────────────────────────────────────────

export const CACHE_TTL_SECONDS: Record<KnowledgeIntent, number> = {
  weather:          6  * 3600,
  news:             6  * 3600,
  current_events:   6  * 3600,
  health:           24 * 3600,
  science:          7  * 86400,
  technology:       7  * 86400,
  history:          30 * 86400,
  math:             30 * 86400,
  general_knowledge:14 * 86400,
  parent_guidance:  14 * 86400,
  teacher_support:  14 * 86400,
  lesson_planning:  14 * 86400,
  homework:         7  * 86400,
  programming:      7  * 86400,
  translation:      30 * 86400,
  vocabulary:       30 * 86400,
  reading_help:     30 * 86400,
  creative_writing: 30 * 86400,
  story_question:   0,   // never cached — always internal
  conversation:     0,   // never cached — always real-time
};

// ── Intents that MUST bypass cache and use live search ────────────────────────

export const ALWAYS_FRESH_INTENTS = new Set<KnowledgeIntent>([
  'weather',
  'news',
  'current_events',
]);

// ── Intents that should NEVER trigger web search ──────────────────────────────

export const INTERNAL_ONLY_INTENTS = new Set<KnowledgeIntent>([
  'story_question',
  'vocabulary',
  'reading_help',
  'conversation',
]);

// ── Minimum article trigger threshold ────────────────────────────────────────

export const ARTICLE_GENERATION_THRESHOLD = 10; // searches before auto-article
