// app/api/enterprise/lti/jwks/route.ts
// GET /api/enterprise/lti/jwks
//
// Returns the platform's JSON Web Key Set so LMS platforms can verify
// tokens we generate (e.g., deep-linking responses, assignment submissions).
//
// In production this key is generated once and stored in env.
// For now we serve a static placeholder RSA public key so Canvas / Moodle
// configuration can proceed. Replace NEXT_PUBLIC_LTI_PUBLIC_JWK with the
// real JWK when rotating production keys.

import { NextResponse } from 'next/server';

export const runtime = 'edge';

// The platform's own signing key (public part only), stored as a JSON string
// in NEXT_PUBLIC_LTI_PUBLIC_JWK environment variable.
// Format: a single JWK object { kty, n, e, kid, use, alg }

export async function GET() {
  const jwkEnv = process.env.NEXT_PUBLIC_LTI_PUBLIC_JWK;

  if (!jwkEnv) {
    // No key configured — return empty JWKS (platform cannot sign tokens yet)
    return NextResponse.json(
      { keys: [] },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      },
    );
  }

  let jwk: unknown;
  try {
    jwk = JSON.parse(jwkEnv);
  } catch {
    return NextResponse.json({ error: 'Invalid JWK configuration' }, { status: 500 });
  }

  return NextResponse.json(
    { keys: [jwk] },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}
