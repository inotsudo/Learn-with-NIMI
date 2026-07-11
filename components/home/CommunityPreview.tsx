"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
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
  "from-green-400 to-emerald-500",
  "from-blue-400 to-cyan-500",
  "from-orange-400 to-pink-400",
  "from-green-400 to-teal-500",
];

export default function CommunityPreview() {
  const m = useThemeMotion();
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
    <div className="bg-white border border-ds-border shadow-ds-card overflow-hidden" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--ds-brand-subtle)] rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <span className="text-lg">🌍</span>
            </div>
            <div>
              <h3 className="font-black text-ds-text text-[16px]">NIMI COMMUNITY</h3>
              <p className="text-gray-500 text-[10px]">See what other little champions are sharing!</p>
            </div>
          </div>
          <Link href="/community">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={m.buttonPress}
              className="text-white font-black text-[11px] px-4 py-2 shadow-sm flex items-center gap-1"
              style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}>
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
              className="shrink-0 w-[150px] sm:w-[170px] overflow-hidden border border-ds-border bg-white hover:bg-gray-50 transition shadow-sm"
              style={{ borderRadius: 'var(--leaf-r)' }}>
              <div className="h-24 bg-gray-50 flex items-center justify-center relative overflow-hidden">
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
                  <span className="text-ds-text text-[11px] font-bold truncate">{item.child_name}</span>
                </div>
                <p className="text-gray-400 text-[9px] truncate">{item.description}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Heart className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-pink-400 text-[9px] font-bold">Love this!</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
