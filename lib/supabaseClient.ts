import { createClient, processLock } from "@supabase/supabase-js";

// Several components call supabase.auth.getUser()/getSession() concurrently
// on mount (UserProvider, admin auth check, Sidebar, MissionManager, ...).
// The default navigatorLock serializes these via the cross-tab Navigator
// Locks API, which times out and "steals" the lock under React Strict Mode's
// double-effects, throwing AbortErrors. processLock serializes the same
// calls in-process without that cross-tab timeout/steal behavior.
const supabase = createClient(
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
