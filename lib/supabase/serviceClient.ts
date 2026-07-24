import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton service-role Supabase client.
 * Lazy-initialized so module load at build time doesn't throw when env vars
 * are absent — the client is only created on the first actual request.
 */
export function getServiceClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _client;
}
