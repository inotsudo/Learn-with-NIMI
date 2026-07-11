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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm font-semibold">
        Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <img
            src="/nimi-logo-circle.png"
            alt="NIMIPIKO"
            className="w-16 h-16 rounded-full object-cover mx-auto mb-3 shadow-md"
          />
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">NIMIPIKO</h1>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">
              {mode === "login" ? "Sign in to your account" : "Reset your password"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {mode === "login"
                ? "Enter your credentials to access the admin console"
                : "Enter your email to receive a reset link"}
            </p>
          </div>

          {error && (
            <div className="rounded-xl p-2.5 text-center text-sm font-semibold bg-red-50 text-red-600 border border-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl p-2.5 text-center text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
              {message}
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (mode === "login" ? login() : sendResetLink())}
                disabled={loading}
                placeholder="you@nimipiko.com"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-10 pr-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
              />
            </div>
          </div>

          {mode === "login" && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}
                    className="text-xs font-semibold text-green-600 hover:text-green-700 transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && login()}
                    disabled={loading}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={login}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-3 shadow-sm transition disabled:opacity-50"
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
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-3 shadow-sm transition disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                className="w-full text-center text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
              >
                Back to Sign In
              </button>
            </>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Authorized personnel only · NIMIPIKO © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
