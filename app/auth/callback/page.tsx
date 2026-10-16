"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plane } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { safeNextPath } from "@/lib/auth/config";
import { PENDING_REF_KEY } from "@/lib/referralConstants";

// /auth/callback — landing page for ALL Supabase email/OAuth redirects:
// Google OAuth, magic link, email confirmation, password recovery.
// Exchanges the ?code for a session (PKCE), ensures the parent row via
// /api/auth/session, then routes to ?next= or /home.
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = safeNextPath(searchParams?.get("next"));
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errDesc =
        url.searchParams.get("error_description") ?? searchParams?.get("error_description");

      if (errDesc && !code) {
        if (!cancelled) setError(errDesc.replace(/\+/g, " "));
        return;
      }

      try {
        if (code) {
          const { error: exError } = await supabase.auth.exchangeCodeForSession(code);
          if (exError) throw exError;
        } else {
          // Token-hash links (#access_token) are auto-processed by the client.
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            await new Promise((r) => setTimeout(r, 1500));
            const { data: { session: retry } } = await supabase.auth.getSession();
            if (!retry) throw new Error("No session found. Please try signing in again.");
          }
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Could not read your account. Please sign in again.");

        // Ensure parent row + referral + welcome email (server-side, all methods).
        const pendingRef =
          searchParams?.get("ref") ?? sessionStorage.getItem(PENDING_REF_KEY) ?? undefined;
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:
              (user.user_metadata?.name as string | undefined) ??
              (user.user_metadata?.full_name as string | undefined) ??
              undefined,
            referralCode: pendingRef ?? undefined,
          }),
        }).catch((e) => console.warn("[callback] session ensure failed (non-blocking):", e));
        sessionStorage.removeItem(PENDING_REF_KEY);

        // New vs returning: children exist → /home, else → /onboarding.
        const { data: kids } = await supabase
          .from("children")
          .select("id")
          .eq("parent_id", user.id)
          .limit(1);
        if (!cancelled) {
          router.replace(kids && kids.length > 0 ? next : "/onboarding");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: "linear-gradient(180deg,#F7FAF7,#EDF5EF)" }}
    >
      {error ? (
        <>
          <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-2xl shadow" style={{ border: "1.5px solid #E5B8B8" }}>🛬</span>
          <h1 className="font-baloo font-black text-2xl text-gray-900">Hmm, that boarding pass expired</h1>
          <p className="font-nunito text-sm text-gray-500 max-w-sm font-semibold">{error}</p>
          <a href="/loginpage" className="mt-2 font-baloo font-black text-white px-6 py-3 rounded-2xl" style={{ background: "linear-gradient(135deg,#1FA34F,#178040)" }}>
            Back to Login
          </a>
        </>
      ) : (
        <>
          <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow animate-bounce" style={{ border: "1.5px solid #1B8A4B" }}>
            <Plane className="w-6 h-6" style={{ color: "#1B8A4B" }} />
          </span>
          <h1 className="font-baloo font-black text-2xl text-gray-900">Boarding…</h1>
          <p className="font-nunito text-sm text-gray-500 font-semibold">Confirming your seat with the tower</p>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#F2F7F3" }} />}>
      <CallbackInner />
    </Suspense>
  );
}
