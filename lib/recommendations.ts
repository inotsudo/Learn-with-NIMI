import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Why this story was recommended.
 * Drives both the UI chip and Nimi's spoken reasoning.
 */
export type ReasonKey =
  | "in_progress"    // child has started but not finished
  | "level_up"       // natural next story in curriculum order
  | "review_needed"  // category where quiz accuracy is low
  | "interest_match" // matches the child's favorite category
  | "age_match"      // within the child's age range
  | "new_adventure"; // none of the above signals fired

export interface ScoredRecommendation {
  storyId:       string;
  slug:          string;
  title:         string;
  coverUrl:      string | null;
  description:   string | null;
  themeEmoji:    string | null;
  ageMin:        number | null;
  ageMax:        number | null;
  isFree:        boolean;
  category:      string | null;
  score:         number;
  reasonKey:     ReasonKey;
  completionPct: number;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Returns ranked story recommendations for a child, using the v2 scoring
 * engine that weighs 7 signals: in-progress, sequential order, interest
 * category, age fit, reading-level fit, vocabulary novelty, and quiz weakness.
 *
 * Fully completed stories are excluded. Only unlocked (accessible) stories
 * are returned, respecting sequential curriculum gating and subscription status.
 *
 * The caller's Supabase client must satisfy `is_my_child(childId)`.
 */
export async function getRecommendations(
  supabase:  SupabaseClient,
  childId:   string,
  language:  string,
  limit = 5,
): Promise<ScoredRecommendation[]> {
  const { data, error } = await supabase.rpc("get_story_recommendations_v2", {
    p_child_id: childId,
    p_language: language,
    p_limit:    limit,
  });

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map(row => ({
    storyId:       String(row.story_id ?? ""),
    slug:          String(row.slug     ?? ""),
    title:         String(row.title    ?? ""),
    coverUrl:      (row.cover_url    as string | null) ?? null,
    description:   (row.description  as string | null) ?? null,
    themeEmoji:    (row.theme_emoji  as string | null) ?? null,
    ageMin:        row.age_min  != null ? Number(row.age_min)  : null,
    ageMax:        row.age_max  != null ? Number(row.age_max)  : null,
    isFree:        Boolean(row.is_free  ?? false),
    category:      (row.category    as string | null) ?? null,
    score:         Number(row.score          ?? 0),
    reasonKey:     (row.reason_key as ReasonKey) ?? "new_adventure",
    completionPct: Number(row.completion_pct ?? 0),
  }));
}

// ── Reason text ───────────────────────────────────────────────────────────────

const REASON_LABELS: Record<ReasonKey, string> = {
  in_progress:    "Continue where you left off",
  level_up:       "Your next adventure",
  review_needed:  "Practice makes perfect",
  interest_match: "Matches your interests",
  age_match:      "Just right for you",
  new_adventure:  "Try something new",
};

/**
 * Returns the short human-readable reason label for a recommendation.
 * Suitable for a UI chip or a spoken introduction by Nimi.
 */
export function getReasonLabel(reasonKey: ReasonKey): string {
  return REASON_LABELS[reasonKey] ?? "Recommended";
}

/**
 * Returns a longer, conversational reason sentence Nimi can speak directly
 * to the child. Keep these warm and encouraging — they go into Nimi's voice.
 */
export function getReasonSentence(
  rec:       ScoredRecommendation,
  childName: string,
): string {
  const name = childName || "friend";
  switch (rec.reasonKey) {
    case "in_progress":
      return `${name}, you've already started "${rec.title}" — let's keep going! You're ${rec.completionPct}% of the way there!`;
    case "level_up":
      return `You're ready for your next story, ${name}! "${rec.title}" is waiting for you.`;
    case "review_needed":
      return `"${rec.title}" is a great way to practice the things you're still learning, ${name}!`;
    case "interest_match":
      return `I think you'll love "${rec.title}", ${name} — it's right up your alley!`;
    case "age_match":
      return `"${rec.title}" is perfect for someone your age, ${name}!`;
    case "new_adventure":
    default:
      return `Ready for something new, ${name}? "${rec.title}" looks like a great adventure!`;
  }
}

// ── Prompt formatter ──────────────────────────────────────────────────────────

/**
 * Renders up to 3 recommendations as a compact text block for Nimi's system
 * prompt. Each line gives the story title, reason, and completion state.
 *
 * Returns an empty string when there are no recommendations, so the block
 * can be safely concatenated into the system prompt without extra guards.
 */
export function formatRecommendationsForPrompt(
  recs: ScoredRecommendation[],
): string {
  if (recs.length === 0) return "";

  const lines = ["📚 NEXT STORY RECOMMENDATIONS (suggest these when relevant):"];

  for (const rec of recs.slice(0, 3)) {
    const progress  = rec.completionPct > 0 ? ` — ${rec.completionPct}% done` : "";
    const ageLabel  = rec.ageMin != null ? ` (ages ${rec.ageMin}${rec.ageMax ? `–${rec.ageMax}` : "+"})` : "";
    const reason    = REASON_LABELS[rec.reasonKey];
    lines.push(
      `• "${rec.title}"${rec.themeEmoji ? ` ${rec.themeEmoji}` : ""}${ageLabel}${progress} — ${reason}`
    );
    if (rec.description) {
      // trim to ~120 chars so the block stays compact
      const desc = rec.description.length > 120
        ? rec.description.slice(0, 117) + "…"
        : rec.description;
      lines.push(`  ${desc}`);
    }
  }

  lines.push(
    "\nWhen a child asks what to read next or finishes their current story, " +
    "suggest one of the above. Use the reason to frame your suggestion naturally."
  );

  return lines.join("\n");
}
