"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, MotionConfig } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

export default function ResetPassword() {
  const router = useRouter();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Supabase handles access_token from URL automatically in the session
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match. Please try again.");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setIsError(true);
      setMessage(error.message);
      setPassword("");
      setConfirmPassword("");
    } else {
      setIsError(false);
      setMessage("Password updated successfully! Redirecting to login...");
      setTimeout(() => router.push("/loginpage"), 2000);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">

      <AuthBackground />

      <div className="relative z-10 w-full max-w-md">

        {/* Mascot header */}
        <div className="flex flex-col items-center text-center mb-6">
          <motion.img
            src={assets.nimiAuth} alt="NIMI"
            className="w-20 h-20 rounded-full object-cover border-4 border-yellow-400 shadow-xl mb-3"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
          <h1 className="font-black text-3xl sm:text-4xl text-ds-text">
            New <span className="text-[var(--ds-brand-primary)]">Password</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm max-w-xs">
            Choose a strong new password to secure your account.
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleUpdatePassword}
          className="bg-white border border-ds-border shadow-ds-card p-6 sm:p-8 space-y-4"
          style={{ borderRadius: 'var(--leaf-r-lg)' }}
        >
          <div className="flex flex-col items-center text-center mb-1">
            <div className="w-14 h-14 rounded-full bg-[var(--ds-brand-subtle)] flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-[var(--ds-brand-primary)]" />
            </div>
            <h2 className="font-black text-xl text-ds-text">Reset Password</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your new password below.</p>
          </div>

          {message && (
            <div className={`leaf p-2.5 text-center text-sm font-semibold flex items-center justify-center gap-2 ${
              isError ? "bg-red-50 text-red-600" : "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]"
            }`}>
              {!isError && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
              {message}
            </div>
          )}

          {/* New password */}
          <div>
            <label className="flex items-center gap-1.5 font-bold text-ds-text text-sm mb-1.5">
              <Lock className="w-4 h-4 text-gray-400" /> New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={loading}
                className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 pr-10 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="flex items-center gap-1.5 font-bold text-ds-text text-sm mb-1.5">
              <Lock className="w-4 h-4 text-gray-400" /> Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={loading}
                className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 pr-10 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={m.buttonPress}
            className="w-full text-white font-black py-3.5 shadow-md transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}
          >
            <Lock className="w-4 h-4" />
            {loading ? "Updating Password..." : "Update Password"}
          </motion.button>
        </form>

        {/* Bottom note */}
        <div className="flex items-center gap-3 mt-4 bg-white border border-ds-border leaf px-4 py-3 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-[var(--ds-brand-subtle)] flex items-center justify-center flex-shrink-0">
            <Lock className="w-3.5 h-3.5 text-[var(--ds-brand-primary)]" />
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-bold text-ds-text">Secure connection.</span> Your password is encrypted and never stored in plain text.
          </p>
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}
