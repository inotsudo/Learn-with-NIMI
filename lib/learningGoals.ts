/**
 * Learning Goals Service
 *
 * Generates and tracks personalized daily and weekly goals for each child.
 * Goals are calibrated to the child's reading level (migration 116) and
 * measured across five activity types that span the whole platform.
 *
 * Goal types
 *   chat_exchanges    — conversations with Nimi
 *   slot_completions  — story activity slots finished
 *   vocab_encounters  — vocabulary words discovered
 *   quiz_correct      — quiz questions answered correctly
 *   story_completions — full stories completed
 *
 * Integration points
 *   Nimi chat POST    → incrementGoalProgress(…, "chat_exchanges")   (per message)
 *   Slot completion   → incrementGoalProgress(…, "slot_completions") (via storyProgressRepository)
 *   Vocab recording   → incrementGoalProgress(…, "vocab_encounters") (via vocabularyProgress)
 *   Quiz correct      → incrementGoalProgress(…, "quiz_correct")     (via recordQuizResult)
 *   Story finished    → incrementGoalProgress(…, "story_completions")(via storyProgressRepository)
 *   Goal reward UI    → claimGoalReward(…)
 *   Goals panel / AI  → generateGoals / getActiveGoals
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GoalType =
  | "chat_exchanges"
  | "slot_completions"
  | "vocab_encounters"
  | "quiz_correct"
  | "story_completions";

export type GoalPeriod = "daily" | "weekly";

export interface LearningGoal {
  id:            string;
  childId:       string;
  language:      string;
  period:        GoalPeriod;
  goalType:      GoalType;
  title:         string;
  description:   string;
  targetValue:   number;
  currentValue:  number;
  completed:     boolean;
  rewardClaimed: boolean;
  starsReward:   number;
  expiresAt:     string;
  generatedAt:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseGoal(raw: Record<string, unknown>): LearningGoal {
  return {
    id:            String(raw.id            ?? ""),
    childId:       String(raw.child_id      ?? ""),
    language:      String(raw.language      ?? "en"),
    period:        (raw.period  as GoalPeriod) ?? "daily",
    goalType:      (raw.goal_type as GoalType) ?? "chat_exchanges",
    title:         String(raw.title         ?? ""),
    description:   String(raw.description   ?? ""),
    targetValue:   Number(raw.target_value  ?? 0),
    currentValue:  Number(raw.current_value ?? 0),
    completed:     Boolean(raw.completed),
    rewardClaimed: Boolean(raw.reward_claimed),
    starsReward:   Number(raw.stars_reward  ?? 0),
    expiresAt:     String(raw.expires_at    ?? ""),
    generatedAt:   String(raw.generated_at  ?? ""),
  };
}

function parseGoalList(data: unknown): LearningGoal[] {
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(parseGoal);
}

// ── Read / Generate ───────────────────────────────────────────────────────────

/**
 * Idempotent goal generation: purges expired goals, then creates daily (2) and
 * weekly (1–2) goals calibrated to the child's reading level if none exist for
 * the current period. Returns the full active goal list.
 *
 * Call once per session start or when the goals panel opens. Subsequent calls
 * within the same day/week are no-ops (goals already exist).
 */
export async function generateGoals(
  supabase:  SupabaseClient,
  childId:   string,
  language:  string,
): Promise<LearningGoal[]> {
  const { data, error } = await supabase.rpc("generate_learning_goals", {
    p_child_id: childId,
    p_language: language,
  });
  if (error) {
    console.error("[learningGoals] generate_learning_goals:", error.message);
    return [];
  }
  return parseGoalList(data);
}

/**
 * Lightweight read: returns non-expired goals without triggering generation.
 * Use this when you just need to display progress or build a prompt block.
 */
