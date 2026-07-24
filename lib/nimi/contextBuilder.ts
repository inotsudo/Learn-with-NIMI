// lib/nimi/contextBuilder.ts
// Orchestrates all parallel data fetches for a single Nimi turn and assembles
// the complete system prompt content string. Returns contextual data that the
// route handler needs for post-response side effects.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getEnrichedStoryKnowledge, formatEnrichedForNimi } from "@/lib/storyKnowledgeEngine";
import { deriveTeachingStrategy, formatTeachingStrategyForPrompt } from "@/lib/teachingStrategy";
import { getLearningProfile } from "@/lib/learningProfile";
import {
  getAdaptationParams,
  type AdaptationParams,
} from "@/lib/adaptiveLearning";
import {
  generateGoals,
  incrementGoalProgress,
  formatGoalsForPrompt,
  type LearningGoal,
} from "@/lib/learningGoals";
import { callAI } from "@/lib/ai/aiService";
import { inferFromEvent } from "@/lib/ai/memory";
import type { LearnerMemory } from "@/lib/ai/types";
import { detectEmotion, injectEmotionGuidance } from "@/lib/intelligence/emotionDetector";
import {
  getRecentConversationContext,
  formatConversationHistoryForPrompt,
} from "@/lib/intelligence/conversationMemory";
import {
  getLearnerKnowledgeSummary,
  formatKnowledgeGraphForNimi,
} from "@/lib/learnerKnowledgeGraph";
import { routeKnowledge } from "@/lib/knowledgeRouter";
import { fetchBookPages, fetchSongLyrics } from "./storyContentFetcher";
import { buildSystemContent } from "./systemPromptBuilder";

export interface NimiContext {
  systemContent: string;
  adaptationParams: AdaptationParams;
  storyKnowledgeBlock: string | null;
}

const READING_LEVEL_MAP: Record<string, number> = {
  emerging: 1, beginning: 2, developing: 3, expanding: 4, fluent: 5,
};

