// ── Universal Recommendation Engine ──────────────────────────────
// Produces ranked UniversalRecommendation[] across ALL content types:
//   story | lesson | coloring | mission | certificate | community | vocab_review
//
// Architecture:
//   - Wraps the existing story-focused lib/recommendations.ts (which calls
//     get_story_recommendations_v2) for story recs — no duplicate scoring.
//   - Adds non-story content types from learner memories + context signals.
//   - Returns a single sorted list the UI can render uniformly.
//
// This is the ONLY place that decides cross-type priority.
// Individual route handlers (quiz-generator, lesson-generator, etc.)
// still generate content; this engine only picks WHAT to offer next.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LearnerMemory,
  LearnerContext,
  UniversalRecommendation,
  UniversalContentType,
} from '@/lib/ai/types';
import { getRecommendations } from '@/lib/recommendations';
import type { SkillMasteryRow, ConceptReviewRow } from '@/lib/learnerKnowledgeGraph';
import {
  buildInProgressEvidence,
  buildLevelUpEvidence,
  buildReviewNeededEvidence,
  buildInterestMatchEvidence,
  buildSkillGapEvidence,
  buildVocabReviewEvidence,
  buildMissionFavouriteEvidence,
  buildMissionStruggleEvidence,
  buildCertificateEvidence,
  buildGenericEvidence,
} from '@/lib/recommendationEvidence';

// ── Story recs (delegates to existing engine) ─────────────────────

async function storyRecs(
  supabase:   SupabaseClient,
  ctx:        LearnerContext,
  language:   string,
  limit:      number,
  quizAccuracy?: number | null,
): Promise<UniversalRecommendation[]> {
  const raw = await getRecommendations(supabase, ctx.child.id, language, limit);
  const childName = ctx.child.name || 'your child';

  return raw.map((r, i) => {
    const reasonKey = r.reasonKey === 'in_progress'   ? 'in_progress'  as const
                    : r.reasonKey === 'review_needed'  ? 'review_needed' as const
                    : r.reasonKey === 'level_up'       ? 'level_up'      as const
                    : r.reasonKey === 'interest_match'  ? 'interest_match' as const
                    : 'new_adventure' as const;

    // Build evidence based on what caused this recommendation
    const evidence = reasonKey === 'in_progress'
      ? buildInProgressEvidence(childName, r.title, r.completionPct ?? 0)
      : reasonKey === 'level_up'
        ? buildLevelUpEvidence(childName, ctx.child.age?.toString() ?? 'unknown', quizAccuracy ?? null)
        : reasonKey === 'review_needed'
          ? buildReviewNeededEvidence(childName, quizAccuracy ?? 0.50, r.title)
          : reasonKey === 'interest_match'
            ? buildInterestMatchEvidence(childName, 'story', 0.70)
            : buildGenericEvidence(childName, STORY_REASON_LABELS['new_adventure']);

    return {
      contentType: 'story' as UniversalContentType,
      id:          r.storyId,
      title:       r.title,
      emoji:       r.themeEmoji ?? '📖',
      reason:      reasonKey,
      reasonLabel: STORY_REASON_LABELS[r.reasonKey] ?? 'Recommended for you',
      priority:    100 + i,
      href:        `/missions?storyId=${r.storyId}`,
      metadata: {
        coverUrl:      r.coverUrl,
        completionPct: r.completionPct,
        isFree:        r.isFree,
        category:      r.category,
      },
      evidence,
    };
  });
}

const STORY_REASON_LABELS: Record<string, string> = {
  in_progress:    'Pick up where you left off',
  level_up:       'Your next adventure',
  review_needed:  'Great for more practice',
  interest_match: 'Matches your favourite type',
  age_match:      'Perfect for your age',
  new_adventure:  'Something new to explore',
};

// ── Mission recs (from activity type preference in memories) ──────

