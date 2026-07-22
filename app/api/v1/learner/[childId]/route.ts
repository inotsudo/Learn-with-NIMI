// app/api/v1/learner/[childId]/route.ts
// GET /api/v1/learner/:childId  — learner progress, stats, and memories
// Requires scope: read:learner
// The key owner must be the parent of the child (verified by RPC ownership check).

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKeyRequest, apiOk, apiError } from '@/lib/api/apiKeyAuth';

export const runtime = 'edge';

export async function GET(
  req:     NextRequest,
  { params }: { params: Promise<{ childId: string }> },
) {
  let ctx;
  try { ctx = await validateApiKeyRequest(req.headers.get('authorization'), 'read:learner'); }
  catch (r) { return r as Response; }

  const { childId } = await params;
  if (!childId) return apiError('childId required', 400);

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Verify the key owner is the parent of this child
  const { data: ownership } = await db
    .from('children')
    .select('id, name, age, language, avatar_id')
    .eq('id', childId)
    .eq('parent_id', ctx.userId)
    .single();

  if (!ownership) return apiError('Child not found or access denied', 403);

  // Fetch stats + recent activity + memories in parallel
  const [statsResult, memoriesResult, activitiesResult] = await Promise.allSettled([
    db.rpc('get_learner_context', { p_child_id: childId }),
    db.rpc('get_learner_memories', { p_child_id: childId }),
    db.from('child_progress')
      .select('mission_id, stars, completed_at, missions(category)')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false })
      .limit(20),
  ]);

  const context   = statsResult.status    === 'fulfilled' ? statsResult.value.data    : null;
  const memories  = memoriesResult.status === 'fulfilled' ? memoriesResult.value.data : [];
  const activities = activitiesResult.status === 'fulfilled' ? activitiesResult.value.data : [];

  return apiOk({
    child: {
      id:       ownership.id,
      name:     ownership.name,
      age:      ownership.age,
      language: ownership.language,
      avatarId: ownership.avatar_id,
    },
    stats:           context?.stats           ?? null,
    recommendations: context?.recommendations ?? [],
    memories:        memories ?? [],
    recentActivity:  activities ?? [],
  }, ctx);
}
