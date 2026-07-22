// app/api/ai/event/route.ts — Learner event ingestion
// POST { type, childId, payload, timestamp }
// Logs event to learner_events and triggers async memory inference.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { inferFromEvent } from '@/lib/ai/memory';
import type { AIEvent, AIEventType } from '@/lib/ai/types';

export const runtime = 'edge';

const VALID_EVENT_TYPES: AIEventType[] = [
  'mission_completed',
  'story_started',
  'story_finished',
  'hint_requested',
  'session_started',
  'streak_earned',
  'story_created',
  'vocabulary_reviewed',
  'quiz_completed',
  'certificate_earned',
  'coloring_completed',
  'reading_session_started',
];

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

  // Parse + validate body
  let event: AIEvent;
  try {
    event = await req.json() as AIEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!event.childId || !event.type || !VALID_EVENT_TYPES.includes(event.type)) {
    return NextResponse.json({ error: 'Invalid event: childId and valid type required' }, { status: 400 });
  }

  // Persist event to learner_events table
  const { data: eventId, error: logError } = await supabase.rpc('log_learner_event', {
    p_child_id:   event.childId,
    p_event_type: event.type,
    p_payload:    event.payload ?? {},
  });

  if (logError) {
    // Child ownership check failed — likely wrong childId or session mismatch
    console.error('[/api/ai/event] log failed:', logError.message);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 403 });
  }

  // Run memory inference (async within this request — edge has no background tasks)
  try {
    await inferFromEvent(supabase, event);
  } catch (e) {
    // Inference failure is non-fatal; event is already persisted
    console.error(JSON.stringify({
      level:     'error',
      service:   'nimi-ai',
      route:     '/api/ai/event',
      event:     'memory_inference_failed',
      childId:   event.childId,
      eventType: event.type,
      error:     e instanceof Error ? e.message : String(e),
      ts:        new Date().toISOString(),
    }));
  }

  return NextResponse.json({ ok: true, eventId });
}
