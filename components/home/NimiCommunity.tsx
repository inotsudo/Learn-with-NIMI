"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const COMMUNITY_POSTS = [
  { name: "Amira",  text: "Love this story!",  emoji: "📖", color: "from-purple-300 to-purple-500" },
  { name: "Kaito",  text: "My coloring page!", emoji: "🎨", color: "from-orange-300 to-orange-400" },
  { name: "Fatima", text: "I sang the song!",  emoji: "🎵", color: "from-pink-300 to-pink-400"    },
];

export default function NimiCommunity() {
  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md overflow-hidden flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-black text-pink-200 text-[13px] uppercase flex items-center gap-1.5 tracking-wide mb-0.5">
          <Users className="w-4 h-4" /> NIMI COMMUNITY
        </h3>
        <p className="text-[9.5px] theme-text-muted leading-tight">Share your drawings, songs and achievements!</p>
      </div>

      <div className="px-3 pb-1 flex gap-2 flex-1">
        {COMMUNITY_POSTS.map(post => (
          <div key={post.name} className="flex-1 flex flex-col">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0 shadow">
                {post.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-white leading-tight">{post.name}</p>
                <p className="text-[8px] theme-text-muted leading-tight truncate">{post.text}</p>
              </div>
            </div>
            <div className="w-full rounded-xl overflow-hidden border-2 border-white/15 shadow-sm bg-white">
              <div className={`w-full h-[55px] sm:h-[65px] xl:h-[70px] bg-gradient-to-br ${post.color} flex items-center justify-center`}>
                <span className="text-4xl drop-shadow-sm">{post.emoji}</span>
              </div>
            </div>
            <motion.button whileTap={{ scale: 1.5 }}
              className="text-base self-start mt-1 ml-0.5 leading-none">
              ❤️
            </motion.button>
          </div>
        ))}
      </div>

      <div className="px-3 pb-3 pt-2 mt-auto">
        <Link href="/community">
          <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-black rounded-full h-7 tracking-wide">
            View Community
          </Button>
        </Link>
      </div>
    </div>
  );
}
