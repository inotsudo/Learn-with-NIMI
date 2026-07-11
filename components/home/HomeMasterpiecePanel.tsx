"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

export default function HomeMasterpiecePanel() {
  return (
    <div className="overflow-hidden leaf-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <div className="relative flex items-center justify-between px-5 pt-5 pb-3 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#f59e0b,#d97706,#92400e)" }}>
        <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
        <div>
          <p className="font-nunito text-white/60 text-[9px] uppercase tracking-widest mb-0.5">Story Forge</p>
          <h3 className="font-baloo font-black text-white text-[18px]">My Masterpiece</h3>
        </div>
        <Link href="/masterpiece" className="flex items-center gap-0.5 font-nunito font-bold text-white/80 text-[11px] hover:text-white">
          Create <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="w-full h-4 block"
        style={{ background: "linear-gradient(135deg,#f59e0b,#d97706,#92400e)" }}>
        <path d="M0,8 C50,0 100,16 150,8 C200,0 250,16 300,8 L300,16 L0,16 Z" fill="#fffbeb" />
      </svg>
      <div className="bg-gradient-to-b from-amber-50 to-yellow-50 p-4 relative flex flex-col items-center gap-3 text-center">
        <motion.span className="text-[44px] leading-none"
          animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>
          👑
        </motion.span>
        <div>
          <p className="font-baloo font-black text-amber-800 text-[13px] leading-tight">Become the Hero!</p>
          <p className="font-nunito text-amber-600 text-[11px] leading-relaxed mt-0.5">Create a personalized story book starring your child.</p>
        </div>
        <Link href="/masterpiece"
          className="font-baloo font-black text-white text-[12px] px-5 py-2 leaf transition-all hover:-translate-y-0.5 active:scale-95"
          style={{ background: "linear-gradient(135deg,#d97706,#b45309)", boxShadow: "0 4px 14px rgba(217,119,6,0.35)" }}>
          Create Masterpiece ✨
        </Link>
        <div className="flex justify-center gap-4 mt-1 opacity-20 pointer-events-none select-none" aria-hidden>
          <motion.span className="text-[13px]" animate={{ y: [0, -4, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>📖</motion.span>
          <motion.span className="text-[13px]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>✨</motion.span>
          <motion.span className="text-[13px]" animate={{ y: [0, -3, 0] }} transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut", delay: 1.0 }}>🎭</motion.span>
        </div>
      </div>
    </div>
  );
}
