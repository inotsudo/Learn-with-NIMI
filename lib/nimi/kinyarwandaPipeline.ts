// lib/nimi/kinyarwandaPipeline.ts
// Kinyarwanda two-pass pipeline:
//   1. Generate a raw Nimi reply (quality model, 15 s budget).
//   2. Run it through the Language Guardian for a natural RW rewrite
//      (fast model, 5 s budget — falls back to raw reply on timeout).
//   3. Stream the polished result word-by-word so the UI typing effect works.
//
// Separate AbortControllers prevent a slow main generation from consuming
// the guardian budget, and cap total latency at ~20 s under worst-case load.

import { callAI } from "@/lib/ai/aiService";
import { KINYARWANDA_GUARDIAN_PROMPT } from "./systemPromptBuilder";

interface Message {
  role: string;
  content: string;
}

// Shared parent signal is still respected — if the outer route aborts (e.g.
// the client disconnects) both passes abort immediately.
function childSignal(parentSignal: AbortSignal, timeoutMs: number): AbortSignal {
  const ctrl = new AbortController();

  const timer = setTimeout(() => ctrl.abort(new DOMException("Timeout", "TimeoutError")), timeoutMs);

  // Propagate parent abort to child
  if (parentSignal.aborted) {
    ctrl.abort(parentSignal.reason);
  } else {
    parentSignal.addEventListener("abort", () => {
      clearTimeout(timer);
      ctrl.abort(parentSignal.reason);
    }, { once: true });
  }

  // Clear the timer when child is done (avoids leaks)
  ctrl.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });

  return ctrl.signal;
}

export async function runKinyarwandaPipeline(
  systemContent: string,
  messages: Message[],
  parentSignal: AbortSignal,
): Promise<Response> {
  // Pass 1: main Nimi response — quality model, 15 s
  const rawReply = (
    await callAI({
      type:        "nimi_chat",
      model:       "quality",
      system:      systemContent,
      messages:    messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      temperature: 0.8,
      signal:      childSignal(parentSignal, 15_000),
    })
  ).content;

  // Pass 2: Language Guardian — fast model, 5 s hard cap, graceful fallback
  let finalReply = rawReply;
  if (rawReply.trim()) {
    try {
      const improved = (
        await callAI({
          type:        "nimi_chat",
          model:       "fast",            // guardian only rewrites, quality model is overkill
          system:      KINYARWANDA_GUARDIAN_PROMPT,
          prompt:      `Rewrite the following response into natural native Kinyarwanda while preserving the exact meaning.\n\nResponse:\n${rawReply}`,
          temperature: 0.3,
          maxTokens:   600,              // guardian output ≤ raw reply length
          signal:      childSignal(parentSignal, 5_000),
        })
      ).content;
      if (improved.trim()) finalReply = improved.trim();
    } catch (err) {
      // Timeout or guardian error → serve the raw reply so the user isn't left waiting
      const name = err instanceof Error ? err.name : "";
      if (name !== "TimeoutError" && name !== "AbortError") {
        console.error("[nimi/kw] guardian rewrite failed:", err);
      }
      // finalReply stays as rawReply — no further action needed
    }
  }

  // Stream polished reply word-by-word (preserves the UI typing effect)
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const parts   = finalReply.match(/\s+|\S+/g) ?? [];
      for (const part of parts) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: part })}\n\n`));
        await new Promise(r => setTimeout(r, 25));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      Connection:      "keep-alive",
    },
  });
}
