"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const updatePassword = async () => {
    if (!password.trim()) {
      setError("Please enter a new password.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated! Redirecting to sign in...");
    setTimeout(() => router.replace("/admin/login"), 2000);
  };

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
            <h2 className="text-lg font-bold text-white">Set a new password</h2>
            <p className="text-indigo-200/70 text-sm mt-1">
              Choose a new password for your admin account
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
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300/60" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && updatePassword()}
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
            onClick={updatePassword}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl py-3 shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Authorized personnel only · NIMIPIKO © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
