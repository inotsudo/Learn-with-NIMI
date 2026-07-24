// app/api/admin/roster/route.ts
// GET    /api/admin/roster?status=pending|linked|archived&type=student|teacher|school
// PATCH  /api/admin/roster/:id   — link or update status
// DELETE /api/admin/roster/:id   — archive a staged entry
//
// Requires: valid admin session (verified against `admins` table)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function sessionClient(auth: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  );
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function requireAdmin(req: NextRequest): Promise<{ userId: string } | NextResponse> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb  = sessionClient(auth);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = serviceClient();
  const { data: admin } = await svc.from('admins').select('id').eq('id', user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return { userId: user.id };
}

// ── GET — list staged roster entries ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const svc    = serviceClient();
  const url    = req.nextUrl;
  const status = url.searchParams.get('status') ?? 'pending';
  const type   = url.searchParams.get('type')   ?? 'student';

  const pageSize = Math.min(Math.max(1, Number(url.searchParams.get('page_size')) || 50), 100);
  const cursor   = url.searchParams.get('cursor'); // created_at ISO string of the last row

  let query = svc
    .from('roster_staged_users')
    .select('id, provider, provider_id, record_type, data, school_id, status, linked_child_id, linked_user_id, archived, created_at, updated_at, schools(name)')
    .eq('record_type', type)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(pageSize + 1); // fetch one extra to detect whether there's a next page

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const page    = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore ? page[page.length - 1]?.created_at ?? null : null;

  // Fetch counts by status for the badge display
  const { data: counts } = await svc
    .from('roster_staged_users')
    .select('status')
    .eq('record_type', type);

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    countMap[row.status as string] = (countMap[row.status as string] ?? 0) + 1;
  }

  return NextResponse.json({ rows: page, counts: countMap, nextCursor, hasMore });
}

// ── PATCH — link a staged entry to an existing child/user or update status ───

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const svc = serviceClient();
  let body: { id: string; linkedChildId?: string; linkedUserId?: string; status?: string; schoolId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.linkedChildId !== undefined) update.linked_child_id = body.linkedChildId;
  if (body.linkedUserId  !== undefined) update.linked_user_id  = body.linkedUserId;
  if (body.schoolId      !== undefined) update.school_id       = body.schoolId;
  if (body.status        !== undefined) update.status          = body.status;

  // Auto-set status to 'linked' when a child is linked
  if (body.linkedChildId && !body.status) update.status = 'linked';

  const { data, error } = await svc
    .from('roster_staged_users')
    .update(update)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

// ── DELETE — archive a staged entry ──────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const svc = serviceClient();
  const id  = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await svc
    .from('roster_staged_users')
    .update({ status: 'archived', archived: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
