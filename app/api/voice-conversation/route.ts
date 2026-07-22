// app/api/voice-conversation/route.ts — Phase 6.2
//
// Voice-optimised conversation endpoint. Shorter, plainer responses than the
// standard /api/nimi route — designed for text-to-speech playback.
// Stateless: the client owns the message history and sends it each request.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildVoiceSystemPrompt,
  validateVoiceResponse,
  type VoiceConvLanguage,
  type VoiceConvAgeRange,
  type VoiceMessage,
} from "@/lib/voiceConversation";
import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";
import { getEnrichedStoryKnowledge, formatForVoice } from "@/lib/storyKnowledgeEngine";

export const runtime = "edge";

const VALID_LANGS    = new Set<VoiceConvLanguage>(["en","fr","rw"]);
const VALID_AGES     = new Set<VoiceConvAgeRange>(["5-7","8-10","11+"]);

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

  const language      = VALID_LANGS.has(b.language as VoiceConvLanguage) ? b.language as VoiceConvLanguage : "en";
  const ageRange      = VALID_AGES.has(b.ageRange  as VoiceConvAgeRange) ? b.ageRange  as VoiceConvAgeRange : "8-10";
  const childName     = typeof b.childName  === "string" ? b.childName.slice(0, 60)   : "friend";
  const storyTitle    = typeof b.storyTitle === "string" ? b.storyTitle.slice(0, 120)  : undefined;
  const storyId       = typeof b.storyId    === "string" ? b.storyId                  : null;
  const childId       = typeof b.childId    === "string" ? b.childId                  : null;
  const sttConfidence = typeof b.sttConfidence === "number" ? b.sttConfidence : undefined;
  const messages: VoiceMessage[] = Array.isArray(b.messages)
    ? (b.messages as unknown[])
        .filter(m => typeof (m as VoiceMessage).content === "string" && ["user","assistant"].includes((m as VoiceMessage).role))
        .map(m => ({ role: (m as VoiceMessage).role, content: String((m as VoiceMessage).content).slice(0, 500) }))
        .slice(-12)
    : [];

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
  }

  // Inject low-confidence hint into the last user message if needed
  if (sttConfidence !== undefined && sttConfidence < 0.55) {
    const last = messages[messages.length - 1];
    messages[messages.length - 1] = {
      ...last,
      content: last.content + " [Note: speech recognition confidence was low — the child may have mispronounced some words]",
    };
  }

  // Fetch enriched story knowledge when a storyId is provided
  let storyKnowledgeBlock: string | null = null;
  if (storyId) {
    try {
      const enriched = await getEnrichedStoryKnowledge(authClient, storyId, language, childId);
      if (enriched) storyKnowledgeBlock = formatForVoice(enriched);
    } catch {
      // non-fatal — voice conversation works without story context
    }
  }

  let systemPrompt = buildVoiceSystemPrompt(childName, language, ageRange, storyTitle);
  if (storyKnowledgeBlock) {
    systemPrompt += `\n\n## Story Context\n${storyKnowledgeBlock}`;
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 20_000);

  try {
    const raw      = stripJson((await callAI({
      type:        'voice_chat',
      system:      systemPrompt,
      messages:    messages.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      temperature: 0.8,
      signal:      controller.signal,
    })).content);
    const response = validateVoiceResponse(JSON.parse(raw) as unknown);
    if (!response) {
      return NextResponse.json({ error: "Invalid AI response. Please try again." }, { status: 502 });
    }
    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("aborted")) {
      return NextResponse.json({ error: "Response timed out. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "Conversation failed. Please try again." }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
