import { createClient, processLock } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables!');
}

// Same storage key/project as lib/supabaseClient.ts — use processLock here
// too so this client doesn't contend with the other over the Navigator Lock.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: processLock,
  },
});
