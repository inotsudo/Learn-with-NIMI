"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Heart } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { getStorageUrl } from "@/lib/queries";

interface FeedItem {
  id: string;
  child_name: string;
  description: string;
  image_url: string | null;
  type: string;
}

const AVATAR_COLORS = [
  "from-purple-400 to-pink-500",
  "from-blue-400 to-cyan-500",
  "from-orange-400 to-pink-400",
  "from-green-400 to-teal-500",
];

export default function CommunityPreview() {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("creations")
        .select("id, child_name, description, image_url, type")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (data) setItems(data);
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="relative rounded-[24px] overflow-hidden border-2 border-blue-400/15 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-[#1f1050] to-indigo-500/5" />

      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <span className="text-lg">🌍</span>
            </div>
            <div>
              <h3 className="font-black text-white text-[16px]">NIMI COMMUNITY</h3>
              <p className="theme-text-faint text-[10px]">See what other little champions are sharing!</p>
            </div>
          </div>
          <Link href="/community">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-[11px] rounded-full px-4 py-2 shadow-lg shadow-blue-500/20 flex items-center gap-1 border border-blue-300/20">
              Visit Community <ChevronRight className="w-3 h-3" />
            </motion.button>
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {items.map((item, i) => (
            <motion.div key={item.id}
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring" }}
              className="shrink-0 w-[150px] sm:w-[170px] rounded-2xl overflow-hidden border-2 border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] transition shadow-lg">
              <div className="h-24 bg-gradient-to-br from-purple-500/15 to-pink-500/10 flex items-center justify-center relative overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url.startsWith("/") ? item.image_url : getStorageUrl(item.image_url)}
                    alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-4xl opacity-40">
                    {item.type === "challenge" ? "🏆" : item.type === "certificate" ? "📜" : "🎨"}
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % 4]} flex items-center justify-center text-white text-[9px] font-black shrink-0 shadow`}>
                    {item.child_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-white text-[11px] font-bold truncate">{item.child_name}</span>
                </div>
                <p className="theme-text-faint text-[9px] truncate">{item.description}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Heart className="w-3.5 h-3.5 text-pink-400/50" />
                  <span className="text-pink-300/40 text-[9px] font-bold">Love this!</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
