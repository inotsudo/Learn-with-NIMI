// lib/supabase/server.ts
//
// Cookie-based Supabase client for use in:
//   • Route Handlers  (pass req + res)
//   • Server Components (pass Next.js cookies() store)
//
// Reads and refreshes the session from the request cookies automatically,
// so middleware and server code can always see the current authenticated user
// without needing a Bearer-token header.
//
// Usage in a Route Handler:
//   import { createRouteClient } from "@/lib/supabase/server";
//   const { supabase, response } = createRouteClient(req);
//   const { data: { user } } = await supabase.auth.getUser();
//   // forward `response` headers onto your NextResponse so refreshed cookies are sent back
//
// Usage in a Server Component:
//   import { createServerComponentClient } from "@/lib/supabase/server";
//   const supabase = await createServerComponentClient();
//   const { data: { user } } = await supabase.auth.getUser();

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Route handler client ─────────────────────────────────────────────────────

export function createRouteClient(req: NextRequest) {
  // We need to mutate the response so refreshed cookies can be forwarded.
  const response = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  return { supabase, response };
}

// ── Server component client ──────────────────────────────────────────────────

export async function createServerComponentClient() {
  const cookieStore = await cookies();

  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as CookieOptions);
          });
        } catch {
          // Server components can't set cookies — ignore the token refresh attempt.
          // The middleware will handle the refresh on the next navigation.
        }
      },
    },
  });
}
