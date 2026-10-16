"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import {
  normalizeEmail, normalizePhone, isValidEmail, isValidPhone,
  safeNextPath, appUrl, type OAuthProvider,
} from "./config";

export type Method = "password" | "magiclink" | "phone";

export function useAirwaysAuth(nextRaw: string | null) {
  const router = useRouter();
  const nextPath = safeNextPath(nextRaw);
  const [method, setMethod] = useState<Method>("password");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const fail = (msg: string) => {
    setError(msg);
    setInfo("");
    setLoading(false);
    setOauthLoading(null);
  };

  const go = (target?: string) => router.replace(target ?? nextPath);

  async function signInPassword(email: string, password: string) {
    const em = normalizeEmail(email);
    if (!isValidEmail(em)) return fail("Enter a valid email address.");
    if (!password) return fail("Enter your boarding code (password).");
    setLoading(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithPassword({ email: em, password });
    if (e) return fail(e.message);
    go();
  }

  async function sendMagicLink(email: string) {
    const em = normalizeEmail(email);
    if (!isValidEmail(em)) return fail("Enter a valid email address.");
    setLoading(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithOtp({
      email: em,
      options: { emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    if (e) return fail(e.message);
    setLoading(false);
    setInfo("Magic boarding link sent! Check your email and tap the link.");
  }

  async function sendPhoneOtp(phone: string) {
    const ph = normalizePhone(phone);
    if (!isValidPhone(ph)) return fail("Enter phone as +2507XXXXXXXX.");
    setLoading(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithOtp({ phone: ph });
    if (e) return fail(e.message);
    setLoading(false);
    setInfo(`Code sent to ${ph}. Enter it below to board.`);
  }

  async function verifyPhoneOtp(phone: string, token: string) {
    const ph = normalizePhone(phone);
    if (!isValidPhone(ph)) return fail("Enter phone as +2507XXXXXXXX.");
    if (token.trim().length < 6) return fail("Enter the 6-digit code from SMS.");
    setLoading(true);
    setError("");
    const { error: e } = await supabase.auth.verifyOtp({ phone: ph, token: token.trim(), type: "sms" });
    if (e) return fail(e.message);
    // New phone users have no parent row yet — callback + session API handle it,
    // but for direct verify we ensure it here via the API too.
    await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    go();
  }

  async function signInOAuth(provider: OAuthProvider) {
    setOauthLoading(provider);
    setError("");
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    if (e) return fail(`${provider} sign-in failed: ${e.message}. Enable it in Supabase → Auth → Providers.`);
  }

  return {
    method, setMethod, loading, oauthLoading, error, info,
    setError, setInfo, nextPath, signInPassword, sendMagicLink,
    sendPhoneOtp, verifyPhoneOtp, signInOAuth,
  };
}
