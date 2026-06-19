"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, Shield, Sparkles } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import AuthBackground from "@/components/auth/AuthBackground";
// import GoogleIcon from "@/components/auth/GoogleIcon";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://nimi-learn.onrender.com/reset-password",
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("Password reset email sent! Please check your inbox.");
    }

    setLoading(false);
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

      <div className="relative z-10 w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">

        {/* Left: hero copy + mascot */}
        <div className="text-center lg:text-left mb-10 lg:mb-0">
          <Link
            href="/loginpage"
            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur rounded-full px-4 py-1.5 text-sm font-bold text-purple-100 hover:bg-white/20 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>

          <h1 className="font-black text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mt-4">
            Don&apos;t worry,<br />
            <span className="relative inline-block px-2">
              <span className="bg-gradient-to-r from-fuchsia-400 to-purple-300 bg-clip-text text-transparent">Explorer!</span>
              <Sparkles className="absolute -right-7 top-1 w-6 h-6 text-yellow-300" />
            </span>
          </h1>

          <p className="text-purple-200 mt-4 text-sm sm:text-base max-w-sm mx-auto lg:mx-0">
            It happens! Reset your password and get back to your adventure.
          </p>

          <div className="mt-10 flex flex-col items-center lg:items-start gap-2">
            <div className="bg-white/15 backdrop-blur border border-white/20 rounded-2xl rounded-bl-sm shadow-lg px-4 py-3 max-w-[220px] ml-0 sm:ml-10">
              <p className="text-sm font-bold text-white text-center leading-snug">
                No problem! Let&apos;s get you back on track! ✨
              </p>
            </div>
            <motion.img
              src="/nimipiko.png" alt="NIMI"
              className="w-56 h-56 sm:w-64 sm:h-64 rounded-full object-cover -mt-2"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
          </div>
        </div>

        {/* Right: forgot password card */}
        <div className="w-full max-w-md mx-auto lg:mx-0 bg-white/10 backdrop-blur border-2 border-white/15 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4">

          <div className="flex flex-col items-center text-center mb-1">
            <div className="w-16 h-16 rounded-full bg-purple-400/20 flex items-center justify-center mb-3">
              <Lock className="w-7 h-7 text-purple-200" />
            </div>
            <h2 className="font-black text-2xl text-white">Forgot Password?</h2>
            <p className="text-purple-200 text-sm mt-1">
              No worries! Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {(error || message) && (
            <div className={`rounded-xl p-2.5 text-center text-sm font-semibold ${error ? "bg-red-500/10 text-red-300" : "bg-green-500/10 text-green-300"}`}>
              {error || message}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 font-bold text-purple-100 text-sm mb-1.5">
              <Mail className="w-4 h-4 text-purple-300" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleResetPassword()}
              placeholder="Enter your email address"
              disabled={loading}
              className="w-full border-2 border-white/20 bg-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-purple-300 transition placeholder:text-white/40" />
          </div>

          <motion.button
            onClick={handleResetPassword}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="relative w-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-rose-500 hover:opacity-90 text-white font-black rounded-2xl py-3.5 shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            {loading ? "Sending..." : "Send Reset Link"}
          </motion.button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-xs font-bold text-purple-300">OR</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <motion.button
            onClick={loginWithGoogle}
            disabled={googleLoading}
            whileTap={{ scale: 0.97 }}
            className="w-full border-2 border-white/20 hover:border-purple-300 rounded-2xl py-3 flex items-center justify-center gap-2 font-bold text-white transition disabled:opacity-60"
          >
            {/* <GoogleIcon /> */}
            {/* {googleLoading ? "Connecting..." : "Continue with Google"} */}
          </motion.button>

          <p className="text-center text-sm text-purple-200">
            Remember your password?{" "}
            <Link href="/loginpage" className="text-white font-bold hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom mascot bubble */}
      <div className="relative z-10 flex items-center gap-3 mt-10 max-w-md">
        <img
          src="/nimipiko.png" alt="NIMI"
          className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400 shadow-md flex-shrink-0" />
        <div className="bg-white/15 backdrop-blur border border-white/20 rounded-2xl rounded-bl-sm shadow-lg px-4 py-3">
          <p className="text-sm font-bold text-white leading-snug">
            You&apos;ve got this! Every adventure starts with a fresh step. 💜
          </p>
        </div>
      </div>

      {/* Security note */}
      <div className="relative z-10 w-full max-w-md mt-4 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-purple-200" />
        </div>
        <p className="text-sm text-purple-100">
          <span className="font-bold text-white">Your security is our priority.</span> We&apos;ll never share your information with anyone.
        </p>
      </div>
    </div>
  );
}
