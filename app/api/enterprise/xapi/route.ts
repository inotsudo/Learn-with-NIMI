// app/api/enterprise/xapi/route.ts
// POST /api/enterprise/xapi            — submit xAPI statement(s)
// POST /api/enterprise/xapi?flush=1    — (service-role) batch-forward pending statements to external LRS
//
// Auth: Bearer token (session-based) for learner submissions
//       Service-role key via X-Service-Key header for the cron flush

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import type { XapiStatement }        from '@/lib/enterprise/xapi';

export const runtime = 'edge';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ── POST — submit statements ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Cron flush path ───────────────────────────────────────────────────────
  if (req.nextUrl.searchParams.get('flush') === '1') {
    const serviceKey = req.headers.get('x-service-key');
    if (!serviceKey || serviceKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return flushToLrs();
  }

  // ── Learner statement submission ──────────────────────────────────────────
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Accept a single statement or an array
  const statements: XapiStatement[] = Array.isArray(body) ? body : [body as XapiStatement];

  if (statements.length === 0) {
    return NextResponse.json({ error: 'No statements provided' }, { status: 400 });
  }
  if (statements.length > 100) {
    return NextResponse.json({ error: 'Max 100 statements per request' }, { status: 400 });
  }

  // Validate minimal required fields
  for (const s of statements) {
    if (!s.actor || !s.verb || !s.object || !s.timestamp) {
      return NextResponse.json({ error: 'Each statement must have actor, verb, object, and timestamp' }, { status: 400 });
    }
  }

  // Queue all statements for async forwarding
  const svc = serviceClient();
  const ids: string[] = [];

  for (const stmt of statements) {
    const { data, error } = await svc.rpc('queue_xapi_statement', {
      p_actor_id:  user.id,
      p_statement: stmt as unknown as Record<string, unknown>,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (data) ids.push(data as string);
  }

  return NextResponse.json({ ok: true, queued: ids.length, ids }, { status: 202 });
}

// ── flushToLrs — forward pending statements to external LRS ──────────────────

async function flushToLrs(): Promise<NextResponse> {
  const lrsEndpoint = process.env.XAPI_LRS_ENDPOINT;
  const lrsUsername = process.env.XAPI_LRS_USERNAME;
  const lrsPassword = process.env.XAPI_LRS_PASSWORD;

  if (!lrsEndpoint || !lrsUsername || !lrsPassword) {
    return NextResponse.json({ ok: true, forwarded: 0, note: 'LRS not configured' });
  }

  const svc = serviceClient();
  const { data: pending, error } = await svc.rpc('get_pending_xapi_statements', { p_limit: 500 });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending || (pending as unknown[]).length === 0) {
    return NextResponse.json({ ok: true, forwarded: 0 });
  }

  const rows = pending as Array<{ id: string; statement: XapiStatement }>;
  const statements = rows.map(r => r.statement);
  const ids        = rows.map(r => r.id);

  // POST batch to LRS (xAPI 1.0.3 batch endpoint)
  const basicAuth = btoa(`${lrsUsername}:${lrsPassword}`);
  let forwarded   = 0;

  try {
    const lrsRes = await fetch(`${lrsEndpoint}/statements`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Experience-API-Version': '1.0.3',
        Authorization:     `Basic ${basicAuth}`,
      },
      body: JSON.stringify(statements),
    });

    if (lrsRes.ok) {
      // Mark as forwarded in DB
      await svc.rpc('mark_xapi_forwarded', { p_ids: ids });
      forwarded = ids.length;
    } else {
      console.error('[xapi flush] LRS error:', lrsRes.status, await lrsRes.text());
    }
  } catch (e) {
    console.error('[xapi flush] network error:', e);
  }

  return NextResponse.json({ ok: true, forwarded });
}