function missionRecs(
  ctx:      LearnerContext,
  memories: LearnerMemory[]
): UniversalRecommendation[] {
  const recs: UniversalRecommendation[] = [];
  const childName = ctx.child.name || 'your child';

  const favType = memories.find(m => m.key === 'favorite_mission_type');
  if (favType?.value?.type) {
    const type = String(favType.value.type);
    recs.push({
      contentType: 'mission',
      id:          `mission-${type}`,
      title:       `${missionLabel(type)} Mission`,
      emoji:       missionEmoji(type),
      reason:      'interest_match',
      reasonLabel: 'Your favourite activity',
      priority:    50,
      href:        `/missions/${type}`,
      metadata:    { missionType: type },
      evidence:    buildMissionFavouriteEvidence(childName, type, favType.confidence),
    });
  }

  const struggle = memories
    .filter(m => m.memory_type === 'struggle' && m.confidence >= 0.5)
    .sort((a, b) => b.confidence - a.confidence)
    .at(0);

  if (struggle) {
    const type = struggle.key.replace('mission_type_', '');
    if (type && type !== favType?.value?.type) {
      recs.push({
        contentType: 'mission',
        id:          `mission-practice-${type}`,
        title:       `Practise ${missionLabel(type)}`,
        emoji:       missionEmoji(type),
        reason:      'review_needed',
        reasonLabel: 'Build your skills here',
        priority:    200,
        href:        `/missions/${type}`,
        metadata:    { missionType: type, isStruggle: true },
        evidence:    buildMissionStruggleEvidence(childName, type, struggle.confidence),
      });
    }
  }

  return recs;
}

function missionLabel(type: string): string {
  const MAP: Record<string, string> = {
    'sing-along':      'Sing-Along',
    'move-and-groove': 'Move & Groove',
    'watch-and-learn': 'Watch & Learn',
    'read-with-me':    'Reading',
    'little-creators': 'Creative',
    'magic-stories':   'Story',
  };
  return MAP[type] ?? type.replace(/-/g, ' ');
}

function missionEmoji(type: string): string {
  const MAP: Record<string, string> = {
    'sing-along':      '🎵',
    'move-and-groove': '🕺',
    'watch-and-learn': '📺',
    'read-with-me':    '📚',
    'little-creators': '🎨',
    'magic-stories':   '✨',
  };
  return MAP[type] ?? '🎯';
}

// ── Vocab review rec ──────────────────────────────────────────────

function vocabRec(
  childName:        string,
  conceptsToReview: ConceptReviewRow[],
): UniversalRecommendation | null {
  const count = conceptsToReview.length;
  if (count < 1) return null;
  return {
    contentType: 'vocab_review',
    id:          'vocab-review',
    title:       `Review ${count} word${count === 1 ? '' : 's'}`,
    emoji:       '📝',
    reason:      'review_needed',
    reasonLabel: 'Words that need a little practice',
    priority:    75,
    href:        '/missions/read-with-me',
    metadata:    { wordCount: count, words: conceptsToReview.slice(0, 3).map(c => c.concept_name) },
    evidence:    buildVocabReviewEvidence(childName, conceptsToReview),
  };
}

// ── Certificate rec ───────────────────────────────────────────────

function certificateRec(
  ctx:      LearnerContext,
  memories: LearnerMemory[]
): UniversalRecommendation | null {
  const childName = ctx.child.name || 'your child';

  const completedToday = ctx.recent_activity.filter(a => {
    const d = new Date(a.completed_at);
    return d.toDateString() === new Date().toDateString();
  });

  const uniqueTypesToday = new Set(completedToday.map(a => a.mission_type));
  const remaining = 8 - uniqueTypesToday.size;

  if (remaining > 0 && remaining <= 3) {
    return {
      contentType: 'certificate',
      id:          'cert-daily-champion',
      title:       'Daily Champion Certificate',
      emoji:       '🏆',
      reason:      'achievement_unlock',
      reasonLabel: `Only ${remaining} more activit${remaining === 1 ? 'y' : 'ies'} away!`,
      priority:    80,
      href:        '/certificates',
      metadata:    { certType: 'daily_champion', remaining },
      evidence:    buildCertificateEvidence(childName, 'daily_champion', remaining),
    };
  }

  if (ctx.stats.streak_days >= 5 && ctx.stats.streak_days < 7) {
    const daysLeft = 7 - ctx.stats.streak_days;
    return {
      contentType: 'certificate',
      id:          'cert-weekly-champion',
      title:       'Weekly Champion Certificate',
      emoji:       '🌟',
      reason:      'achievement_unlock',
      reasonLabel: `${daysLeft} more day${daysLeft === 1 ? '' : 's'} to go!`,
      priority:    85,
      href:        '/certificates',
      metadata:    { certType: 'weekly_champion', daysLeft },
      evidence:    buildCertificateEvidence(childName, 'weekly_champion', daysLeft),
    };
  }

  return null;
}

// ── Community rec ─────────────────────────────────────────────────

