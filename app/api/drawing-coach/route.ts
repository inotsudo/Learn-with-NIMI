// app/api/drawing-coach/route.ts — Phase 7.2
//
// Two actions:
//   action: "steps"    → generate step-by-step drawing lesson
//   action: "feedback" → warm feedback after child finishes

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildDrawingCoachPrompt,
  buildDrawingFeedbackPrompt,
  validateDrawingCoachResponse,
  validateDrawingFeedbackResponse,
  DRAWING_SUBJECTS,
  type DrawingCoachRequest,
  type DrawingFeedbackRequest,
} from "@/lib/drawingCoach";
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
  const action  = b.action === "feedback" ? "feedback" : "steps";
  const childId = typeof b.childId === "string" ? b.childId : null;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 20_000);

  try {
    if (action === "steps") {
      const subjectId = typeof b.subjectId === "string" ? b.subjectId : null;
      const subject   = DRAWING_SUBJECTS.find(s => s.id === subjectId) ?? DRAWING_SUBJECTS[0];
      const r: DrawingCoachRequest = {
        subject,
        language:  ["en","fr","rw"].includes(b.language as string) ? b.language as string : "en",
        ageRange:  ["5-7","8-10","11+"].includes(b.ageRange as string) ? b.ageRange as string : "8-10",
        childName: typeof b.childName === "string" ? b.childName.slice(0, 60) : "friend",
      };
      const raw  = stripJson((await callAI({ type: 'drawing_coach', prompt: buildDrawingCoachPrompt(r), temperature: 0.65, signal: controller.signal })).content);
      const data = validateDrawingCoachResponse(JSON.parse(raw) as unknown);
      if (!data) return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
      return NextResponse.json({ ...data, subject });
    } else {
      const r: DrawingFeedbackRequest = {
        subject:   typeof b.subject   === "string" ? b.subject.slice(0, 80)   : "drawing",
        childNote: typeof b.childNote === "string" ? b.childNote.slice(0, 400) : "I finished!",
        childName: typeof b.childName === "string" ? b.childName.slice(0, 60)  : "friend",
        language:  ["en","fr","rw"].includes(b.language as string) ? b.language as string : "en",
      };
      const raw  = stripJson((await callAI({ type: 'drawing_coach', prompt: buildDrawingFeedbackPrompt(r), temperature: 0.65, signal: controller.signal })).content);
      const data = validateDrawingFeedbackResponse(JSON.parse(raw) as unknown);
      if (!data) return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });

      // Emit mission_completed for memory inference (fire-and-forget)
      if (childId) {
        void Promise.resolve(
          client.rpc('log_learner_event', { p_child_id: childId, p_event_type: 'mission_completed', p_payload: { missionType: 'drawing', stars: 3 } })
            .then(r2 => r2.data ? inferFromEvent(client, { type: 'mission_completed', childId, payload: { missionType: 'drawing', stars: 3 }, timestamp: Date.now() }) : null)
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
