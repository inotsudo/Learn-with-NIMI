"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";

interface CommunityCreation {
  id: string;
  imageUrl: string;
  childName: string;
  type: string;
}

interface Props {
  communityCreations: CommunityCreation[];
}

export default function HomeCommunityPanel({ communityCreations }: Props) {
  return (
    <div className="overflow-hidden leaf-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <div className="relative flex items-center justify-between px-5 pt-5 pb-3 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488,#0891b2)" }}>
        <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />
        <div>
          <p className="font-nunito text-white/60 text-[9px] uppercase tracking-widest mb-0.5">Community Square</p>
          <h3 className="font-baloo font-black text-white text-[18px]">Community Creations</h3>
        </div>
        <Link href="/community" className="flex items-center gap-0.5 font-nunito font-bold text-white/80 text-[11px] hover:text-white">
          All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="w-full h-4 block"
        style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488,#0891b2)" }}>
        <path d="M0,8 C50,0 100,16 150,8 C200,0 250,16 300,8 L300,16 L0,16 Z" fill="#f0fdf4" />
      </svg>
      <div className="bg-gradient-to-b from-teal-50 to-cyan-50 p-4 relative">
        {communityCreations.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {communityCreations.map((c) => (
              <Link key={c.id} href="/community"
                className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <Image src={getStorageUrl(c.imageUrl)} alt={c.childName}
                  fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-1 right-1 text-[10px]">🎨</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-5 px-3 text-center">
            <motion.span className="text-[38px] leading-none"
              animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>🔭</motion.span>
            <p className="font-baloo font-black text-teal-700 text-[13px] leading-tight mt-1">Be the first explorer!</p>
            <p className="font-nunito text-teal-500 text-[11px] leading-relaxed">Share your masterpiece and inspire the whole campus.</p>
            <Link href="/community"
              className="mt-2 font-baloo font-black text-white text-[12px] px-5 py-2 leaf transition-all hover:-translate-y-0.5 active:scale-95"
              style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)", boxShadow: "0 4px 14px rgba(20,184,166,0.35)" }}>
              Visit Community Square
            </Link>
          </div>
        )}
        <div className="flex justify-center gap-4 mt-3 opacity-20 pointer-events-none select-none" aria-hidden>
          <motion.span className="text-[13px]" animate={{ y: [0, -4, 0] }} transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut" }}>🎈</motion.span>
          <motion.span className="text-[13px]" animate={{ x: [0, 5, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}>🐦</motion.span>
          <motion.span className="text-[13px]" animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}>🌳</motion.span>
        </div>
      </div>
    </div>
  );
}
