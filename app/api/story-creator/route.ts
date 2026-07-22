// app/api/story-creator/route.ts — Phase 7.3

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildStoryCreatorPrompt,
  validateCreatedStory,
  type StoryCreatorRequest,
  type StoryHero,
  type StorySetting,
  type StoryProblem,
} from "@/lib/storyCreator";
import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";
import { inferFromEvent } from "@/lib/ai/memory";

export const runtime = "edge";

const VALID_HEROES    = ["child","animal","bird","elder","twins"] as const;
const VALID_SETTINGS  = ["forest","village","river","sky","savanna","school","market","night"] as const;
const VALID_PROBLEMS  = ["lost","storm","friend","gift","journey","mystery"] as const;

function isHero(v: unknown): v is StoryHero       { return VALID_HEROES.includes(v as StoryHero); }
function isSetting(v: unknown): v is StorySetting  { return VALID_SETTINGS.includes(v as StorySetting); }
function isProblem(v: unknown): v is StoryProblem  { return VALID_PROBLEMS.includes(v as StoryProblem); }

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
  const b = body as Record<string, unknown>;

  const heroName = typeof b.heroName === "string" && b.heroName.trim() ? b.heroName.trim().slice(0, 60) : null;
  if (!heroName) return NextResponse.json({ error: "heroName is required" }, { status: 400 });
  if (!isHero(b.heroType)) return NextResponse.json({ error: "Invalid heroType" }, { status: 400 });
  if (!isSetting(b.setting)) return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
  if (!isProblem(b.problem)) return NextResponse.json({ error: "Invalid problem" }, { status: 400 });

  const rawMoments = b.childMoments;
  if (!Array.isArray(rawMoments) || rawMoments.length < 3) {
    return NextResponse.json({ error: "childMoments (3 items) is required" }, { status: 400 });
  }
  const childMoments: [string, string, string] = [
    typeof rawMoments[0] === "string" ? rawMoments[0].slice(0, 400) : "",
    typeof rawMoments[1] === "string" ? rawMoments[1].slice(0, 400) : "",
    typeof rawMoments[2] === "string" ? rawMoments[2].slice(0, 400) : "",
  ];
  if (childMoments.some(m => m.trim().length < 2)) {
    return NextResponse.json({ error: "Each childMoment must have content" }, { status: 400 });
  }

  const childId = typeof b.childId === "string" ? b.childId : null;

  const r: StoryCreatorRequest = {
    heroName,
    heroType:     b.heroType,
    setting:      b.setting,
    problem:      b.problem,
    language:     ["en","fr","rw"].includes(b.language as string) ? b.language as string : "en",
    ageRange:     ["5-7","8-10","11+"].includes(b.ageRange as string) ? b.ageRange as string : "8-10",
    childName:    typeof b.childName === "string" ? b.childName.slice(0, 60) : "friend",
    childMoments,
  };

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 30_000);

  try {
    const raw = stripJson((await callAI({
      type: 'story_generate',
      prompt: buildStoryCreatorPrompt(r),
      temperature: 0.8,
      signal: controller.signal,
    })).content);

    const story = validateCreatedStory(JSON.parse(raw) as unknown);
    if (!story) return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });

    // Emit story_created event for memory inference (fire-and-forget)
    if (childId) {
      void Promise.resolve(
        client.rpc('log_learner_event', { p_child_id: childId, p_event_type: 'story_created', p_payload: { heroName: r.heroName, heroType: r.heroType } })
          .then(r2 => r2.data ? inferFromEvent(client, { type: 'story_created', childId, payload: { heroName: r.heroName, heroType: r.heroType }, timestamp: Date.now() }) : null)
      ).catch(() => null);
    }

    return NextResponse.json(story);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("aborted")) return NextResponse.json({ error: "Timed out" }, { status: 504 });
    return NextResponse.json({ error: "Story generation failed" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
