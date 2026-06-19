"use client";

import Link from "next/link";
import AuthBackground from "@/components/auth/AuthBackground";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col items-center justify-center px-4 text-center">
      <AuthBackground />
      <div className="relative z-10 bg-white/10 backdrop-blur rounded-3xl shadow-lg p-8 max-w-md w-full">
        <p className="text-5xl mb-4">🙈</p>
        <h1 className="text-xl font-bold text-white mb-2">
          Oops! Something went wrong
        </h1>
        <p className="text-sm text-purple-300 mb-6">
          Don&apos;t worry, it&apos;s not your fault. Let&apos;s try that again!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl px-6 py-3 shadow-md hover:opacity-90 transition"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="bg-white/10 text-purple-100 font-bold rounded-2xl px-6 py-3 hover:bg-white/20 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
