// Route-handler auth for a localStorage-based Supabase client (no cookies).
// The browser client stores sessions in localStorage, not cookies, so
// createRouteClient (cookie-based) always sees no session → 401.
// Instead: the client passes its access token as "Authorization: Bearer <token>"
// and this helper validates it server-side.

import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const _client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const { data: { user } } = await _client.auth.getUser(authHeader.slice(7));
  return user ?? null;
}
