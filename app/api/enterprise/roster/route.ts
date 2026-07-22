// app/api/enterprise/roster/route.ts
// POST /api/enterprise/roster?provider=clever|classlink
//
// Webhook receiver for Clever and ClassLink roster change events.
// Signature verification is performed before processing; unsigned webhooks are rejected.
// Enterprise accounts must pre-register their roster secret via the admin portal.

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import {
  parseRosterWebhook,
  verifyCleverSignature,
  buildSyncResult,
  type RosterProvider,
} from '@/lib/enterprise/roster';

export const runtime = 'edge';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get('provider') ?? 'clever') as RosterProvider;
  if (provider !== 'clever' && provider !== 'classlink') {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  }

  // Read raw body for signature verification
  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── Verify Clever signature ───────────────────────────────────────────────
  if (provider === 'clever') {
    const sig    = req.headers.get('x-clever-signature') ?? '';
    const secret = process.env.CLEVER_WEBHOOK_SECRET ?? '';

    if (!secret) {
      // Secret not configured — reject to avoid silently accepting unsigned events
      return NextResponse.json({ error: 'Roster integration not configured' }, { status: 500 });
    }

    const valid = await verifyCleverSignature(rawBody, sig, secret);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // ── ClassLink uses a shared secret in Authorization header ────────────────
  if (provider === 'classlink') {
    const secret = process.env.CLASSLINK_WEBHOOK_SECRET ?? '';
    const token  = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
    if (!secret || token !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ── Parse the webhook ─────────────────────────────────────────────────────
  const event = parseRosterWebhook(provider, body);
  if (!event) {
    // Unknown event shape — ack with 200 so the provider stops retrying
    return NextResponse.json({ ok: true, action: 'ignored' });
  }

  // ── Dispatch to the appropriate sync RPC ─────────────────────────────────
  const db = serviceClient();

  try {
    switch (event.recordType) {
      case 'student': {
        if (event.eventType === 'deleted') {
          // Soft-archive only — we never hard-delete learner data
          await db.rpc('roster_archive_learner', {
            p_provider:    provider,
            p_provider_id: event.providerId,
          });
        } else {
          await db.rpc('roster_upsert_learner', {
            p_provider:    provider,
            p_provider_id: event.providerId,
            p_data:        event.data,
          });
        }
        break;
      }

      case 'teacher': {
        await db.rpc('roster_upsert_teacher', {
          p_provider:    provider,
          p_provider_id: event.providerId,
          p_data:        event.data,
          p_deleted:     event.eventType === 'deleted',
        });
        break;
      }

      case 'school': {
        await db.rpc('roster_upsert_school', {
          p_provider:    provider,
          p_provider_id: event.providerId,
          p_data:        event.data,
        });
        break;
      }

      // section + enrollment: ack without action for now
      default:
        break;
    }
  } catch (e) {
    // Log and return 500 so the provider retries
    console.error('[roster] sync error:', e);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }

  return NextResponse.json(
    buildSyncResult(event, `${event.eventType}_${event.recordType}`, true),
  );
}
