// app/api/nimi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnrichedStoryKnowledge, formatEnrichedForNimi } from "@/lib/storyKnowledgeEngine";
import { deriveTeachingStrategy, formatTeachingStrategyForPrompt } from "@/lib/teachingStrategy";
import { getLearningProfile, recordQuizResult } from "@/lib/learningProfile";
import type { QuestionType } from "@/lib/learningProfile";
import {
  getAdaptationParams,
  buildVocabProtocol,
  buildQuestionProtocol,
  buildToneSection,
  type AdaptationParams,
} from "@/lib/adaptiveLearning";
import {
  generateGoals,
  incrementGoalProgress,
  formatGoalsForPrompt,
  type LearningGoal,
} from "@/lib/learningGoals";
import { markNeedsReview, markReviewed } from "@/lib/vocabularyProgress";
import { callAI, OPENROUTER_URL, OPENROUTER_KEY, DEFAULT_MODEL, QUALITY_MODEL } from "@/lib/ai/aiService";
import { inferFromEvent } from "@/lib/ai/memory";
import type { LearnerMemory } from "@/lib/ai/types";
import { detectEmotion, injectEmotionGuidance } from "@/lib/intelligence/emotionDetector";
import {
  persistConversationSummary,
  getRecentConversationContext,
  formatConversationHistoryForPrompt,
  getSessionId,
} from "@/lib/intelligence/conversationMemory";
import {
  getLearnerKnowledgeSummary,
  formatKnowledgeGraphForNimi,
} from "@/lib/learnerKnowledgeGraph";
import { routeKnowledge } from "@/lib/knowledgeRouter";
import type { RouterLearnerProfile } from "@/lib/knowledgeRouter/types";

// ── System prompt builder ──────────────────────────────────────────────────────
//
// Three modes, selected by what context is available:
//
//  1. STORY COMPANION  — storyKnowledgeBlock present.
//     Nimi acts as a dedicated story guide. Anti-hallucination boundaries.
//     Vocabulary, question, and tone sections are profile-calibrated via
//     AdaptationParams (see lib/adaptiveLearning.ts).
//
//  2. SHALLOW STORY    — storyTitle present but no knowledge block.
//     Nimi knows title and progress only; invites open discussion.
//
//  3. GENERAL CHAT     — no story context.
//     Pure companion mode — curiosity, games, facts, emotional support.

function buildSystemContent({
  childName,
  languageInstruction,
  storyKnowledgeBlock,
  storyTitle,
  storyEmoji,
  slotsDone,
  slotsTotal,
  adaptationParams,
  goalsBlock,
}: {
  childName: string;
  languageInstruction: string;
  storyKnowledgeBlock: string | null;
  storyTitle: string | null;
  storyEmoji: string | null;
  slotsDone: number;
  slotsTotal: number;
  adaptationParams: AdaptationParams;
  goalsBlock: string;
}): string {
  const name = childName || "this child";
  const nameIntro = childName
    ? `You're chatting with ${childName} right now — use their name sometimes.`
    : "";

  // ── 1. STORY COMPANION MODE ────────────────────────────────────────────────
  if (storyKnowledgeBlock) {
    return `\
You are Nimi 🧸, a warm and playful story companion for children aged 2–10.
${nameIntro}

YOUR ROLE RIGHT NOW: Be ${name}'s personal expert on the story they are reading. Everything you know about the story is provided in the STORY KNOWLEDGE section below. That section is your complete source of truth — use it, do not add to it.

━━━ STORY KNOWLEDGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${storyKnowledgeBlock}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO HANDLE EACH QUESTION TYPE:

CHARACTERS — Find character names in the STORY TEXT above. Bring them to life using only what the text says about them: their names, what they do, how they feel. Make it warm and vivid.

EVENTS ("what happened when...") — Look in the STORY TEXT pages above and retell it simply. You can say "On that page..." to make it feel real.

${buildVocabProtocol(adaptationParams)}

MORAL LESSON ("what did the story teach?") — Read the full STORY TEXT above. The lesson is usually shown through what the characters do and how things change for them. Explain it in one warm, simple sentence a young child can hold onto.

"WHAT HAPPENS NEXT?" — Follow the page order in the STORY TEXT above.

SOMETHING NOT IN THE KNOWLEDGE — If asked about a detail you cannot find above, say warmly: "Hmm, I'm not sure about that part! But I do know..." and then share something real from the story. Never invent characters, places, or events that are not in the story knowledge above.

COMPREHENSION QUESTIONS — When the child says things like "Quiz me!", "Ask me something!", "I want to answer questions", or when it feels natural after discussing the story, generate a comprehension question.

${buildQuestionProtocol(adaptationParams)}

${buildToneSection(adaptationParams, languageInstruction)}${goalsBlock ? `\n\n${goalsBlock}` : ""}`.trim();
  }

  // ── 2. SHALLOW STORY MODE ──────────────────────────────────────────────────
  if (storyTitle) {
    const progressNote = slotsTotal > 0
      ? ` They have completed ${slotsDone} of ${slotsTotal} story activities.`
      : "";
    return `\
You are Nimi 🧸, a warm, playful, and curious AI friend for children aged 2–10.
${nameIntro}

${name} is reading the story "${storyTitle}"${storyEmoji ? ` ${storyEmoji}` : ""}.${progressNote} Ask them what they thought about it — their favourite part, their favourite character, a funny or surprising moment, or what they learned.

${buildToneSection(adaptationParams, languageInstruction)}`.trim();
  }

  // ── 3. GENERAL CHAT MODE ───────────────────────────────────────────────────
  return `\
You are Nimi 🧸, a warm, playful, and curious AI friend for children aged 2–10.
${nameIntro}

Turn everyday moments into little games, jokes, or silly songs to keep things fun.
Celebrate wins enthusiastically and gently cheer the child up if they sound sad or bored.
Share tiny, fun facts (animals, colors, shapes, planets) when it feels right.
Never give scary or adult topics.

${buildToneSection(adaptationParams, languageInstruction)}${goalsBlock ? `\n\n${goalsBlock}` : ""}`.trim();
}

