export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAuthResetPassword } from "@/lib/email";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: string };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nimipiko.com";

  const { data, error } = await sb.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl}/reset-password` },
  });

  if (error) {
    // Don't reveal whether the email exists — always return success to the client
    console.error("[send-reset] generateLink error:", error.message);
    return NextResponse.json({ ok: true });
  }

  try {
    await sendAuthResetPassword(email, data.properties.action_link);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-reset] SendGrid error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
