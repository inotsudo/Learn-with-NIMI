// app/api/nimi/route.ts — thin orchestrator (~80 lines)
// Heavy logic lives in:
//   lib/nimi/contextBuilder.ts   — parallel data fetches + system prompt assembly
//   lib/nimi/kinyarwandaPipeline.ts — two-LLM RW pass + word-stream
//   lib/nimi/sideEffects.ts      — quiz recording, hint logging, summary persist
//   lib/nimi/systemPromptBuilder.ts — prompt templates + Kinyarwanda Guardian prompt
//   lib/nimi/storyContentFetcher.ts — book pages + song lyrics fetchers

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"; // auth client only; gate check uses security-definer RPC
import { OPENROUTER_URL, OPENROUTER_KEY, QUALITY_MODEL } from "@/lib/ai/aiService";
import { buildNimiContext } from "@/lib/nimi/contextBuilder";
import { runKinyarwandaPipeline } from "@/lib/nimi/kinyarwandaPipeline";
import {
  recordQuizOutcome,
  logHintIfRequested,
  maybePersistSummary,
} from "@/lib/nimi/sideEffects";

export const runtime = "edge";

const LANGUAGE_NAMES: Record<string, string> = { en: "English", fr: "French", rw: "Kinyarwanda" };

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
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

  // ── Body parse ───────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const childId       = (body.childId       as string | null)  ?? null;
  const messages      = body.messages as Array<{ role: string; content: string }> | null;
  const language      = (body.language      as string)         ?? "en";
  const childName     = (body.childName     as string)         ?? "";
  const storyId       = (body.storyId       as string | null)  ?? null;
  const storyTitle    = (body.storyTitle    as string | null)  ?? null;
  const storyEmoji    = (body.storyEmoji    as string | null)  ?? null;
  const slotsDone     = (body.slotsDone     as number)         ?? 0;
  const slotsTotal    = (body.slotsTotal    as number)         ?? 0;
  const quizOutcome   = (body.quizOutcome   as Record<string, unknown> | null) ?? null;
  const persistSummary = Boolean(body.persistSummary);

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
  }
  if (messages.length > 20) {
    return NextResponse.json({ error: "Too many messages" }, { status: 400 });
  }
  if (messages.some(m => typeof m.content !== "string" || m.content.length > 500)) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  try {
    const languageInstruction =
      language === "rw"
        ? `Reply only in natural, native Kinyarwanda (Ikinyarwanda) as spoken by people in Rwanda — correct grammar and everyday vocabulary a young Rwandan child would hear at home. Do not switch to French or English, and do not mix in French/English words, except for a child's own name.`
        : `Stay in ${LANGUAGE_NAMES[language] ?? "English"} unless asked otherwise.`;

    // ── Freemium gate + context build in parallel ────────────────────────────
    // nimi_gate_check is a security-definer RPC that atomically checks the
    // subscription status AND increments the daily message count — one round-
    // trip instead of 2 sequential service-role queries.
    // Context building starts simultaneously so its 8 DB fetches run in
    // parallel with the gate check, eliminating one sequential wait.
    const [gateResult, nimiContext] = await Promise.all([
      authClient.rpc("nimi_gate_check", {
        p_parent_id: user.id,
        p_child_id:  childId ?? null,
      }),
      buildNimiContext(authClient, {
        childId,
        childName,
        language,
        languageInstruction,
        storyId,
        storyTitle,
        storyEmoji,
        slotsDone,
        slotsTotal,
        messages,
      }),
    ]);

    // Gate check: block if daily limit reached (free users only)
    const gate = gateResult.data as { allowed: boolean; subscribed: boolean; count?: number; limit?: number } | null;
    if (gate && !gate.allowed) {
      return NextResponse.json(
        { error: "daily_limit_reached", limit: gate.limit ?? 10 },
        { status: 429 },
      );
    }

    const { systemContent, adaptationParams } = nimiContext;

    // Side effects (fire-and-forget, never block response)
    if (childId && quizOutcome && typeof quizOutcome === "object") {
      recordQuizOutcome(
        authClient, childId, language, storyId,
        quizOutcome as { word?: string | null; correct: boolean; questionType?: string; questionText?: string },
        adaptationParams,
      );
    }
    if (childId) logHintIfRequested(authClient, childId, language, storyId, messages);
    if (childId) maybePersistSummary(authClient, childId, messages, language, storyId, persistSummary);

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20_000); // stay under Vercel edge 25s limit

    // ── Kinyarwanda: two-LLM pass + word-stream ──────────────────────────────
    if (language === "rw") {
      try {
        return await runKinyarwandaPipeline(systemContent, messages, controller.signal);
      } catch (err) {
        console.error("[nimi] Kinyarwanda pipeline error:", err);
        return NextResponse.json({ error: "AI service error" }, { status: 500 });
      }
    }

    // ── All other languages: streaming pass-through ───────────────────────────
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:       QUALITY_MODEL,
        messages:    [{ role: "system", content: systemContent }, ...messages],
        temperature: 0.8,
        stream:      true,
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      console.error("[nimi] OpenRouter error:", await upstream.text());
      return NextResponse.json({ error: "AI service error" }, { status: 500 });
    }

    const stream = new ReadableStream({
      async start(ctrl) {
        const dec = new TextDecoder();
        const enc = new TextEncoder();
        const reader = upstream.body?.getReader();
        if (!reader) return ctrl.close();

        let buf = "";
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data:") || line.includes("[DONE]")) continue;
              try {
                const data    = JSON.parse(line.slice(5));
                const content = data.choices?.[0]?.delta?.content;
                if (content) ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ content })}\n\n`));
              } catch { /* malformed chunk — skip */ }
            }
          }

          if (buf.trim().startsWith("data:")) {
            try {
              const data    = JSON.parse(buf.slice(5));
              const content = data.choices?.[0]?.delta?.content;
              if (content) ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ content })}\n\n`));
            } catch { /* ignore */ }
          }
        } finally {
          ctrl.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        Connection:      "keep-alive",
      },
    });
  } catch (error) {
    console.error("[nimi] unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
