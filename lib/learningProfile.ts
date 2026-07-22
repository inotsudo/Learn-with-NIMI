import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReadingLevel = "emerging" | "beginning" | "developing" | "expanding" | "fluent";
export type VocabStatus  = "encountered" | "practiced" | "mastered";
export type QuestionType = "comprehension" | "vocabulary" | "recall";
export type Difficulty   = "easy" | "medium" | "hard";

export interface VocabularyStats {
  totalEncountered: number;
  totalPracticed:   number;
  totalMastered:    number;
}

export interface QuizDifficultyBreakdown {
  total:   number;
  correct: number;
}

export interface QuizStats {
  totalQuestions: number;
  correct:        number;
  accuracyPct:    number | null;
  byDifficulty:   Partial<Record<Difficulty, QuizDifficultyBreakdown>>;
}

export interface LearningProfile {
  childId:             string;
  name:                string;
  language:            string;
  age:                 number;
  readingLevel:        ReadingLevel;
  completedStoryCount: number;
  totalMissionsDone:   number;
  lastActiveAt:        string | null;
  vocabulary:          VocabularyStats;
  quiz:                QuizStats;
  strengths:           QuestionType[];
  weaknesses:          QuestionType[];
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Fetches the computed learning profile for a child.
 * Calls the `get_child_learning_profile` security-definer RPC — the caller's
 * auth token must satisfy `is_my_child(childId)`.
 */
export async function getLearningProfile(
  supabase: SupabaseClient,
  childId: string,
): Promise<LearningProfile | null> {
  const { data, error } = await supabase.rpc("get_child_learning_profile", {
    p_child_id: childId,
  });

  if (error || !data) return null;

  const d = data as Record<string, unknown>;

  const vocab = d.vocabulary as Record<string, number> | undefined;
  const quiz  = d.quiz       as Record<string, unknown> | undefined;
  const byDiff = (quiz?.by_difficulty ?? {}) as Record<string, { total: number; correct: number }>;

  return {
    childId:             String(d.child_id ?? childId),
    name:                String(d.name     ?? ""),
    language:            String(d.language ?? "en"),
    age:                 Number(d.age      ?? 0),
    readingLevel:        (d.reading_level  ?? "emerging") as ReadingLevel,
    completedStoryCount: Number(d.completed_story_count ?? 0),
    totalMissionsDone:   Number(d.total_missions_done   ?? 0),
    lastActiveAt:        (d.last_active_at as string | null) ?? null,
    vocabulary: {
      totalEncountered: Number(vocab?.total_encountered ?? 0),
      totalPracticed:   Number(vocab?.total_practiced   ?? 0),
      totalMastered:    Number(vocab?.total_mastered    ?? 0),
    },
    quiz: {
      totalQuestions: Number(quiz?.total_questions ?? 0),
      correct:        Number(quiz?.correct         ?? 0),
      accuracyPct:    quiz?.accuracy_pct != null ? Number(quiz.accuracy_pct) : null,
      byDifficulty: {
        easy:   byDiff.easy   ?? undefined,
        medium: byDiff.medium ?? undefined,
        hard:   byDiff.hard   ?? undefined,
      },
    },
    strengths:  ((d.strengths  as string[]) ?? []) as QuestionType[],
    weaknesses: ((d.weaknesses as string[]) ?? []) as QuestionType[],
  };
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Records that a child encountered a vocabulary word.
 * Safe to call on every slot completion or Nimi explanation — the RPC
 * upserts and promotes status (encountered → practiced → mastered)
 * based on cumulative encounter count.
 */
export async function recordVocabEncounter(
  supabase: SupabaseClient,
  childId:   string,
  language:  string,
  word:      string,
  storyId?:  string | null,
  missionId?: string | null,
): Promise<void> {
  await supabase.rpc("record_vocab_encounter", {
    p_child_id:   childId,
    p_language:   language,
    p_word:       word,
    p_story_id:   storyId   ?? null,
    p_mission_id: missionId ?? null,
  });
}

/**
 * Records a single quiz result from a Nimi comprehension session.
 * Returns the new row's UUID, or null if the write failed.
 */
export async function recordQuizResult(
  supabase: SupabaseClient,
  opts: {
    childId:           string;
    language:          string;
    storyId:           string | null;
    questionText:      string;
    questionType:      QuestionType;
    difficulty:        Difficulty;
    answeredCorrectly: boolean;
    responseSummary?:  string | null;
  },
): Promise<string | null> {
  const { data, error } = await supabase.rpc("record_quiz_result", {
    p_child_id:           opts.childId,
    p_language:           opts.language,
    p_story_id:           opts.storyId,
    p_question_text:      opts.questionText,
    p_question_type:      opts.questionType,
    p_difficulty:         opts.difficulty,
    p_answered_correctly: opts.answeredCorrectly,
    p_response_summary:   opts.responseSummary ?? null,
  });

  if (error || !data) return null;
  return String(data);
}

// ── Prompt formatter ──────────────────────────────────────────────────────────

const LEVEL_DESCRIPTIONS: Record<ReadingLevel, string> = {
  emerging:   "just beginning — keep explanations very simple, use lots of encouragement",
  beginning:  "early reader — short sentences, simple words, concrete examples",
  developing: "growing reader — can handle slightly longer explanations with one new idea at a time",
  expanding:  "confident reader — enjoys richer vocabulary and can make connections between stories",
  fluent:     "advanced reader — can handle complex ideas, metaphors, and multi-step explanations",
};

/**
 * Renders a compact learning profile block for Nimi's system prompt.
 * Future AI features call this to add personalization context alongside
 * the story knowledge block.
 *
 * Returns an empty string when the profile has no meaningful data yet
 * (child brand-new — no missions, no quiz history) to avoid cluttering
 * Nimi's context with empty sections.
 */
export function formatProfileForPrompt(profile: LearningProfile): string {
  const { readingLevel, completedStoryCount, vocabulary, quiz, strengths, weaknesses } = profile;

  // No data yet — omit the block entirely
  if (completedStoryCount === 0 && vocabulary.totalEncountered === 0 && quiz.totalQuestions === 0) {
    return "";
  }

  const lines: string[] = [];

  lines.push(`📊 LEARNER PROFILE: ${profile.name}`);
  lines.push(`Reading level: ${readingLevel} — ${LEVEL_DESCRIPTIONS[readingLevel]}`);

  if (completedStoryCount > 0) {
    lines.push(`Stories completed: ${completedStoryCount}`);
  }

  if (vocabulary.totalEncountered > 0) {
    const mastered  = vocabulary.totalMastered  > 0 ? `, ${vocabulary.totalMastered} mastered`  : "";
    const practiced = vocabulary.totalPracticed > 0 ? `, ${vocabulary.totalPracticed} practiced` : "";
    lines.push(`Vocabulary: ${vocabulary.totalEncountered} words encountered${practiced}${mastered}`);
  }

  if (quiz.totalQuestions >= 3) {
    const pct = quiz.accuracyPct != null ? ` (${quiz.accuracyPct}% correct)` : "";
    lines.push(`Quiz history: ${quiz.totalQuestions} questions answered${pct}`);

    if (strengths.length > 0) {
      lines.push(`Strengths: ${strengths.join(", ")}`);
    }
    if (weaknesses.length > 0) {
      lines.push(`Needs practice: ${weaknesses.join(", ")}`);
    }
  }

  return lines.join("\n");
}
