"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, UserPlus, Star, Sparkles } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SignupPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      router.replace("/");
    } else {
      setError(t("signupErrNoUser"));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden theme-bg flex flex-col items-center px-4 py-10 sm:py-14">

      <AuthBackground />

      <div className="relative z-10 w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">

        {/* Left: hero copy + mascot */}
        <div className="text-center lg:text-left mb-10 lg:mb-0">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur rounded-full px-4 py-1.5 text-sm font-bold theme-text">
            <Star className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" /> Create your account
          </span>

          <h1 className="font-black text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mt-4">
            Start Your<br />
            <span className="relative inline-block px-2">
              <Sparkles className="absolute -left-7 top-1 w-6 h-6 text-pink-300" />
              <span className="bg-gradient-to-r from-fuchsia-400 to-purple-300 bg-clip-text text-transparent">Adventure!</span>
              <Sparkles className="absolute -right-7 top-1 w-6 h-6 text-yellow-300" />
            </span>
          </h1>

          <p className="theme-text mt-4 text-sm sm:text-base max-w-sm mx-auto lg:mx-0">
            Join Nimipiko Studio and unlock a world of creativity.
          </p>

          <div className="mt-10 flex flex-col items-center lg:items-start gap-2">
            <div className="bg-white/15 backdrop-blur border border-white/20 rounded-2xl rounded-bl-sm shadow-lg px-4 py-3 max-w-[220px] ml-0 sm:ml-10">
              <p className="text-sm font-bold text-white text-center leading-snug">
                I can&apos;t wait to see what we&apos;ll create together! ✨
              </p>
            </div>
            <motion.img
              src="/nimi-logo-circle.png" alt="NIMI"
              className="w-56 h-56 sm:w-64 sm:h-64 rounded-full object-cover -mt-2"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
          </div>
        </div>

        {/* Right: sign-up card */}
        <div className="w-full max-w-md mx-auto lg:mx-0 theme-card border-2 border-white/15 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4">

          <div className="flex flex-col items-center text-center mb-1">
            <div className="w-16 h-16 rounded-full theme-accent-muted flex items-center justify-center mb-3">
              <UserPlus className="w-7 h-7 theme-text" />
            </div>
            <h2 className="font-black text-2xl text-white">Sign Up</h2>
            <p className="theme-text text-sm mt-1">Create your account to begin your creative journey.</p>
          </div>

          {error && (
            <div className="rounded-xl p-2.5 text-center text-sm font-semibold bg-red-500/10 text-red-300">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="flex items-center gap-3 border-2 border-white/20 bg-white/5 rounded-2xl px-3 py-2 focus-within:theme-border-strong transition">
            <div className="w-9 h-9 rounded-xl theme-accent-muted flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 theme-text" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold theme-text">Full Name</label>
              <input
                type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t("signupPlaceholderName")}
                disabled={loading}
                className="w-full text-sm font-semibold text-white placeholder:text-white/40 focus:outline-none bg-transparent" />
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 border-2 border-white/20 bg-white/5 rounded-2xl px-3 py-2 focus-within:theme-border-strong transition">
            <div className="w-9 h-9 rounded-xl theme-accent-muted flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 theme-text" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold theme-text">Email Address</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t("signupPlaceholderEmail")}
                disabled={loading}
                className="w-full text-sm font-semibold text-white placeholder:text-white/40 focus:outline-none bg-transparent" />
            </div>
          </div>

          {/* Password */}
          <div className="flex items-center gap-3 border-2 border-white/20 bg-white/5 rounded-2xl px-3 py-2 focus-within:theme-border-strong transition">
            <div className="w-9 h-9 rounded-xl theme-accent-muted flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 theme-text" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold theme-text">Password</label>
              <input
                type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t("signupPlaceholderPassword")}
                disabled={loading}
                className="w-full text-sm font-semibold text-white placeholder:text-white/40 focus:outline-none bg-transparent" />
            </div>
            <button type="button" onClick={() => setShowPassword(p => !p)}
              className="flex-shrink-0 theme-text hover:text-white transition">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="flex items-center gap-3 border-2 border-white/20 bg-white/5 rounded-2xl px-3 py-2 focus-within:theme-border-strong transition">
            <div className="w-9 h-9 rounded-xl theme-accent-muted flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 theme-text" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold theme-text">Confirm Password</label>
              <input
                type={showConfirmPassword ? "text" : "password"} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && signup()}
                placeholder={t("signupPlaceholderConfirm")}
                disabled={loading}
                className="w-full text-sm font-semibold text-white placeholder:text-white/40 focus:outline-none bg-transparent" />
            </div>
            <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
              className="flex-shrink-0 theme-text hover:text-white transition">
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 text-sm theme-text cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-purple-600 rounded flex-shrink-0" />
            <span>
              I agree to the <span className="text-white font-bold">Terms of Service</span> and{" "}
              <span className="text-white font-bold">Privacy Policy</span>
            </span>
          </label>

          <motion.button
            onClick={signup}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="relative w-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-rose-500 hover:opacity-90 text-white font-black rounded-2xl py-3.5 shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Sparkles className="absolute left-4 w-3.5 h-3.5 text-white/70" />
            {loading ? t("signupCreating") : <>🚀 {t("signupCreateBtn")}</>}
            <Sparkles className="absolute right-4 w-3.5 h-3.5 text-white/70" />
          </motion.button>

          <p className="text-center text-sm theme-text">
            Already have an account?{" "}
            <Link href="/loginpage" className="text-white font-bold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom mascot bubble */}
      <div className="relative z-10 flex items-center gap-3 mt-10 max-w-md">
        <img
          src="/nimi-logo-circle.png" alt="NIMI"
          className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400 shadow-md flex-shrink-0" />
        <div className="bg-white/15 backdrop-blur border border-white/20 rounded-2xl rounded-bl-sm shadow-lg px-4 py-3">
          <p className="text-sm font-bold text-white leading-snug">
            Every great adventure starts with a single step. Let&apos;s go! ✨
          </p>
        </div>
      </div>
    </div>
  );
}
