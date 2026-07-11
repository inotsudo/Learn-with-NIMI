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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <img
            src="/nimi-logo-circle.png"
            alt="NIMIPIKO"
            className="w-16 h-16 rounded-full object-cover mx-auto mb-3 shadow-md"
           loading="lazy" />
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">NIMIPIKO</h1>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">Set a new password</h2>
            <p className="text-gray-500 text-sm mt-1">
              Choose a new password for your admin account
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
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && updatePassword()}
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
            onClick={updatePassword}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-3 shadow-sm transition disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Authorized personnel only · NIMIPIKO © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
