// lib/recommendationEvidence.ts
//
// Pure functions that build RecommendationEvidence objects from learner signals.
//
// Design principle: every recommendation Nimi or the app makes must be
// explainable from first principles — no "black box" labels. This module
// converts the structured data already computed by the recommendation engine
// (skill mastery rows, spaced repetition snapshots, quiz accuracy, memories)
// into two plain-language explanations:
//
//   parentSentence  — warm, uses the child's name, 1–2 sentences
//   teacherNotes    — data-forward, curriculum-framed, structured text
//
// No LLM. No DB. Deterministic. Always accurate — because it reads the
// exact signals that caused each recommendation, not a post-hoc summary.

import type {
  EvidenceSignal,
  CurriculumObjective,
  RecommendationEvidence,
  LearnerMemory,
} from "./ai/types";
import type { SkillMasteryRow, ConceptReviewRow } from "./learnerKnowledgeGraph";
import { SKILL_DEFINITIONS } from "./curriculumKnowledge";
import type { CurriculumSkill } from "./curriculumKnowledge";

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function skillLabel(skill: string): string {
  return SKILL_DEFINITIONS[skill as CurriculumSkill]?.label ?? skill.replace(/_/g, " ");
}

function skillObjective(skill: string): string {
  return SKILL_DEFINITIONS[skill as CurriculumSkill]?.objectives[0] ?? `Develop ${skill.replace(/_/g, " ")} skills`;
}

// ── Story evidence builders ────────────────────────────────────────────────────

/**
 * Evidence for a story recommendation driven by in-progress state.
 * "Annie started this story and has 40% left to complete."
 */
export function buildInProgressEvidence(
  childName:      string,
  storyTitle:     string,
  completionPct:  number,
): RecommendationEvidence {
  const done    = Math.round(completionPct);
  const remain  = 100 - done;
  const signal: EvidenceSignal = {
    type:     'in_progress',
    label:    'Story in progress',
    detail:   `${done}% of activities completed — ${remain}% remaining`,
    strength: done > 50 ? 'strong' : 'moderate',
  };

  return {
    signals:         [signal],
    curriculumGoals: [],
    parentSentence:  `${childName} started "${storyTitle}" and has completed ${done}% of the activities. Returning to a story they've begun helps ideas stick much better than starting something new.`,
    teacherNotes:    `Signal: story_in_progress\nCompletion: ${done}%\nPedagogy: spaced re-engagement with familiar content strengthens comprehension retention. Re-entering a partially completed story activates prior learning and reduces cognitive load on new concepts.`,
    dataSourcesUsed: ['story_knowledge'],
  };
}

/**
 * Evidence for a story recommended because the child's reading level advanced.
 */
export function buildLevelUpEvidence(
  childName:    string,
  readingLevel: string,
  accuracy:     number | null,
): RecommendationEvidence {
  const signals: EvidenceSignal[] = [{
    type:     'level_progression',
    label:    'Reading level advanced',
    detail:   `Current level: ${readingLevel}${accuracy !== null ? `, calibrated from quiz accuracy: ${pct(accuracy)}` : ''}`,
    strength: 'strong',
  }];

  const sources: RecommendationEvidence['dataSourcesUsed'] = ['learning_profile'];
  if (accuracy !== null) sources.push('quiz_history');

  return {
    signals,
    curriculumGoals: [],
    parentSentence:  `${childName}'s reading level has advanced to "${readingLevel}". This story is matched to their new level and gives them a chance to build on their growing skills.`,
    teacherNotes:    `Signal: level_progression\nReading level: ${readingLevel}${accuracy !== null ? `\nCalibration source: quiz accuracy (${pct(accuracy)}), ≥5 quiz answers` : ''}\nMethod: quiz-adaptive calibration in lib/adaptiveLearning.ts — accuracy ≥80% triggers upgradeOnce(), <50% triggers downgradeOnce().`,
    dataSourcesUsed: sources,
  };
}

/**
 * Evidence for a story recommended because quiz accuracy flagged need for review.
 */
