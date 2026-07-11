"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { ArrowLeft, Mail, Lock, Shield } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError(t("resetErrEmail"));
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage(t("resetSuccess"));
    }

    setLoading(false);
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10 sm:py-14 relative overflow-hidden">

      <AuthBackground />

      <div className="relative z-10 w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">

        {/* Left: hero copy + mascot */}
        <div className="text-center lg:text-left mb-10 lg:mb-0">
          <Link
            href="/loginpage"
            className="inline-flex items-center gap-2 bg-white border border-ds-border rounded-full px-4 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>

          <h1 className="font-black text-4xl sm:text-5xl lg:text-6xl text-ds-text leading-tight mt-4">
            Don&apos;t worry,<br />
            <span className="text-[var(--ds-brand-primary)]">Explorer!</span>
          </h1>

          <p className="text-gray-500 mt-4 text-sm sm:text-base max-w-sm mx-auto lg:mx-0">
            It happens! Reset your password and get back to your adventure.
          </p>

          <div className="mt-10 flex flex-col items-center lg:items-start gap-2">
            <div className="bg-white border border-ds-border rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 max-w-[220px] ml-0 sm:ml-10">
              <p className="text-sm font-bold text-ds-text text-center leading-snug">
                No problem! Let&apos;s get you back on track! ✨
              </p>
            </div>
            <motion.img
              src={assets.nimiAuth} alt="NIMI"
              className="w-56 h-56 sm:w-64 sm:h-64 rounded-full object-cover -mt-2"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
          </div>
        </div>

        {/* Right: forgot password card */}
        <div className="w-full max-w-md mx-auto lg:mx-0 bg-white border border-ds-border shadow-ds-card p-6 sm:p-8 space-y-4" style={{ borderRadius: 'var(--leaf-r-lg)' }}>

          <div className="flex flex-col items-center text-center mb-1">
            <div className="w-16 h-16 rounded-full bg-[var(--ds-brand-subtle)] flex items-center justify-center mb-3">
              <Lock className="w-7 h-7 text-[var(--ds-brand-primary)]" />
            </div>
            <h2 className="font-black text-2xl text-ds-text">Forgot Password?</h2>
            <p className="text-gray-500 text-sm mt-1">
              No worries! Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {(error || message) && (
            <div className={`leaf p-2.5 text-center text-sm font-semibold ${error ? "bg-red-50 text-red-600" : "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]"}`}>
              {error || message}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 font-bold text-ds-text text-sm mb-1.5">
              <Mail className="w-4 h-4 text-gray-400" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleResetPassword()}
              placeholder={t("resetPlaceholderEmail")}
              disabled={loading}
              className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
          </div>

          <motion.button
            onClick={handleResetPassword}
            disabled={loading}
            whileTap={m.buttonPress}
            className="w-full text-white font-black py-3.5 shadow-md transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}
          >
            <Mail className="w-4 h-4" />
            {loading ? t("resetSending") : t("resetSendBtn")}
          </motion.button>

          <p className="text-center text-sm text-gray-600">
            Remember your password?{" "}
            <Link href="/loginpage" className="text-[var(--nimi-green)] font-bold hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom mascot bubble */}
      <div className="relative z-10 flex items-center gap-3 mt-10 max-w-md">
        <img
          src={assets.nimiAuth} alt="NIMI"
          className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400 shadow-md flex-shrink-0"  loading="lazy" />
        <div className="bg-white border border-ds-border rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
          <p className="text-sm font-bold text-ds-text leading-snug">
            You&apos;ve got this! Every adventure starts with a fresh step. 💚
          </p>
        </div>
      </div>

      {/* Security note */}
      <div className="relative z-10 w-full max-w-md mt-4 flex items-center gap-3 bg-gray-50 border border-ds-border leaf px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-[var(--ds-brand-subtle)] flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-[var(--ds-brand-primary)]" />
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-bold text-ds-text">Your security is our priority.</span> We&apos;ll never share your information with anyone.
        </p>
      </div>
    </div>
    </MotionConfig>
  );
}
