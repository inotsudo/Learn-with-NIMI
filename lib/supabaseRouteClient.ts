import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in Next.js App Router route handlers.
 * Replaces the deprecated createRouteHandlerClient from @supabase/auth-helpers-nextjs,
 * which was incompatible with Next.js 15+ async cookies().
 *
 * Usage:
 *   const supabase = await createRouteClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createRouteClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll may throw in read-only contexts; safe to ignore in route handlers
          }
        },
      },
    }
  );
}
