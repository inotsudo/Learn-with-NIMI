// ── Intelligence-enhanced Recommendation Engine ───────────────────
// Wraps get_recommendation_candidates RPC with memory-based scoring boosts.
// Client + server compatible.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecommendationCandidate, LearnerMemory } from './types';
import { getMemories } from './memory';

// ── Core ranking ──────────────────────────────────────────────────

export async function getEnhancedRecommendations(
  supabase: SupabaseClient,
  childId:  string,
  limit     = 5
): Promise<RecommendationCandidate[]> {
  // Fetch raw candidates (fetch extra to allow re-ranking to show value)
  const { data, error } = await supabase.rpc('get_recommendation_candidates', {
    p_child_id: childId,
    p_limit:    limit * 2,
  });

  if (error || !data) {
    console.error('[NimiRec] get_recommendation_candidates failed:', error?.message);
    return [];
  }

  const candidates = data as RecommendationCandidate[];
  if (candidates.length === 0) return [];

  // Fetch memory signals for boosting
  const memories = await getMemories(supabase, childId, ['preference', 'struggle']);
  const boosted  = applyMemoryBoosts(candidates, memories);

  return boosted.slice(0, limit);
}

function applyMemoryBoosts(
  candidates: RecommendationCandidate[],
  memories:   LearnerMemory[]
): RecommendationCandidate[] {
  const favTypeMemory = memories.find(m => m.key === 'favorite_mission_type');
  const favType       = favTypeMemory?.value?.type as string | undefined;

  const struggleKeys = new Set(
    memories
      .filter(m => m.memory_type === 'struggle' && m.confidence >= 0.5)
      .map(m => m.key.replace('mission_type_', ''))
  );

  return candidates
    .map(c => {
      let boost = 0;

      // +15 if story contains the learner's favourite mission type
      if (favType && c.mission_types.includes(favType)) boost += 15;

      // +8 if story includes a struggle type (gentle practice nudge)
      if (c.mission_types.some(t => struggleKeys.has(t))) boost += 8;

      // +5 reinforcement bonus — encourage revisiting mastered content
      if (c.reason === 'reinforcement') boost -= 5; // slight demotion (already finished)

      return { ...c, score: c.score + boost };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Human-readable reason strings ────────────────────────────────

export function recommendationLabel(
  c:         RecommendationCandidate,
  childName: string
): string {
  switch (c.reason) {
    case 'in_progress':
      return `${childName} is on mission ${c.missions_done}/${c.total_missions} — keep going!`;
    case 'not_started':
      return `A fresh adventure waiting for ${childName}`;
    case 'reinforcement':
      return `Build mastery — ${childName} knows this one`;
  }
}

// ── Context-aware next-step picker ───────────────────────────────
// Returns the single best next story/mission for the current session.

export async function getNextStep(
  supabase: SupabaseClient,
  childId:  string
): Promise<RecommendationCandidate | null> {
  const recs = await getEnhancedRecommendations(supabase, childId, 1);
  return recs[0] ?? null;
}
