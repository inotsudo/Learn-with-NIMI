// lib/nimi/sideEffects.ts
// All fire-and-forget side effects for a Nimi turn:
//   • Quiz outcome recording
//   • Vocabulary review flagging
//   • Hint logging
//   • Conversation summary persistence
// Every function returns void and swallows errors — none of these must block the response.

import type { SupabaseClient } from "@supabase/supabase-js";
import { recordQuizResult } from "@/lib/learningProfile";
import type { QuestionType } from "@/lib/learningProfile";
import { markNeedsReview, markReviewed } from "@/lib/vocabularyProgress";
import { inferFromEvent } from "@/lib/ai/memory";
import { incrementGoalProgress } from "@/lib/learningGoals";
import { persistConversationSummary, getSessionId } from "@/lib/intelligence/conversationMemory";
import type { AdaptationParams } from "@/lib/adaptiveLearning";

interface QuizOutcome {
  word?: string | null;
  correct: boolean;
  questionType?: string;
  questionText?: string;
}

export function recordQuizOutcome(
  supabase: SupabaseClient,
  childId: string,
  language: string,
  storyId: string | null,
  quizOutcome: QuizOutcome,
  adaptationParams: AdaptationParams,
): void {
  const qWord         = typeof quizOutcome.word         === "string" ? quizOutcome.word         : null;
  const qCorrect      = Boolean(quizOutcome.correct);
  const qQuestionType = (
    ["comprehension", "vocabulary", "recall"].includes(quizOutcome.questionType ?? "")
      ? quizOutcome.questionType
      : "comprehension"
  ) as QuestionType;
  const qQuestionText = typeof quizOutcome.questionText === "string" ? quizOutcome.questionText : "(quiz)";

  void recordQuizResult(supabase, {
    childId,
    language,
    storyId,
    questionText:      qQuestionText,
    questionType:      qQuestionType,
    difficulty:        adaptationParams.questionDifficulty,
    answeredCorrectly: qCorrect,
  });

  if (qWord) {
    void (qCorrect
      ? markReviewed(supabase, childId, language, qWord)
      : markNeedsReview(supabase, childId, language, qWord));

    void inferFromEvent(supabase, {
      type: "vocabulary_reviewed",
      childId,
      payload: { word: qWord, correct: qCorrect, language },
      timestamp: Date.now(),
    });
  }

  void inferFromEvent(supabase, {
    type: "quiz_completed",
    childId,
    payload: {
      correct:      qCorrect,
      questionType: qQuestionType,
      word:         qWord ?? undefined,
      storyId:      storyId ?? undefined,
    },
    timestamp: Date.now(),
  });

  if (qCorrect) {
    void incrementGoalProgress(supabase, childId, language, "quiz_correct");
  }
}

export function logHintIfRequested(
  supabase: SupabaseClient,
  childId: string,
  language: string,
  storyId: string | null,
  messages: Array<{ role: string; content: string }>,
): void {
  if (!messages.length) return;
  const lastMsg = messages.at(-1)?.content?.toLowerCase() ?? "";
  const isHint  = lastMsg.includes("help") || lastMsg.includes("hint") || lastMsg.includes("ndamfasha");
  if (!isHint) return;

  void Promise.resolve(
    supabase
      .rpc("log_learner_event", {
        p_child_id:   childId,
        p_event_type: "hint_requested",
        p_payload:    { language, storyId },
      })
      .then(r => {
        if (r.data) {
          return inferFromEvent(supabase, {
            type:    "hint_requested",
            childId,
            payload: { missionType: "nimi_chat", storyId },
            timestamp: Date.now(),
          });
        }
      }),
  ).catch(() => null);
}

export function maybePersistSummary(
  supabase: SupabaseClient,
  childId: string,
  messages: Array<{ role: string; content: string }>,
  language: string,
  storyId: string | null,
  persistSummary: boolean,
): void {
  if (!persistSummary || messages.length < 4) return;
  const sessionId = getSessionId(childId);
  void persistConversationSummary(
    supabase,
    childId,
    sessionId,
    messages as { role: "user" | "assistant"; content: string }[],
    language,
    storyId,
  ).catch(() => null);
}
