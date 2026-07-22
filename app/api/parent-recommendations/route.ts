// app/api/parent-recommendations/route.ts
//
// Generates AI-written parent action recommendations from Phase 3 learning data.
// Four categories: bedtime_story · review_activity · reading_habit · supportive_action
//
// Auth:    Bearer token (same pattern as /api/nimi and /api/parent-insights)
// Cache:   In-process 4-hour TTL per child — regenerate on demand via bust:true
// Output:  { recommendations: ParentRecommendation[], childName, generatedAt }
//          | { insufficientData: true }  | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildInsightContext,
  formatInsightContextForPrompt,
  hasEnoughData,
  validateRecommendations,
  PARENT_RECOMMENDATIONS_PROMPT,
  type ParentRecommendation,
} from "@/lib/parentInsightBuilder";

// ── Cache (Redis-backed, in-memory fallback) ───────────────────────────────────

import { KvCache } from "@/lib/ai/kvCache";

const CACHE_TTL_SEC = 4 * 60 * 60;

interface CacheEntry {
  recommendations: ParentRecommendation[];
  childName:       string;
  generatedAt:     string;
}

const recCache = new KvCache<CacheEntry>('parent-recommendations', CACHE_TTL_SEC);

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

  // Parse
  let body: { childId?: string; language?: string; bust?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const childId  = body.childId;
  const language = body.language ?? "en";
  const bust     = body.bust === true;

  if (!childId || typeof childId !== "string") {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  // Verify caller owns this child (RLS on children enforces parent_id = auth.uid())
  const { data: ownedChild } = await authClient.from("children").select("id").eq("id", childId).single();
  if (!ownedChild) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Cache check
  const cacheKey = `${childId}:${language}`;
  if (!bust) {
    const cached = await recCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }
  }

  // Fetch Phase 3 context (reuses the same builder as insights)
  const ctx = await buildInsightContext(authClient, childId, language);

  if (!hasEnoughData(ctx)) {
    return NextResponse.json({
      recommendations:  [],
      childName:        ctx.childName,
      generatedAt:      new Date().toISOString(),
      insufficientData: true,
    });
  }

  // LLM call
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 15_000);

  let recommendations: ParentRecommendation[];
  try {
    const contextBlock = formatInsightContextForPrompt(ctx);
    const raw = stripJson((await callAI({ type: 'parent_recommendation', prompt: contextBlock, system: PARENT_RECOMMENDATIONS_PROMPT, temperature: 0.5, signal: controller.signal })).content);
    recommendations = validateRecommendations(JSON.parse(raw));
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[parent-recommendations] LLM call failed:", err);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 503 });
  } finally {
    clearTimeout(timeoutId);
  }

  if (recommendations.length === 0) {
    return NextResponse.json({ error: "No valid recommendations returned" }, { status: 502 });
  }

  // Cache + respond
  const entry: CacheEntry = {
    recommendations,
    childName:   ctx.childName,
    generatedAt: new Date().toISOString(),
  };
  await recCache.set(cacheKey, entry);

  return NextResponse.json({ ...entry, cached: false });
}