export async function getActiveGoals(
  supabase:  SupabaseClient,
  childId:   string,
  language:  string,
): Promise<LearningGoal[]> {
  const { data, error } = await supabase.rpc("get_active_goals", {
    p_child_id: childId,
    p_language: language,
  });
  if (error) {
    console.error("[learningGoals] get_active_goals:", error.message);
    return [];
  }
  return parseGoalList(data);
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Advances current_value for all active, incomplete goals of the given type.
 * Safe to call fire-and-forget — no-op when no matching goals exist.
 *
 * @param increment  Amount to add (default 1). Pass the actual word count for
 *                   vocab_encounters so a single slot recording counts correctly.
 */
export async function incrementGoalProgress(
  supabase:  SupabaseClient,
  childId:   string,
  language:  string,
  goalType:  GoalType,
  increment: number = 1,
): Promise<void> {
  const { error } = await supabase.rpc("increment_goal_progress", {
    p_child_id:  childId,
    p_language:  language,
    p_goal_type: goalType,
    p_increment: increment,
  });
  if (error) {
    console.error("[learningGoals] increment_goal_progress:", error.message);
  }
}

/**
 * Language-resolving variant for callers that have childId but not language
 * (storyProgressRepository, vocabularyProgress). Looks up the child's stored
 * language via the `increment_goal_progress_for_child` security-definer RPC.
 */
export async function incrementGoalProgressForChild(
  supabase:  SupabaseClient,
  childId:   string,
  goalType:  GoalType,
  increment: number = 1,
): Promise<void> {
  const { error } = await supabase.rpc("increment_goal_progress_for_child", {
    p_child_id:  childId,
    p_goal_type: goalType,
    p_increment: increment,
  });
  if (error) {
    console.error("[learningGoals] increment_goal_progress_for_child:", error.message);
  }
}

/**
 * Claims the star reward for a completed goal.
 * Returns true when stars are newly credited, false when already claimed or
 * the goal is not yet complete.
 *
 * After a successful claim, invalidate the parent star caches:
 *   qinvalidate(`bonusStars:${childId}:${language}`)
 *   qinvalidate(`totalStars:${childId}:${language}`)
 */
export async function claimGoalReward(
  supabase: SupabaseClient,
  childId:  string,
  goalId:   string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_goal_reward", {
    p_child_id: childId,
    p_goal_id:  goalId,
  });
  if (error) {
    console.error("[learningGoals] claim_goal_reward:", error.message);
    return false;
  }
  return Boolean(data);
}

// ── Prompt formatter ──────────────────────────────────────────────────────────

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  chat_exchanges:   "Chat with Nimi",
  slot_completions: "Complete story activities",
  vocab_encounters: "Learn new words",
  quiz_correct:     "Answer quiz questions correctly",
  story_completions:"Complete a full story",
};

/**
 * Renders a compact goals block for Nimi's system prompt so she can celebrate
 * completions and gently nudge the child toward unfinished goals.
 *
 * Returns an empty string when there are no active goals (keeps the prompt lean
 * for brand-new children whose goals haven't been generated yet).
 */
export function formatGoalsForPrompt(goals: LearningGoal[]): string {
  if (goals.length === 0) return "";

  const daily  = goals.filter(g => g.period === "daily");
  const weekly = goals.filter(g => g.period === "weekly");

  const formatLine = (g: LearningGoal): string => {
    const label    = g.title || GOAL_TYPE_LABELS[g.goalType];
    const progress = `${g.currentValue}/${g.targetValue}`;
    const badge    = g.completed ? (g.rewardClaimed ? "✅ done" : "✅ COMPLETED — reward ready!") : `${progress} done`;
    return `• ${label} — ${badge}`;
  };

  const lines: string[] = ["🎯 LEARNING GOALS:"];

  if (daily.length > 0) {
    lines.push("Today:");
    daily.forEach(g => lines.push(`  ${formatLine(g)}`));
  }

  if (weekly.length > 0) {
    lines.push("This week:");
    weekly.forEach(g => lines.push(`  ${formatLine(g)}`));
  }

  lines.push(
    "When a goal is COMPLETED, celebrate it warmly: " +
    '"You just finished your goal! ⭐ Amazing work!" — then move on naturally.'
  );
  lines.push(
    "When a goal is close (≥ 80% done), give a gentle nudge once if it fits naturally."
  );

  return lines.join("\n");
}
