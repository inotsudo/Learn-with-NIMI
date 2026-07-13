"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import supabase from "@/lib/supabaseClient";

export default function AdminResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [busy, setBusy]           = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");

  const update = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/admin/login"), 2500);
    } catch {
      setError("Could not update password. Check your connection.");
      setBusy(false);
    }
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {!done ? (
            <div className="p-7 space-y-5">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Set a new password</h2>
                <p className="text-[13px] text-gray-400 mt-0.5">Must be at least 8 characters</p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3 text-[13px] text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && !busy && update()}
                    disabled={busy}
                    placeholder="••••••••"
                    autoComplete="new-password"
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

              <button
                onClick={update}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-[14px] rounded-xl py-3 shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : "Update Password"}
              </button>
            </div>
          ) : (
            <div className="p-7 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Password updated</h2>
                <p className="text-[13px] text-gray-400 mt-1">Redirecting you to sign in…</p>
              </div>
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
