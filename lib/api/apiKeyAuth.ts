// lib/api/apiKeyAuth.ts — Edge-safe API key validation
// All public v1 routes call validateApiKeyRequest() before doing anything else.

import { createClient } from '@supabase/supabase-js';

export interface ApiKeyContext {
  keyId:    string;
  userId:   string;
  plan:     string;
  scopes:   string[];
  rpm:      number;
  rpd:      number;
}

export type ApiScope =
  | 'read:learner'
  | 'write:events'
  | 'ai:chat'
  | 'read:content'
  | 'admin:school'
  | 'read:memories';

// Edge-safe SHA-256 using the Web Crypto API
export async function hashApiKey(raw: string): Promise<string> {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a new key — only called client-side at key-creation time.
// The prefix is stored in the DB; the full key is shown once and never stored.
export function generateApiKey(env: 'live' | 'test' = 'live'): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex   = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `nk_${env}_${hex}`;
}

// Returns the first 20 characters — displayed in the UI as a non-secret reminder.
export function keyPrefix(raw: string): string {
  return raw.slice(0, 20);
}

// Service-role Supabase client used for all API key validation (no user session).
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── validateApiKeyRequest ─────────────────────────────────────────────────────
// Call this at the top of every v1 route handler.
// Returns ApiKeyContext on success; throws a Response on failure.

export async function validateApiKeyRequest(
  authHeader: string | null,
  requiredScope?: ApiScope,
): Promise<ApiKeyContext> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
    });
  }

  const raw  = authHeader.slice(7).trim();
  const hash = await hashApiKey(raw);
  const db   = serviceClient();

  // Validate against DB (updates last_used_at in the same query)
  const { data, error } = await db.rpc('validate_api_key', { p_key_hash: hash });
  if (error || !data || data.length === 0) {
    throw new Response(JSON.stringify({ error: 'Invalid or revoked API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const row = data[0] as {
    key_id: string; user_id: string; plan: string;
    rate_limit_rpm: number; rate_limit_rpd: number; scopes: string[];
  };

  // Rate limit check
  const { data: allowed } = await db.rpc('check_and_increment_rate_limit', {
    p_key_id:    row.key_id,
    p_limit_rpm: row.rate_limit_rpm,
    p_limit_rpd: row.rate_limit_rpd,
  });

  if (!allowed) {
    throw new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After':  '60',
        'X-RateLimit-Limit-Minute': String(row.rate_limit_rpm),
        'X-RateLimit-Limit-Day':    String(row.rate_limit_rpd),
      },
    });
  }

  // Scope check
  if (requiredScope && !row.scopes.includes(requiredScope)) {
    throw new Response(JSON.stringify({ error: `Scope required: ${requiredScope}` }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return {
    keyId:  row.key_id,
    userId: row.user_id,
    plan:   row.plan,
    scopes: row.scopes,
    rpm:    row.rate_limit_rpm,
    rpd:    row.rate_limit_rpd,
  };
}

// ── apiResponse helpers ────────────────────────────────────────────────────────

export function apiOk<T>(data: T, ctx?: ApiKeyContext): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Nimi-Version': '1',
  };
  if (ctx) {
    headers['X-RateLimit-Limit-Minute'] = String(ctx.rpm);
    headers['X-RateLimit-Limit-Day']    = String(ctx.rpd);
  }
  return new Response(JSON.stringify(data), { status: 200, headers });
}

export function apiError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Nimi-Version': '1' },
  });
}
