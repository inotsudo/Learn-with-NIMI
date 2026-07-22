// app/api/admin/warm-story-cache/route.ts
//
// Called automatically when a story is published (from StoryPublishingManager).
// Also callable manually from the admin portal for republish or forced refresh.
//
// Responsibilities:
//   1. Trigger AI extraction → write to story_knowledge_cache (Layer 1 warm)
//   2. Seed concept nodes + story→concept links into the Global Knowledge Graph
//
// Design:
//   - Uses service role to bypass RLS (admin-only route, auth checked below)
//   - Fire-and-forget from the client — this route does not need to be fast
//   - Idempotent: safe to call multiple times for the same story
//
// Auth: must be an authenticated admin (checked via admins table)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStoryKnowledgeBase } from "@/lib/storyKnowledgeEngine";
import { linkStoryConceptsToGraph } from "@/lib/learnerKnowledgeGraph";

const SUPPORTED_LANGUAGES = ["en", "fr", "rw"] as const;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  // Auth check — must be a logged-in admin
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminRow } = await authClient
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .single();
  if (!adminRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Parse body
  let body: { storyId?: string; language?: string; forceRefresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { storyId, language, forceRefresh = false } = body;
  if (!storyId) return NextResponse.json({ error: "storyId is required" }, { status: 400 });

  // Service role client for cache writes (bypasses RLS)
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // When language is not specified, warm all supported languages in parallel
  const languages = language
    ? [language]
    : (SUPPORTED_LANGUAGES as readonly string[]);

  const results: Record<string, {
    cacheStatus: "warmed" | "skipped" | "failed";
    conceptsSeeded: number;
    error?: string;
  }> = {};

  await Promise.allSettled(
    languages.map(async lang => {
      try {
        // Check if a recent cache already exists (skip if warmed within last hour
        // unless forceRefresh is set — prevents redundant AI calls on bulk publish)
        if (!forceRefresh) {
          const { data: existing } = await serviceClient
            .from("story_knowledge_cache")
            .select("analyzed_at")
            .eq("story_id", storyId)
            .eq("language", lang)
            .single();

          if (existing?.analyzed_at) {
            const ageMs = Date.now() - new Date(existing.analyzed_at).getTime();
            const ONE_HOUR_MS = 60 * 60 * 1000;
            if (ageMs < ONE_HOUR_MS) {
              results[lang] = { cacheStatus: "skipped", conceptsSeeded: 0 };
              return;
            }
          }
        }

        // Trigger AI extraction — getStoryKnowledgeBase calls fetchAnalysis internally
        // which writes to story_knowledge_cache on completion.
        const knowledgeBase = await getStoryKnowledgeBase(serviceClient, storyId, lang);

        if (!knowledgeBase) {
          results[lang] = { cacheStatus: "failed", conceptsSeeded: 0, error: "Story not found or no pages" };
          return;
        }

        // Seed the Global Learner Knowledge Graph from the extracted analysis
        let conceptsSeeded = 0;
        if (knowledgeBase.analysis) {
          const { conceptsSeeded: seeded } = await linkStoryConceptsToGraph(
            serviceClient,
            storyId,
            lang,
            {
              vocabulary:           knowledgeBase.vocabulary.map(v => v.word),
              themes:               knowledgeBase.analysis.themes,
              educational_concepts: knowledgeBase.analysis.educational_concepts,
              characters:           knowledgeBase.analysis.characters,
            }
          );
          conceptsSeeded = seeded;
        }

        results[lang] = { cacheStatus: "warmed", conceptsSeeded };

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[warm-story-cache] ${lang} failed:`, msg);
        results[lang] = { cacheStatus: "failed", conceptsSeeded: 0, error: msg };
      }
    })
  );

  const totalConceptsSeeded = Object.values(results).reduce((acc, r) => acc + r.conceptsSeeded, 0);
  const anyFailed = Object.values(results).some(r => r.cacheStatus === "failed");

  return NextResponse.json({
    storyId,
    results,
    totalConceptsSeeded,
    ok: !anyFailed,
  }, { status: anyFailed ? 207 : 200 });
}
