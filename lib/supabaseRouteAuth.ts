// lib/supabaseRouteAuth.ts
//
// Route-handler auth helper.  Supports two auth mechanisms, in priority order:
//
//   1. Cookie-based (preferred) — @supabase/ssr reads the session from the
//      request cookies automatically.  Works once the browser client stores
//      sessions in cookies (lib/supabaseClient.ts uses createBrowserClient).
//
//   2. Bearer-token fallback — older client code (and the external V1 API)
//      pass "Authorization: Bearer <token>" in the request header.  Still
//      valid; used when no session cookie is present.
//
// Both paths return the same User object so every calling route is unchanged.

import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

// Lightweight client for Bearer-token validation — no cookie storage needed.
const _bearerClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function getAuthUser(req: NextRequest) {
  // 1. Try cookie-based session first (the new default after migration to
  //    createBrowserClient).  If no auth cookie exists the call returns null
  //    quickly — the Supabase SDK never makes a network request in that case.
  const { supabase } = createRouteClient(req);
  const { data: { user: cookieUser } } = await supabase.auth.getUser();
  if (cookieUser) return cookieUser;

  // 2. Fall back to Bearer token (external API partners, legacy client code,
  //    admin routes that pass the token explicitly).
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const { data: { user } } = await _bearerClient.auth.getUser(auth.slice(7));
    return user ?? null;
  }

  return null;
}
