"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const m = useThemeMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/home");
    });
  }, [router]);

  const login = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      setMessage(t("loginSuccess"));
      router.replace("/home");
    } catch (err) {
      console.error("Unexpected login error:", err);
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10 sm:py-14 relative overflow-hidden">

      <AuthBackground />

      {/* Header */}
      <div className="relative z-10 text-center mb-6 max-w-2xl">
        <h1 className="font-black text-3xl sm:text-4xl lg:text-5xl text-ds-text">
          Welcome Back, <span className="text-[var(--ds-brand-primary)]">Explorer!</span> 🚀
        </h1>
        <p className="text-gray-500 mt-2 text-sm sm:text-base">
          Log in to continue your creative journey with Nimipiko Studio.
        </p>
      </div>

      {/* Mascot + speech bubble */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end justify-center gap-3 mb-6">
        <motion.img
          src={assets.nimiCircle} alt="NIMI"
          className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-yellow-400 shadow-xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
        <div className="bg-white border border-ds-border rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 max-w-[220px] sm:mb-6">
          <p className="text-sm font-bold text-ds-text text-center leading-snug">
            Let&apos;s create something amazing today! ✨
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-white border border-ds-border shadow-ds-card p-6 sm:p-8 space-y-5" style={{ borderRadius: 'var(--leaf-r-lg)' }}>

        {(error || message) && (
          <div className={`leaf p-2.5 text-center text-sm font-semibold ${error ? "bg-red-50 text-red-600" : "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]"}`}>
            {error || message}
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="flex items-center gap-1.5 font-bold text-ds-text text-sm mb-1.5">
            <Mail className="w-4 h-4 text-gray-400" aria-hidden="true" /> Email Address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder={t("loginPlaceholderEmail")}
            disabled={loading}
            className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
        </div>

        <div>
          <label htmlFor="login-password" className="flex items-center gap-1.5 font-bold text-ds-text text-sm mb-1.5">
            <Lock className="w-4 h-4 text-gray-400" aria-hidden="true" /> Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder={t("loginPlaceholderPassword")}
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

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 font-semibold text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-green-600 rounded" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-gray-500 font-bold hover:text-ds-text hover:underline">
            Forgot Password?
          </Link>
        </div>

        <motion.button
          onClick={login}
          disabled={loading}
          whileTap={m.buttonPress}
          className="w-full text-white font-black py-3.5 shadow-md transition disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}
        >
          {loading ? t("loginLoggingIn") : <>🚀 {t("loginStartAdventure")}</>}
        </motion.button>

      </div>

      {/* Sign up link */}
      <p className="relative z-10 text-center text-sm text-gray-600 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signuppage" className="text-[var(--nimi-green)] font-bold hover:underline">
          Sign up
        </Link>{" "}
        and start your adventure!
      </p>

      {/* Bottom mascot bubble */}
      <div className="relative z-10 flex items-center gap-3 mt-8 max-w-md">
        <img
          src={assets.nimiCircle} alt="NIMI"
          className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400 shadow-md flex-shrink-0"  loading="lazy" />
        <div className="bg-white border border-ds-border rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
          <p className="text-sm font-bold text-ds-text leading-snug">
            Ready for another adventure? Let&apos;s bring your <span className="text-[var(--nimi-green)]">ideas</span> to life! ✨
          </p>
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}
