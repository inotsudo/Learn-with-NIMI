"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import supabase from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: admin, error: adminError } = await supabase
            .from("admins")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
          if (adminError) console.error("[admin login] admins lookup failed:", adminError.message);
          if (admin) {
            router.replace("/admin");
            return;
          }
        }
      } catch (err) {
        console.error("[admin login] session check failed:", err);
      }
      setChecking(false);
    };
    void checkSession();
  }, [router]);

  const login = async () => {
    setLoading(true);
    setError("");

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError || !data.user) {
      setError(loginError?.message ?? "Login failed.");
      setLoading(false);
      return;
    }

    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!admin) {
      await supabase.auth.signOut();
      setError("This account doesn't have admin access.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
  };

  const sendResetLink = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("Password reset email sent! Check your inbox.");
    }

    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] text-indigo-200 text-sm font-semibold">
        Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] flex items-center justify-center px-4 py-10">
      {/* Decorative glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <img
            src="/nimi-logo-circle.png"
            alt="NIMIPIKO"
            className="w-16 h-16 rounded-full object-cover mx-auto mb-3 ring-2 ring-white/20 shadow-lg"
          />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">NIMIPIKO</h1>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">
              {mode === "login" ? "Sign in to your account" : "Reset your password"}
            </h2>
            <p className="text-indigo-200/70 text-sm mt-1">
              {mode === "login"
                ? "Enter your credentials to access the admin console"
                : "Enter your email to receive a reset link"}
            </p>
          </div>

          {error && (
            <div className="rounded-xl p-2.5 text-center text-sm font-semibold bg-red-500/10 text-red-300 border border-red-500/20">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl p-2.5 text-center text-sm font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {message}
            </div>
          )}

          <div>
            <label className="block font-semibold text-indigo-100/80 text-xs uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300/60" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (mode === "login" ? login() : sendResetLink())}
                disabled={loading}
                placeholder="you@nimipiko.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition"
              />
            </div>
          </div>

          {mode === "login" && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-indigo-100/80 text-xs uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}
                    className="text-xs font-semibold text-indigo-300 hover:text-white transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300/60" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && login()}
                    disabled={loading}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-300/60 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={login}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl py-3 shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </>
          )}

          {mode === "forgot" && (
            <>
              <button
                onClick={sendResetLink}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl py-3 shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                className="w-full text-center text-sm font-semibold text-indigo-200/70 hover:text-white transition"
              >
                Back to Sign In
              </button>
            </>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Authorized personnel only · NIMIPIKO © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