export const runtime = "edge";

// ── Story content fetchers ─────────────────────────────────────────────────────

async function fetchBookPages(
  supabase: SupabaseClient,
  storyId: string,
  language: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('story_pages')
      .select('page_number, story_page_versions(language, text, published)')
      .eq('story_id', storyId)
      .order('page_number');

    if (!data || data.length === 0) return null;

    const lines: string[] = [];
    for (const page of data as Array<{ page_number: number; story_page_versions: Array<{ language: string; text: string | null; published: boolean }> }>) {
      const versions = page.story_page_versions ?? [];
      const version = versions.find(v => v.language === language && v.published)
        ?? versions.find(v => v.language === 'en' && v.published);
      const text = version?.text?.trim();
      if (text) lines.push(`Page ${page.page_number}: ${text}`);
    }

    return lines.length > 0
      ? `STORY BOOK PAGES:\n${lines.join('\n')}`
      : null;
  } catch {
    return null;
  }
}

async function fetchSongLyrics(
  supabase: SupabaseClient,
  storyId: string,
  language: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('missions')
      .select('title, mission_versions(language, title, content_json, published)')
      .eq('story_id', storyId)
      .eq('type', 'sing');

    if (!data || data.length === 0) return null;

    const blocks: string[] = [];
    for (const mission of data as Array<{ title: string; mission_versions: Array<{ language: string; title: string | null; content_json: { lyrics?: string[] } | null; published: boolean }> }>) {
      const versions = mission.mission_versions ?? [];
      const version = versions.find(v => v.language === language && v.published)
        ?? versions.find(v => v.language === 'en' && v.published);
      const lyrics = version?.content_json?.lyrics;
      if (Array.isArray(lyrics) && lyrics.length > 0) {
        const songTitle = version?.title ?? mission.title ?? 'Song';
        blocks.push(`SONG: "${songTitle}"\n${lyrics.map((l, i) => `  ${i + 1}. ${l}`).join('\n')}`);
      }
    }

    return blocks.length > 0
      ? `SONG LYRICS:\n${blocks.join('\n\n')}`
      : null;
  } catch {
    return null;
  }
}

