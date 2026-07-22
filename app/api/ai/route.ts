// app/api/ai/route.ts — Unified AI endpoint
// POST { type, prompt, childId?, system?, maxTokens?, model? }
// Returns { content, model, usage } or 400/401/500

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callAI, buildSystemPrompt } from '@/lib/ai/aiService';
import { contextManager } from '@/lib/ai/contextManager';
import type { AICallType, AIModel } from '@/lib/ai/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // Auth
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: {
    type:       AICallType;
    prompt:     string;
    childId?:   string;
    system?:    string;
    maxTokens?: number;
    model?:     AIModel;
  };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, prompt, childId, system, maxTokens, model } = body;

  if (!type || !prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return NextResponse.json({ error: 'type and prompt are required' }, { status: 400 });
  }

  // Optionally load learner context for personalization
  let resolvedSystem = system;
  if (!resolvedSystem && childId) {
    try {
      const ctx = await contextManager.build(supabase, childId);
      resolvedSystem = buildSystemPrompt(type, ctx);
    } catch {
      // Fall back to generic system prompt — non-fatal
      resolvedSystem = buildSystemPrompt(type);
    }
  } else if (!resolvedSystem) {
    resolvedSystem = buildSystemPrompt(type);
  }

  try {
    const result = await callAI({
      type,
      prompt: prompt.slice(0, 8000),
      system: resolvedSystem,
      maxTokens,
      model,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error('[/api/ai]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI call failed' },
      { status: 500 }
    );
  }
}
