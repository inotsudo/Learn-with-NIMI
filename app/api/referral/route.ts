import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function makeCode(id: string): string {
  // Deterministic short code from UUID — take first 8 hex chars, uppercase
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// GET: Return (or create) the caller's referral code
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try to fetch existing code
  const { data: existing } = await serviceSupabase
    .from("referral_codes")
    .select("code")
    .eq("parent_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ code: existing.code });

  // Create one
  const code = makeCode(user.id);
  const { data, error } = await serviceSupabase
    .from("referral_codes")
    .insert({ parent_id: user.id, code })
    .select("code")
    .single();

  if (error) return NextResponse.json({ error: "Could not create code" }, { status: 500 });
  return NextResponse.json({ code: data.code });
}

// POST: Apply a referral code at signup — body: { code }
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { code?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const code = typeof body.code === "string" ? body.code.toUpperCase().trim() : "";
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 422 });

  // Look up the referrer by code
  const { data: referralRow } = await serviceSupabase
    .from("referral_codes")
    .select("parent_id")
    .eq("code", code)
    .maybeSingle();

  if (!referralRow) return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  if (referralRow.parent_id === user.id) return NextResponse.json({ error: "Cannot use own code" }, { status: 400 });

  // Check not already redeemed
  const { data: existing } = await serviceSupabase
    .from("referral_redemptions")
    .select("id")
    .eq("referred_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ ok: true, message: "Already applied" });

  // Record redemption
  await serviceSupabase.from("referral_redemptions").insert({
    referrer_id: referralRow.parent_id,
    referred_id: user.id,
    code,
  });

  return NextResponse.json({ ok: true });
}
