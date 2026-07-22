/**
 * Parent Insight Builder — Phase 4.2
 *
 * Pure functions that normalize Phase 3 learning data into a stable
 * InsightContext, then render it as a compact LLM-readable block.
 *
 * No Supabase schema knowledge lives here beyond calling the existing
 * service functions — this module is the reusable bridge between data
 * and AI narrative.
 *
 * Future consumers: email digest, push notification copy, weekly reports.
 * They all call buildInsightContext() and do whatever they need next.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getLearningProfile, type ReadingLevel, type QuestionType } from "./learningProfile";
import { getVocabProgress } from "./vocabularyProgress";
import { getActiveGoals } from "./learningGoals";

// ── Context ───────────────────────────────────────────────────────────────────

export interface InsightContext {
  // Child
  childName:          string;
  language:           string;
  ageYears:           number;

  // Reading
  readingLevel:       ReadingLevel;
  completedStories:   number;
  totalMissionsDone:  number;
  lastActiveAt:       string | null;

  // Vocabulary (from child_vocabulary)
  totalWords:         number;
  mastered:           number;
  practiced:          number;
  encountered:        number;
  needsReview:        number;
  masteryPct:         number;
  topReviewWords:     string[];     // up to 5, already needs_review=true

  // Quiz
  totalQuestions:     number;
  quizCorrect:        number;
  quizAccuracyPct:    number | null;
  quizStrengths:      QuestionType[];
  quizWeaknesses:     QuestionType[];

  // Goals (active, non-expired)
  dailyGoalsTotal:    number;
  dailyGoalsDone:     number;
  weeklyGoalsTotal:   number;
  weeklyGoalsDone:    number;
}

// ── Insight shape ─────────────────────────────────────────────────────────────

export type InsightType = "strength" | "improvement" | "needs_support" | "observation";

export interface InsightResult {
  type:  InsightType;
  title: string;     // ≤55 chars
  body:  string;     // 1–2 warm sentences
}

// ── Build ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all Phase 3 data for the child and normalizes it into an InsightContext.
 * All three RPC calls run in parallel. A failing call produces zero-valued fields
 * rather than crashing — the LLM gracefully handles partial data.
 */
export async function buildInsightContext(
  supabase:  SupabaseClient,
  childId:   string,
  language:  string,
): Promise<InsightContext> {
  const [profileResult, vocabResult, goalsResult] = await Promise.allSettled([
    getLearningProfile(supabase, childId),
    getVocabProgress(supabase, childId, language),
    getActiveGoals(supabase, childId, language),
  ]);

  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const vocab   = vocabResult.status   === "fulfilled" ? vocabResult.value   : null;
  const goals   = goalsResult.status   === "fulfilled" ? (goalsResult.value ?? []) : [];

  const dailyGoals  = goals.filter(g => g.period === "daily");
  const weeklyGoals = goals.filter(g => g.period === "weekly");

  return {
    childName:         profile?.name          ?? "your child",
    language,
    ageYears:          profile?.age           ?? 0,

    readingLevel:      profile?.readingLevel  ?? "emerging",
    completedStories:  profile?.completedStoryCount ?? 0,
    totalMissionsDone: profile?.totalMissionsDone   ?? 0,
    lastActiveAt:      profile?.lastActiveAt  ?? null,

    totalWords:        vocab?.totalWords   ?? 0,
    mastered:          vocab?.mastered     ?? 0,
    practiced:         vocab?.practiced    ?? 0,
    encountered:       vocab?.encountered  ?? 0,
    needsReview:       vocab?.needsReview  ?? 0,
    masteryPct:        vocab?.masteryPct   ?? 0,
    topReviewWords:    (vocab?.reviewWords ?? []).slice(0, 5).map(w => w.word),

    totalQuestions:    profile?.quiz.totalQuestions ?? 0,
    quizCorrect:       profile?.quiz.correct        ?? 0,
    quizAccuracyPct:   profile?.quiz.accuracyPct    ?? null,
    quizStrengths:     profile?.strengths            ?? [],
    quizWeaknesses:    profile?.weaknesses           ?? [],

    dailyGoalsTotal:   dailyGoals.length,
    dailyGoalsDone:    dailyGoals.filter(g => g.completed).length,
    weeklyGoalsTotal:  weeklyGoals.length,
    weeklyGoalsDone:   weeklyGoals.filter(g => g.completed).length,
  };
}

// ── Minimum data check ────────────────────────────────────────────────────────

/**
 * Returns true when the context has enough signal for the LLM to produce
 * at least 2 grounded insights. Without this gate the model tends to
 * fabricate trends — better to show a "check back later" message.
 */