function communityRec(
  ctx:      LearnerContext,
  memories: LearnerMemory[]
): UniversalRecommendation | null {
  const isCreative = memories.find(m =>
    m.memory_type === 'personality' && m.key === 'creative' && m.confidence >= 0.7
  );
  if (!isCreative) return null;
  const childName = ctx.child.name || 'your child';

  return {
    contentType: 'community',
    id:          'community-share',
    title:       'Share with the Community',
    emoji:       '🌍',
    reason:      'interest_match',
    reasonLabel: 'Show your creativity',
    priority:    300,
    href:        '/community',
    metadata:    {},
    evidence:    buildMissionFavouriteEvidence(childName, 'creative sharing', isCreative.confidence),
  };
}

function coloringRec(
  ctx:      LearnerContext,
  memories: LearnerMemory[]
): UniversalRecommendation | null {
  const lovesCreating = memories.find(m =>
    m.key === 'favorite_mission_type' && m.value?.type === 'little-creators'
  );
  if (!lovesCreating) return null;
  const childName = ctx.child.name || 'your child';

  return {
    contentType: 'coloring',
    id:          'coloring-activity',
    title:       'Coloring Studio',
    emoji:       '🖍️',
    reason:      'interest_match',
    reasonLabel: 'Your favourite creative activity',
    priority:    150,
    href:        '/missions/little-creators',
    metadata:    {},
    evidence:    buildMissionFavouriteEvidence(childName, 'little creators', lovesCreating.confidence),
  };
}

// ── Skill gap rec (from Global Learner Knowledge Graph) ───────────

/**
 * Surfaces a story recommendation when skill mastery data reveals a specific gap.
 * Example: "Annie has mastered empathy vocabulary but still struggles with sequencing.
 *           Recommend a story that reinforces sequencing while introducing emotional
 *           vocabulary at a medium level."
 *
 * This is the Knowledge Graph's primary contribution to the recommendation engine:
 * reasoning ACROSS stories about WHICH skills need work, not just which story to finish next.
 */
function skillGapRec(
  childName:    string,
  skillMastery: SkillMasteryRow[]
): UniversalRecommendation | null {
  if (skillMastery.length === 0) return null;

  const weakest = skillMastery
    .filter(m => m.concept_count >= 1 && m.mastery_level !== 'strong')
    .at(0);

  if (!weakest) return null;

  const sl        = weakest.curriculum_skill.replace(/_/g, ' ');
  const levelLabel = weakest.mastery_level === 'none'    ? 'just getting started with'
                   : weakest.mastery_level === 'emerging' ? 'still building'
                   : 'developing';

  return {
    contentType: 'story',
    id:          `skill-gap-${weakest.curriculum_skill}`,
    title:       `Stories for ${sl}`,
    emoji:       '🧩',
    reason:      'review_needed',
    reasonLabel: `You're ${levelLabel} ${sl}`,
    priority:    90,
    href:        `/missions?skill=${weakest.curriculum_skill}`,
    metadata: {
      skill:         weakest.curriculum_skill,
      masteryLevel:  weakest.mastery_level,
      avgConfidence: Math.round(weakest.avg_confidence * 100),
    },
    evidence: buildSkillGapEvidence(childName, weakest, skillMastery),
  };
}

// ── Main export ──────────────────────────────────────────────────

export async function getUniversalRecommendations(
  supabase:          SupabaseClient,
  ctx:               LearnerContext,
  memories:          LearnerMemory[],
  language:          string,
  conceptsToReview:  ConceptReviewRow[] = [],
  limit              = 8,
  skillMastery:      SkillMasteryRow[]  = [],
  quizAccuracy?:     number | null,
): Promise<UniversalRecommendation[]> {
  const childName = ctx.child.name || 'your child';

  const [stories] = await Promise.allSettled([
    storyRecs(supabase, ctx, language, Math.min(limit, 4), quizAccuracy),
  ]);

  const all: UniversalRecommendation[] = [];

  if (stories.status === 'fulfilled') all.push(...stories.value);

  all.push(...missionRecs(ctx, memories));

  const vocab = vocabRec(childName, conceptsToReview);
  if (vocab) all.push(vocab);

  const cert = certificateRec(ctx, memories);
  if (cert) all.push(cert);

  const coloring = coloringRec(ctx, memories);
  if (coloring) all.push(coloring);

  const community = communityRec(ctx, memories);
  if (community) all.push(community);

  const gap = skillGapRec(childName, skillMastery);
  if (gap) all.push(gap);

  const seen = new Set<string>();
  return all
    .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}

// ── Format for Nimi system prompt injection ───────────────────────

export function formatRecsForPrompt(recs: UniversalRecommendation[]): string {
  if (recs.length === 0) return '';
  const lines = recs
    .slice(0, 4)
    .map(r => `- ${r.emoji} ${r.title} (${r.reasonLabel})`);
  return `## What's Recommended Next\n${lines.join('\n')}`;
}
