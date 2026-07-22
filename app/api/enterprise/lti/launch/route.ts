// app/api/enterprise/lti/launch/route.ts
// POST /api/enterprise/lti/launch
//
// LTI 1.3 Tool Launch endpoint (OpenID Connect login → id_token validation).
// Caller: LMS platform (Canvas, Moodle, Blackboard, etc.)
// Flow: platform POSTs an id_token + state; we validate JWT, consume nonce,
// look up the enterprise account, and redirect the learner into the app.

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { verifyLtiToken, extractLaunchResult } from '@/lib/enterprise/lti';

export const runtime = 'edge';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  let id_token: string | null = null;
  let state:    string | null = null;

  // Accept both application/x-www-form-urlencoded and JSON
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const body = await req.json() as Record<string, string>;
    id_token   = body.id_token ?? null;
    state      = body.state    ?? null;
  } else {
    const form = await req.formData();
    id_token   = form.get('id_token') as string | null;
    state      = form.get('state')    as string | null;
  }

  if (!id_token) {
    return NextResponse.json({ error: 'id_token required' }, { status: 400 });
  }

  // ── Decode issuer to look up the registered enterprise account ────────────
  // We decode without verifying first, only to find the right JWKS URL.
  let iss: string;
  let clientId: string;
  try {
    const b64     = id_token.split('.')[1];
    const padded  = b64.replace(/-/g, '+').replace(/_/g, '/');
    const raw     = JSON.parse(atob(padded)) as { iss?: string; aud?: string | string[] };
    iss           = raw.iss ?? '';
    clientId      = Array.isArray(raw.aud) ? (raw.aud[0] ?? '') : (raw.aud ?? '');
  } catch {
    return NextResponse.json({ error: 'Malformed id_token' }, { status: 400 });
  }

  if (!iss || !clientId) {
    return NextResponse.json({ error: 'Missing iss or aud in token' }, { status: 400 });
  }

  const db = serviceClient();

  // ── Look up enterprise account by LTI client_id ───────────────────────────
  const { data: enterprise } = await db.rpc('get_enterprise_by_lti_client', {
    p_client_id: clientId,
  });

  if (!enterprise) {
    return NextResponse.json({ error: 'Unknown LTI client_id' }, { status: 403 });
  }

  // ── Verify the JWT signature ──────────────────────────────────────────────
  let claims: Awaited<ReturnType<typeof verifyLtiToken>>;
  try {
    claims = await verifyLtiToken(id_token, enterprise.jwks_url as string, clientId);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }

  // ── Consume nonce (replay prevention) ─────────────────────────────────────
  const { data: nonceOk } = await db.rpc('validate_lti_nonce', {
    p_nonce:     claims.nonce,
    p_client_id: clientId,
  });

  if (!nonceOk) {
    return NextResponse.json({ error: 'Invalid or replayed nonce' }, { status: 401 });
  }

  // ── Extract launch data and redirect into the app ─────────────────────────
  const launch = extractLaunchResult(claims);

  // Build redirect URL with launch context as query params
  // The app shell reads these to auto-provision the LTI session
  const params = new URLSearchParams({
    lti:          '1',
    lti_user_id:  launch.userId,
    lti_email:    launch.email,
    lti_name:     launch.name,
    lti_role:     launch.role,
    lti_context:  launch.contextId,
    lti_account:  String((enterprise as Record<string, unknown>).id),
    ...(state ? { state } : {}),
  });

  const landingPath = launch.role === 'learner' ? '/missions' : '/teacher';
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}${landingPath}?${params}`;

  return NextResponse.redirect(redirectUrl, 302);
}
