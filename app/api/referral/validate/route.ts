import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { REFERRAL_CODE_LENGTH } from "@/lib/referralConstants";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase().trim();
  if (!code || code.length !== REFERRAL_CODE_LENGTH) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
  }

  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await serviceSupabase
    .from("referral_codes")
    .select("parent_id, parents(name)")
    .eq("code", code)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Invalid code" }, { status: 404 });

  const referrerName = (data.parents as { name?: string } | null)?.name ?? "a friend";
  return NextResponse.json({ valid: true, referrerName });
}