export function buildReviewNeededEvidence(
  childName:   string,
  accuracy:    number,
  storyTitle?: string,
): RecommendationEvidence {
  const pctValue = pct(accuracy);
  const signal: EvidenceSignal = {
    type:     'quiz_performance',
    label:    'Quiz accuracy below threshold',
    detail:   `${pctValue} quiz accuracy — below the 65% threshold for confident progression`,
    strength: accuracy < 0.45 ? 'strong' : 'moderate',
  };

  const subject = storyTitle ? `"${storyTitle}"` : 'this story';

  return {
    signals:         [signal],
    curriculumGoals: [],
    parentSentence:  `${childName} answered ${pctValue} of questions correctly on ${subject}. A story focused on the same skills will help build confidence through more practice.`,
    teacherNotes:    `Signal: quiz_performance\nAccuracy: ${pctValue} (threshold: 65%)\nSource: child_quiz_results (story-scoped, most recent 20 answers)\nAction: lib/adaptiveLearning.ts routes to lower difficulty tier — recommend reinforcement content before progression.`,
    dataSourcesUsed: ['quiz_history'],
  };
}

/**
 * Evidence for a story matched to the child's expressed interests.
 */
export function buildInterestMatchEvidence(
  childName:    string,
  missionType:  string,
  confidence:   number,
): RecommendationEvidence {
  const typeLabel = missionType.replace(/-/g, ' ');
  const signal: EvidenceSignal = {
    type:     'interest_match',
    label:    'Interest match',
    detail:   `Favourite activity type: ${typeLabel} (inferred from ${Math.round(confidence * 100)}% confidence)`,
    strength: confidence >= 0.8 ? 'strong' : 'moderate',
  };

  return {
    signals:         [signal],
    curriculumGoals: [],
    parentSentence:  `${childName} has shown a strong preference for ${typeLabel} activities. This recommendation matches their favourite way to learn.`,
    teacherNotes:    `Signal: interest_match\nSource: learner_memories (memory_type='preference', key='favorite_mission_type')\nConfidence: ${pct(confidence)}\nMethod: Inferred by lib/ai/memory.ts inferFromEvent('mission_completed') — 5+ completions of same type triggers preference memory.`,
    dataSourcesUsed: ['learner_memory'],
  };
}

// ── Skill gap evidence ─────────────────────────────────────────────────────────

/**
 * Evidence for a recommendation driven by a curriculum skill gap.
 * This is the Knowledge Graph's primary contribution to explainability:
 * "Annie has mastered empathy vocabulary but struggles with sequencing."
 */
export function buildSkillGapEvidence(
  childName:    string,
  weakest:      SkillMasteryRow,
  allMastery:   SkillMasteryRow[],
): RecommendationEvidence {
  const sl        = skillLabel(weakest.curriculum_skill);
  const conf      = pct(weakest.avg_confidence);
  const retention = pct(weakest.avg_retention);
  const level     = weakest.mastery_level;

  const signal: EvidenceSignal = {
    type:   'skill_gap',
    label:  'Skill gap detected',
    detail: `${sl}: ${level} mastery (${conf} confidence, ${weakest.concept_count} concept${weakest.concept_count !== 1 ? 's' : ''} tracked)`,
    strength: level === 'none' || level === 'emerging' ? 'strong' : 'moderate',
  };

  // Also surface strong skills for context
  const strongSkills = allMastery
    .filter(m => m.mastery_level === 'strong')
    .map(m => skillLabel(m.curriculum_skill));

  const objective: CurriculumObjective = {
    skill:       weakest.curriculum_skill,
    skillLabel:  sl,
    objective:   skillObjective(weakest.curriculum_skill),
    masteryLevel: level,
    confidence:   weakest.avg_confidence,
  };

  const strongNote = strongSkills.length > 0
    ? `Strong in: ${strongSkills.join(', ')}. `
    : '';

  const needsReviewNote = weakest.needs_review_count > 0
    ? ` ${weakest.needs_review_count} concept${weakest.needs_review_count !== 1 ? 's' : ''} below retention threshold.`
    : '';

  return {
    signals:         [signal],
    curriculumGoals: [objective],
    parentSentence:  `${strongNote}${childName} is still building their ${sl.toLowerCase()} skills — they're at the "${level}" stage. This recommendation targets exactly that skill so they can grow through a story they'll enjoy.`,
    teacherNotes: [
      `Signal: skill_gap`,
      `Source: get_learner_skill_mastery() — Global Learner Knowledge Graph (migration 146)`,
      `Skill: ${sl} (${weakest.curriculum_skill})`,
      `Mastery level: ${level} | Avg confidence: ${conf} | Avg retention: ${retention}`,
      `Concept coverage: ${weakest.concept_count} concepts tracked across all stories${needsReviewNote}`,
      `Curriculum objective: ${skillObjective(weakest.curriculum_skill)}`,
      strongSkills.length > 0 ? `Context: strong skills — ${strongSkills.join(', ')}` : '',
    ].filter(Boolean).join('\n'),
    dataSourcesUsed: ['knowledge_graph'],
  };
}

