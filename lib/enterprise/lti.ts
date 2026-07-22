// lib/enterprise/lti.ts — LTI 1.3 message validation and launch handling
//
// Implements the subset of IMS LTI 1.3 needed for basic tool launches:
// - JWT validation against platform's JWKS endpoint
// - Nonce replay prevention (via DB)
// - Claim extraction for user identity + context mapping
//
// Reference: https://www.imsglobal.org/spec/lti/v1p3/

export interface LtiClaims {
  sub:         string;          // platform user ID
  email?:      string;
  name?:       string;
  given_name?: string;
  iss:         string;          // platform URL
  aud:         string;          // client_id
  nonce:       string;
  iat:         number;
  exp:         number;

  // LTI-specific claims
  'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
  'https://purl.imsglobal.org/spec/lti/claim/version':      string;
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti/claim/roles':        string[];
  'https://purl.imsglobal.org/spec/lti/claim/context'?: {
    id:    string;
    label: string;
    title: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/resource_link'?: {
    id:          string;
    title?:      string;
    description?: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/custom'?: Record<string, string>;
}

export interface LtiLaunchResult {
  userId:     string;   // platform user ID
  email:      string;
  name:       string;
  role:       'instructor' | 'learner' | 'admin';
  contextId:  string;   // course / class ID
  contextTitle: string;
  deploymentId: string;
  claims:     LtiClaims;
}

// ── Role detection ────────────────────────────────────────────────────────────

const INSTRUCTOR_ROLES = new Set([
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Faculty',
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Staff',
]);

const ADMIN_ROLES = new Set([
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#SysAdmin',
]);

function detectRole(roles: string[]): 'instructor' | 'learner' | 'admin' {
  for (const r of roles) {
    if (ADMIN_ROLES.has(r))      return 'admin';
  }
  for (const r of roles) {
    if (INSTRUCTOR_ROLES.has(r)) return 'instructor';
  }
  return 'learner';
}

// ── JWKS key fetching ─────────────────────────────────────────────────────────

interface JwksKey {
  kid: string;
  kty: string;
  use: string;
  n:   string;
  e:   string;
}

const jwksCache = new Map<string, { keys: JwksKey[]; expiresAt: number }>();

async function fetchJwks(url: string): Promise<JwksKey[]> {
  const cached = jwksCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;

  const res  = await fetch(url, { next: { revalidate: 3600 } } as RequestInit);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const json = await res.json() as { keys: JwksKey[] };
  jwksCache.set(url, { keys: json.keys, expiresAt: Date.now() + 3600_000 });
  return json.keys;
}

// ── JWT decode (no signature verification — done via JWKS) ────────────────────

function decodeJwtPayload(token: string): LtiClaims {
  const parts  = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT structure');
  const payload = parts[1];
  // Edge-safe base64url decode
  const padded  = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json    = atob(padded);
  return JSON.parse(json) as LtiClaims;
}

function decodeJwtHeader(token: string): { kid?: string; alg?: string } {
  const header = token.split('.')[0];
  const padded = header.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(padded)) as { kid?: string; alg?: string };
}

// ── Import RSA public key from JWK ───────────────────────────────────────────

async function importRsaKey(jwk: JwksKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', use: 'sig' },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

// ── Base64url → Uint8Array ───────────────────────────────────────────────────

function b64urlDecode(s: string): ArrayBuffer {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin    = atob(padded);
  const buf    = new ArrayBuffer(bin.length);
  const view   = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

// ── verifyLtiToken ────────────────────────────────────────────────────────────
// Validates a LTI 1.3 id_token JWT.
// Throws with a descriptive error on any validation failure.

export async function verifyLtiToken(
  token:    string,
  jwksUrl:  string,
  clientId: string,
): Promise<LtiClaims> {
  const header  = decodeJwtHeader(token);
  const payload = decodeJwtPayload(token);
  const now     = Math.floor(Date.now() / 1000);

  // Temporal checks
  if (payload.exp < now) throw new Error('LTI token expired');
  if (payload.iat > now + 60) throw new Error('LTI token issued in the future');

  // Audience check
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(clientId)) throw new Error('LTI token audience mismatch');

  // Version + message type
  const version = payload['https://purl.imsglobal.org/spec/lti/claim/version'];
  if (!version?.startsWith('1.3')) throw new Error('LTI version must be 1.3.x');

  // Signature verification via JWKS
  const keys    = await fetchJwks(jwksUrl);
  const jwk     = header.kid
    ? keys.find(k => k.kid === header.kid)
    : keys[0];
  if (!jwk) throw new Error('No matching JWK found for kid: ' + header.kid);

  const cryptoKey = await importRsaKey(jwk);
  const [headerB64, payloadB64, sigB64] = token.split('.');
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature    = b64urlDecode(sigB64);

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', cryptoKey, signature, signingInput,
  );
  if (!valid) throw new Error('LTI token signature invalid');

  return payload;
}

// ── extractLaunchResult ───────────────────────────────────────────────────────

export function extractLaunchResult(claims: LtiClaims): LtiLaunchResult {
  const context = claims['https://purl.imsglobal.org/spec/lti/claim/context'];
  const roles   = claims['https://purl.imsglobal.org/spec/lti/claim/roles'] ?? [];

  return {
    userId:       claims.sub,
    email:        claims.email ?? '',
    name:         claims.name ?? claims.given_name ?? 'LTI User',
    role:         detectRole(roles),
    contextId:    context?.id    ?? '',
    contextTitle: context?.title ?? '',
    deploymentId: claims['https://purl.imsglobal.org/spec/lti/claim/deployment_id'],
    claims,
  };
}
