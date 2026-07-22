// lib/spacedRepetition.ts
//
// Pure math functions for the Ebbinghaus spaced-repetition model.
//
// No DB, no LLM, no side effects — deterministic transforms on numeric state.
//
// Model:
//   confidence       — how well the child knows this concept right now (0–1)
//   stability_days   — how long memory is expected to last (doubles on correct review)
//   predicted_retention — e^(-days_since_correct / stability_days)
//   needs_review     — true when predicted_retention < REVIEW_THRESHOLD
//
// These functions mirror the SQL logic in upsert_concept_knowledge() exactly
// so TypeScript code can compute the same values locally (e.g., for display)
// without a round-trip to the DB.

// ── Constants ─────────────────────────────────────────────────────────────────

/** Retention below this threshold triggers a spaced-repetition review. */
export const REVIEW_THRESHOLD = 0.70;

/** Maximum stability cap (90 days ≈ "learned permanently for a young learner"). */
export const MAX_STABILITY_DAYS = 90;

/** Minimum stability floor (0.5 days = same day forgetting). */
export const MIN_STABILITY_DAYS = 0.5;

// ── Core math ─────────────────────────────────────────────────────────────────

/**
 * Predicted retention at a given point in time.
 * R = e^(-t / S)
 *   t = days since last correct review (0 = just reviewed)
 *   S = stability_days (higher = slower forgetting)
 */
export function computeRetention(lastCorrectAt: Date | null, stabilityDays: number): number {
  if (!lastCorrectAt) return 0;
  const t = (Date.now() - lastCorrectAt.getTime()) / (1000 * 60 * 60 * 24);
  const S = Math.max(stabilityDays, MIN_STABILITY_DAYS);
  return Math.exp(-t / S);
}

/**
 * Update stability after a review event.
 * Correct → doubles (capped at MAX_STABILITY_DAYS)
 * Incorrect → halves (floored at MIN_STABILITY_DAYS)
 */
export function updateStability(current: number, wasCorrect: boolean): number {
  if (wasCorrect) {
    return Math.min(current * 2, MAX_STABILITY_DAYS);
  }
  return Math.max(current * 0.5, MIN_STABILITY_DAYS);
}

/**
 * Update confidence after a review event.
 * Correct → rises toward 1.0 asymptotically: c + 0.15 × (1 - c)
 * Incorrect → drops toward 0 multiplicatively: c × 0.65
 */
export function updateConfidence(current: number, wasCorrect: boolean): number {
  if (wasCorrect) {
    return Math.min(1.0, current + 0.15 * (1 - current));
  }
  return Math.max(0.05, current * 0.65);
}

/**
 * Whether a concept needs review right now.
 */
export function needsReview(predictedRetention: number): boolean {
  return predictedRetention < REVIEW_THRESHOLD;
}

// ── Display helpers ───────────────────────────────────────────────────────────

/**
 * How many days ago was the last correct review?
 * Returns null if never reviewed correctly.
 */
export function daysSinceCorrect(lastCorrectAt: Date | null): number | null {
  if (!lastCorrectAt) return null;
  return (Date.now() - lastCorrectAt.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * A human-readable phrase for the retention state.
 * Used when Nimi says "It's been a while since we used 'delight'."
 */
export function retentionPhrase(
  predictedRetention: number,
  lastCorrectAt: Date | null,
): string {
  const days = daysSinceCorrect(lastCorrectAt);

  if (predictedRetention >= 0.90) return "very strong";
  if (predictedRetention >= 0.70) return "solid";
  if (predictedRetention >= 0.50) return "fading";

  if (days === null)               return "not yet learned";
  if (days < 1)                    return "reviewed today";
  if (days < 3)                    return "reviewed recently";
  if (days < 7)                    return "a few days ago";
  if (days < 14)                   return "last week";
  if (days < 30)                   return "a few weeks ago";
  return "a long time ago";
}

/**
 * The Nimi-facing sentence to inject when a word needs review.
 * Example: "It's been 5 days since Annie used 'delight' — weave it in naturally."
 */
export function buildReviewHint(
  word: string,
  lastCorrectAt: Date | null,
  predictedRetention: number,
): string | null {
  if (predictedRetention >= REVIEW_THRESHOLD) return null; // no hint needed

  const days = daysSinceCorrect(lastCorrectAt);
  if (days === null) {
    return `"${word}" — never correctly reviewed yet. Introduce it gently.`;
  }

  const daysText = days < 1 ? "earlier today"
    : days < 2 ? "yesterday"
    : `${Math.round(days)} days ago`;

  return `"${word}" — last correctly reviewed ${daysText} (retention: ${Math.round(predictedRetention * 100)}%). Weave it naturally into the conversation.`;
}

// ── Batch helpers ──────────────────────────────────────────────────────────────

export interface RetentionSnapshot {
  name:               string;
  predicted_retention: number;
  needs_review:       boolean;
  days_since_correct: number | null;
  phrase:             string;
  nimi_hint:          string | null;
}

/**
 * Given a list of learner_knowledge rows, compute display snapshots for all.
 * Used by parent/teacher dashboards and the Nimi review hint block.
 */
export function buildRetentionSnapshots(
  rows: Array<{
    concept_name:        string;
    predicted_retention: number;
    last_correct_at:     string | null;
    stability_days:      number;
  }>
): RetentionSnapshot[] {
  return rows.map(r => {
    const lastCorrectAt = r.last_correct_at ? new Date(r.last_correct_at) : null;
    const retention = r.predicted_retention; // pre-computed in DB
    return {
      name:               r.concept_name,
      predicted_retention: retention,
      needs_review:       needsReview(retention),
      days_since_correct: daysSinceCorrect(lastCorrectAt),
      phrase:             retentionPhrase(retention, lastCorrectAt),
      nimi_hint:          buildReviewHint(r.concept_name, lastCorrectAt, retention),
    };
  });
}
