"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
import GoogleIcon from "@/components/auth/GoogleIcon";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/");
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

      setMessage("Login successful! Redirecting...");
      router.replace("/");
    } catch (err) {
      console.error("Unexpected login error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
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

      {/* Header */}
      <div className="relative z-10 text-center mb-6 max-w-2xl">
        <h1 className="font-black text-3xl sm:text-4xl lg:text-5xl text-white">
          Welcome Back, <span className="bg-gradient-to-r from-fuchsia-400 to-purple-300 bg-clip-text text-transparent">Explorer!</span> 🚀
        </h1>
        <p className="text-purple-200 mt-2 text-sm sm:text-base">
          Log in to continue your creative journey with Nimipiko Studio.
        </p>
      </div>

      {/* Mascot + speech bubble */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end justify-center gap-3 mb-6">
        <motion.img
          src="/nimi-logo-circle.png" alt="NIMI"
          className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-yellow-400 shadow-xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
        <div className="bg-white rounded-2xl rounded-bl-sm shadow-lg px-4 py-3 max-w-[220px] sm:mb-6">
          <p className="text-sm font-bold text-purple-700 text-center leading-snug">
            Let&apos;s create something amazing today! ✨
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5">

        {(error || message) && (
          <div className={`rounded-xl p-2.5 text-center text-sm font-semibold ${error ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
            {error || message}
          </div>
        )}

        <div>
          <label className="flex items-center gap-1.5 font-bold text-gray-700 text-sm mb-1.5">
            <Mail className="w-4 h-4 text-purple-600" /> Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder="Enter your email"
            disabled={loading}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-purple-500 transition placeholder:text-gray-400" />
        </div>

        <div>
          <label className="flex items-center gap-1.5 font-bold text-gray-700 text-sm mb-1.5">
            <Lock className="w-4 h-4 text-purple-600" /> Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Enter your password"
              disabled={loading}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-gray-800 focus:outline-none focus:border-purple-500 transition placeholder:text-gray-400" />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition"
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
              className="w-4 h-4 accent-purple-600 rounded" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-purple-600 font-bold hover:underline">
            Forgot Password?
          </Link>
        </div>

        <motion.button
          onClick={login}
          disabled={loading}
          whileTap={{ scale: 0.97 }}
          className="relative w-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-rose-500 hover:opacity-90 text-white font-black rounded-2xl py-3.5 shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Sparkles className="absolute left-4 w-3.5 h-3.5 text-white/70" />
          {loading ? "Logging in..." : <>🚀 Start My Adventure</>}
          <Sparkles className="absolute right-4 w-3.5 h-3.5 text-white/70" />
        </motion.button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-bold text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <motion.button
          onClick={loginWithGoogle}
          disabled={googleLoading}
          whileTap={{ scale: 0.97 }}
          className="w-full border-2 border-gray-200 hover:border-purple-300 rounded-2xl py-3 flex items-center justify-center gap-2 font-bold text-gray-700 transition disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </motion.button>
      </div>

      {/* Sign up link */}
      <p className="relative z-10 text-center text-sm text-purple-100 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signuppage" className="text-pink-400 font-bold hover:underline">
          Sign up
        </Link>{" "}
        and start your adventure!
      </p>

      {/* Bottom mascot bubble */}
      <div className="relative z-10 flex items-center gap-3 mt-8 max-w-md">
        <img
          src="/nimi-logo-circle.png" alt="NIMI"
          className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400 shadow-md flex-shrink-0" />
        <div className="bg-white/95 rounded-2xl rounded-bl-sm shadow-lg px-4 py-3">
          <p className="text-sm font-bold text-purple-700 leading-snug">
            Ready for another adventure? Let&apos;s bring your <span className="text-purple-600">ideas</span> to life! ✨
          </p>
        </div>
      </div>
    </div>
  );
}
