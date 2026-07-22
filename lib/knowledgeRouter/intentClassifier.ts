// lib/knowledgeRouter/intentClassifier.ts
//
// Classifies a user question into a KnowledgeIntent without an LLM call.
// Uses scored keyword/pattern matching — fast, deterministic, edge-safe.
// Returns the best intent + confidence; ambiguous cases get lower confidence.

import type { KnowledgeIntent } from './types';

// ── Signal tables ─────────────────────────────────────────────────────────────

const SIGNALS: Array<{
  intent:   KnowledgeIntent;
  weight:   number;
  patterns: RegExp[];
}> = [
  // Time-sensitive first — highest specificity
  {
    intent: 'weather',
    weight: 1.0,
    patterns: [
      /\bweather\b/i, /\bforecast\b/i, /\btemperature\b/i,
      /\braining\b/i, /\bunning\b/i, /\bsunny\b/i, /\bwindy\b/i,
      /\bcloud\b/i,   /\bhot today\b/i, /\bcold today\b/i,
    ],
  },
  {
    intent: 'news',
    weight: 1.0,
    patterns: [
      /\bnews\b/i, /\bheadlines?\b/i, /\bbreaking\b/i,
      /\btoday['']?s news\b/i, /\blatest\b.*\bnews\b/i,
    ],
  },
  {
    intent: 'current_events',
    weight: 0.95,
    patterns: [
      /\bcurrent events?\b/i,    /\bwhat is happening\b/i,
      /\bwhat['']?s happening\b/i, /\bright now\b/i,
      /\btoday['']?s\b.*\b(event|happening|update)\b/i,
    ],
  },

  // Story / reading — highest internal priority
  {
    intent: 'story_question',
    weight: 1.0,
    patterns: [
      /\b(what|who|where|why|how)\b.{0,40}\b(story|character|happen|next|plot)\b/i,
      /\bwhat happens\b/i,   /\bwho is\b/i,
      /\btell me about\b.{0,30}\bstory\b/i,
      /\bmain character\b/i, /\bend of the story\b/i,
      /\bwhat did .{0,20} do\b/i,
    ],
  },
  {
    intent: 'vocabulary',
    weight: 0.95,
    patterns: [
      /\bwhat does .{1,30} mean\b/i,
      /\bdefine\b/i,   /\bdefinition\b/i,
      /\bmeaning of\b/i, /\bsynonym\b/i, /\bantonym\b/i,
      /\bhow do you spell\b/i, /\bspelling of\b/i,
      /\bword for\b/i, /\bwhat['']?s another word\b/i,
    ],
  },
  {
    intent: 'reading_help',
    weight: 0.90,
    patterns: [
      /\bhelp me read\b/i, /\bcan['']?t read\b/i,
      /\bhard to understand\b/i, /\bdon['']?t understand\b/i,
      /\bwhat does this page say\b/i, /\bread this\b/i,
      /\bsound out\b/i, /\bphonics\b/i,
    ],
  },

  // Homework / lesson
  {
    intent: 'homework',
    weight: 0.95,
    patterns: [
      /\bhomework\b/i,    /\bassignment\b/i,
      /\bfor school\b/i,  /\bmy teacher\b/i,
      /\bdue\b.{0,20}\bschool\b/i,
      /\btest\b.*\btomorrow\b/i, /\bexam\b/i,
      /\bworksheet\b/i,
    ],
  },
  {
    intent: 'lesson_planning',
    weight: 0.95,
    patterns: [
      /\blesson plan\b/i,     /\bunit plan\b/i,
      /\bcurriculum\b/i,     /\blearning objective\b/i,
      /\bteaching strategy\b/i, /\bclassroom activity\b/i,
      /\bhow to teach\b/i,   /\bfor my class\b/i,
    ],
  },

  // Parent / teacher guidance
  {
    intent: 'parent_guidance',
    weight: 0.90,
    patterns: [
      /\bmy child\b/i,     /\bmy (son|daughter|kid)\b/i,
      /\bparent\b.*(tip|advice|help|guide)\b/i,
      /\bhow do i (help|support|encourage)\b.{0,20}\b(my|child)\b/i,
      /\bscreen time\b/i,  /\bbedtime\b/i,
      /\bchild development\b/i,
    ],
  },
  {
    intent: 'teacher_support',
    weight: 0.90,
    patterns: [
      /\bfor my students?\b/i, /\bin my classroom\b/i,
      /\bteacher resource\b/i, /\bteaching tool\b/i,
      /\bpedagog\b/i,          /\bdifferentiat\b/i,
      /\blearning outcome\b/i,
    ],
  },

  // Subjects
  {
    intent: 'math',
    weight: 0.90,
    patterns: [
      /\bmath\b/i, /\bmathematics\b/i,
      /\b\d+\s*[\+\-\×\÷\*\/]\s*\d+\b/,   // arithmetic expression
      /\bhow (many|much|old)\b.*\d/i,
      /\bcalculat\b/i,  /\bsolve\b/i,
      /\bequation\b/i,  /\bfraction\b/i,
      /\bgeometry\b/i,  /\balgeb\b/i,
      /\bnumber\b.*\b(pattern|sequence)\b/i,
    ],
  },
  {
    intent: 'science',
    weight: 0.85,
    patterns: [
      /\bscience\b/i,   /\bscientific\b/i,
      /\bhow do(es)? (animals?|plants?|trees?|stars?|planets?|birds?|fish|insects?|humans?)\b/i,
      /\bwhy do(es)?\b.{0,50}\b(grow|fly|swim|live|die|change|work|form|happen|cause|make)\b/i,
      /\bwhy (is|are) (the )?(sky|sun|moon|rain|snow|cloud|leaf|leaves|sea|ocean)\b/i,
      /\bwhat causes\b/i, /\bhow (is|are).{0,30}\b(made|formed|created)\b/i,
      /\bbiology\b/i,   /\bchemistry\b/i,
      /\bphysics\b/i,   /\becolog\b/i,
      /\bspace\b/i,     /\buniverse\b/i,
      /\bsolar system\b/i, /\bplanet\b/i,
      /\bdinosaur\b/i,  /\bevolution\b/i,
      /\bexperiment\b/i,
      /\bphotosynthes\b/i, /\bgravity\b/i,
      /\bweather\b.*\bwhy\b|\bwhy\b.*\bweather\b/i,
      /\bvolcano\b/i, /\bearthquake\b/i, /\btornado\b/i,
    ],
  },
  {
    intent: 'history',
    weight: 0.85,
    patterns: [
      /\bhistory\b/i,  /\bhistorical\b/i,
      /\bwhen was\b.*\binvented\b/i,
      /\bwho (was|were)\b.{0,20}\b(president|king|queen|leader|inventor)\b/i,
      /\bworld war\b/i, /\bancient\b/i,
      /\bcivilization\b/i, /\bgeograph\b/i,
      /\bcontinent\b/i, /\bcountry\b.*\bfound\b/i,
      /\bwhen did\b/i,  /\bfirst person to\b/i,
    ],
  },
  {
    intent: 'health',
    weight: 0.85,
    patterns: [
      /\bhealth\b/i,  /\bhealthy\b/i,
      /\bnutrition\b/i, /\bfood\b.*(good|bad)\b/i,
      /\bexercise\b/i, /\bvitamin\b/i,
      /\bvaccine\b/i,  /\bgerm\b/i,
      /\bvirus\b/i,    /\bbacter\b/i,
      /\bbody\b.*(work|function)\b/i,
    ],
  },
  {
    intent: 'technology',
    weight: 0.80,
    patterns: [
      /\btechnology\b/i, /\bhow does .{0,30} work\b/i,
      /\binternet\b/i,   /\bcomputer\b/i,
      /\brobots?\b/i,    /\bartificial intelligence\b/i,
      /\bai\b/i,         /\bmachine learning\b/i,
      /\bapp\b.*\b(works?|made)\b/i,
    ],
  },
  {
    intent: 'programming',
    weight: 0.90,
    patterns: [
      /\bprogramming\b/i, /\bcoding?\b/i,
      /\bpython\b/i, /\bjavascript\b/i,
      /\bhtml\b/i,   /\bcss\b/i,
      /\bfunction\b.*\b(code|program)\b/i,
      /\bdebugg\b/i, /\bcompil\b/i,
      /\balgorithm\b/i,
    ],
  },
  {
    intent: 'translation',
    weight: 0.95,
    patterns: [
      /\btranslate\b/i,         /\bhow do you say\b/i,
      /\bin (french|kinyarwanda|spanish|swahili|arabic)\b/i,
      /\b(french|kinyarwanda|spanish|swahili) (word|for|translation)\b/i,
      /\bwhat does .{1,30} mean in\b/i,
    ],
  },
  {
    intent: 'creative_writing',
    weight: 0.80,
    patterns: [
      /\bwrite (a|me) (story|poem|song|letter)\b/i,
      /\bcreate a story\b/i, /\bmake up\b/i,
      /\bimagine\b/i, /\bonce upon a time\b/i,
      /\bpoem\b/i,    /\brhyme\b/i,
    ],
  },
  {
    intent: 'conversation',
    weight: 0.60,
    patterns: [
      /^(hi|hello|hey|hey nimi)\b/i,
      /\bhow are you\b/i,
      /\bwhat['']?s your (name|favorite)\b/i,
      /\btell me a joke\b/i,
      /\blet['']?s (play|chat|talk)\b/i,
    ],
  },
  {
    intent: 'general_knowledge',
    weight: 0.50,
    patterns: [
      /\bwhat is\b/i,   /\bwhat are\b/i,
      /\bwhy is\b/i,    /\bwhy are\b/i,
      /\bwhy do\b/i,    /\bwhy does\b/i,
      /\bhow does\b/i,  /\bhow do\b/i,
      /\bhow come\b/i,  /\bwhat causes\b/i,
      /\btell me about\b/i, /\bexplain\b/i,
      /\bwhere does\b/i, /\bwho invented\b/i,
      /\bwhat happens\b.{0,20}\bwhen\b/i,
    ],
  },
];

