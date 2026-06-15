"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, UserPlus, Star, Sparkles } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
import GoogleIcon from "@/components/auth/GoogleIcon";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const signup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
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
      setError("Signup failed: no user returned");
    }

    setLoading(false);
  };

  const signupWithGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col items-center px-4 py-10 sm:py-14">

      <AuthBackground />

      <div className="relative z-10 w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">

        {/* Left: hero copy + mascot */}
        <div className="text-center lg:text-left mb-10 lg:mb-0">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur rounded-full px-4 py-1.5 text-sm font-bold text-purple-100">
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

          <p className="text-purple-200 mt-4 text-sm sm:text-base max-w-sm mx-auto lg:mx-0">
            Join Nimipiko Studio and unlock a world of creativity.
          </p>

          <div className="mt-10 flex flex-col items-center lg:items-start gap-2">
            <div className="bg-white rounded-2xl rounded-bl-sm shadow-lg px-4 py-3 max-w-[220px] ml-0 sm:ml-10">
              <p className="text-sm font-bold text-purple-700 text-center leading-snug">
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
        <div className="w-full max-w-md mx-auto lg:mx-0 bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4">

          <div className="flex flex-col items-center text-center mb-1">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-3">
              <UserPlus className="w-7 h-7 text-purple-600" />
            </div>
            <h2 className="font-black text-2xl text-gray-800">Sign Up</h2>
            <p className="text-gray-500 text-sm mt-1">Create your account to begin your creative journey.</p>
          </div>

          {error && (
            <div className="rounded-xl p-2.5 text-center text-sm font-semibold bg-red-100 text-red-600">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="flex items-center gap-3 border-2 border-gray-200 rounded-2xl px-3 py-2 focus-within:border-purple-400 transition">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold text-gray-700">Full Name</label>
              <input
                type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                disabled={loading}
                className="w-full text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent" />
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 border-2 border-gray-200 rounded-2xl px-3 py-2 focus-within:border-purple-400 transition">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold text-gray-700">Email Address</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={loading}
                className="w-full text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent" />
            </div>
          </div>

          {/* Password */}
          <div className="flex items-center gap-3 border-2 border-gray-200 rounded-2xl px-3 py-2 focus-within:border-purple-400 transition">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold text-gray-700">Password</label>
              <input
                type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a password"
                disabled={loading}
                className="w-full text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent" />
            </div>
            <button type="button" onClick={() => setShowPassword(p => !p)}
              className="flex-shrink-0 text-gray-400 hover:text-purple-600 transition">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="flex items-center gap-3 border-2 border-gray-200 rounded-2xl px-3 py-2 focus-within:border-purple-400 transition">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold text-gray-700">Confirm Password</label>
              <input
                type={showConfirmPassword ? "text" : "password"} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && signup()}
                placeholder="Confirm your password"
                disabled={loading}
                className="w-full text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent" />
            </div>
            <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
              className="flex-shrink-0 text-gray-400 hover:text-purple-600 transition">
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-purple-600 rounded flex-shrink-0" />
            <span>
              I agree to the <span className="text-purple-600 font-bold">Terms of Service</span> and{" "}
              <span className="text-purple-600 font-bold">Privacy Policy</span>
            </span>
          </label>

          <motion.button
            onClick={signup}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="relative w-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-rose-500 hover:opacity-90 text-white font-black rounded-2xl py-3.5 shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Sparkles className="absolute left-4 w-3.5 h-3.5 text-white/70" />
            {loading ? "Creating account..." : <>🚀 Create My Account</>}
            <Sparkles className="absolute right-4 w-3.5 h-3.5 text-white/70" />
          </motion.button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-bold text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <motion.button
            onClick={signupWithGoogle}
            disabled={googleLoading}
            whileTap={{ scale: 0.97 }}
            className="w-full border-2 border-gray-200 hover:border-purple-300 rounded-2xl py-3 flex items-center justify-center gap-2 font-bold text-gray-700 transition disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? "Connecting..." : "Sign up with Google"}
          </motion.button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/loginpage" className="text-purple-600 font-bold hover:underline">
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
        <div className="bg-white/95 rounded-2xl rounded-bl-sm shadow-lg px-4 py-3">
          <p className="text-sm font-bold text-purple-700 leading-snug">
            Every great adventure starts with a single step. Let&apos;s go! ✨
          </p>
        </div>
      </div>
    </div>
  );
}
