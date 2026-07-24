// lib/adminAuth.ts
//
// Shared admin authentication helper for all /api/admin/* routes.
//
// Usage in a route:
//   import { requireAdmin } from "@/lib/adminAuth";
//
//   export async function GET(req: NextRequest) {
//     const check = await requireAdmin(req);
//     if (check.error) return check.error;
//     const { userId } = check;
//     ...
//   }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sessionClient(auth: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  );
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

type AdminCheckSuccess = { error: null; userId: string };
type AdminCheckFailure = { error: NextResponse; userId?: never };
export type AdminCheck  = AdminCheckSuccess | AdminCheckFailure;

export async function requireAdmin(req: NextRequest): Promise<AdminCheck> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const sb  = sessionClient(auth);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const svc = serviceClient();
  const { data: admin } = await svc
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null, userId: user.id };
}

// Re-export clients so routes don't have to duplicate them.
export { sessionClient, serviceClient };
