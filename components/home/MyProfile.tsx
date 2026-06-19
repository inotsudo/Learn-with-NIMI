"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface Props {
  childName: string;
  avatar: string | null;
  categoriesMastered: number;
}

export default function MyProfile({ childName, avatar, categoriesMastered }: Props) {
  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4 text-center flex flex-col h-full">
      <h3 className="font-black text-purple-200 text-[12px] uppercase mb-3 tracking-widest">MY PROFILE</h3>
      <div className="relative inline-block mb-2 mx-auto">
        {avatar && !avatar.startsWith("http") ? (
          <div className="w-20 h-20 rounded-full border-4 border-purple-300 shadow-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-4xl select-none">
            {avatar}
          </div>
        ) : (
          <img
            src={avatar ?? "/default-avatar.png"} alt={childName}
            className="w-20 h-20 rounded-full object-cover border-4 border-purple-300 shadow-lg"
            onError={e => { (e.target as HTMLImageElement).src = "/avatar.png"; }} />
        )}
      </div>
      <div className="flex items-center justify-center gap-1 mt-1 mb-0.5">
        <p className="font-black text-white text-sm uppercase tracking-wide">{childName}</p>
        <Edit className="w-3.5 h-3.5 text-purple-400" />
      </div>
      <p className="text-[11px] font-bold text-yellow-300 mb-3">⭐ SUPER STAR ★</p>
      <div className="text-left mb-3">
        <p className="text-[10px] text-purple-300 font-semibold mb-1">Categories Mastered</p>
        <div className="w-full bg-white/10 rounded-full h-2.5 mb-1 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(categoriesMastered / 8) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }} />
        </div>
        <p className="text-[10px] text-purple-300 text-right">{categoriesMastered}/8</p>
      </div>
      <div className="mt-auto">
        <Link href="/user-profile">
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black rounded-full h-8 tracking-wide">
            VIEW MY ACHIEVEMENTS
          </Button>
        </Link>
      </div>
    </div>
  );
}
