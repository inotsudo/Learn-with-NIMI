// app/api/lesson-generator/route.ts
//
// Stateless AI lesson plan generator.
// Accepts a structured lesson request (story context, language, age range,
// duration, focus) and returns a complete LessonPlan JSON.
//
// No DB writes. No classroom data. Completely independent from the classroom
// analytics pipeline (Phases 5.1–5.2). Any authenticated user can call this —
// the only DB dependency is the auth check in the RPC the client called first.
//
// No caching here: lesson plans are generated fresh by design (teachers
// re-generate when they want a variation). Rate-limiting is left to the
// platform's API key rotation and the Edge function concurrency limits.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildLessonPrompt,
  LESSON_SYSTEM_PROMPT,
  validateLessonPlan,
  type LessonGeneratorRequest,
} from "@/lib/lessonGenerator";
import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";

// ── Handler ───────────────────────────────────────────────────────────────────

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Auth: any authenticated user (teacher or admin) may call this
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

  // Parse and validate request body
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const lessonReq: LessonGeneratorRequest = {
    storyId:          typeof b.storyId   === "string" ? b.storyId   : undefined,
    storyTitle:       typeof b.storyTitle === "string" ? b.storyTitle : "Custom Lesson",
    vocabulary:       Array.isArray(b.vocabulary) ? (b.vocabulary as unknown[]).filter(w => typeof w === "string") as string[] : [],
    language:         (["en", "fr", "rw"].includes(b.language as string) ? b.language : "en") as "en" | "fr" | "rw",
    ageRange:         (["5-7", "8-10", "11+"].includes(b.ageRange as string) ? b.ageRange : "8-10") as "5-7" | "8-10" | "11+",
    durationMinutes:  ([20, 30, 45, 60].includes(Number(b.durationMinutes)) ? Number(b.durationMinutes) : 45) as 20 | 30 | 45 | 60,
    focus:            (["vocabulary", "comprehension", "both"].includes(b.focus as string) ? b.focus : "both") as "vocabulary" | "comprehension" | "both",
    customObjectives: typeof b.customObjectives === "string" ? b.customObjectives.slice(0, 600) : "",
  };

  const userContent = buildLessonPrompt(lessonReq);

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 30_000);

  try {
    const raw    = stripJson((await callAI({ type: 'lesson_generate', prompt: userContent, system: LESSON_SYSTEM_PROMPT, temperature: 0.65, signal: controller.signal })).content);
    const parsed = JSON.parse(raw) as unknown;
    const plan   = validateLessonPlan(parsed);

    if (!plan) {
      return NextResponse.json({ error: "Failed to generate a valid lesson plan. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ plan, generatedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("aborted")) {
      return NextResponse.json({ error: "Generation timed out. Try a shorter duration or simpler focus." }, { status: 504 });
    }
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
