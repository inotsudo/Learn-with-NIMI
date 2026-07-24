// app/api/v1/keys/route.ts — API key management (session auth, not key auth)
// GET  /api/v1/keys        → list caller's keys
// POST /api/v1/keys        → create a new key (returns the raw key ONCE)
// DELETE /api/v1/keys?id=  → revoke a key

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateApiKey, hashApiKey, keyPrefix } from '@/lib/api/apiKeyAuth';

export const runtime = 'edge';

const VALID_SCOPES = new Set([
  'read:learner', 'write:events', 'ai:chat',
  'read:content', 'admin:school', 'read:memories',
]);

function sessionClient(auth: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  );
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = sessionClient(auth);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await db.rpc('list_api_keys');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = sessionClient(auth);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; plan?: string; scopes?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const name   = typeof body.name  === 'string' ? body.name.trim().slice(0, 80)  : '';
  const plan   = ['free','pro','enterprise'].includes(body.plan ?? '') ? body.plan! : 'free';
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter((s): s is string => typeof s === 'string' && VALID_SCOPES.has(s))
    : ['read:learner', 'read:content'];

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const env  = plan === 'enterprise' ? 'live' : 'test';
  const raw  = generateApiKey(env as 'live' | 'test');
  const hash = await hashApiKey(raw);
  const pfx  = keyPrefix(raw);

  const { data: keyId, error } = await db.rpc('create_api_key', {
    p_name:       name,
    p_key_hash:   hash,
    p_key_prefix: pfx,
    p_plan:       plan,
    p_scopes:     scopes,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The raw key is returned exactly once. It is never stored or retrievable again.
  return NextResponse.json({ id: keyId, key: raw, prefix: pfx, plan, scopes }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = sessionClient(auth);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await db.rpc('revoke_api_key', { p_key_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