// 🇷🇼 Reviews/rewrites Kinyarwanda replies into natural, everyday spoken Kinyarwanda.
const KINYARWANDA_GUARDIAN_PROMPT = `You are Nimi's Kinyarwanda Language Guardian.

Your job is to review and improve any Kinyarwanda response before it is shown to the user.

GOAL:
Make every Kinyarwanda response sound like it was written by a native Rwandan speaker using natural everyday Kinyarwanda.

RULES:

1. Preserve the original meaning.
2. Preserve facts, instructions, and educational content.
3. Rewrite unnatural, translated, robotic, or overly formal Kinyarwanda.
4. Use common spoken Kinyarwanda used in Rwanda today.
5. Prefer shorter and more conversational sentences.
6. Sound friendly, warm, and natural.
7. If the audience is a child, use child-friendly language.
8. Never mix unnecessary English words into Kinyarwanda.
9. Never translate English sentence structures literally.
10. If the original response is already natural, return it unchanged.

AVOID PHRASES LIKE:
- Ni iki nakunganira?
- Muri iki gihe
- Ndagusaba
- Birashoboka ko
- Nishimiye kugufasha
- Mu rwego rwo
- Birakwiye ko

PREFER:
- Nagufasha iki?
- Ubu
- Mbwira
- Wenda
- Reka turebere hamwe
- Gerageza nanone
- Wabikoze neza
- Yego
- Oya

STYLE REQUIREMENTS:

- Sound like a native Rwandan speaker.
- Sound natural when spoken aloud.
- Avoid sounding like a translated government document.
- Avoid sounding like a machine.
- Use language commonly understood by primary and secondary school students.
- Maintain politeness without becoming overly formal.

QUALITY CHECK BEFORE RETURNING:

Ask yourself:
"Would an average Rwandan naturally say this in a normal conversation?"

If NO:
Rewrite again.

If YES:
Return the improved version.

OUTPUT:
Return ONLY the improved Kinyarwanda response.
Do not explain your changes.
Do not provide analysis.
Do not provide notes.`;

interface OpenRouterMessage {
  role: string;
  content: string;
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      messages,
      language = "en",
      childName = "",
      childId = null,
      storyId = null,
      storyTitle = null,
      storyEmoji = null,
      slotsDone = 0,
      slotsTotal = 0,
      // Optional quiz outcome sent by the client when the user answered a quiz
      // question in the previous Nimi turn. Shape:
      //   { word?: string | null, correct: boolean,
      //     questionType?: "comprehension"|"vocabulary"|"recall",
      //     questionText?: string }
      quizOutcome = null,
      // Set by client to trigger conversation summary persistence at session end
      persistSummary = false,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    if (messages.length > 20) {
      return NextResponse.json({ error: "Too many messages" }, { status: 400 });
    }
    if (messages.some((m: OpenRouterMessage) => typeof m.content !== "string" || m.content.length > 500)) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const LANGUAGE_NAMES: Record<string, string> = {
      en: "English",
      fr: "French",
      rw: "Kinyarwanda",
    };
    const languageName = LANGUAGE_NAMES[language] || "English";
    const languageInstruction =
      language === "rw"
        ? `Reply only in natural, native Kinyarwanda (Ikinyarwanda) as spoken by people in Rwanda — correct grammar and everyday vocabulary a young Rwandan child would hear at home. Do not switch to French or English, and do not mix in French/English words, except for a child's own name.`
        : `Stay in ${languageName} unless asked otherwise.`;

    // ── Story knowledge + learning profile + goals (parallel) ────────────────
    // All three fetches are non-fatal: failures fall back to the next-best context.
    // Story knowledge → Nimi's story content source of truth.
    // Learning profile → AdaptationParams that calibrate difficulty and depth.
    // Goals → awareness of today's/week's progress so Nimi can celebrate.
    // Extract the last user message for the knowledge router
    const lastUserMessage = (messages as OpenRouterMessage[])
      .filter(m => m.role === 'user')
      .at(-1)?.content ?? '';

    // First batch: all data fetches that don't depend on each other
    const [knowledgeResult, profileResult, goalsResult, memoriesResult, convHistoryResult, knowledgeGraphResult, bookPagesResult, songLyricsResult] = await Promise.allSettled([
      storyId
        ? getEnrichedStoryKnowledge(authClient, storyId, language, childId)
        : Promise.resolve(null),
      childId
        ? getLearningProfile(authClient, childId)
        : Promise.resolve(null),
      childId
        ? generateGoals(authClient, childId, language)
        : Promise.resolve([] as LearningGoal[]),
      childId
        ? authClient.rpc('get_learner_memories', { p_child_id: childId }).then(r => r.data as LearnerMemory[] ?? [])
        : Promise.resolve([] as LearnerMemory[]),
      childId && messages.length <= 2
        ? getRecentConversationContext(authClient, childId, 3)
        : Promise.resolve([]),
      // Global Learner Knowledge Graph — cross-story skill mastery + spaced repetition review queue
      childId
        ? getLearnerKnowledgeSummary(authClient, childId, language)
        : Promise.resolve(null),
      // Real book page texts from story_page_versions
      storyId ? fetchBookPages(authClient, storyId, language) : Promise.resolve(null),
      // Song lyrics from sing-along missions for this story
      storyId ? fetchSongLyrics(authClient, storyId, language) : Promise.resolve(null),
    ]);

