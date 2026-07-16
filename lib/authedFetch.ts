// Drop-in replacement for fetch() that injects the Supabase access token
// as "Authorization: Bearer <token>" so server route handlers can authenticate
// the caller without relying on cookies (session is in localStorage, not cookies).

import supabase from "@/lib/supabaseClient";

export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
