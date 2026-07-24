// app/api/ai/route.ts — Unified AI endpoint (Supabase JWT auth)
// POST { type, prompt, childId?, system?, maxTokens? }
// Returns { content, model, usage } or 400/401/429/503/504

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runAICall, classifyAIError } from '@/lib/ai/chatHandler';
import type { AICallType } from '@/lib/ai/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
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

  let body: {
    type:       AICallType;
    prompt:     string;
    childId?:   string;
    system?:    string;
    maxTokens?: number;
  };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, prompt, childId, system, maxTokens } = body;

  if (!type || !prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return NextResponse.json({ error: 'type and prompt are required' }, { status: 400 });
  }

  try {
    const result = await runAICall(supabase, { type, prompt, childId, system, maxTokens });
    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error('[/api/ai]', e);
    const { message, code, retryable, status } = classifyAIError(e);
    return NextResponse.json({ error: message, code, retryable }, { status });
  }
}
