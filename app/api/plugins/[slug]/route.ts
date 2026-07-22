// app/api/plugins/[slug]/route.ts
// GET    /api/plugins/:slug                 — get plugin details
// POST   /api/plugins/:slug/install         — install for a school
// DELETE /api/plugins/:slug?schoolId=       — uninstall from a school

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { invalidateSchoolCache } from '@/lib/plugins/registry';

export const runtime = 'edge';

function sessionClient(auth: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await db
    .from('plugins')
    .select('id, slug, name, description, version, author_name, hooks, permissions, install_count, rating_sum, rating_count, created_at')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });

  const avg = data.rating_count > 0
    ? Math.round((data.rating_sum / data.rating_count) * 10) / 10
    : null;

  return NextResponse.json({ ...data, avg_rating: avg });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = sessionClient(auth);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { schoolId?: string; config?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.schoolId) return NextResponse.json({ error: 'schoolId required' }, { status: 400 });

  // Resolve plugin ID from slug
  const { data: plugin } = await db
    .from('plugins')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (!plugin) return NextResponse.json({ error: 'Plugin not found or not active' }, { status: 404 });

  const { error } = await db.rpc('install_plugin', {
    p_school_id: body.schoolId,
    p_plugin_id: plugin.id,
    p_config:    body.config ?? {},
  });

  if (error) {
    if (error.message === 'forbidden') return NextResponse.json({ error: 'Not a school admin' }, { status: 403 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateSchoolCache(body.schoolId);
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = sessionClient(auth);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const schoolId = req.nextUrl.searchParams.get('schoolId');
  if (!schoolId) return NextResponse.json({ error: 'schoolId required' }, { status: 400 });

  const { data: plugin } = await db
    .from('plugins')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!plugin) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });

  const { error } = await db
    .from('school_plugins')
    .delete()
    .eq('school_id', schoolId)
    .eq('plugin_id', plugin.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateSchoolCache(schoolId);
  return NextResponse.json({ ok: true });
}
