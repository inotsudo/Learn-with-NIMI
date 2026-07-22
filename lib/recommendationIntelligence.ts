// lib/recommendationIntelligence.ts
//
// Recommendation Learning Engine — the self-improving layer.
//
// After outcome data accumulates, this module:
//   1. Reads historical success rates per rec type + reason key
//   2. Computes a priority adjustment for each strategy
//   3. Returns adjustments that the recommendation engine applies
//
// This turns the recommendation engine from static scoring into a
// continuously improving system: strategies that consistently produce
// high learning outcomes get promoted; strategies that don't get demoted.
//
// Adjustment model:
//   avg_success_score ≥ 80  → priority bonus  (−15: surfaces higher)
//   avg_success_score ≥ 65  → no adjustment
//   avg_success_score 50–64 → priority penalty (+15: surfaces lower)
//   avg_success_score < 50  → strong penalty   (+30)
//   < 3 outcomes measured   → no adjustment    (insufficient data)
//
// All adjustments are additive to the base priority (lower priority number
// = surfaces earlier in the sorted list). Bounded to prevent extreme skew.

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SuccessStatRow {
  content_type:           string;
  reason_key:             string;
  total_shown:            number;
  outcomes_measured:      number;
  avg_success_score:      number | null;
  avg_prediction_accuracy: number | null;
  beat_prediction_rate:   number | null;
}

export interface PriorityAdjustment {
  contentType:   string;
  reasonKey:     string;
  delta:         number;   // added to base priority; negative = surfaces earlier
  confidence:    number;   // how much data backs this adjustment (0–1)
  rationale:     string;   // "Consistently 85% success score across 12 outcomes"
}

export interface RecommendationIntelligenceReport {
  adjustments:           PriorityAdjustment[];
  overallSuccessRate:    number | null;   // across all rec types for this child
  totalOutcomesMeasured: number;
  topPerformingStrategy: string | null;
  lowPerformingStrategy: string | null;
  // For the parent/teacher dashboard
  aiQualitySummary:      string;
}

// ── Adjustment logic ──────────────────────────────────────────────────────────

function computeDelta(avgScore: number | null, outcomes: number): number {
  if (avgScore === null || outcomes < 3) return 0; // insufficient data
  if (avgScore >= 80) return -15;   // boost
  if (avgScore >= 65) return 0;     // no change
  if (avgScore >= 50) return +15;   // mild penalty
  return +30;                       // strong penalty
}

function computeAdjustmentConfidence(outcomes: number): number {
  if (outcomes >= 20) return 0.95;
  if (outcomes >= 10) return 0.80;
  if (outcomes >= 5)  return 0.65;
  if (outcomes >= 3)  return 0.50;
  return 0;
}

function buildRationale(row: SuccessStatRow): string {
  const score   = row.avg_success_score !== null ? `${Math.round(row.avg_success_score)}%` : 'no data';
  const n       = row.outcomes_measured;
  const type    = `${row.content_type} (${row.reason_key.replace(/_/g, ' ')})`;

  if (n < 3)   return `${type}: insufficient outcomes (${n} measured) — no adjustment`;
  if (!row.avg_success_score) return `${type}: ${n} outcomes measured, no score computed`;

  const beatRate = row.beat_prediction_rate !== null
    ? ` Beat own predictions ${Math.round(row.beat_prediction_rate * 100)}% of the time.`
    : '';
  return `${type}: ${score} success score across ${n} measured outcomes.${beatRate}`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetches historical success data for a child and computes priority adjustments.
 *
 * Returns empty adjustments (no-op) when insufficient outcome data exists.
 * Safe to call on every recommendation request — fast (single RPC).
 */
export async function getRecommendationIntelligence(
  supabase: SupabaseClient,
  childId:  string,
): Promise<RecommendationIntelligenceReport> {
  const { data, error } = await supabase.rpc(
    "get_recommendation_success_stats_for_child",
    { p_child_id: childId }
  );

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return {
      adjustments:           [],
      overallSuccessRate:    null,
      totalOutcomesMeasured: 0,
      topPerformingStrategy: null,
      lowPerformingStrategy: null,
      aiQualitySummary:      "Building recommendation history — predictions will improve as more activities are completed.",
    };
  }

  const rows = data as SuccessStatRow[];

  const adjustments: PriorityAdjustment[] = rows
    .filter(r => r.outcomes_measured >= 3)
    .map(r => ({
      contentType:  r.content_type,
      reasonKey:    r.reason_key,
      delta:        computeDelta(r.avg_success_score, r.outcomes_measured),
      confidence:   computeAdjustmentConfidence(r.outcomes_measured),
      rationale:    buildRationale(r),
    }));

  const totalMeasured   = rows.reduce((acc, r) => acc + r.outcomes_measured, 0);
  const scoredRows      = rows.filter(r => r.avg_success_score !== null && r.outcomes_measured >= 3);
  const overallScore    = scoredRows.length > 0
    ? scoredRows.reduce((acc, r) => acc + (r.avg_success_score ?? 0), 0) / scoredRows.length
    : null;

  const sorted          = [...scoredRows].sort((a, b) => (b.avg_success_score ?? 0) - (a.avg_success_score ?? 0));
  const top             = sorted[0];
  const low             = sorted.at(-1);

  const topLabel = top ? `${top.content_type} — ${top.reason_key.replace(/_/g, ' ')} (${Math.round(top.avg_success_score ?? 0)}%)` : null;
  const lowLabel = low && low !== top ? `${low.content_type} — ${low.reason_key.replace(/_/g, ' ')} (${Math.round(low.avg_success_score ?? 0)}%)` : null;

  const aiQualitySummary = buildAiQualitySummary(overallScore, totalMeasured, topLabel, lowLabel);

  return {
    adjustments,
    overallSuccessRate:    overallScore ? Math.round(overallScore) : null,
    totalOutcomesMeasured: totalMeasured,
    topPerformingStrategy: topLabel,
    lowPerformingStrategy: lowLabel,
    aiQualitySummary,
  };
}

