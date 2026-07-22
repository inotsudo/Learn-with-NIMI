// app/api/pronunciation-coach/route.ts — Phase 6.3
//
// Pronunciation feedback endpoint. Receives:
//   - expected text (what the child was asked to read)
//   - spoken text (what STT captured)
//   - pre-computed analysis from pronunciationAnalyzer (score, missed words)
//   - child info (name, age, language)
//
// Returns an LLM-generated encouragement message + specific pronunciation tips.
// The algorithmic scoring stays client-side; this route only adds the human
// touch — warm feedback that a child would enjoy hearing.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PronunciationAnalysis } from "@/lib/pronunciationAnalyzer";
import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";
import { inferFromEvent } from "@/lib/ai/memory";

export const runtime = "edge";

const SYSTEM_PROMPT = `\
You are Nimi, a warm and encouraging reading coach for African primary-school children.
A child has just read a passage aloud. You have their pronunciation analysis results.

Write a short, encouraging voice response. Rules:
- NO markdown — plain spoken text only (will be read aloud via TTS)
- Start by celebrating the attempt ("Great job reading!", "You tried so hard!")
- If score ≥ 80: mostly celebrate, give one small tip if needed
- If score 50–79: celebrate effort, gently practise 1–2 difficult words
- If score < 50: lots of encouragement, focus on just ONE word to improve
- Never say "you got X% right" — just be warm and specific
- Keep it SHORT: 2–3 sentences max
- End with an invitation to try again ("Ready to try again?", "Shall we go again?")

OUTPUT FORMAT — respond ONLY with valid JSON, no code fences:
{
  "encouragement": "...",
  "practice_word": "...",
  "practice_tip": "...",
  "invite_retry": "..."
}

practice_word: the single most important word to practise (or null if score ≥ 85)
practice_tip: how to say that word (e.g., "Say it slowly: el-e-phant") — or null
invite_retry: a short invitation to try again`;

export interface PronunciationCoachResponse {
  encouragement: string;
  practice_word: string | null;
  practice_tip:  string | null;
  invite_retry:  string;
}

function validate(raw: unknown): PronunciationCoachResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const encouragement = typeof r.encouragement === "string" ? r.encouragement.trim() : null;
  if (!encouragement) return null;
  return {
    encouragement: encouragement.slice(0, 300),
    practice_word: typeof r.practice_word === "string" ? r.practice_word.slice(0, 60) : null,
    practice_tip:  typeof r.practice_tip  === "string" ? r.practice_tip.slice(0, 200) : null,
    invite_retry:  typeof r.invite_retry  === "string" ? r.invite_retry.slice(0, 100) : "Want to try again?",
  };
}

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
  const b = body as Record<string, unknown>;

  const expected   = typeof b.expected   === "string" ? b.expected.slice(0, 500)  : "";
  const spoken     = typeof b.spoken     === "string" ? b.spoken.slice(0, 500)    : "";
  const childName  = typeof b.childName  === "string" ? b.childName.slice(0, 60)  : "friend";
  const language   = ["en","fr","rw"].includes(b.language as string) ? b.language as string : "en";
  const ageRange   = ["5-7","8-10","11+"].includes(b.ageRange as string) ? b.ageRange as string : "8-10";
  const analysis   = b.analysis as PronunciationAnalysis | undefined;
  const childId    = typeof b.childId === "string" ? b.childId : null;

  if (!expected || !spoken) {
    return NextResponse.json({ error: "expected and spoken are required" }, { status: 400 });
  }

  const missedList = analysis?.missedWords.slice(0, 5).join(", ") ?? "";
  const closeList  = analysis?.closeWords.slice(0, 5).join(", ") ?? "";
  const score      = analysis?.score ?? 0;

  const userContent = [
    `CHILD: ${childName} (age range: ${ageRange}, language: ${language})`,
    `EXPECTED: "${expected}"`,
    `SPOKEN: "${spoken}"`,
    `SCORE: ${score}/100`,
    missedList  ? `MISSED WORDS: ${missedList}`  : "",
    closeList   ? `CLOSE WORDS (almost right): ${closeList}` : "",
  ].filter(Boolean).join("\n");

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 20_000);

  try {
    const raw      = stripJson((await callAI({ type: 'pronunciation_coach', prompt: userContent, system: SYSTEM_PROMPT, temperature: 0.7, signal: controller.signal })).content);
    const feedback = validate(JSON.parse(raw) as unknown);
    if (!feedback) {
      return NextResponse.json({ error: "Invalid AI response. Please try again." }, { status: 502 });
    }

    // Emit hint event if child struggled (score < 50) — fire-and-forget
    if (childId && score < 50) {
      void Promise.resolve(
        authClient.rpc('log_learner_event', { p_child_id: childId, p_event_type: 'hint_requested', p_payload: { missionType: 'pronunciation', score, language } })
          .then(r2 => r2.data ? inferFromEvent(authClient, { type: 'hint_requested', childId, payload: { missionType: 'pronunciation', score }, timestamp: Date.now() }) : null)
      ).catch(() => null);
    }

    return NextResponse.json(feedback);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("aborted")) {
      return NextResponse.json({ error: "Response timed out." }, { status: 504 });
    }
    return NextResponse.json({ error: "Feedback generation failed. Please try again." }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
