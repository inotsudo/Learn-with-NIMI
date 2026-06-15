"use client";

import Link from "next/link";

const TRUST_BADGES = [
  { emoji: "🛡️", label: "SAFE ENVIRONMENT",  bg: "bg-blue-600"   },
  { emoji: "🎯", label: "FUN LEARNING",       bg: "bg-pink-600"   },
  { emoji: "💪", label: "BUILD CONFIDENCE",   bg: "bg-orange-500" },
  { emoji: "🎮", label: "LEARN THROUGH PLAY", bg: "bg-green-600"  },
];

export default function HomeFooter() {
  return (
    <footer className="bg-purple-800 text-white">

      {/* Main body */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center gap-5">

        {/* Brand row */}
        <div className="flex items-center gap-4">
          <img src="/nimi-logo-circle.png" alt="NIMI"
            className="w-12 h-12 rounded-full border-2 border-yellow-300 shadow-lg" />
          <div className="text-center">
            <p className="font-black text-2xl tracking-widest leading-none bg-gradient-to-r from-pink-300 via-purple-200 to-cyan-300 bg-clip-text text-transparent drop-shadow">
              NIMIPIKO
            </p>
            <p className="text-purple-300 text-[11px] font-semibold tracking-widest mt-1 uppercase">
              Where Stories Come to Life
            </p>
          </div>
          <img src="/piko-logo-circle.png.png" alt="PIKO"
            className="w-12 h-12 rounded-full border-2 border-blue-300 shadow-lg" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-sm">
          <div className="flex-1 h-px bg-purple-600" />
          <span className="text-yellow-400 text-sm">✦</span>
          <div className="flex-1 h-px bg-purple-600" />
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-2">
          {TRUST_BADGES.map(b => (
            <div key={b.label}
              className={`${b.bg} flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black tracking-wide shadow-md`}>
              <span>{b.emoji}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright strip */}
      <div className="border-t border-purple-700 bg-purple-900 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-purple-400 font-semibold">
          <span>© {new Date().getFullYear()} NIMIPIKO · All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
