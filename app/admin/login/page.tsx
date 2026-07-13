"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import supabase from "@/lib/supabaseClient";

type Mode = "login" | "forgot" | "forgot-sent";

export default function AdminLoginPage() {
  const emailRef = useRef<HTMLInputElement>(null);

  const [mode, setMode]               = useState<Mode>("login");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [busy, setBusy]               = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/admin";
    });
    emailRef.current?.focus();
  }, []);

  const clearError = () => setError("");

  const login = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err || !data.user) {
        setError(err?.message ?? "Invalid email or password.");
        setBusy(false);
        return;
      }
      // Hard navigation so the browser clears the login page immediately
      // rather than holding it visible while the admin JS bundle downloads.
      setRedirecting(true);
      window.location.href = "/admin";
    } catch {
      setError("Could not reach the server. Check your connection.");
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (err) { setError(err.message); setBusy(false); return; }
      setMode("forgot-sent");
    } catch {
      setError("Could not send reset email. Try again.");
    }
    setBusy(false);
  };

  const onKey = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && !busy) action();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9] px-4 py-12">
      <div className="w-full max-w-[400px] space-y-6">

        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md ring-2 ring-green-100">
            <img src="/nimi-logo-circle.png" alt="NIMIPIKO" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-600">NIMIPIKO</p>
            <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight tracking-tight">Admin Console</h1>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <div className="p-7 space-y-5">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Sign in</h2>
                <p className="text-[13px] text-gray-400 mt-0.5">Authorized personnel only</p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3 text-[13px] text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Email</label>
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError(); }}
                    onKeyDown={e => onKey(e, login)}
                    disabled={busy}
                    placeholder="admin@nimipiko.com"
                    autoComplete="email"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15 transition disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Password</label>
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); clearError(); }}
                      className="text-[11px] font-semibold text-green-600 hover:text-green-700 transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearError(); }}
                      onKeyDown={e => onKey(e, login)}
                      disabled={busy}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 pr-11 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15 transition disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={login}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-[14px] rounded-xl py-3 shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {redirecting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening admin…</>
                  : busy
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                  : "Sign In"
                }
              </button>
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === "forgot" && (
            <div className="p-7 space-y-5">
              <button
                onClick={() => { setMode("login"); clearError(); }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400 hover:text-gray-600 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>

              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Reset password</h2>
                <p className="text-[13px] text-gray-400 mt-0.5">We'll send a link to your inbox</p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3 text-[13px] text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError(); }}
                  onKeyDown={e => onKey(e, sendReset)}
                  disabled={busy}
                  placeholder="admin@nimipiko.com"
                  autoComplete="email"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15 transition disabled:opacity-50"
                />
              </div>

              <button
                onClick={sendReset}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-[14px] rounded-xl py-3 shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send Reset Link"}
              </button>
            </div>
          )}

          {/* ── FORGOT SENT ── */}
          {mode === "forgot-sent" && (
            <div className="p-7 space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Check your inbox</h2>
                <p className="text-[13px] text-gray-400 mt-1">
                  We sent a reset link to <span className="font-semibold text-gray-600">{email}</span>
                </p>
              </div>
              <button
                onClick={() => { setMode("login"); clearError(); }}
                className="text-[13px] font-semibold text-green-600 hover:text-green-700 transition"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-300">
          Authorized personnel only · NIMIPIKO © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
