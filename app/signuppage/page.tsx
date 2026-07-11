"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, UserPlus, Star } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const m = useThemeMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) setReferralCode(ref.toUpperCase().slice(0, 10));
  }, [searchParams]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError(t("signupErrFillAll"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("signupErrNoMatch"));
      return;
    }
    if (!agreed) {
      setError(t("signupErrTerms"));
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Upsert parent row (trigger may have already created it)
      await supabase.from("parents").upsert(
        { id: data.user.id, email: data.user.email ?? email, name },
        { onConflict: "id" }
      );
      // Send welcome email + apply referral code (best-effort, non-blocking)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        void fetch("/api/account/welcome-email", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (referralCode) {
          void fetch("/api/referral", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ code: referralCode }),
          });
        }
      }
      router.replace("/onboarding");
    } else {
      setError(t("signupErrNoUser"));
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
          <span className="inline-flex items-center gap-2 bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/20 rounded-full px-4 py-1.5 text-sm font-bold text-[var(--ds-brand-primary)]">
            <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" /> Create your account
          </span>

          <h1 className="font-black text-4xl sm:text-5xl lg:text-6xl text-ds-text leading-tight mt-4">
            Start Your<br />
            <span className="text-[var(--ds-brand-primary)]">Adventure!</span>
          </h1>

          <p className="text-gray-500 mt-4 text-sm sm:text-base max-w-sm mx-auto lg:mx-0">
            Join Nimipiko Studio and unlock a world of creativity.
          </p>

          <div className="mt-10 flex flex-col items-center lg:items-start gap-2">
            <div className="bg-white border border-ds-border rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 max-w-[220px] ml-0 sm:ml-10">
              <p className="text-sm font-bold text-ds-text text-center leading-snug">
                I can&apos;t wait to see what we&apos;ll create together! ✨
              </p>
            </div>
            <motion.img
              src={assets.nimiAuth} alt="NIMI"
              className="w-56 h-56 sm:w-64 sm:h-64 rounded-full object-cover -mt-2"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
          </div>
        </div>

        {/* Right: sign-up card */}
        <div className="w-full max-w-md mx-auto lg:mx-0 bg-white border border-ds-border shadow-ds-card p-6 sm:p-8 space-y-4" style={{ borderRadius: 'var(--leaf-r-lg)' }}>

          <div className="flex flex-col items-center text-center mb-1">
            <div className="w-16 h-16 rounded-full bg-[var(--ds-brand-subtle)] flex items-center justify-center mb-3">
              <UserPlus className="w-7 h-7 text-[var(--ds-brand-primary)]" />
            </div>
            <h2 className="font-black text-2xl text-ds-text">Sign Up</h2>
            <p className="text-gray-500 text-sm mt-1">Create your account to begin your creative journey.</p>
          </div>

          {error && (
            <div className="leaf p-2.5 text-center text-sm font-semibold bg-red-50 text-red-600">
              {error}
            </div>
          )}

          {/* Referral notice */}
          {referralCode && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
              <p className="font-baloo font-black text-green-700 text-[13px]">🎁 Referral code applied!</p>
              <p className="font-nunito text-green-600/80 text-[11px] mt-0.5">
                You and your friend both get 1 free month when you subscribe.
              </p>
            </div>
          )}

          {/* Full Name */}
          <div className="flex items-center gap-3 border border-ds-border bg-ds-input leaf px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--ds-state-focus)] transition">
            <div className="w-9 h-9 rounded-xl bg-[var(--ds-brand-subtle)] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[var(--ds-brand-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="signup-name" className="block text-xs font-bold text-gray-500">Full Name</label>
              <input
                id="signup-name"
                type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t("signupPlaceholderName")}
                disabled={loading}
                className="w-full text-sm font-semibold text-ds-text placeholder:text-gray-400 focus:outline-none bg-transparent" />
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 border border-ds-border bg-ds-input leaf px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--ds-state-focus)] transition">
            <div className="w-9 h-9 rounded-xl bg-[var(--ds-brand-subtle)] flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-[var(--ds-brand-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="signup-email" className="block text-xs font-bold text-gray-500">Email Address</label>
              <input
                id="signup-email"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t("signupPlaceholderEmail")}
                disabled={loading}
                className="w-full text-sm font-semibold text-ds-text placeholder:text-gray-400 focus:outline-none bg-transparent" />
            </div>
          </div>

          {/* Password */}
          <div className="flex items-center gap-3 border border-ds-border bg-ds-input leaf px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--ds-state-focus)] transition">
            <div className="w-9 h-9 rounded-xl bg-[var(--ds-brand-subtle)] flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-[var(--ds-brand-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="signup-password" className="block text-xs font-bold text-gray-500">Password</label>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t("signupPlaceholderPassword")}
                disabled={loading}
                className="w-full text-sm font-semibold text-ds-text placeholder:text-gray-400 focus:outline-none bg-transparent" />
            </div>
            <button type="button" onClick={() => setShowPassword(p => !p)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="flex items-center gap-3 border border-ds-border bg-ds-input leaf px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--ds-state-focus)] transition">
            <div className="w-9 h-9 rounded-xl bg-[var(--ds-brand-subtle)] flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-[var(--ds-brand-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="signup-confirm" className="block text-xs font-bold text-gray-500">Confirm Password</label>
              <input
                id="signup-confirm"
                type={showConfirmPassword ? "text" : "password"} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && signup()}
                placeholder={t("signupPlaceholderConfirm")}
                disabled={loading}
                className="w-full text-sm font-semibold text-ds-text placeholder:text-gray-400 focus:outline-none bg-transparent" />
            </div>
            <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition">
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-green-600 rounded flex-shrink-0" />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-ds-text font-bold hover:underline">Terms of Service</Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-ds-text font-bold hover:underline">Privacy Policy</Link>
            </span>
          </label>

          <motion.button
            onClick={signup}
            disabled={loading}
            whileTap={m.buttonPress}
            className="w-full text-white font-black py-3.5 shadow-md transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}
          >
            {loading ? t("signupCreating") : <>🚀 {t("signupCreateBtn")}</>}
          </motion.button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/loginpage" className="text-[var(--nimi-green)] font-bold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom mascot bubble */}
      <div className="relative z-10 flex items-center gap-3 mt-10 max-w-md">
        <img
          src={assets.nimiCircle} alt="NIMI"
          className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400 shadow-md flex-shrink-0" />
        <div className="bg-white border border-ds-border rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
          <p className="text-sm font-bold text-ds-text leading-snug">
            Every great adventure starts with a single step. Let&apos;s go! ✨
          </p>
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}

