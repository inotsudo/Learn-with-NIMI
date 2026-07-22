// app/api/creativity-challenges/route.ts — Phase 7.4
//
// Generates 3 daily creative challenges for a child:
//   { type: "drawing"|"coloring"|"writing", prompt: string, stars: 5 }
// Prompts are themed around the child's story and language.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";
import { inferFromEvent } from "@/lib/ai/memory";

export const runtime = "edge";

const SYSTEM_PROMPT = `\
You are Nimi, a creative teacher for African primary-school children.
Generate 3 fun daily creative challenges for a child based on their story theme.

Rules:
- One challenge per type: "drawing", "coloring", "writing"
- Each prompt is 1 short exciting sentence (max 12 words), child-friendly, action-based
- drawing: something to draw ("Draw a brave elephant splashing in the river!")
- coloring: something to color a specific way ("Color the sunset with 3 different oranges!")
- writing: something to write/say ("Write 3 words that describe how the bird felt!")
- Make them match the story theme if given, or use African nature/community themes
- Language: as requested (en=English, fr=French, rw=English since no Kinyarwanda TTS)
- stars: always 5 for each

Respond ONLY with valid JSON array, no code fences:
[
  { "type": "drawing",  "prompt": "...", "stars": 5 },
  { "type": "coloring", "prompt": "...", "stars": 5 },
  { "type": "writing",  "prompt": "...", "stars": 5 }
]`;

interface Challenge {
  type:   "drawing" | "coloring" | "writing";
  prompt: string;
  stars:  number;
}

function validate(raw: unknown): Challenge[] | null {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const TYPES = new Set(["drawing", "coloring", "writing"]);
  const result: Challenge[] = [];
  for (const item of raw.slice(0, 3)) {
    if (typeof item !== "object" || item === null) return null;
    const o = item as Record<string, unknown>;
    if (!TYPES.has(o.type as string)) return null;
    if (typeof o.prompt !== "string" || !o.prompt.trim()) return null;
    result.push({
      type:   o.type   as Challenge["type"],
      prompt: (o.prompt as string).slice(0, 120),
      stars:  typeof o.stars === "number" ? Math.min(o.stars, 20) : 5,
    });
  }
  return result.length === 3 ? result : null;
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b        = body as Record<string, unknown>;
  const lang     = ["en","fr","rw"].includes(b.language as string) ? b.language as string : "en";
  const theme    = typeof b.storyTitle === "string" ? b.storyTitle.slice(0, 100) : "nature and adventure";
  const ageRange = typeof b.ageRange   === "string" ? b.ageRange : "8-10";
  const childId  = typeof b.childId    === "string" ? b.childId : null;

  const userContent = [`Story theme: "${theme}"`, `Language: ${lang}`, `Age range: ${ageRange}`].join("\n");

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 15_000);

  try {
    const raw = stripJson((await callAI({ type: 'creativity_challenge', prompt: userContent, system: SYSTEM_PROMPT, temperature: 0.85, signal: controller.signal })).content);

    const challenges = validate(JSON.parse(raw) as unknown);
    if (!challenges) return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });

    // Emit mission_completed for all challenge types (fire-and-forget)
    if (childId) {
      for (const c of challenges) {
        void Promise.resolve(
          client.rpc('log_learner_event', { p_child_id: childId, p_event_type: 'mission_completed', p_payload: { missionType: c.type, stars: c.stars } })
            .then(r2 => r2.data ? inferFromEvent(client, { type: 'mission_completed', childId, payload: { missionType: c.type, stars: c.stars }, timestamp: Date.now() }) : null)
        ).catch(() => null);
      }
    }

    return NextResponse.json({ challenges });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("aborted")) return NextResponse.json({ error: "Timed out" }, { status: 504 });
    return NextResponse.json({ error: "Challenge generation failed" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
