// app/api/homework-generator/route.ts
//
// Stateless AI homework generator.
// Returns a HomeworkDocument from story vocabulary, classroom progress data,
// and teacher configuration.
//
// The classroom context (vocabulary review words, dominant reading level)
// is passed in by the client — it was fetched client-side from
// get_classroom_learning_summary so this route stays stateless.
//
// No DB writes. No caching — homework is generated fresh so every
// regeneration gives a variation the teacher can choose from.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildHomeworkPrompt,
  HOMEWORK_SYSTEM_PROMPT,
  validateHomeworkDocument,
  type HomeworkGeneratorRequest,
  type HomeworkFocus,
  type HomeworkLanguage,
  type HomeworkDuration,
  type HomeworkAgeRange,
} from "@/lib/homeworkGenerator";
import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";

// ── Handler ───────────────────────────────────────────────────────────────────

export const runtime = "edge";

const VALID_FOCUSES   = new Set<HomeworkFocus>(["vocabulary","comprehension","creative","mixed"]);
const VALID_DURATIONS = new Set<HomeworkDuration>([15, 20, 30, 40]);
const VALID_AGES      = new Set<HomeworkAgeRange>(["5-7","8-10","11+"]);
const VALID_LANGS     = new Set<HomeworkLanguage>(["en","fr","rw"]);

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

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

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const hwReq: HomeworkGeneratorRequest = {
    storyId:              typeof b.storyId        === "string" ? b.storyId : undefined,
    storyTitle:           typeof b.storyTitle      === "string" ? b.storyTitle : "Custom Homework",
    storyVocabulary:      Array.isArray(b.storyVocabulary)
      ? (b.storyVocabulary as unknown[]).filter((w): w is string => typeof w === "string")
      : [],
    language:             (VALID_LANGS.has(b.language as HomeworkLanguage)
      ? b.language : "en") as HomeworkLanguage,
    ageRange:             (VALID_AGES.has(b.ageRange as HomeworkAgeRange)
      ? b.ageRange : "8-10") as HomeworkAgeRange,
    durationMinutes:      (VALID_DURATIONS.has(Number(b.durationMinutes) as HomeworkDuration)
      ? Number(b.durationMinutes) : 20) as HomeworkDuration,
    focus:                (VALID_FOCUSES.has(b.focus as HomeworkFocus)
      ? b.focus : "mixed") as HomeworkFocus,
    reviewWords:          Array.isArray(b.reviewWords)
      ? (b.reviewWords as unknown[]).filter((w): w is string => typeof w === "string").slice(0, 12)
      : [],
    dominantReadingLevel: typeof b.dominantReadingLevel === "string" ? b.dominantReadingLevel : null,
    includeParentNote:    b.includeParentNote !== false,
    customInstructions:   typeof b.customInstructions === "string"
      ? b.customInstructions.slice(0, 500) : "",
  };

  const userContent = buildHomeworkPrompt(hwReq);

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 30_000);

  try {
    const raw  = stripJson((await callAI({ type: 'homework_generate', prompt: userContent, system: HOMEWORK_SYSTEM_PROMPT, temperature: 0.65, signal: controller.signal })).content);
    const doc  = validateHomeworkDocument(JSON.parse(raw) as unknown);

    if (!doc) {
      return NextResponse.json(
        { error: "Failed to generate a valid homework assignment. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ homework: doc, generatedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("aborted")) {
      return NextResponse.json(
        { error: "Generation timed out. Try a shorter duration or simpler focus." },
        { status: 504 },
      );
    }
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