// ── Spaced repetition evidence ─────────────────────────────────────────────────

/**
 * Evidence for a vocabulary review recommendation.
 * Shows exactly which words are fading and their retention values.
 */
export function buildVocabReviewEvidence(
  childName:        string,
  conceptsToReview: ConceptReviewRow[],
): RecommendationEvidence {
  const top3     = conceptsToReview.slice(0, 3);
  const count    = conceptsToReview.length;
  const wordList = top3.map(c => `"${c.concept_name}"`).join(', ');

  const signals: EvidenceSignal[] = top3.map(c => {
    const days = c.last_correct_at
      ? Math.round((Date.now() - new Date(c.last_correct_at).getTime()) / 86400000)
      : null;
    const daysText = days === null ? 'never reviewed'
      : days === 0 ? 'reviewed today'
      : days === 1 ? '1 day ago'
      : `${days} days ago`;

    return {
      type:     'spaced_repetition',
      label:    'Memory fading',
      detail:   `"${c.concept_name}" — retention: ${pct(c.predicted_retention)}, last correct: ${daysText}`,
      strength: c.predicted_retention < 0.50 ? 'strong' : 'moderate',
    };
  });

  const teacherWordLines = top3.map(c => {
    const days = c.last_correct_at
      ? Math.round((Date.now() - new Date(c.last_correct_at).getTime()) / 86400000)
      : null;
    const skill = c.curriculum_skill ? `  skill: ${skillLabel(c.curriculum_skill)}` : '';
    return [
      `  • "${c.concept_name}"`,
      `    retention: ${pct(c.predicted_retention)} | confidence: ${pct(c.confidence)} | stability: ${c.stability_days.toFixed(1)} days`,
      `    last correct: ${days !== null ? `${days} day${days !== 1 ? 's' : ''} ago` : 'never'} | times seen: ${c.times_seen}`,
      skill,
    ].filter(Boolean).join('\n');
  }).join('\n');

  const parentVocab = top3.length === 1
    ? `the word "${top3[0].concept_name}"`
    : `${wordList} and ${count > 3 ? `${count - 3} more words` : 'other words'}`;

  return {
    signals,
    curriculumGoals: top3
      .filter(c => c.curriculum_skill)
      .map(c => ({
        skill:       c.curriculum_skill!,
        skillLabel:  skillLabel(c.curriculum_skill!),
        objective:   skillObjective(c.curriculum_skill!),
        confidence:  c.confidence,
      })),
    parentSentence: `${childName} learned ${parentVocab} but hasn't used ${count === 1 ? 'it' : 'them'} in a while — the memory is starting to fade. Reading a story with these words will bring them back naturally, without any drilling.`,
    teacherNotes: [
      `Signal: spaced_repetition`,
      `Source: get_concepts_needing_review() — learner_knowledge table (migration 146)`,
      `Model: Ebbinghaus R = e^(-t/S); review threshold: 70%`,
      `Words below threshold (${count} total):`,
      teacherWordLines,
      `Next review window: 1–3 days (based on current stability values)`,
    ].join('\n'),
    dataSourcesUsed: ['knowledge_graph'],
  };
}

// ── Mission evidence ───────────────────────────────────────────────────────────

export function buildMissionFavouriteEvidence(
  childName:   string,
  missionType: string,
  confidence:  number,
): RecommendationEvidence {
  const label = missionType.replace(/-/g, ' ');
  const signal: EvidenceSignal = {
    type:     'interest_match',
    label:    'Favourite activity',
    detail:   `${label} is ${childName}'s most completed activity type (${pct(confidence)} confidence)`,
    strength: confidence >= 0.75 ? 'strong' : 'moderate',
  };

  return {
    signals:         [signal],
    curriculumGoals: [],
    parentSentence:  `${childName} loves ${label} activities! This is the type they return to most. Doing what they enjoy keeps motivation high.`,
    teacherNotes:    `Signal: interest_match\nSource: learner_memories (favorite_mission_type)\nConfidence: ${pct(confidence)}\nEngagement rationale: sustained motivation is a prerequisite for skill acquisition in early learners. High-preference activities reduce cognitive resistance.`,
    dataSourcesUsed: ['learner_memory'],
  };
}