export function hasEnoughData(ctx: InsightContext): boolean {
  // Need at least one meaningful data point beyond the child's name
  return (
    ctx.completedStories >= 1 ||
    ctx.totalWords       >= 5 ||
    ctx.totalQuestions   >= 3
  );
}

// ── Prompt formatter ──────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<ReadingLevel, string> = {
  emerging:   "Emerging",
  beginning:  "Beginning",
  developing: "Developing",
  expanding:  "Expanding",
  fluent:     "Fluent",
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  rw: "Kinyarwanda",
};

const QT_LABELS: Record<string, string> = {
  comprehension: "story comprehension",
  vocabulary:    "vocabulary",
  recall:        "recall",
};

/**
 * Renders the InsightContext as a compact, LLM-readable block.
 * Stable format so future prompt updates only change the surrounding
 * instructions, not this function.
 */
export function formatInsightContextForPrompt(ctx: InsightContext): string {
  const langLabel = LANGUAGE_LABELS[ctx.language] ?? ctx.language;
  const ageStr    = ctx.ageYears > 0 ? `, age ${ctx.ageYears}` : "";

  const lines: string[] = [
    `CHILD: ${ctx.childName}${ageStr}, learning in ${langLabel}`,
    `READING LEVEL: ${LEVEL_LABELS[ctx.readingLevel]} (${ctx.completedStories} ${ctx.completedStories === 1 ? "story" : "stories"} completed, ${ctx.totalMissionsDone} activities total)`,
  ];

  if (ctx.lastActiveAt) {
    const daysAgo = Math.round((Date.now() - new Date(ctx.lastActiveAt).getTime()) / 86_400_000);
    lines.push(`LAST ACTIVE: ${daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}`);
  }

  // Vocabulary
  if (ctx.totalWords > 0) {
    lines.push(
      `\nVOCABULARY: ${ctx.totalWords} total words encountered`,
      `  Mastered: ${ctx.mastered} (${ctx.masteryPct}%) | Practiced: ${ctx.practiced} | Encountered: ${ctx.encountered}`,
    );
    if (ctx.needsReview > 0) {
      const wordList = ctx.topReviewWords.join(", ");
      lines.push(`  Needs review: ${ctx.needsReview} words${wordList ? ` — ${wordList}` : ""}`);
    }
  } else {
    lines.push(`\nVOCABULARY: No data yet`);
  }

  // Quiz
  if (ctx.totalQuestions > 0) {
    const accuracy = ctx.quizAccuracyPct !== null ? `${ctx.quizAccuracyPct}%` : "n/a";
    lines.push(
      `\nQUIZ: ${ctx.totalQuestions} questions answered | Accuracy: ${accuracy}`,
    );
    if (ctx.quizStrengths.length > 0) {
      lines.push(`  Strengths: ${ctx.quizStrengths.map(q => QT_LABELS[q] ?? q).join(", ")}`);
    }
    if (ctx.quizWeaknesses.length > 0) {
      lines.push(`  Needs work: ${ctx.quizWeaknesses.map(q => QT_LABELS[q] ?? q).join(", ")}`);
    }
  } else {
    lines.push(`\nQUIZ: No data yet`);
  }

  // Goals
  if (ctx.dailyGoalsTotal > 0 || ctx.weeklyGoalsTotal > 0) {
    lines.push(`\nGOALS:`);
    if (ctx.dailyGoalsTotal  > 0) lines.push(`  Today: ${ctx.dailyGoalsDone}/${ctx.dailyGoalsTotal} completed`);
    if (ctx.weeklyGoalsTotal > 0) lines.push(`  This week: ${ctx.weeklyGoalsDone}/${ctx.weeklyGoalsTotal} completed`);
  }

  return lines.join("\n");
}

// ── Combined AI response ──────────────────────────────────────────────────────

export interface ParentAIResponse {
  insights:         InsightResult[];
  recommendations:  ParentRecommendation[];
  childName:        string;
  generatedAt:      string;
  cached?:          boolean;
  insufficientData?: boolean;
}

// ── Recommendations ───────────────────────────────────────────────────────────

export type RecommendationCategory =
  | "bedtime_story"     // specific book or reading activity for bedtime
  | "review_activity"   // parent-led game/activity targeting vocab or quiz gaps
  | "reading_habit"     // routine or consistency tip tailored to this child's pattern
  | "supportive_action";// something to say or do TODAY — celebrate, reinforce, encourage

export interface ParentRecommendation {
  category:    RecommendationCategory;
  title:       string;   // ≤55 chars — what it is
  description: string;   // why it fits this child specifically (1–2 sentences)
  action:      string;   // concrete step starting with a verb (≤80 chars)
}

const VALID_CATEGORIES = new Set<RecommendationCategory>([
  "bedtime_story", "review_activity", "reading_habit", "supportive_action",
]);

