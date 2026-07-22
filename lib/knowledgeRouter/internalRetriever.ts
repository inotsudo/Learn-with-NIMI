// lib/knowledgeRouter/internalRetriever.ts
//
// Retrieves knowledge from all internal Nimipiko sources in priority order.
// Reuses existing services — never duplicates their logic.
//
// Priority:
//   1. Learner Context (active story, curriculum, memories)
//   2. Story Knowledge Base (story_knowledge_cache)
//   3. Curriculum Knowledge
//   4. Learner Knowledge Graph
//   5. Nimipiko Knowledge Articles (approved curated articles)
//
// Returns InternalKnowledge with a confidence score (0–1) indicating
// how well the internal sources answer the question.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { InternalKnowledge, KnowledgeIntent } from './types';
import { SKILL_DEFINITIONS } from '@/lib/curriculumKnowledge';
import type { CurriculumSkill } from '@/lib/curriculumKnowledge';

// ── Story knowledge ───────────────────────────────────────────────────────────

async function fetchStoryKnowledge(
  supabase:  SupabaseClient,
  storyId:   string,
  language:  string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('story_knowledge_cache')
      .select('analysis')
      .eq('story_id', storyId)
      .eq('language', language)
      .single();

    if (!data?.analysis) return null;
    const a = data.analysis as Record<string, unknown>;
    const parts: string[] = [];
    if (Array.isArray(a.themes))     parts.push(`Themes: ${(a.themes as string[]).join(', ')}`);
    if (Array.isArray(a.vocabulary)) parts.push(`Key vocabulary: ${(a.vocabulary as string[]).slice(0, 12).join(', ')}`);
    if (Array.isArray(a.moralLessons)) parts.push(`Moral lessons: ${(a.moralLessons as string[]).join('; ')}`);
    if (a.summary) parts.push(`Summary: ${String(a.summary).slice(0, 300)}`);
    return parts.length > 0 ? parts.join('\n') : null;
  } catch {
    return null;
  }
}

// ── Curriculum knowledge ──────────────────────────────────────────────────────
// Uses the authoritative static SKILL_DEFINITIONS from lib/curriculumKnowledge.ts
// (the real curriculum DB tables are curriculum_levels + curriculum_units, not 'lessons').

const INTENT_SKILL_MAP: Partial<Record<KnowledgeIntent, CurriculumSkill[]>> = {
  vocabulary:       ['vocabulary', 'reading_comprehension'],
  reading_help:     ['reading_comprehension', 'phonics'],
  math:             ['counting', 'patterns', 'shapes'],
  science:          ['nature_science', 'animals'],
  health:           ['health', 'safety'],
  history:          ['geography', 'culture'],
  homework:         ['reading_comprehension', 'vocabulary', 'counting'],
  lesson_planning:  ['empathy', 'kindness', 'friendship', 'problem_solving', 'self_regulation'],
  teacher_support:  ['reading_comprehension', 'vocabulary', 'empathy'],
  parent_guidance:  ['empathy', 'self_regulation', 'family_values'],
  general_knowledge:['nature_science', 'geography', 'culture'],
  technology:       ['nature_science'],
  creative_writing: ['creativity', 'memory'],
};

function fetchCurriculumKnowledge(
  _supabase: SupabaseClient,
  _language: string,
  intent:    KnowledgeIntent,
): string | null {
  const skills = INTENT_SKILL_MAP[intent];
  if (!skills || skills.length === 0) return null;

  const lines = skills
    .filter(s => SKILL_DEFINITIONS[s])
    .slice(0, 3)
    .map(s => {
      const def = SKILL_DEFINITIONS[s];
      const objectives = def.objectives?.slice(0, 2).join('; ') ?? '';
      return `• ${def.label} (${s}): ${objectives}`;
    });

  return lines.length > 0
    ? `Curriculum objectives for this topic:\n${lines.join('\n')}`
    : null;
}

// ── Learner knowledge graph ───────────────────────────────────────────────────

