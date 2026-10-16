import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/serviceClient";
import { checkRateLimit } from "@/lib/ratelimit";

// POST /api/auth/session — ensure parent row + apply pending referral.
// Called by the auth callback page after any sign-in method (password,
// OAuth, magic link, phone) so Google/magic-link users get the same
// parent profile + referral treatment as email signups.
// Body: { name?: string, referralCode?: string }
export async function POST(req: NextRequest) {
  const { supabase, response } = createRouteClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { name?: string; referralCode?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : ((user.user_metadata?.name as string | undefined) ??
        (user.user_metadata?.full_name as string | undefined) ??
        "Parent");

  const sb = getServiceClient();

  // Parent row — trigger handle_new_user() usually creates it; upsert covers
  // OAuth / older accounts where the trigger never ran.
  const { error: parentError } = await sb
    .from("parents")
    .upsert(
      { id: user.id, email: user.email ?? "", name },
      { onConflict: "id" }
    );
  if (parentError) {
    console.error("[auth/session] parent upsert failed:", parentError.message);
    return NextResponse.json({ error: "Could not create profile" }, { status: 500 });
  }

  // Pending referral code (from signup ?ref= link / sessionStorage).
  let referralApplied = false;
  const code =
    typeof body.referralCode === "string" ? body.referralCode.toUpperCase().trim() : "";
  if (code) {
    const allowed = await checkRateLimit(`referral:${user.id}`, "nimipiko:auth-referral", 5, 60);
    if (allowed) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/referral`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          }
        ).catch(() => null);
        // Fallback: apply directly with service client if internal fetch fails.
        if (!res?.ok) {
          const { data: row } = await sb
            .from("referral_codes")
            .select("parent_id")
            .eq("code", code)
            .maybeSingle();
          if (row && (row as { parent_id: string }).parent_id !== user.id) {
            const { data: existing } = await sb
              .from("referral_redemptions")
              .select("id")
              .eq("referred_id", user.id)
              .maybeSingle();
            if (!existing) {
              await sb.from("referral_redemptions").insert({
                referrer_id: (row as { parent_id: string }).parent_id,
                referred_id: user.id,
                code,
              });
              referralApplied = true;
            }
          }
        } else {
          referralApplied = true;
        }
      } catch (err) {
        console.warn("[auth/session] referral apply failed (non-blocking):", err);
      }
    }
  }

  // Welcome email — best effort, never blocks login.
  try {
    if (user.email) {
      const { sendWelcomeEmail } = await import("@/lib/email");
      const { data: parent } = await sb
        .from("parents")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      sendWelcomeEmail(user.email, (parent as { name?: string } | null)?.name ?? name).catch(
        (err) => console.error("[auth/session] welcome email failed:", err)
      );
    }
  } catch (err) {
    console.warn("[auth/session] welcome email failed (non-blocking):", err);
  }

  const headers = new Headers(response.headers);
  return NextResponse.json({ ok: true, referralApplied }, { headers });
}
