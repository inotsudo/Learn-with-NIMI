// app/api/quiz-generator/route.ts
//
// Stateless AI quiz generator.
// Returns a Quiz JSON object from story vocabulary and teacher configuration.
// No DB writes. No classroom data. Completely independent from classroom
// analytics (Phases 5.1–5.2) and the lesson generator (Phase 5.3).
//
// Generation is always fresh — no caching — so teachers get variety
// on regeneration and can use this as a classroom resource bank.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildQuizPrompt,
  QUIZ_SYSTEM_PROMPT,
  validateQuiz,
  type QuizGeneratorRequest,
  type QuestionType,
  type DifficultyMix,
} from "@/lib/quizGenerator";
import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";

// ── Handler ───────────────────────────────────────────────────────────────────

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Auth: any authenticated user (teacher or admin)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse body
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const VALID_Q_TYPES = new Set<QuestionType>([
    "multiple_choice", "true_false", "fill_blank", "short_answer",
  ]);
  const VALID_MIXES = new Set<DifficultyMix>([
    "easy_heavy", "balanced", "hard_heavy",
  ]);

  const questionTypes: QuestionType[] = Array.isArray(b.questionTypes)
    ? (b.questionTypes as unknown[]).filter((t): t is QuestionType => VALID_Q_TYPES.has(t as QuestionType))
    : ["multiple_choice", "true_false"];
  if (questionTypes.length === 0) questionTypes.push("multiple_choice");

  const quizReq: QuizGeneratorRequest = {
    storyId:       typeof b.storyId      === "string" ? b.storyId : undefined,
    storyTitle:    typeof b.storyTitle   === "string" ? b.storyTitle : "Custom Quiz",
    vocabulary:    Array.isArray(b.vocabulary)
      ? (b.vocabulary as unknown[]).filter((w): w is string => typeof w === "string")
      : [],
    language:      (["en", "fr", "rw"].includes(b.language as string) ? b.language : "en") as string,
    ageRange:      (["5-7", "8-10", "11+"].includes(b.ageRange as string) ? b.ageRange : "8-10") as string,
    questionCount: ([5, 8, 10, 15].includes(Number(b.questionCount)) ? Number(b.questionCount) : 8),
    questionTypes,
    difficultyMix: (VALID_MIXES.has(b.difficultyMix as DifficultyMix) ? b.difficultyMix : "balanced") as DifficultyMix,
    storyContext:  typeof b.storyContext  === "string" ? b.storyContext.slice(0, 1000) : "",
    customFocus:   typeof b.customFocus  === "string" ? b.customFocus.slice(0, 400)   : "",
  };

  const userContent = buildQuizPrompt(quizReq);

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 35_000);

  try {
    const raw    = stripJson((await callAI({ type: 'quiz_generate', prompt: userContent, system: QUIZ_SYSTEM_PROMPT, temperature: 0.7, signal: controller.signal })).content);
    const parsed = JSON.parse(raw) as unknown;
    const quiz   = validateQuiz(parsed);

    if (!quiz) {
      return NextResponse.json(
        { error: "Failed to generate a valid quiz. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ quiz, generatedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("aborted")) {
      return NextResponse.json(
        { error: "Quiz generation timed out. Try fewer questions or simpler settings." },
        { status: 504 },
      );
    }
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
