/**
 * Vocabulary Progress Service
 *
 * Tracks which words a child has encountered, practiced, mastered, or needs to
 * review. All writes go through security-definer RPCs so RLS never blocks them.
 *
 * Lifecycle
 *   encountered → practiced (3 cumulative encounters) → mastered (8 encounters)
 *   Any status can be flagged needs_review = true (quiz failure) and cleared
 *   needs_review = false (quiz success) independently of the status column.
 *
 * Integration points
 *   Story slot completion  → recordSlotVocab   (bulk, automatic)
 *   Nimi quiz wrong answer → markNeedsReview    (explicit)
 *   Nimi quiz right answer → markReviewed       (explicit)
 *   Parent dashboard / AI  → getVocabProgress   (read)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabStatus } from "./learningProfile";
import { incrementGoalProgressForChild } from "./learningGoals";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VocabWord {
  word:          string;
  status:        VocabStatus;
  storyId:       string | null;
  encounterCount: number;
  lastSeenAt:    string;
}

export interface VocabProgress {
  totalWords:    number;
  encountered:   number;
  practiced:     number;
  mastered:      number;
  needsReview:   number;
  masteryPct:    number;
  reviewWords:   VocabWord[];
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns the child's full vocabulary progress for the given language.
 * Includes aggregate counts and the list of words flagged for review.
 */
export async function getVocabProgress(
  supabase:  SupabaseClient,
  childId:   string,
  language:  string,
): Promise<VocabProgress | null> {
  const { data, error } = await supabase.rpc("get_vocab_progress", {
    p_child_id: childId,
    p_language: language,
  });

  if (error || !data) return null;

  const d = data as Record<string, unknown>;
  const rawWords = (d.review_words as Record<string, unknown>[] | null) ?? [];

  return {
    totalWords:  Number(d.total_words   ?? 0),
    encountered: Number(d.encountered   ?? 0),
    practiced:   Number(d.practiced     ?? 0),
    mastered:    Number(d.mastered      ?? 0),
    needsReview: Number(d.needs_review  ?? 0),
    masteryPct:  Number(d.mastery_pct   ?? 0),
    reviewWords: rawWords.map(w => ({
      word:           String(w.word            ?? ""),
      status:         (w.status as VocabStatus) ?? "encountered",
      storyId:        (w.story_id as string | null) ?? null,
      encounterCount: Number(w.encounter_count ?? 0),
      lastSeenAt:     String(w.last_seen_at    ?? ""),
    })),
  };
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Records vocabulary exposure for a completed story slot.
 *
 * Called automatically by storyProgressRepository after every successful
 * complete_story_slot call. Reads the mission's published vocabulary list
 * and bulk-upserts into child_vocabulary using the child's current language.
 *
 * Returns the number of words upserted, or 0 on failure (non-fatal).
 */
export async function recordSlotVocab(
  supabase:  SupabaseClient,
  childId:   string,
  missionId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("record_slot_vocab_encounters", {
    p_child_id:   childId,
    p_mission_id: missionId,
  });
  if (error) {
    console.error("[vocabularyProgress] record_slot_vocab_encounters:", error.message);
    return 0;
  }
  const count = Number(data ?? 0);
  if (count > 0) {
    void incrementGoalProgressForChild(supabase, childId, "vocab_encounters", count);
  }
  return count;
}

/**
 * Flags a word for extra practice.
 * Call when a child answers a Nimi quiz question incorrectly about this word.
 * Does not change the word's status — a mastered word can still need a refresh.
 */
export async function markNeedsReview(
  supabase:  SupabaseClient,
  childId:   string,
  language:  string,
  word:      string,
): Promise<void> {
  const { error } = await supabase.rpc("mark_vocab_needs_review", {
    p_child_id: childId,
    p_language: language,
    p_word:     word,
  });
  if (error) {
    console.error("[vocabularyProgress] mark_vocab_needs_review:", error.message);
  }
}

/**
 * Clears the review flag and records a correct answer.
 * Call when a child answers a Nimi quiz question correctly about this word.
 * Increments encounter_count and promotes status if thresholds are met.
 */
export async function markReviewed(
  supabase:  SupabaseClient,
  childId:   string,
  language:  string,
  word:      string,
): Promise<void> {
  const { error } = await supabase.rpc("mark_vocab_reviewed", {
    p_child_id: childId,
    p_language: language,
    p_word:     word,
  });
  if (error) {
    console.error("[vocabularyProgress] mark_vocab_reviewed:", error.message);
  }
}

// ── Prompt formatter ──────────────────────────────────────────────────────────

/**
 * Renders a compact vocabulary progress block for Nimi's system prompt.
 *
 * Included when there are words needing review so Nimi can naturally reinforce
 * them during conversation. Returns an empty string when there is nothing
 * actionable (no data or no review words), keeping the prompt lean.
 */
export function formatVocabProgressForPrompt(progress: VocabProgress): string {
  if (progress.totalWords === 0) return "";

  const lines: string[] = [];

  // One-line summary
  const parts: string[] = [];
  if (progress.mastered   > 0) parts.push(`${progress.mastered} mastered`);
  if (progress.practiced  > 0) parts.push(`${progress.practiced} practiced`);
  if (progress.encountered > 0) parts.push(`${progress.encountered} encountered`);
  lines.push(`📝 VOCABULARY: ${progress.totalWords} words — ${parts.join(", ")}`);

  // Words needing review — Nimi can weave these into conversation
  if (progress.reviewWords.length > 0) {
    const wordList = progress.reviewWords
      .slice(0, 5) // cap at 5 so the block stays compact
      .map(w => w.word)
      .join(", ");
    lines.push(
      `Needs review (${progress.needsReview} word${progress.needsReview !== 1 ? "s" : ""}): ${wordList}` +
      ` — weave these into the conversation naturally to reinforce them.`
    );
  }

  return lines.join("\n");
}