/**
 * Applies priority adjustments to a list of recommendations.
 * Returns a new list with adjusted priorities (re-sorted).
 *
 * Called inside getUniversalRecommendations after building the initial list.
 */
export function applyIntelligenceAdjustments<T extends { contentType: string; reason: string; priority: number }>(
  recommendations: T[],
  adjustments:     PriorityAdjustment[],
): T[] {
  if (adjustments.length === 0) return recommendations;

  return recommendations
    .map(rec => {
      const adj = adjustments.find(
        a => a.contentType === rec.contentType && a.reasonKey === rec.reason
      );
      if (!adj || adj.delta === 0) return rec;
      return { ...rec, priority: Math.max(1, rec.priority + adj.delta) };
    })
    .sort((a, b) => a.priority - b.priority);
}

function buildAiQualitySummary(
  overallScore:    number | null,
  totalMeasured:   number,
  topStrategy:     string | null,
  lowStrategy:     string | null,
): string {
  if (totalMeasured === 0) {
    return "Nimi is building its recommendation history. Complete a few more stories to start seeing success measurements.";
  }

  const parts: string[] = [];

  if (overallScore !== null) {
    parts.push(`Recommendation success rate: ${Math.round(overallScore)}% across ${totalMeasured} measured outcome${totalMeasured !== 1 ? 's' : ''}.`);
  }
  if (topStrategy) {
    parts.push(`Best strategy: ${topStrategy}.`);
  }
  if (lowStrategy) {
    parts.push(`Still improving: ${lowStrategy}.`);
  }

  return parts.join(' ');
}

/**
 * Formats the success stats report for injection into a parent-ai or teacher-ai
 * system prompt, giving the AI context about how well its past recs have worked.
 */
export function formatIntelligenceForAI(
  report: RecommendationIntelligenceReport,
  role:   'parent' | 'teacher',
): string {
  if (report.totalOutcomesMeasured === 0) return '';

  if (role === 'parent') {
    return `## Recommendation Accuracy\n${report.aiQualitySummary}`;
  }

  const adjLines = report.adjustments
    .filter(a => a.delta !== 0)
    .map(a => `  ${a.contentType}/${a.reasonKey}: delta ${a.delta > 0 ? '+' : ''}${a.delta} (${a.rationale})`);

  return [
    `## Recommendation Intelligence`,
    `Overall success rate: ${report.overallSuccessRate ?? 'N/A'}% (${report.totalOutcomesMeasured} outcomes)`,
    report.topPerformingStrategy ? `Top strategy: ${report.topPerformingStrategy}` : '',
    report.lowPerformingStrategy ? `Lowest success: ${report.lowPerformingStrategy}` : '',
    adjLines.length > 0 ? `Active adjustments:\n${adjLines.join('\n')}` : '',
  ].filter(Boolean).join('\n');
}
