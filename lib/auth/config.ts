// lib/auth/config.ts — single source of truth for Airways auth options.
// Controls which buttons appear on login/signup. OAuth providers must also
// be enabled in Supabase Dashboard → Auth → Providers.
export const AUTH_PROVIDERS = ["google"] as const;
export type OAuthProvider = (typeof AUTH_PROVIDERS)[number];

export const AUTH_METHODS = ["password", "magiclink", "phone", "oauth"] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export const OAUTH_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// E.164 — required by Supabase phone OTP (e.g. +2507XXXXXXXX for Rwanda).
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim().toLowerCase());
}

export function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

export function isValidPhone(v: string): boolean {
  return PHONE_RE.test(v.trim().replace(/[\s-]/g, ""));
}

export function normalizePhone(v: string): string {
  return v.trim().replace(/[\s-]/g, "");
}

export function isValidPassword(v: string): boolean {
  return v.length >= 8;
}

/** Allow only internal redirect targets — prevents open-redirect attacks. */
export function safeNextPath(raw: string | null | undefined, fallback = "/home"): string {
  if (!raw) return fallback;
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return raw;
  return fallback;
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
