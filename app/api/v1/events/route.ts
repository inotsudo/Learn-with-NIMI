// app/api/v1/events/route.ts
// POST /api/v1/events — log a learner event via API key
// Requires scope: write:events
// Body: { childId, type, payload? }

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKeyRequest, apiOk, apiError } from '@/lib/api/apiKeyAuth';
import { inferFromEvent } from '@/lib/ai/memory';
import type { AIEventType, AIEvent } from '@/lib/ai/types';

export const runtime = 'edge';

const VALID_EVENT_TYPES = new Set<AIEventType>([
  'mission_completed', 'story_started', 'story_finished',
  'hint_requested', 'session_started', 'streak_earned', 'story_created',
]);

export async function POST(req: NextRequest) {
  let ctx;
  try { ctx = await validateApiKeyRequest(req.headers.get('authorization'), 'write:events'); }
  catch (r) { return r as Response; }

  let body: { childId?: string; type?: string; payload?: Record<string, unknown> };
  try { body = await req.json(); }
  catch { return apiError('Invalid JSON', 400); }

  const { childId, type, payload = {} } = body;
  if (!childId) return apiError('childId required', 400);
  if (!type || !VALID_EVENT_TYPES.has(type as AIEventType)) {
    return apiError(`Invalid event type. Valid types: ${[...VALID_EVENT_TYPES].join(', ')}`, 400);
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Verify child belongs to key owner
  const { data: child } = await db
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('user_id', ctx.userId)
    .single();
  if (!child) return apiError('Child not found or access denied', 403);

  // Log event
  const { data: eventId, error } = await db.rpc('log_learner_event', {
    p_child_id:   childId,
    p_event_type: type,
    p_payload:    payload,
  });

  if (error) return apiError(error.message, 500);

  // Async memory inference (fire-and-forget — edge has no background tasks)
  const event: AIEvent = {
    type:      type as AIEventType,
    childId,
    payload,
    timestamp: Date.now(),
  };
  void Promise.resolve(inferFromEvent(db, event)).catch(() => null);

  return apiOk({ ok: true, eventId }, ctx);
}
