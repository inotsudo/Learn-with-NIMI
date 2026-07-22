// app/api/parent-insights/route.ts
//
// Generates AI-written parent insights from a child's Phase 3 learning data.
//
// Auth:    Bearer token in Authorization header (same pattern as /api/nimi).
// Cache:   In-process TTL (4 h per child) — fast repeat loads within a session.
// Output:  { insights: InsightResult[], childName: string, generatedAt: string }
//          | { error: string }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildInsightContext,
  formatInsightContextForPrompt,
  hasEnoughData,
  validateInsights,
  PARENT_INSIGHTS_PROMPT,
  type InsightResult,
} from "@/lib/parentInsightBuilder";

import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";
import { KvCache } from "@/lib/ai/kvCache";

// ── Cache (Redis-backed, in-memory fallback) ──────────────────────────────────

const CACHE_TTL_SEC = 4 * 60 * 60;

interface CachedEntry {
  insights:    InsightResult[];
  childName:   string;
  generatedAt: string;
}

const insightCache = new KvCache<CachedEntry>('parent-insights', CACHE_TTL_SEC);


export const runtime = "edge";

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
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

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { childId?: string; language?: string; bust?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const childId  = body.childId;
  const language = body.language ?? "en";
  const bust     = body.bust === true;   // force regeneration (e.g. after new session)

  if (!childId || typeof childId !== "string") {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  // Verify caller owns this child (RLS on children enforces parent_id = auth.uid())
  const { data: ownedChild } = await authClient.from("children").select("id").eq("id", childId).single();
  if (!ownedChild) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── Cache check ───────────────────────────────────────────────────────────
  const cacheKey = `${childId}:${language}`;
  if (!bust) {
    const cached = await insightCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }
  }

  // ── Fetch Phase 3 data ────────────────────────────────────────────────────
  const ctx = await buildInsightContext(authClient, childId, language);

  if (!hasEnoughData(ctx)) {
    return NextResponse.json({
      insights:    [],
      childName:   ctx.childName,
      generatedAt: new Date().toISOString(),
      insufficientData: true,
    });
  }

  // ── Call LLM ──────────────────────────────────────────────────────────────
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 15_000);

  let insights: InsightResult[];
  try {
    const contextBlock = formatInsightContextForPrompt(ctx);
    const raw = stripJson((await callAI({ type: 'parent_insight', prompt: contextBlock, system: PARENT_INSIGHTS_PROMPT, temperature: 0.4, signal: controller.signal })).content);
    insights = validateInsights(JSON.parse(raw));
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[parent-insights] LLM call failed:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 503 });
  } finally {
    clearTimeout(timeoutId);
  }

  if (insights.length === 0) {
    return NextResponse.json({ error: "No valid insights returned" }, { status: 502 });
  }

  // ── Cache + respond ───────────────────────────────────────────────────────
  const entry: CachedEntry = {
    insights,
    childName:   ctx.childName,
    generatedAt: new Date().toISOString(),
  };
  await insightCache.set(cacheKey, entry);

  return NextResponse.json({ ...entry, cached: false });
}
