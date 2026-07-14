"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, Users } from "lucide-react";
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
    <div className="overflow-hidden leaf-lg border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)]">

      {/* Flat header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shadow-sm shrink-0">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="font-nunito text-teal-500 text-[10px] uppercase tracking-widest leading-none mb-0.5">Community Square</p>
            <h3 className="font-baloo font-black text-gray-900 text-[17px] leading-tight">Community Creations</h3>
          </div>
        </div>
        <Link href="/community" className="flex items-center gap-0.5 font-nunito font-bold text-gray-400 text-[11px] hover:text-teal-600 transition-colors">
          All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="h-px bg-gray-100 mx-4" />

      {/* Content */}
      <div className="p-4">
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
            <p className="font-baloo font-black text-gray-800 text-[13px] leading-tight mt-1">Be the first explorer!</p>
            <p className="font-nunito text-gray-500 text-[11px] leading-relaxed">Share your masterpiece and inspire the whole campus.</p>
            <Link href="/community"
              className="mt-2 font-baloo font-black text-white text-[12px] px-5 py-2 leaf transition-all hover:-translate-y-0.5 active:scale-95"
              style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)", boxShadow: "0 4px 14px rgba(20,184,166,0.35)" }}>
              Visit Community Square
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
