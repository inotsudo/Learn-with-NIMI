"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full">
        <p className="text-8xl mb-4 select-none">🌿</p>
        <h1 className="font-baloo font-black text-[42px] text-gray-800 leading-tight">
          404
        </h1>
        <p className="text-xl font-bold text-gray-600 mt-1 mb-2">
          Nimi got lost in the jungle!
        </p>
        <p className="text-sm text-gray-400 mb-8">
          This page doesn&apos;t exist — but there are amazing stories waiting for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/stories"
            className="text-white font-black px-7 py-3.5 shadow-md transition text-[15px]"
            style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}
          >
            📖 Back to Stories
          </Link>
          <Link
            href="/"
            className="bg-white border border-gray-200 text-gray-600 font-bold px-7 py-3.5 hover:bg-gray-50 transition text-[15px]"
            style={{ borderRadius: 'var(--leaf-r)' }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