    // Knowledge Router — called after first batch so profile age/readingLevel are real values
    const READING_LEVEL_MAP: Record<string, number> = {
      emerging: 1, beginning: 2, developing: 3, expanding: 4, fluent: 5,
    };
    const resolvedProfile = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const routerResult = lastUserMessage.length >= 5
      ? await routeKnowledge(authClient, {
          question: lastUserMessage,
          context:  storyTitle ? `story: ${storyTitle}` : undefined,
          learner: {
            childId,
            childName,
            age:          resolvedProfile?.age ?? null,
            readingLevel: resolvedProfile
              ? (READING_LEVEL_MAP[resolvedProfile.readingLevel] ?? null)
              : null,
            language,
            role: 'child',
          },
          storyId,
        }).catch(() => null)
      : null;

    let storyKnowledgeBlock: string | null = null;
    let storyAgeMin: number | null = null;
    if (knowledgeResult.status === "fulfilled" && knowledgeResult.value) {
      storyKnowledgeBlock = formatEnrichedForNimi(knowledgeResult.value);
      storyAgeMin = knowledgeResult.value.ageMin;
    } else if (knowledgeResult.status === "rejected") {
      console.error("[nimi] story knowledge fetch failed:", knowledgeResult.reason);
    }

    const profile =
      profileResult.status === "fulfilled" ? profileResult.value : null;

    const goals =
      goalsResult.status === "fulfilled" ? (goalsResult.value ?? []) : [];

    const memories: LearnerMemory[] =
      memoriesResult.status === "fulfilled" ? (memoriesResult.value ?? []) : [];

    const conversationHistory =
      convHistoryResult.status === "fulfilled" ? convHistoryResult.value : [];

    // All calibration rules live in adaptiveLearning.ts — nothing is hardcoded here.
    const adaptationParams = getAdaptationParams(profile, storyAgeMin);

    // ── Quiz outcome processing (fire-and-forget) ─────────────────────────────
    // The client sends quizOutcome when the previous AI turn asked a quiz question
    // and the child has now replied. We record it before generating the next
    // response so the accuracy signal is available on the *next* request.
    if (childId && quizOutcome && typeof quizOutcome === "object") {
      const qWord         = typeof quizOutcome.word         === "string" ? quizOutcome.word         : null;
      const qCorrect      = Boolean(quizOutcome.correct);
      const qQuestionType = (["comprehension", "vocabulary", "recall"].includes(quizOutcome.questionType)
        ? quizOutcome.questionType : "comprehension") as QuestionType;
      const qQuestionText = typeof quizOutcome.questionText === "string" ? quizOutcome.questionText : "(quiz)";

      // Store in child_quiz_results — drives the accuracy signal in adaptationParams
      void recordQuizResult(authClient, {
        childId,
        language,
        storyId,
        questionText:      qQuestionText,
        questionType:      qQuestionType,
        difficulty:        adaptationParams.questionDifficulty,
        answeredCorrectly: qCorrect,
      });

      // Update vocab review flag for the specific word that was quizzed
      if (qWord) {
        void (qCorrect
          ? markReviewed(authClient, childId, language, qWord)
          : markNeedsReview(authClient, childId, language, qWord));

        // Emit vocabulary_reviewed into memory inference
        void inferFromEvent(authClient, {
          type: 'vocabulary_reviewed',
          childId,
          payload: { word: qWord, correct: qCorrect, language },
          timestamp: Date.now(),
        });
      }

      // Emit quiz_completed into memory inference
      void inferFromEvent(authClient, {
        type: 'quiz_completed',
        childId,
        payload: { correct: qCorrect, questionType: qQuestionType, word: qWord ?? undefined, storyId: storyId ?? undefined },
        timestamp: Date.now(),
      });

      // Advance quiz_correct goal
      if (qCorrect) {
        void incrementGoalProgress(authClient, childId, language, "quiz_correct");
      }
    }

    const goalsBlock = formatGoalsForPrompt(goals);

    // Count this message as a chat exchange toward any active chat goals.
    // Fire-and-forget: a failure never surfaces to the user.
    if (childId) {
      void incrementGoalProgress(authClient, childId, language, "chat_exchanges");
    }

