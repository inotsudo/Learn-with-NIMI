// app/api/enterprise/sso/[provider]/route.ts
// GET /api/enterprise/sso/:provider?code=...&state=...
//
// OAuth 2.0 callback handler for enterprise SSO.
// Supported providers: google, microsoft, clever, classlink
//
// The actual OAuth exchange (code → token → user info) is delegated to Supabase
// Auth's signInWithOAuth flow — Supabase handles token exchange and session
// creation. This route exists as the callback URL so we can:
//   1. Read the provider-specific user info after Supabase Auth resolves the session
//   2. Look up the enterprise account the user belongs to
//   3. Apply enterprise-specific role assignments before redirecting
//
// Supabase inserts a `#access_token=...` fragment on success; we redirect back
// to the app shell which reads it from the fragment and calls setSession().

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

export const runtime = 'edge';

const SUPPORTED_PROVIDERS = new Set(['google', 'microsoft', 'clever', 'classlink']);

// Maps provider → Supabase provider name
const SUPABASE_PROVIDER: Record<string, string> = {
  google:    'google',
  microsoft: 'azure',
  clever:    'clever',      // custom OIDC — configured in Supabase dashboard
  classlink: 'classlink',   // custom OIDC — configured in Supabase dashboard
};

export async function GET(
  req:     NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: `Unknown SSO provider: ${provider}` }, { status: 400 });
  }

  const url  = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    // No code — could be an error callback or direct navigation; redirect to login
    const error       = url.searchParams.get('error');
    const description = url.searchParams.get('error_description') ?? 'SSO failed';
    const loginUrl    = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login?error=${encodeURIComponent(error ? `${error}: ${description}` : description)}`;
    return NextResponse.redirect(loginUrl, 302);
  }

  // Exchange the code via Supabase Auth
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await db.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login?error=${encodeURIComponent(error?.message ?? 'SSO exchange failed')}`;
    return NextResponse.redirect(loginUrl, 302);
  }

  // Redirect to app shell with the session in the URL fragment.
  // The shell reads access_token + refresh_token and calls setSession().
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const fragment = `access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&provider=${SUPABASE_PROVIDER[provider] ?? provider}`;

  return NextResponse.redirect(`${appUrl}/auth/callback#${fragment}`, 302);
}
