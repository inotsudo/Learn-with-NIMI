import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const { email, name, source } = body as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 422 });
  }

  const { data: inserted, error } = await supabase
    .from("newsletter_signups")
    .insert({
      email: email.toLowerCase().trim(),
      name: typeof name === "string" ? name.trim().slice(0, 80) : null,
      source: typeof source === "string" ? source : "landing_page",
    })
    .select("unsubscribe_token")
    .single();

  if (error) {
    // 23505 = unique_violation (duplicate email) — treat as success to avoid enumeration
    if (error.code === "23505") return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  // Send welcome email if Resend key present (best-effort, fire-and-forget)
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimipiko.com";
    const unsubUrl = `${siteUrl}/unsubscribe?token=${inserted.unsubscribe_token}`;
    void fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: "NIMIPIKO <hello@nimipiko.com>",
        to: [email],
        subject: "Welcome to the NIMIPIKO family! 🌿",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
            <div style="background:#15803d;padding:28px 24px;text-align:center">
              <p style="color:#fff;font-size:28px;margin:0">🌿</p>
              <h1 style="color:#fff;margin:8px 0 0;font-size:22px">You're in!</h1>
            </div>
            <div style="padding:28px 24px">
              <p style="color:#374151;font-size:15px;line-height:1.6">
                ${name ? `Hi ${name},` : "Hi there,"}<br><br>
                Thank you for joining the NIMIPIKO community. We'll send you updates about new stories, features, and tips to help your child thrive.
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6">
                In the meantime, explore what your kids can do on NIMIPIKO:
              </p>
              <div style="text-align:center;margin:24px 0">
                <a href="${siteUrl}/signuppage"
                  style="display:inline-block;background:#15803d;color:#fff;font-weight:700;border-radius:12px;padding:12px 28px;text-decoration:none;font-size:15px">
                  Start for Free →
                </a>
              </div>
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px">
                NIMIPIKO · <a href="${siteUrl}/privacy" style="color:#9ca3af">Privacy Policy</a> ·
                <a href="${unsubUrl}" style="color:#9ca3af">Unsubscribe</a>
              </p>
            </div>
          </div>
        `,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
