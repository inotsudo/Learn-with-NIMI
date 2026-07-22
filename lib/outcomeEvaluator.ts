// lib/outcomeEvaluator.ts
//
// Recommendation Outcome Evaluator — the feedback loop.
//
// After a learner completes recommended content, this module:
//   1. Fetches actual outcomes (quiz accuracy, vocab mastery, retention)
//   2. Compares to the prediction made at recommendation time
//   3. Computes a success score (0–100) and prediction accuracy (0–1)
//   4. Persists the outcome to recommendation_outcomes
//
// This closes the loop:
//   Prediction → Learner Activity → Outcome → Recommendation Learning
//
// Called from:
//   - lib/ai/memory.ts inferFromEvent('story_finished')
//   - The warm-cache route after story re-analysis
//
// Fire-and-forget safe: errors are logged but never thrown.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SuccessCriterion } from "./learningPrediction";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PendingPrediction {
  prediction_id:              string;
  story_id:                   string | null;
  content_type:               string;
  recommendation_id:          string;
  reason_key:                 string;
  predicted_quiz_accuracy:    number | null;
  predicted_vocab_gains:      string[];
  predicted_skill_gains:      SkillGainRecord[];
  predicted_retention_gains:  RetentionGainRecord[];
  success_criteria:           SuccessCriterion[];
  prediction_confidence:      number;
  created_at:                 string;
}

interface SkillGainRecord {
  skill:          string;
  fromConfidence: number;
  toConfidence:   number;
}

interface RetentionGainRecord {
  word: string;
  from: number;
  to:   number;
}

interface ActualOutcomes {
  quizAccuracy:       number | null;
  vocabMastered:      string[];
  retentionActual:    { word: string; retention: number }[];
  completionMinutes?: number;
}

export interface EvaluationResult {
  successScore:         number;   // 0–100
  predictionAccuracy:   number;   // 0–1
  beatPrediction:       boolean;
  breakdown:            BreakdownItem[];
  summary:              string;
}

interface BreakdownItem {
  metric:       string;
  label:        string;
  predicted:    number;
  actual:       number;
  improvement:  number;   // actual - predicted (positive = exceeded prediction)
  contribution: number;   // how much this contributed to the success score
}

// ── Score computation ─────────────────────────────────────────────────────────

function scoreAgainstCriteria(
  criteria:   SuccessCriterion[],
  actual:     ActualOutcomes,
  prediction: PendingPrediction,
): { score: number; breakdown: BreakdownItem[] } {
  if (criteria.length === 0) return { score: 0, breakdown: [] };

  const breakdown: BreakdownItem[] = [];
  let weightedScore = 0;

  for (const c of criteria) {
    let actualValue  = 0;
    let predictedVal = c.threshold;
    let label        = c.description;

    if (c.metric === 'quiz_accuracy') {
      actualValue  = actual.quizAccuracy ?? 0;
      predictedVal = prediction.predicted_quiz_accuracy ?? c.threshold;
    } else if (c.metric === 'retention_improvement') {
      // Average retention of the predicted vocab words
      if (actual.retentionActual.length > 0) {
        const relevant = actual.retentionActual.filter(r =>
          prediction.predicted_vocab_gains.includes(r.word)
        );
        actualValue = relevant.length > 0
          ? relevant.reduce((acc, r) => acc + r.retention, 0) / relevant.length
          : 0;
        predictedVal = (prediction.predicted_retention_gains as RetentionGainRecord[])
          .filter(g => prediction.predicted_vocab_gains.includes(g.word))
          .reduce((acc, g, _, arr) => acc + g.to / arr.length, 0) || c.threshold;
      }
    } else if (c.metric === 'skill_confidence') {
      // Use quiz accuracy as proxy for skill confidence when no direct measure
      actualValue  = actual.quizAccuracy ?? 0;
      predictedVal = c.threshold;
    } else if (c.metric === 'vocab_mastery') {
      const predicted = prediction.predicted_vocab_gains.length;
      const mastered  = actual.vocabMastered.filter(w =>
        prediction.predicted_vocab_gains.includes(w)
      ).length;
      actualValue  = predicted > 0 ? mastered / predicted : 0;
      predictedVal = c.threshold;
    }

    // Achievement: full credit if actual ≥ threshold, partial otherwise
    const achievement = actualValue >= c.threshold
      ? 1.0
      : actualValue / Math.max(c.threshold, 0.001);

    const contribution = achievement * c.weight;
    weightedScore += contribution;

    breakdown.push({
      metric:       c.metric,
      label,
      predicted:    predictedVal,
      actual:       actualValue,
      improvement:  actualValue - predictedVal,
      contribution: Math.round(contribution * 100),
    });
  }

  return { score: Math.round(weightedScore * 100), breakdown };
}

function computePredictionAccuracy(
  actual:     ActualOutcomes,
  prediction: PendingPrediction,
): number {
  const errors: number[] = [];

  if (actual.quizAccuracy !== null && prediction.predicted_quiz_accuracy !== null) {
    errors.push(Math.abs(actual.quizAccuracy - prediction.predicted_quiz_accuracy));
  }

  const retGains = prediction.predicted_retention_gains as RetentionGainRecord[];
  for (const g of retGains) {
    const found = actual.retentionActual.find(r => r.word === g.word);
    if (found) {
      errors.push(Math.abs(found.retention - g.to));
    }
  }

  if (errors.length === 0) return 0.5; // no measurable comparison
  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
  return Math.max(0, 1 - mae); // higher MAE → lower accuracy score
}