export async function buildNimiContext(
  supabase: SupabaseClient,
  {
    childId,
    childName,
    language,
    languageInstruction,
    storyId,
    storyTitle,
    storyEmoji,
    slotsDone,
    slotsTotal,
    messages,
  }: {
    childId: string | null;
    childName: string;
    language: string;
    languageInstruction: string;
    storyId: string | null;
    storyTitle: string | null;
    storyEmoji: string | null;
    slotsDone: number;
    slotsTotal: number;
    messages: Array<{ role: string; content: string }>;
  },
): Promise<NimiContext> {
  const lastUserMessage = messages.filter(m => m.role === "user").at(-1)?.content ?? "";

  // ── Parallel data fetches (all non-fatal) ─────────────────────────────────
  const [
    knowledgeResult,
    profileResult,
    goalsResult,
    memoriesResult,
    convHistoryResult,
    knowledgeGraphResult,
    bookPagesResult,
    songLyricsResult,
  ] = await Promise.allSettled([
    storyId
      ? getEnrichedStoryKnowledge(supabase, storyId, language, childId)
      : Promise.resolve(null),
    childId ? getLearningProfile(supabase, childId) : Promise.resolve(null),
    childId
      ? generateGoals(supabase, childId, language)
      : Promise.resolve([] as LearningGoal[]),
    childId
      ? supabase
          .rpc("get_learner_memories", { p_child_id: childId })
          .then(r => (r.data as LearnerMemory[]) ?? [])
      : Promise.resolve([] as LearnerMemory[]),
    childId && messages.length <= 2
      ? getRecentConversationContext(supabase, childId, 3)
      : Promise.resolve([]),
    childId
      ? getLearnerKnowledgeSummary(supabase, childId, language)
      : Promise.resolve(null),
    storyId ? fetchBookPages(supabase, storyId, language) : Promise.resolve(null),
    storyId ? fetchSongLyrics(supabase, storyId, language) : Promise.resolve(null),
  ]);

  // ── Knowledge Router (needs profile to inform age/readingLevel) ───────────
  const resolvedProfile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const routerResult =
    lastUserMessage.length >= 5
      ? await routeKnowledge(supabase, {
          question: lastUserMessage,
          context: storyTitle ? `story: ${storyTitle}` : undefined,
          learner: {
            childId,
            childName,
            age: resolvedProfile?.age ?? null,
            readingLevel: resolvedProfile
              ? (READING_LEVEL_MAP[resolvedProfile.readingLevel] ?? null)
              : null,
            language,
            role: "child",
          },
          storyId,
        }).catch(() => null)
      : null;

  // ── Resolve settled results ────────────────────────────────────────────────
  let storyKnowledgeBlock: string | null = null;
  let storyAgeMin: number | null = null;
  if (knowledgeResult.status === "fulfilled" && knowledgeResult.value) {
    storyKnowledgeBlock = formatEnrichedForNimi(knowledgeResult.value);
    storyAgeMin = knowledgeResult.value.ageMin;
  } else if (knowledgeResult.status === "rejected") {
    console.error("[nimi] story knowledge fetch failed:", knowledgeResult.reason);
  }

  const profile = resolvedProfile;
  const goals = goalsResult.status === "fulfilled" ? (goalsResult.value ?? []) : [];
  const memories: LearnerMemory[] =
    memoriesResult.status === "fulfilled" ? (memoriesResult.value ?? []) : [];
  const conversationHistory =
    convHistoryResult.status === "fulfilled" ? convHistoryResult.value : [];
  const adaptationParams = getAdaptationParams(profile, storyAgeMin);

  // Fire-and-forget: chat_exchanges goal progress
  if (childId) {
    void incrementGoalProgress(supabase, childId, language, "chat_exchanges");
  }

  // ── Assemble system prompt ─────────────────────────────────────────────────
  let systemContent = buildSystemContent({
    childName,
    languageInstruction,
    storyKnowledgeBlock,
    storyTitle,
    storyEmoji,
    slotsDone,
    slotsTotal,
    adaptationParams,
    goalsBlock: formatGoalsForPrompt(goals),
  });

  // Learner memory block
  if (memories.length > 0) {
    const prefs = memories
      .filter(m => m.memory_type === "preference" && m.confidence >= 0.6)
      .map(m => `${m.key}: ${JSON.stringify(m.value)}`)
      .join(", ");
    const struggles = memories
      .filter(m => m.memory_type === "struggle" && m.confidence >= 0.5)
      .map(m => m.key)
      .join(", ");
    const achievements = memories
      .filter(m => m.memory_type === "achievement")
      .map(m => m.key)
      .join(", ");
    const personality = memories
      .filter(m => m.memory_type === "personality")
      .map(m => `${m.key}: ${JSON.stringify(m.value)}`)
      .join(", ");
    const vocabMastered = memories
      .filter(m => m.memory_type === "skill" && m.key.startsWith("vocab_mastered_"))
      .slice(0, 8)
      .map(m => (m.value?.word as string | undefined) ?? m.key.replace("vocab_mastered_", ""))
      .join(", ");

    const memBlock = [
      prefs         && `Preferences: ${prefs}`,
      struggles     && `Needs extra support: ${struggles}`,
      achievements  && `Achievements: ${achievements}`,
      personality   && `Learning style: ${personality}`,
      vocabMastered && `Vocab mastered: ${vocabMastered}`,
    ].filter(Boolean).join("\n");

    if (memBlock) systemContent += `\n\n## Learner Memory\n${memBlock}`;
  }

  // Cross-session conversation history (first 2 messages only)
  if (conversationHistory.length > 0 && messages.length <= 2) {
    const histBlock = formatConversationHistoryForPrompt(conversationHistory);
    if (histBlock) systemContent += `\n\n${histBlock}`;
  }

  // Knowledge graph
  const knowledgeGraphSummary =
    knowledgeGraphResult.status === "fulfilled" ? knowledgeGraphResult.value : null;
  if (knowledgeGraphSummary) {
    const graphBlock = formatKnowledgeGraphForNimi(knowledgeGraphSummary);
    if (graphBlock) systemContent += `\n\n${graphBlock}`;
  }

  // Book pages
  const bookPages = bookPagesResult.status === "fulfilled" ? bookPagesResult.value : null;
  if (bookPages) {
    systemContent += `\n\n## Book Content\n${bookPages}\nUse these page texts to answer questions about what happens in the book. Quote or paraphrase directly from the pages above — do not invent content.`;
  }

  // Song lyrics
  const songLyrics = songLyricsResult.status === "fulfilled" ? songLyricsResult.value : null;
  if (songLyrics) {
    systemContent += `\n\n## Song Content\n${songLyrics}\nWhen the child asks about the song, sings, or wants to practice lyrics, use the lines above. You can sing along, help them remember lines, or ask which part is their favourite.`;
  }

  // Knowledge Router result
  if (routerResult?.knowledgeBlock && (!routerResult.internalSufficient || routerResult.usedWebSearch)) {
    systemContent += `\n\n${routerResult.knowledgeBlock}`;
  }

  // Teaching strategy (only when full story knowledge is available)
  if (storyKnowledgeBlock) {
    const enrichedKnowledge = knowledgeResult.status === "fulfilled" ? knowledgeResult.value : null;
    const teachingStrategy = deriveTeachingStrategy(
      adaptationParams,
      enrichedKnowledge?.learner ?? null,
      enrichedKnowledge?.analysis ?? null,
      enrichedKnowledge?.curriculum ?? null,
    );
    const strategyBlock = formatTeachingStrategyForPrompt(teachingStrategy, childName);
    if (strategyBlock) systemContent += `\n\n${strategyBlock}`;
  }

  // Emotion detection
  const emotionSignal = detectEmotion(messages as { role: "user" | "assistant"; content: string }[]);
  systemContent = injectEmotionGuidance(systemContent, emotionSignal);

  return { systemContent, adaptationParams, storyKnowledgeBlock };
}
