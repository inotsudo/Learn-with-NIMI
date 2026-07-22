// app/api/nimi/proactive/route.ts
//
// GET  /api/nimi/proactive?childId=<uuid>&language=en|fr|rw
//   Returns up to 3 proactive suggestions for a child.
//   First checks the proactive_queue for pending items.
//   If the queue is empty (or all expired), generates fresh ones and queues them.
//   Marks returned suggestions as delivered so they're not shown twice.
//
// POST /api/nimi/proactive  { childId, language, wordsToReview? }
//   Force-generates a new batch (bypasses queue / used after major events).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { LearnerMemory, LearnerContext } from '@/lib/ai/types';
import { generateProactiveSuggestions } from '@/lib/intelligence/proactiveEngine';

export const runtime = 'edge';

// ── Auth helper ───────────────────────────────────────────────────

function sessionClient(auth: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } }
  );
}

async function requireAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const sb = sessionClient(auth);
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb } : null;
}

// ── Validate language ─────────────────────────────────────────────

function safeLang(raw: string | null): 'en' | 'fr' | 'rw' {
  if (raw === 'fr' || raw === 'rw') return raw;
  return 'en';
}

// ── GET — retrieve pending suggestions ────────────────────────────

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sb } = session;
  const url      = req.nextUrl;
  const childId  = url.searchParams.get('childId');
  const language = safeLang(url.searchParams.get('language'));

  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

  // ── Check pending queue first ─────────────────────────────────
  const { data: pending } = await sb.rpc('get_pending_proactive', {
    p_child_id: childId,
    p_limit:    3,
  });

  const pendingRows = (pending as Record<string, unknown>[] | null) ?? [];

  if (pendingRows.length > 0) {
    // Mark as delivered
    const ids = pendingRows.map(r => r.id as string);
    await sb.rpc('mark_proactive_delivered', { p_ids: ids });

    return NextResponse.json({
      suggestions: pendingRows.map(r => ({
        id:          r.id,
        type:        r.suggestion_type,
        title:       r.title,
        message:     r.message,
        contextData: r.context_data ?? {},
        priority:    r.priority,
      })),
      source: 'queue',
    });
  }

  // ── Queue empty — generate fresh suggestions ──────────────────
  const [ctxResult, memoriesResult] = await Promise.allSettled([
    sb.rpc('get_learner_context',  { p_child_id: childId }),
    sb.rpc('get_learner_memories', { p_child_id: childId, p_types: null }),
  ]);

  const ctx = ctxResult.status === 'fulfilled'
    ? (ctxResult.value.data as LearnerContext | null)
    : null;

  const memories = memoriesResult.status === 'fulfilled'
    ? ((memoriesResult.value.data as LearnerMemory[] | null) ?? [])
    : [];

  if (!ctx) {
    return NextResponse.json({ suggestions: [], source: 'empty' });
  }

  const suggestions = generateProactiveSuggestions(ctx, memories, 0, language);

  // Persist to queue (non-blocking; deduplication handled by RPC)
  for (const s of suggestions) {
    void sb.rpc('queue_proactive_suggestion', {
      p_child_id:      childId,
      p_type:          s.type,
      p_title:         s.title,
      p_message:       s.message,
      p_context_data:  s.contextData,
      p_priority:      s.priority,
      p_expires_hours: 24,
    });
  }

  return NextResponse.json({
    suggestions: suggestions.slice(0, 3),
    source:      'generated',
  });
}

// ── POST — force-generate (after significant events) ──────────────

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sb } = session;
  let body: { childId?: string; language?: string; wordsToReview?: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const childId       = body.childId;
  const language      = safeLang(body.language ?? null);
  const wordsToReview = typeof body.wordsToReview === 'number' ? body.wordsToReview : 0;

  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

  const [ctxResult, memoriesResult] = await Promise.allSettled([
    sb.rpc('get_learner_context',  { p_child_id: childId }),
    sb.rpc('get_learner_memories', { p_child_id: childId, p_types: null }),
  ]);

  const ctx = ctxResult.status === 'fulfilled'
    ? (ctxResult.value.data as LearnerContext | null)
    : null;

  const memories = memoriesResult.status === 'fulfilled'
    ? ((memoriesResult.value.data as LearnerMemory[] | null) ?? [])
    : [];

  if (!ctx) return NextResponse.json({ suggestions: [] });

  const suggestions = generateProactiveSuggestions(ctx, memories, wordsToReview, language);

  // Queue new suggestions (RPC deduplicates within 12h)
  for (const s of suggestions) {
    void sb.rpc('queue_proactive_suggestion', {
      p_child_id:      childId,
      p_type:          s.type,
      p_title:         s.title,
      p_message:       s.message,
      p_context_data:  s.contextData,
      p_priority:      s.priority,
      p_expires_hours: 12,
    });
  }

  return NextResponse.json({ suggestions: suggestions.slice(0, 3), source: 'forced' });
}
