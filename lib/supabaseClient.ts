"use client";

import { createBrowserClient } from "@supabase/ssr";
import { processLock } from "@supabase/supabase-js";

// Cookie-based Supabase browser client.
//
// @supabase/ssr stores the session in cookies instead of localStorage, which:
//   • Lets middleware read and refresh the session on every request
//   • Lets server components/route handlers read the session via Next.js cookies()
//   • Eliminates the "middleware sees no session" problem that blocked admin auth
//
// processLock is kept: several components call getUser() concurrently on mount.
// The default navigatorLock times out and throws AbortErrors under React Strict
// Mode's double-effect; processLock serializes calls in-process without that.
//
// NOTE: createBrowserClient creates a new instance on every call and is safe to
// call in "use client" components.  The singleton below is used by the many
// existing files that import from this module directly.

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      lock: processLock,
    },
  }
);

export { supabase };
export default supabase;
