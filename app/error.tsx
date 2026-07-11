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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="bg-white border border-ds-border shadow-ds-card p-8 max-w-md w-full" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
        <p className="text-5xl mb-4">🙈</p>
        <h1 className="text-xl font-bold text-ds-text mb-2">
          Oops! Something went wrong
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Don&apos;t worry, it&apos;s not your fault. Let&apos;s try that again!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="text-white font-bold px-6 py-3 shadow-md transition"
            style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}
          >
            Try Again
          </button>
          <Link
            href="/home"
            className="bg-white border border-ds-border text-ds-text font-bold px-6 py-3 hover:bg-gray-50 transition"
            style={{ borderRadius: 'var(--leaf-r)' }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
