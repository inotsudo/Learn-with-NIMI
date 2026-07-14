"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";

export default function HomeMasterpiecePanel() {
  return (
    <div className="overflow-hidden leaf-lg border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)]">

      {/* Flat header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-nunito text-amber-500 text-[10px] uppercase tracking-widest leading-none mb-0.5">Story Forge</p>
            <h3 className="font-baloo font-black text-gray-900 text-[17px] leading-tight">My Masterpiece</h3>
          </div>
        </div>
        <Link href="/masterpiece" className="flex items-center gap-0.5 font-nunito font-bold text-gray-400 text-[11px] hover:text-amber-600 transition-colors">
          Create <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="h-px bg-gray-100 mx-4" />

      {/* Content */}
      <div className="px-4 py-4 flex flex-col items-center gap-3 text-center">
        <motion.span className="text-[44px] leading-none"
          animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>
          👑
        </motion.span>
        <div>
          <p className="font-baloo font-black text-gray-800 text-[13px] leading-tight">Become the Hero!</p>
          <p className="font-nunito text-gray-500 text-[11px] leading-relaxed mt-0.5">Create a personalized story book starring your child.</p>
        </div>
        <Link href="/masterpiece"
          className="font-baloo font-black text-white text-[12px] px-5 py-2 leaf transition-all hover:-translate-y-0.5 active:scale-95"
          style={{ background: "linear-gradient(135deg,#d97706,#b45309)", boxShadow: "0 4px 14px rgba(217,119,6,0.35)" }}>
          Create Masterpiece ✨
        </Link>
      </div>
    </div>
  );
}
