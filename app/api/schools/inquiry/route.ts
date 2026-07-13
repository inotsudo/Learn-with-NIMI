import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, school, email, country, size, message } = body;

    if (!name || !email || !school) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Store inquiry in DB
    await supabase.from("school_inquiries").insert({
      name,
      school,
      email,
      country: country || null,
      learner_count: size || null,
      message: message || null,
    });

    // Notify internal team via email (best-effort)
    if (process.env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NIMIPIKO Schools <hello@nimipiko.com>",
          to: "schools@nimipiko.com",
          subject: `New School Inquiry — ${school} (${country || "Unknown"})`,
          html: `
<div style="font-family:Arial,sans-serif;max-width:520px">
  <h2 style="color:#15803d">New School Inquiry</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">Name</td><td style="font-weight:700">${esc(name)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">School</td><td style="font-weight:700">${esc(school)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">Country</td><td>${esc(country) || "—"}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">Learners</td><td>${esc(size) || "—"}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">Message</td><td>${esc(message) || "—"}</td></tr>
  </table>
</div>
          `.trim(),
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Schools Inquiry]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
