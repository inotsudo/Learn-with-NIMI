// app/api/teacher-insights/route.ts
//
// Teacher-scoped AI insights route.
// One call fetches the classroom summary RPC, builds a single LLM prompt with
// the full class context, and returns three structured arrays:
//   class_insights  — 3–5 classroom-level observations
//   student_flags   — up to 5 individual students flagged (struggling / excelling)
//   focus_areas     — 2–3 actionable priorities for the teacher this week
//
// Cache: 4 hours per teacher ID (module-level Map, Edge-runtime safe).
// Reuse: normalizeClassroomSummary + formatters live in lib/teacherInsightBuilder.ts
// and are callable by any future consumer (admin dashboards, email digests).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeClassroomSummary,
  formatClassroomContextForPrompt,
  hasEnoughClassroomData,
  validateClassInsights,
  validateStudentFlags,
  validateFocusAreas,
  type ClassInsight,
  type StudentFlag,
  type FocusArea,
} from "@/lib/teacherInsightBuilder";

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

interface CacheEntry {
  class_insights: ClassInsight[];
  student_flags:  StudentFlag[];
  focus_areas:    FocusArea[];
  expiresAt:      number;
}

const aiCache = new Map<string, CacheEntry>();

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are an expert learning analytics advisor writing concise, data-grounded
insights for a primary-school teacher to review between classes.

TASK: Analyse the classroom data below and return a single JSON object with
three keys. Read every student row before writing anything.

REQUIRED FORMAT — return ONLY valid JSON, no markdown fences:
{
  "class_insights": [
    { "type": "strength|gap|trend|observation", "title": "...", "body": "..." }
  ],
  "student_flags": [
    {
      "child_id": "...",
      "name": "...",
      "flag_type": "struggling|excelling|at_risk|improving",
      "reason": "...",
      "suggestion": "..."
    }
  ],
  "focus_areas": [
    {
      "area": "vocabulary|comprehension|reading_habit|quiz_accuracy|engagement",
      "title": "...",
      "detail": "...",
      "action": "..."
    }
  ]
}

RULES FOR class_insights (3–5 items):
- "strength"    — something the class is genuinely doing well
- "gap"         — a skill area where the class data shows a shortfall
- "trend"       — a pattern visible across multiple students (only if clear from data)
- "observation" — a neutral but useful pattern in the numbers
- title: ≤60 chars, plain language a non-specialist teacher understands
- body: 1–2 warm sentences grounded specifically in the numbers provided
- Do NOT invent figures, trends, or student names not present in the data

RULES FOR student_flags (0–5 items; only flag when data clearly justifies it):
- struggling: quiz accuracy ≤ 40 % with ≥ 5 questions
- excelling:  reading level "expanding" or "fluent" AND quiz accuracy ≥ 70 % with ≥ 5 questions
- at_risk:    0 completed stories AND 0 vocab words (no learning activity at all)
- improving:  only flag when something in the data shows a clear positive signal
- If quiz_questions < 5 for a student, do not flag them based on quiz accuracy alone
- child_id must exactly match the child_id from the student detail rows
- reason:     ≤80 chars, references specific numbers
- suggestion: ≤80 chars, starts with a verb, practical for a classroom teacher

RULES FOR focus_areas (2–3 items):
- Choose areas the data actually supports; do not fabricate priorities
- title:  ≤55 chars
- detail: 1–2 sentences explaining the specific issue in this class
- action: ≤80 chars, starts with a verb, immediately actionable this week

ONLY output the JSON object — nothing else before or after it.`;

import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";

// ── Handler ───────────────────────────────────────────────────────────────────

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Auth
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
  let body: { teacherId?: string; bust?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const teacherId = body.teacherId;
  const bust      = body.bust === true;

  if (!teacherId || typeof teacherId !== "string") {
    return NextResponse.json({ error: "teacherId required" }, { status: 400 });
  }

  // Only the teacher can request their own insights
  if (user.id !== teacherId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cache check
  if (!bust) {
    const hit = aiCache.get(teacherId);
    if (hit && hit.expiresAt > Date.now()) {
      return NextResponse.json({
        class_insights: hit.class_insights,
        student_flags:  hit.student_flags,
        focus_areas:    hit.focus_areas,
        generatedAt:    new Date(hit.expiresAt - CACHE_TTL_MS).toISOString(),
        cached:         true,
      });
    }
  }

  // Fetch classroom summary from DB
  const { data: rawSummary, error: dbErr } = await authClient
    .rpc("get_classroom_learning_summary", { p_teacher_id: teacherId });

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  // Fetch teacher profile for name/class_name
  const { data: profileRow } = await authClient
    .from("teacher_profiles")
    .select("name, class_name")
    .eq("id", teacherId)
    .single();

  const teacher = {
    name:       (profileRow?.name       as string | null) ?? "Teacher",
    class_name: (profileRow?.class_name as string | null) ?? null,
  };

  const ctx = normalizeClassroomSummary(
    rawSummary as Record<string, unknown>,
    teacher,
  );

  if (!hasEnoughClassroomData(ctx)) {
    return NextResponse.json({
      class_insights:  [],
      student_flags:   [],
      focus_areas:     [],
      generatedAt:     new Date().toISOString(),
      insufficientData: true,
    });
  }

  const contextBlock    = formatClassroomContextForPrompt(ctx);
  const validChildIds   = new Set(ctx.students.map(s => s.child_id));

  // Single LLM call for all three sections
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 25_000);

  let class_insights: ClassInsight[] = [];
  let student_flags:  StudentFlag[]  = [];
  let focus_areas:    FocusArea[]    = [];

  try {
    const raw = stripJson((await callAI({ type: 'teacher_insight', prompt: contextBlock, system: SYSTEM_PROMPT, temperature: 0.4, signal: controller.signal })).content);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    class_insights = validateClassInsights(parsed.class_insights);
    student_flags  = validateStudentFlags(parsed.student_flags, validChildIds);
    focus_areas    = validateFocusAreas(parsed.focus_areas);
  } catch {
    // Partial / empty result is still returned and cached so a bad response
    // doesn't hammer the LLM on every subsequent page load.
  } finally {
    clearTimeout(timeoutId);
  }

  aiCache.set(teacherId, {
    class_insights,
    student_flags,
    focus_areas,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return NextResponse.json({
    class_insights,
    student_flags,
    focus_areas,
    generatedAt: new Date().toISOString(),
    cached:      false,
  });
}
