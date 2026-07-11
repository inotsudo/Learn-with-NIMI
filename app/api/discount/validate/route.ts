import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabaseClient";

// POST { code, productSlug } → { valid, discount_type, discount_value, description }
// Public endpoint (no auth required) — RLS only exposes active codes.
export async function POST(req: NextRequest) {
  let body: { code?: string; productSlug?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ valid: false, error: "Bad request" }, { status: 400 }); }

  const code = typeof body.code === "string" ? body.code.toUpperCase().trim() : "";
  if (!code) return NextResponse.json({ valid: false, error: "Code required" }, { status: 422 });

  const { data: dc } = await supabase
    .from("discount_codes")
    .select("id, code, description, discount_type, discount_value, applies_to, max_uses, uses_count")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (!dc) return NextResponse.json({ valid: false, error: "Invalid or expired code" });

  // Check max uses
  if (dc.max_uses !== null && dc.uses_count >= dc.max_uses) {
    return NextResponse.json({ valid: false, error: "This code has been fully redeemed" });
  }

  // Check product applicability
  const slug = body.productSlug ?? "";
  if (dc.applies_to === "club" && !slug.includes("club")) {
    return NextResponse.json({ valid: false, error: "This code is only valid for Club plans" });
  }
  if (dc.applies_to === "annual" && !slug.includes("annual")) {
    return NextResponse.json({ valid: false, error: "This code is only valid for annual plans" });
  }

  return NextResponse.json({
    valid: true,
    code_id: dc.id,
    code: dc.code,
    description: dc.description ?? null,
    discount_type: dc.discount_type,
    discount_value: Number(dc.discount_value),
  });
}