async function fetchKnowledgeGraph(
  supabase: SupabaseClient,
  childId:  string,
  language: string,
  intent:   KnowledgeIntent,
): Promise<string | null> {
  // Only relevant for vocabulary, reading, homework
  const RELEVANT: Partial<Record<KnowledgeIntent, true>> = {
    vocabulary:   true,
    reading_help: true,
    homework:     true,
    story_question: true,
  };
  if (!RELEVANT[intent]) return null;

  try {
    const { data } = await supabase.rpc('get_learner_skill_mastery', {
      p_child_id: childId,
      p_language: language,
    });
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const rows = (data as Array<{ skill_label: string; mastery_level: string; average_confidence: number }>)
      .slice(0, 5)
      .map(r => `${r.skill_label}: ${r.mastery_level} (${Math.round((r.average_confidence ?? 0) * 100)}% confidence)`);

    return `This learner's current skill levels:\n${rows.map(r => `• ${r}`).join('\n')}`;
  } catch {
    return null;
  }
}

// ── Nimipiko knowledge articles ───────────────────────────────────────────────

async function fetchNimipikArticle(
  supabase:  SupabaseClient,
  topic:     string,
  language:  string,
): Promise<string | null> {
  try {
    const { data } = await supabase.rpc('get_nimipiko_article', {
      p_topic:    topic,
      p_language: language,
    });
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as { content: string } | null;
    return row?.content ?? null;
  } catch {
    return null;
  }
}

// ── Conversation memory context ───────────────────────────────────────────────

async function fetchConversationContext(
  supabase: SupabaseClient,
  childId:  string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('conversation_summaries')
      .select('summary, topics_discussed')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(2);

    if (!data || data.length === 0) return null;

    const parts = (data as Array<{ summary: string; topics_discussed?: string[] }>)
      .map(s => s.summary)
      .filter(Boolean)
      .slice(0, 2);

    return parts.length > 0 ? `Recent conversation context:\n${parts.join('\n')}` : null;
  } catch {
    return null;
  }
}

// ── Confidence estimator ──────────────────────────────────────────────────────

function estimateConfidence(sources: (string | null)[], intent: KnowledgeIntent): number {
  const filledCount = sources.filter(Boolean).length;
  const total = sources.length;

  if (filledCount === 0) return 0;

  // For story / vocab questions, internal is always authoritative
  const ALWAYS_SUFFICIENT: Partial<Record<KnowledgeIntent, true>> = {
    story_question:  true,
    vocabulary:      true,
    reading_help:    true,
    conversation:    true,
  };
  if (ALWAYS_SUFFICIENT[intent]) {
    return 0.95;
  }

  // For subject questions, internal coverage is partial
  const BASE: Partial<Record<KnowledgeIntent, number>> = {
    homework:         0.60,
    math:             0.50,
    science:          0.40,
    history:          0.40,
    health:           0.35,
    general_knowledge:0.30,
    current_events:   0.10, // internal almost never sufficient
    weather:          0.00,
    news:             0.00,
  };
  const base = BASE[intent] ?? 0.40;
  // Each extra filled source bumps confidence modestly
  const bonus = ((filledCount - 1) / total) * 0.25;
  return Math.min(0.95, base + bonus);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function retrieveInternal(
  supabase:  SupabaseClient,
  query:     string,
  intent:    KnowledgeIntent,
  childId:   string | null,
  language:  string,
  storyId:   string | null,
): Promise<InternalKnowledge> {
  // Derive topic keyword from the query for article lookup
  const topicKeyword = query
    .replace(/[?!.,;:]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 3)
    .join(' ')
    .toLowerCase();

  const [storyCtx, graphCtx, convCtx, articleCtx] =
    await Promise.allSettled([
      storyId ? fetchStoryKnowledge(supabase, storyId, language) : Promise.resolve(null),
      childId ? fetchKnowledgeGraph(supabase, childId, language, intent) : Promise.resolve(null),
      childId ? fetchConversationContext(supabase, childId) : Promise.resolve(null),
      topicKeyword ? fetchNimipikArticle(supabase, topicKeyword, language) : Promise.resolve(null),
    ]);

  const storyContext      = storyCtx.status  === 'fulfilled' ? storyCtx.value  : null;
  const knowledgeGraph    = graphCtx.status  === 'fulfilled' ? graphCtx.value  : null;
  const conversationCtx   = convCtx.status   === 'fulfilled' ? convCtx.value   : null;
  const nimipikArticle    = articleCtx.status === 'fulfilled' ? articleCtx.value : null;
  const curriculumContent = fetchCurriculumKnowledge(supabase, language, intent);

  const confidence = estimateConfidence(
    [storyContext, curriculumContent, knowledgeGraph, nimipikArticle],
    intent,
  );

  return {
    storyContext,
    curriculumContent,
    knowledgeGraph,
    conversationCtx,
    nimipikArticle,
    confidence,
  };
}