    let systemContent = buildSystemContent({
      childName,
      languageInstruction,
      storyKnowledgeBlock,
      storyTitle,
      storyEmoji,
      slotsDone,
      slotsTotal,
      adaptationParams,
      goalsBlock,
    });

    // Inject learner memory into the system prompt when available
    if (memories.length > 0) {
      const prefs = memories
        .filter(m => m.memory_type === 'preference' && m.confidence >= 0.6)
        .map(m => `${m.key}: ${JSON.stringify(m.value)}`).join(', ');
      const struggles = memories
        .filter(m => m.memory_type === 'struggle' && m.confidence >= 0.5)
        .map(m => m.key).join(', ');
      const achievements = memories
        .filter(m => m.memory_type === 'achievement')
        .map(m => m.key).join(', ');
      const personality = memories
        .filter(m => m.memory_type === 'personality')
        .map(m => `${m.key}: ${JSON.stringify(m.value)}`).join(', ');
      const vocabMastered = memories
        .filter(m => m.memory_type === 'skill' && m.key.startsWith('vocab_mastered_'))
        .slice(0, 8)
        .map(m => (m.value?.word as string | undefined) ?? m.key.replace('vocab_mastered_', ''))
        .join(', ');

      const memBlock = [
        prefs          && `Preferences: ${prefs}`,
        struggles      && `Needs extra support: ${struggles}`,
        achievements   && `Achievements: ${achievements}`,
        personality    && `Learning style: ${personality}`,
        vocabMastered  && `Vocab mastered: ${vocabMastered}`,
      ].filter(Boolean).join('\n');

      if (memBlock) systemContent += `\n\n## Learner Memory\n${memBlock}`;
    }

    // Inject cross-session conversation history (only on session start — first 2 messages)
    if (conversationHistory.length > 0 && messages.length <= 2) {
      const histBlock = formatConversationHistoryForPrompt(conversationHistory);
      if (histBlock) systemContent += `\n\n${histBlock}`;
    }

    // Inject Global Learner Knowledge Graph — spaced repetition review hints + skill profile
    const knowledgeGraphSummary =
      knowledgeGraphResult.status === "fulfilled" ? knowledgeGraphResult.value : null;
    if (knowledgeGraphSummary) {
      const graphBlock = formatKnowledgeGraphForNimi(knowledgeGraphSummary);
      if (graphBlock) systemContent += `\n\n${graphBlock}`;
    }

    // Inject real book page text so Nimi can answer page-specific questions
    const bookPages = bookPagesResult.status === "fulfilled" ? bookPagesResult.value : null;
    if (bookPages) {
      systemContent += `\n\n## Book Content\n${bookPages}\nUse these page texts to answer questions about what happens in the book. Quote or paraphrase directly from the pages above — do not invent content.`;
    }

    // Inject song lyrics so Nimi can sing along and answer lyric questions
    const songLyrics = songLyricsResult.status === "fulfilled" ? songLyricsResult.value : null;
    if (songLyrics) {
      systemContent += `\n\n## Song Content\n${songLyrics}\nWhen the child asks about the song, sings, or wants to practice lyrics, use the lines above. You can sing along, help them remember lines, or ask which part is their favourite.`;
    }

    // Inject Knowledge Router result — adds web knowledge, curriculum context, or
    // Nimipiko article content when internal sources are insufficient for the question.
    // Story/vocab/conversation intents are internal-only and never trigger web search.
    if (
      routerResult &&
      routerResult.knowledgeBlock &&
      (!routerResult.internalSufficient || routerResult.usedWebSearch)
    ) {
      systemContent += `\n\n${routerResult.knowledgeBlock}`;
    }

    // Teaching strategy — pure function, no LLM call.
    // Combines Layer 0 (curriculum), Layer 1 (analysis), Layer 2 (learner) into
    // concrete teaching rules for this child + this story + this moment.
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

    // Emotion detection — pure function, no LLM call
    const emotionSignal = detectEmotion(messages as { role: 'user' | 'assistant'; content: string }[]);
    systemContent = injectEmotionGuidance(systemContent, emotionSignal);

