// app/api/coloring-coach/route.ts — Phase 7.1
//
// Two actions in one route:
//   action: "suggest"  → colour palette recommendations for a page
//   action: "feedback" → warm feedback on the child's colour choices

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildColoringSuggestionPrompt,
  buildColoringFeedbackPrompt,
  validateColoringCoachResponse,
  validateColoringFeedbackResponse,
  type ColoringCoachRequest,
  type ColoringFeedbackRequest,
} from "@/lib/coloringCoach";
import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";
import { inferFromEvent } from "@/lib/ai/memory";

export const runtime = "edge";

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
  const action  = b.action === "feedback" ? "feedback" : "suggest";
  const childId = typeof b.childId === "string" ? b.childId : null;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 20_000);

  try {
    if (action === "suggest") {
      const r: ColoringCoachRequest = {
        storyTitle: typeof b.storyTitle === "string" ? b.storyTitle.slice(0, 120) : "My Story",
        storyEmoji: typeof b.storyEmoji === "string" ? b.storyEmoji.slice(0, 4)   : null,
        pageNumber: typeof b.pageNumber === "number" ? b.pageNumber               : 1,
        language:   ["en","fr","rw"].includes(b.language as string) ? b.language as string : "en",
        ageRange:   ["5-7","8-10","11+"].includes(b.ageRange as string) ? b.ageRange as string : "8-10",
        childName:  typeof b.childName === "string" ? b.childName.slice(0, 60) : "friend",
      };
      const raw  = stripJson((await callAI({ type: 'coloring_coach', prompt: buildColoringSuggestionPrompt(r), temperature: 0.7, signal: controller.signal })).content);
      const data = validateColoringCoachResponse(JSON.parse(raw) as unknown);
      if (!data) return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
      return NextResponse.json(data);
    } else {
      const r: ColoringFeedbackRequest = {
        storyTitle:  typeof b.storyTitle  === "string" ? b.storyTitle.slice(0, 120)  : "My Story",
        pageNumber:  typeof b.pageNumber  === "number" ? b.pageNumber                : 1,
        childColors: typeof b.childColors === "string" ? b.childColors.slice(0, 400) : "many colors",
        language:    ["en","fr","rw"].includes(b.language as string) ? b.language as string : "en",
        ageRange:    ["5-7","8-10","11+"].includes(b.ageRange as string) ? b.ageRange as string : "8-10",
        childName:   typeof b.childName   === "string" ? b.childName.slice(0, 60) : "friend",
      };
      const raw  = stripJson((await callAI({ type: 'coloring_coach', prompt: buildColoringFeedbackPrompt(r), temperature: 0.7, signal: controller.signal })).content);
      const data = validateColoringFeedbackResponse(JSON.parse(raw) as unknown);
      if (!data) return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });

      // Emit mission_completed for memory inference (fire-and-forget)
      if (childId) {
        void Promise.resolve(
          client.rpc('log_learner_event', { p_child_id: childId, p_event_type: 'mission_completed', p_payload: { missionType: 'coloring', stars: 3 } })
            .then(r2 => r2.data ? inferFromEvent(client, { type: 'mission_completed', childId, payload: { missionType: 'coloring', stars: 3 }, timestamp: Date.now() }) : null)
        ).catch(() => null);
      }

      return NextResponse.json(data);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("aborted")) return NextResponse.json({ error: "Timed out" }, { status: 504 });
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
