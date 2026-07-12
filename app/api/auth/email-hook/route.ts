export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  sendAuthConfirmSignup,
  sendAuthResetPassword,
  sendAuthMagicLink,
  sendAuthChangeEmail,
  sendAuthInvite,
} from "@/lib/email";

// Supabase sends this hook when it needs to deliver an auth email.
// Responding with {} tells Supabase to skip its own email sending.
// Configure in: Supabase Dashboard → Auth → Hooks → Send Email → HTTP

const HOOK_SECRET = process.env.SUPABASE_AUTH_HOOK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface EmailHookPayload {
  user: {
    email: string;
    user_metadata?: { name?: string; full_name?: string };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: "signup" | "recovery" | "magiclink" | "email_change" | "invite";
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function buildConfirmUrl(tokenHash: string, type: string, redirectTo: string): string {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type,
    next: redirectTo,
  });
  return `${SUPABASE_URL}/auth/v1/verify?${params.toString()}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify the request came from Supabase
  const authHeader = req.headers.get("authorization");
  if (HOOK_SECRET && authHeader !== `Bearer ${HOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: EmailHookPayload;
  try {
    payload = (await req.json()) as EmailHookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user, email_data } = payload;
  const to = user.email;
  if (!to) return NextResponse.json({});

  const { token_hash, token_hash_new, redirect_to, email_action_type } = email_data;

  try {
    switch (email_action_type) {
      case "signup": {
        const url = buildConfirmUrl(token_hash, "signup", redirect_to);
        await sendAuthConfirmSignup(to, url);
        break;
      }
      case "recovery": {
        const url = buildConfirmUrl(token_hash, "recovery", redirect_to);
        await sendAuthResetPassword(to, url);
        break;
      }
      case "magiclink": {
        const url = buildConfirmUrl(token_hash, "magiclink", redirect_to);
        await sendAuthMagicLink(to, url);
        break;
      }
      case "email_change": {
        // Supabase sends two tokens: one to old email, one to new email.
        // token_hash_new is for the new address (sent to the new email).
        const hash = token_hash_new ?? token_hash;
        const url = buildConfirmUrl(hash, "email_change", redirect_to);
        await sendAuthChangeEmail(to, url);
        break;
      }
      case "invite": {
        const url = buildConfirmUrl(token_hash, "invite", redirect_to);
        await sendAuthInvite(to, url);
        break;
      }
    }
  } catch (err) {
    console.error("[email-hook] send failed:", err);
    // Return 500 so Supabase can retry
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  // Empty object = success; Supabase will NOT send its own email
  return NextResponse.json({});
}