export function buildMissionStruggleEvidence(
  childName:   string,
  missionType: string,
  confidence:  number,
): RecommendationEvidence {
  const label = missionType.replace(/-/g, ' ');
  const signal: EvidenceSignal = {
    type:     'quiz_performance',
    label:    'Needs practice',
    detail:   `${label} activities flagged as a struggle area (${pct(confidence)} confidence)`,
    strength: confidence >= 0.75 ? 'strong' : 'moderate',
  };

  return {
    signals:         [signal],
    curriculumGoals: [],
    parentSentence:  `${label} activities are an area where ${childName} could use a bit more practice. Gentle repetition in a low-stakes setting helps build confidence.`,
    teacherNotes:    `Signal: quiz_performance / struggle\nSource: learner_memories (memory_type='struggle')\nConfidence: ${pct(confidence)}\nMethod: lib/ai/memory.ts inferFromEvent() tracks repeated low-accuracy quiz outcomes per mission type.`,
    dataSourcesUsed: ['learner_memory', 'quiz_history'],
  };
}

// ── Certificate / achievement evidence ────────────────────────────────────────

export function buildCertificateEvidence(
  childName:   string,
  certType:    'daily_champion' | 'weekly_champion',
  remaining:   number,
): RecommendationEvidence {
  const isDaily   = certType === 'daily_champion';
  const goalLabel = isDaily ? 'Daily Champion' : 'Weekly Champion';
  const what      = isDaily ? `${remaining} more activit${remaining === 1 ? 'y' : 'ies'} today` : `${remaining} more day${remaining === 1 ? '' : 's'} in a row`;

  const signal: EvidenceSignal = {
    type:     'achievement_unlock',
    label:    'Certificate within reach',
    detail:   `${goalLabel} certificate — only ${what} away`,
    strength: remaining <= 1 ? 'strong' : 'moderate',
  };

  return {
    signals:         [signal],
    curriculumGoals: [],
    parentSentence:  `${childName} is only ${what} from earning their ${goalLabel} certificate! Completing just one more activity will unlock it.`,
    teacherNotes:    `Signal: achievement_unlock\nCertificate: ${goalLabel}\nRemaining: ${what}\nSource: recent_activity (today's session) + stats.streak_days\nPedagogy: proximal achievement rewards sustain session length without external pressure.`,
    dataSourcesUsed: ['learning_profile'],
  };
}

// ── Generic / fallback evidence ────────────────────────────────────────────────

/**
 * Used when a recommendation is made but no specific learner signal triggered it.
 * This should be rare — most recs have at least one signal.
 */
export function buildGenericEvidence(
  childName: string,
  reason:    string,
): RecommendationEvidence {
  return {
    signals:         [{
      type:     'interest_match',
      label:    'New discovery',
      detail:   reason,
      strength: 'weak',
    }],
    curriculumGoals: [],
    parentSentence:  `This is a new discovery for ${childName} — something they haven't tried yet that fits their age and language level.`,
    teacherNotes:    `Signal: age_match / language_match\nSource: story metadata (age range, language)\nNote: no specific learner signal triggered this recommendation — it is a general match based on profile.`,
    dataSourcesUsed: ['learning_profile'],
  };
}

// ── Formatter for AI context blocks ───────────────────────────────────────────

/**
 * Formats recommendation evidence for injection into a parent-ai or teacher-ai prompt.
 * Used when the AI is asked to explain or comment on a recommendation.
 *
 * For parent-ai: include parentSentence, hide raw numbers
 * For teacher-ai: include teacherNotes, full data
 */
export function formatEvidenceForAI(
  evidence:  RecommendationEvidence,
  role:      'parent' | 'teacher',
  recTitle:  string,
): string {
  if (role === 'parent') {
    return `Recommendation: "${recTitle}"\nWhy: ${evidence.parentSentence}`;
  }

  const goalLines = evidence.curriculumGoals.map(g =>
    `  • ${g.skillLabel}: "${g.objective}"${g.masteryLevel ? ` [${g.masteryLevel}]` : ''}`
  ).join('\n');

  return [
    `Recommendation: "${recTitle}"`,
    evidence.teacherNotes,
    goalLines ? `Curriculum objectives:\n${goalLines}` : '',
    `Data sources: ${evidence.dataSourcesUsed.join(', ')}`,
  ].filter(Boolean).join('\n');
}