function buildSummary(score: number, childName: string, recTitle: string): string {
  if (score >= 85) return `${childName} exceeded expectations with "${recTitle}" — prediction was accurate.`;
  if (score >= 70) return `"${recTitle}" met its learning goals for ${childName}.`;
  if (score >= 50) return `"${recTitle}" partially met goals for ${childName} — strategy adjustment recommended.`;
  return `"${recTitle}" did not meet predicted outcomes for ${childName} — the recommendation engine will adjust.`;
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchActualOutcomes(
  supabase:  SupabaseClient,
  childId:   string,
  storyId:   string | null,
  vocabWords: string[],
  since:     Date,
): Promise<ActualOutcomes> {
  const [quizRes, vocabRes, retentionRes] = await Promise.allSettled([
    // Quiz accuracy for this story since the prediction was made
    storyId
      ? supabase
          .from("child_quiz_results")
          .select("answered_correctly")
          .eq("child_id", childId)
          .eq("story_id", storyId)
          .gte("created_at", since.toISOString())
      : Promise.resolve({ data: null }),

    // Vocab mastered since prediction
    storyId && vocabWords.length > 0
      ? supabase
          .from("child_vocabulary")
          .select("word, status")
          .eq("child_id", childId)
          .in("word", vocabWords)
          .eq("status", "mastered")
      : Promise.resolve({ data: null }),

    // Current retention state from knowledge graph
    vocabWords.length > 0
      ? supabase
          .from("learner_knowledge")
          .select("concept_id, predicted_retention, concepts!inner(name)")
          .eq("child_id", childId)
          .in("concepts.name", vocabWords)
      : Promise.resolve({ data: null }),
  ]);

  let quizAccuracy: number | null = null;
  if (quizRes.status === "fulfilled" && Array.isArray(quizRes.value?.data)) {
    const rows = quizRes.value.data as { answered_correctly: boolean }[];
    if (rows.length >= 3) {
      quizAccuracy = rows.filter(r => r.answered_correctly).length / rows.length;
    }
  }

  const vocabMastered: string[] = [];
  if (vocabRes.status === "fulfilled" && Array.isArray(vocabRes.value?.data)) {
    for (const row of vocabRes.value.data as { word: string }[]) {
      vocabMastered.push(row.word);
    }
  }

  const retentionActual: { word: string; retention: number }[] = [];
  if (retentionRes.status === "fulfilled" && Array.isArray(retentionRes.value?.data)) {
    for (const row of retentionRes.value.data as Record<string, unknown>[]) {
      const concept = row.concepts as { name: string } | null;
      if (concept?.name && typeof row.predicted_retention === "number") {
        retentionActual.push({ word: concept.name, retention: row.predicted_retention });
      }
    }
  }

  return { quizAccuracy, vocabMastered, retentionActual };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Evaluates all pending predictions for a child after they complete a story.
 *
 * Called as fire-and-forget from the story_finished event handler.
 * Safe to call multiple times — the RPC uses ON CONFLICT DO NOTHING.
 */
export async function evaluateOutcomesAfterStory(
  supabase:  SupabaseClient,
  childId:   string,
  storyId:   string,
  childName: string = 'the learner',
): Promise<void> {
  try {
    // Fetch predictions that don't have outcomes yet for this story
    const { data: pending, error } = await supabase.rpc(
      "get_pending_outcome_evaluations",
      { p_child_id: childId, p_story_id: storyId }
    );

    if (error || !pending || !Array.isArray(pending) || pending.length === 0) return;

    for (const pred of pending as PendingPrediction[]) {
      try {
        const sinceDate = new Date(pred.created_at);

        const actual = await fetchActualOutcomes(
          supabase, childId, pred.story_id,
          pred.predicted_vocab_gains ?? [],
          sinceDate,
        );

        const criteria = Array.isArray(pred.success_criteria)
          ? (pred.success_criteria as SuccessCriterion[])
          : [];

        const { score, breakdown } = scoreAgainstCriteria(criteria, actual, pred);
        const predAccuracy  = computePredictionAccuracy(actual, pred);
        const beatPrediction = predAccuracy >= 0.7 && score >= 70;
        const summary       = buildSummary(score, childName, pred.recommendation_id);

        await supabase.rpc("save_recommendation_outcome", {
          p_prediction_id:            pred.prediction_id,
          p_child_id:                 childId,
          p_actual_quiz_accuracy:     actual.quizAccuracy,
          p_actual_vocab_mastered:    actual.vocabMastered,
          p_actual_completion_minutes: null,
          p_actual_retention:         JSON.stringify(actual.retentionActual),
          p_success_score:            score,
          p_prediction_accuracy:      predAccuracy,
          p_success_breakdown:        JSON.stringify(breakdown),
          p_beat_prediction:          beatPrediction,
        });

        console.log(`[OutcomeEvaluator] ${childId} / ${pred.recommendation_id}: score=${score}, accuracy=${Math.round(predAccuracy * 100)}%`);
      } catch (innerErr) {
        console.error(`[OutcomeEvaluator] inner error for prediction ${pred.prediction_id}:`, innerErr);
      }
    }
  } catch (err) {
    console.error("[OutcomeEvaluator] evaluateOutcomesAfterStory failed:", err);
  }
}

/**
 * Returns a formatted success score display for one measured outcome.
 * Used in parent/teacher dashboards to show "Recommendation worked: 87%"
 */
export function formatSuccessScore(score: number): {
  label: string;
  colour: string;
  icon: string;
  detail: string;
} {
  if (score >= 85) return { label: `${score}%`, colour: 'emerald', icon: '✓', detail: 'Exceeded expectations' };
  if (score >= 70) return { label: `${score}%`, colour: 'blue',    icon: '●', detail: 'Met learning goals' };
  if (score >= 50) return { label: `${score}%`, colour: 'amber',   icon: '◐', detail: 'Partially met goals' };
  return              { label: `${score}%`, colour: 'rose',    icon: '○', detail: 'Goals not yet met' };
}
