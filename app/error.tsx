"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full">
        <p className="text-5xl mb-4">🙈</p>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          Oops! Something went wrong
        </h1>
        <p className="text-sm text-gray-500 mb-6">
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
            className="bg-gray-100 text-gray-700 font-bold rounded-2xl px-6 py-3 hover:bg-gray-200 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
