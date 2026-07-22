// lib/enterprise/roster.ts — Clever / ClassLink roster webhook handler
//
// Clever and ClassLink both send JSON webhooks when their roster changes.
// This module normalises the two formats into a common RosterEvent shape
// and provides the synchronization logic (upsert school + teachers + learners).
//
// DB writes use security-definer RPCs — no service-role key is held here.

export type RosterProvider = 'clever' | 'classlink';
export type RosterEventType = 'created' | 'updated' | 'deleted';
export type RosterRecordType = 'school' | 'section' | 'teacher' | 'student' | 'enrollment';

export interface RosterEvent {
  provider:    RosterProvider;
  eventType:   RosterEventType;
  recordType:  RosterRecordType;
  providerId:  string;   // external ID from the roster provider
  data:        Record<string, unknown>;
}

// ── Clever normalisation ──────────────────────────────────────────────────────
// Clever webhooks: { type: 'students.created', data: { object: {...} } }

function normaliseClever(body: Record<string, unknown>): RosterEvent | null {
  const type   = body.type as string | undefined;
  const obj    = (body.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
  if (!type || !obj) return null;

  const [recordStr, eventStr] = type.split('.');
  if (!recordStr || !eventStr) return null;

  const recordMap: Record<string, RosterRecordType> = {
    schools: 'school', sections: 'section', teachers: 'teacher',
    students: 'student', enrollments: 'enrollment',
  };
  const eventMap: Record<string, RosterEventType> = {
    created: 'created', updated: 'updated', deleted: 'deleted',
  };

  const recordType = recordMap[recordStr];
  const eventType  = eventMap[eventStr];
  if (!recordType || !eventType) return null;

  return {
    provider:   'clever',
    eventType,
    recordType,
    providerId: String(obj.id ?? ''),
    data:       obj,
  };
}

// ── ClassLink normalisation ───────────────────────────────────────────────────
// ClassLink OneRoster webhooks: { event: 'rostering.student.create', payload: { ... } }

function normaliseClasslink(body: Record<string, unknown>): RosterEvent | null {
  const event   = body.event as string | undefined;
  const payload = body.payload as Record<string, unknown> | undefined;
  if (!event || !payload) return null;

  // "rostering.student.create" → ['rostering', 'student', 'create']
  const parts = event.split('.');
  if (parts.length < 3) return null;

  const recordStr = parts[1];
  const eventStr  = parts[2];

  const recordMap: Record<string, RosterRecordType> = {
    org: 'school', class: 'section', teacher: 'teacher',
    student: 'student', enrollment: 'enrollment',
  };
  const eventMap: Record<string, RosterEventType> = {
    create: 'created', update: 'updated', delete: 'deleted',
  };

  const recordType = recordMap[recordStr ?? ''];
  const eventType  = eventMap[eventStr ?? ''];
  if (!recordType || !eventType) return null;

  return {
    provider:   'classlink',
    eventType,
    recordType,
    providerId: String(payload.sourcedId ?? payload.id ?? ''),
    data:       payload,
  };
}

// ── parseRosterWebhook ────────────────────────────────────────────────────────

export function parseRosterWebhook(
  provider: RosterProvider,
  body:     Record<string, unknown>,
): RosterEvent | null {
  switch (provider) {
    case 'clever':    return normaliseClever(body);
    case 'classlink': return normaliseClasslink(body);
    default:          return null;
  }
}

// ── verifyCleverSignature ─────────────────────────────────────────────────────
// Clever signs webhooks with HMAC-SHA256 over the raw body.

export async function verifyCleverSignature(
  rawBody: string,
  signature: string,
  secret:    string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    // Clever sends hex-encoded signature
    const sigBytes = Uint8Array.from(
      signature.replace(/^sha256=/, '').match(/.{2}/g)!.map(h => parseInt(h, 16)),
    );
    return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(rawBody));
  } catch {
    return false;
  }
}

// ── RosterSyncResult — returned to the calling route ─────────────────────────

export interface RosterSyncResult {
  ok:       boolean;
  action:   string;
  provider: RosterProvider;
  recordType: RosterRecordType;
  providerId: string;
}

export function buildSyncResult(
  event:   RosterEvent,
  action:  string,
  ok:      boolean,
): RosterSyncResult {
  return {
    ok,
    action,
    provider:   event.provider,
    recordType: event.recordType,
    providerId: event.providerId,
  };
}
