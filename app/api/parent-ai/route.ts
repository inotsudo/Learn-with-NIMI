// app/api/parent-ai/route.ts
//
// Single Edge route that returns both parent insights AND recommendations in one
// response. Replaces the two independent routes as the primary data source for
// LearningBrainTab — one auth, one buildInsightContext call, two parallel LLM
// calls sharing the same context block, one cache entry per child.
//
// The old /api/parent-insights and /api/parent-recommendations routes still
// exist and can be called independently (e.g. for email digests), but the
// parent dashboard no longer calls them directly.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildInsightContext,
  formatInsightContextForPrompt,
  hasEnoughData,
  validateInsights,
  validateRecommendations,
  PARENT_INSIGHTS_PROMPT,
  PARENT_RECOMMENDATIONS_PROMPT,
  type InsightResult,
  type ParentRecommendation,
} from "@/lib/parentInsightBuilder";
import { callAI, stripJson, OPENROUTER_KEY } from "@/lib/ai/aiService";
import type { LearnerMemory } from "@/lib/ai/types";
import { KvCache } from "@/lib/ai/kvCache";
import { getEnrichedStoryKnowledge, formatForParent } from "@/lib/storyKnowledgeEngine";

// ── Cache (Redis-backed, in-memory fallback) ──────────────────────────────────

const CACHE_TTL_SEC = 4 * 60 * 60;

interface CacheEntry {
  insights:        InsightResult[];
  recommendations: ParentRecommendation[];
  childName:       string;
  generatedAt:     string;
}

const aiCache = new KvCache<CacheEntry>('parent-ai', CACHE_TTL_SEC);


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

  // Parse body
  let body: { childId?: string; language?: string; storyId?: string; bust?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const childId  = body.childId;
  const language = body.language ?? "en";
  const storyId  = body.storyId ?? null;
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
    const hit = await aiCache.get(cacheKey);
    if (hit) {
      return NextResponse.json({ ...hit, cached: true });
    }
  }

  // Build context + learner memories + optional story knowledge in parallel
  const [ctx, memoriesResult, storyKnowledgeResult] = await Promise.all([
    buildInsightContext(authClient, childId, language),
    (async (): Promise<LearnerMemory[]> => {
      try {
        const r = await authClient.rpc('get_learner_memories', { p_child_id: childId });
        return (r.data ?? []) as LearnerMemory[];
      } catch { return []; }
    })(),
    storyId
      ? getEnrichedStoryKnowledge(authClient, storyId, language, childId).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!hasEnoughData(ctx)) {
    return NextResponse.json({
      insights:         [],
      recommendations:  [],
      childName:        ctx.childName,
      generatedAt:      new Date().toISOString(),
      insufficientData: true,
    });
  }

  let contextBlock = formatInsightContextForPrompt(ctx);

  // Append learner memories to enrich AI context (Gap 2 fix)
  if (memoriesResult.length > 0) {
    const memLines = memoriesResult
      .filter(m => m.confidence >= 0.5)
      .map(m => `- [${m.memory_type}] ${m.key}: ${JSON.stringify(m.value)} (confidence: ${m.confidence.toFixed(2)})`)
      .join('\n');
    if (memLines) contextBlock += `\n\n## AI-Inferred Learner Memories\n${memLines}`;
  }

  // Append current story context so parent AI can reference specific vocab and activities
  if (storyKnowledgeResult) {
    contextBlock += `\n\n${formatForParent(storyKnowledgeResult)}`;
  }

  // Two parallel LLM calls, shared context, independent abort
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 20_000);

  let insights:        InsightResult[]        = [];
  let recommendations: ParentRecommendation[] = [];

  try {
    const [insightsResult, recommendationsResult] = await Promise.allSettled([
      callAI({ type: 'parent_insight',        prompt: contextBlock, system: PARENT_INSIGHTS_PROMPT,        temperature: 0.4, signal: controller.signal }).then(r => stripJson(r.content)),
      callAI({ type: 'parent_recommendation', prompt: contextBlock, system: PARENT_RECOMMENDATIONS_PROMPT, temperature: 0.5, signal: controller.signal }).then(r => stripJson(r.content)),
    ]);

    if (insightsResult.status === "fulfilled") {
      try { insights = validateInsights(JSON.parse(insightsResult.value)); } catch { /* keep [] */ }
    }
    if (recommendationsResult.status === "fulfilled") {
      try { recommendations = validateRecommendations(JSON.parse(recommendationsResult.value)); } catch { /* keep [] */ }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Cache and respond (partial results are still useful)
  const entry: CacheEntry = {
    insights,
    recommendations,
    childName:   ctx.childName,
    generatedAt: new Date().toISOString(),
  };
  await aiCache.set(cacheKey, entry);

  return NextResponse.json({ ...entry, cached: false });
}