/**
 * Type-guards and cleans LLM recommendation output.
 * Drops malformed items; caps at 6 so the panel stays scannable.
 */
export function validateRecommendations(raw: unknown): ParentRecommendation[] {
  if (!Array.isArray(raw)) return [];

  return (raw as unknown[])
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .filter(item =>
      VALID_CATEGORIES.has(item.category as RecommendationCategory) &&
      typeof item.title       === "string" && item.title.trim()       !== "" &&
      typeof item.description === "string" && item.description.trim() !== "" &&
      typeof item.action      === "string" && item.action.trim()       !== ""
    )
    .map(item => ({
      category:    item.category    as RecommendationCategory,
      title:       String(item.title).slice(0, 120).trim(),
      description: String(item.description).trim(),
      action:      String(item.action).slice(0, 200).trim(),
    }))
    .slice(0, 6);
}

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_TYPES = new Set<InsightType>(["strength", "improvement", "needs_support", "observation"]);

/**
 * Type-guards and cleans LLM output into a valid InsightResult array.
 * Drops malformed items silently so one bad object never breaks the whole response.
 */
// ── Shared LLM prompts ─────────────────────────────────────────────
// Exported so parent-ai, parent-insights, and parent-recommendations
// all use exactly the same prompt text without copy-paste drift.

export const PARENT_INSIGHTS_PROMPT = `\
You are a child learning analyst writing brief, warm observations for parents.

TASK: Read the learning data below and return a JSON array of 3–5 insights.

REQUIRED FORMAT — return ONLY a JSON array, no markdown, no explanation:
[
  { "type": "strength",      "title": "...", "body": "..." },
  { "type": "improvement",   "title": "...", "body": "..." },
  { "type": "needs_support", "title": "...", "body": "..." },
  { "type": "observation",   "title": "...", "body": "..." }
]

TYPE RULES:
- "strength"      — something the child is clearly doing well
- "improvement"   — a positive change or upward trend you can see in the data
- "needs_support" — an area that needs practice (frame positively — not alarming)
- "observation"   — a neutral, interesting pattern in the data

WRITING RULES:
- title: ≤55 characters, plain language a parent would understand
- body: 1–2 sentences maximum, warm, specific, and grounded in the data
- Do NOT invent numbers, trends, or events that aren't in the data
- Do NOT use jargon ("metacognition", "phonemic awareness", "scaffolding")
- Write as if talking to a caring parent, not a teacher or researcher
- Use the child's first name at least once across the insights
- Choose insight types based on what the data actually supports — you do not need all four types
- ONLY output the JSON array — nothing before or after it`;

export const PARENT_RECOMMENDATIONS_PROMPT = `\
You are a child literacy coach writing practical, warm recommendations for parents.

TASK: Read the child's learning data below and return 4–6 recommendations — at
least one from each category — that the parent can act on in the next few days.

CATEGORIES:
- "bedtime_story"     — Name a specific real-world book (author + title) that matches
                        the child's reading level and interests. Explain in one sentence
                        why it fits. Make the action something they can do tonight.
- "review_activity"   — A concrete parent-led activity (game, song, craft, conversation
                        topic) that reinforces vocabulary or comprehension at home.
                        If there are words needing review, centre the activity on them.
- "reading_habit"     — One specific routine change or habit tip tailored to what the
                        data reveals about this child's patterns (recency, streak, goals).
- "supportive_action" — Something the parent can SAY or DO today — a specific phrase,
                        celebration, or question — that addresses a strength or gap.

REQUIRED FORMAT — return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "category": "bedtime_story",
    "title": "...",          (≤55 chars — the book title or activity name)
    "description": "...",    (1–2 sentences explaining why it fits THIS child)
    "action": "..."          (≤80 chars, starts with a verb — the concrete step)
  }
]

RULES:
- Be specific. Name real books. Name real words from the review list. Give real times.
- Descriptions must reference something from the data — level, words, streak, accuracy.
- Actions must start with a verb: "Read...", "Ask...", "Try...", "Say...", "Set...".
- Never write generic tips that apply to every child ("read every day", "praise them").
- Use the child's first name at least once across all recommendations.
- ONLY output the JSON array — nothing else.`;

export function validateInsights(raw: unknown): InsightResult[] {
  if (!Array.isArray(raw)) return [];

  return (raw as unknown[])
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .filter(item =>
      VALID_TYPES.has(item.type as InsightType) &&
      typeof item.title === "string" && item.title.trim() !== "" &&
      typeof item.body  === "string" && item.body.trim()  !== ""
    )
    .map(item => ({
      type:  item.type  as InsightType,
      title: String(item.title).slice(0, 120).trim(),
      body:  String(item.body).trim(),
    }))
    .slice(0, 5);   // hard cap — never show more than 5 insights at once
}