    const systemMessage = {
      role: "system",
      content: systemContent,
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // stay under Vercel edge 25s limit

    // 🇷🇼 Kinyarwanda: generate, then run through the Language Guardian for a natural rewrite,
    // then stream the polished result word-by-word so the UI keeps its typing effect.
    if (language === "rw") {
      try {
        const rawReply = (await callAI({
          type: 'nimi_chat',
          system: systemMessage.content,
          messages: (messages as OpenRouterMessage[]).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          temperature: 0.8,
          signal: controller.signal,
        })).content;

        let finalReply = rawReply;
        if (rawReply.trim()) {
          try {
            const improved = (await callAI({
              type: 'nimi_chat',
              system: KINYARWANDA_GUARDIAN_PROMPT,
              prompt: `Rewrite the following response into natural native Kinyarwanda while preserving the exact meaning.\n\nResponse:\n${rawReply}`,
              temperature: 0.3,
              signal: controller.signal,
            })).content;
            if (improved.trim()) finalReply = improved.trim();
          } catch (err) {
            console.error("Kinyarwanda guardian rewrite failed, using raw reply:", err);
          }
        }

        // Emit hint event if child asked for help (fire-and-forget)
        if (childId && messages.length > 0) {
          const lastMsg = (messages as OpenRouterMessage[]).at(-1)?.content?.toLowerCase() ?? '';
          if (lastMsg.includes('help') || lastMsg.includes('hint') || lastMsg.includes('ndamfasha')) {
            void Promise.resolve(
              authClient.rpc('log_learner_event', { p_child_id: childId, p_event_type: 'hint_requested', p_payload: { language, storyId } })
                .then(r2 => r2.data ? inferFromEvent(authClient, { type: 'hint_requested', childId, payload: { missionType: 'nimi_chat', storyId }, timestamp: Date.now() }) : null)
            ).catch(() => null);
          }
        }

        // Persist conversation summary on session end
        if (childId && persistSummary && messages.length >= 4) {
          const sessionId = getSessionId(childId);
          void persistConversationSummary(
            authClient, childId, sessionId,
            messages as { role: 'user' | 'assistant'; content: string }[],
            language, storyId,
          ).catch(() => null);
        }

        clearTimeout(timeoutId);

        const stream = new ReadableStream({
          async start(streamController) {
            const encoder = new TextEncoder();
            const parts = finalReply.match(/\s+|\S+/g) || [];
            for (const part of parts) {
              streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ content: part })}\n\n`));
              await new Promise(r => setTimeout(r, 25));
            }
            streamController.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Nimi Kinyarwanda pipeline error:", error);
        return NextResponse.json({ error: "AI service error" }, { status: 500 });
      }
    }

    // Emit hint event for non-Kinyarwanda path (fire-and-forget)
    if (childId && messages.length > 0) {
      const lastMsg = (messages as OpenRouterMessage[]).at(-1)?.content?.toLowerCase() ?? '';
      if (lastMsg.includes('help') || lastMsg.includes('hint')) {
        void Promise.resolve(
          authClient.rpc('log_learner_event', { p_child_id: childId, p_event_type: 'hint_requested', p_payload: { language, storyId } })
            .then(r2 => r2.data ? inferFromEvent(authClient, { type: 'hint_requested', childId, payload: { missionType: 'nimi_chat', storyId }, timestamp: Date.now() }) : null)
        ).catch(() => null);
      }
    }

    // Persist conversation summary when the session ends (client signals this)
    if (childId && persistSummary && messages.length >= 4) {
      const sessionId = getSessionId(childId);
      void persistConversationSummary(
        authClient,
        childId,
        sessionId,
        messages as { role: 'user' | 'assistant'; content: string }[],
        language,
        storyId,
      ).catch(() => null);
    }

    const payload = {
      model: QUALITY_MODEL,
      messages: [systemMessage, ...messages],
      temperature: 0.8, // more lively, natural
      stream: true,
    };

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenRouter API error:", text);
      return NextResponse.json({ error: "AI service error" }, { status: 500 });
    }

    // ✅ Safe streaming parser
    const stream = new ReadableStream({
      async start(streamController) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const reader = response.body?.getReader();
        if (!reader) return streamController.close();

        let buffer = "";

        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // save last incomplete line

            for (const line of lines) {
              if (!line.startsWith("data:") || line.includes("[DONE]")) continue;

              try {
                const data = JSON.parse(line.slice(5));
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  streamController.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch (err) {
                console.error("Error parsing chunk:", err, "Raw line:", line);
              }
            }
          }

          // flush final buffer if it contains a full JSON object
          if (buffer.trim().startsWith("data:")) {
            try {
              const data = JSON.parse(buffer.slice(5));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                streamController.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            } catch (err) {
              console.error("Final buffer parse error:", err, "Buffer:", buffer);
            }
          }
        } finally {
          streamController.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