// ── Scoring ───────────────────────────────────────────────────────────────────

function score(question: string): Array<{ intent: KnowledgeIntent; score: number }> {
  const scores = new Map<KnowledgeIntent, number>();

  for (const sig of SIGNALS) {
    let hits = 0;
    for (const pat of sig.patterns) {
      if (pat.test(question)) hits++;
    }
    if (hits > 0) {
      const raw = Math.min(1, hits / sig.patterns.length + 0.4) * sig.weight;
      scores.set(sig.intent, Math.max(scores.get(sig.intent) ?? 0, raw));
    }
  }

  return [...scores.entries()]
    .map(([intent, s]) => ({ intent, score: s }))
    .sort((a, b) => b.score - a.score);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface ClassifiedIntent {
  intent:      KnowledgeIntent;
  confidence:  number;
  needsWeb:    boolean;   // true if this intent should trigger web search
  timeSensitive: boolean; // true if cache must be bypassed
}

export function classifyIntent(
  question: string,
  context?: string,   // e.g. "currently reading story XYZ"
): ClassifiedIntent {
  const combined = context ? `${question} ${context}` : question;
  const results  = score(combined);

  // Default — general conversation
  if (results.length === 0) {
    return { intent: 'conversation', confidence: 0.5, needsWeb: false, timeSensitive: false };
  }

  const top = results[0];
  const second = results[1];

  // Ambiguous if second candidate is close
  const confidence = second
    ? top.score - (top.score - second.score) * 0.4
    : top.score;

  const WEB_INTENTS = new Set<KnowledgeIntent>([
    'weather', 'news', 'current_events', 'homework', 'science',
    'history', 'math', 'health', 'technology', 'programming',
    'general_knowledge', 'parent_guidance', 'teacher_support',
    'lesson_planning', 'translation',
  ]);

  const TIME_SENSITIVE = new Set<KnowledgeIntent>([
    'weather', 'news', 'current_events',
  ]);

  return {
    intent:        top.intent,
    confidence:    Math.min(0.99, confidence),
    needsWeb:      WEB_INTENTS.has(top.intent),
    timeSensitive: TIME_SENSITIVE.has(top.intent),
  };
}
