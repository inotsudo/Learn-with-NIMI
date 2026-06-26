"use client";

import MagicBackground from "@/components/magic/MagicBackground";
import MagicLoader from "@/components/magic/MagicLoader";

import React, { useState, useEffect, useCallback, useRef, RefObject } from "react";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStorageUrl, getChildren } from "@/lib/queries";
import type { Creation } from "@/components/community/types";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";
const PAGE_SIZE = 20;

function mapCreation(c: any, uid: string): Creation {
  return {
    id: c.id, childName: c.child_name || "Friend",
    childAvatar: c.children?.avatar_url || undefined,
    age: c.age, description: c.description, imageUrl: c.image_url,
    likes: c.likes?.length || 0,
    likedByUser: c.likes?.some((l: any) => l.user_id === uid) || false,
    isPublic: true, type: c.type || "art",
    createdAt: c.created_at, status: "approved",
  };
}

const CARD_COLORS = [
  { bg: "bg-gradient-to-br from-yellow-400 to-orange-500", ring: "ring-yellow-300/40" },
  { bg: "bg-gradient-to-br from-pink-400 to-rose-500", ring: "ring-pink-300/40" },
  { bg: "bg-gradient-to-br from-blue-400 to-indigo-500", ring: "ring-blue-300/40" },
  { bg: "bg-gradient-to-br from-green-400 to-emerald-500", ring: "ring-green-300/40" },
  { bg: "bg-gradient-to-br from-purple-400 to-violet-500", ring: "ring-purple-300/40" },
  { bg: "bg-gradient-to-br from-cyan-400 to-blue-500", ring: "ring-cyan-300/40" },
];

const TYPE_CONFIG: Record<string, { emoji: string; label: string }> = {
  certificate: { emoji: "🏆", label: "Story Complete!" },
  challenge: { emoji: "💪", label: "Challenge Done!" },
  sticker: { emoji: "⭐", label: "Star Earned!" },
  art: { emoji: "🎨", label: "Shared Art!" },
};

interface FriendBubble { name: string; avatar: string }

export default function CommunityPage() {
  const { t } = useLanguage();
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [userId, setUserId] = useState("");
  const [friends, setFriends] = useState<FriendBubble[]>([]);
  const [liking, setLiking] = useState<Record<string, boolean>>({});
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const { data: allChildren } = await supabase.from("children").select("name, avatar_url").order("created_at");
      if (allChildren) setFriends(allChildren.map((c: any) => ({ name: c.name, avatar: c.avatar_url || "🌟" })));
    })();
  }, []);

  const fetchCreations = useCallback(async (pageNum: number, refresh: boolean) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase.from("creations")
      .select(`*, likes:likes(id, user_id), children:child_id(avatar_url)`, { count: "exact" })
      .eq("status", "approved").order("created_at", { ascending: false }).range(from, to);
    setCreations(prev => refresh ? (data ?? []).map((c: any) => mapCreation(c, userId)) : [...prev, ...(data ?? []).map((c: any) => mapCreation(c, userId))]);
    setHasMore((count || 0) > to + 1);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchCreations(0, true) }, [fetchCreations]);
  useInfiniteScroll(observerTarget as RefObject<HTMLElement>, () => {
    if (!loading && hasMore) { const next = page + 1; setPage(next); fetchCreations(next, false); }
  });

  const handleCheer = async (id: string) => {
    const c = creations.find(x => x.id === id);
    if (!c || !userId || liking[id]) return;
    const ns = !c.likedByUser;
    setLiking(prev => ({ ...prev, [id]: true }));
    setCreations(prev => prev.map(x => x.id === id ? { ...x, likedByUser: ns, likes: ns ? x.likes + 1 : x.likes - 1 } : x));
    if (ns) await supabase.from("likes").insert({ creation_id: id, user_id: userId });
    else await supabase.from("likes").delete().eq("creation_id", id).eq("user_id", userId);
    setLiking(prev => ({ ...prev, [id]: false }));
  };

  const submitReport = async () => {
    if (!reportingId) return;
    await supabase.from("creations").update({ status: "reported" }).eq("id", reportingId);
    setCreations(prev => prev.filter(c => c.id !== reportingId));
    setReportingId(null); setReportReason("");
  };

  return (
    <AppShell>
      <div className="min-h-screen theme-bg relative">
        <MagicBackground variant="village" />
        <main className="relative z-10 max-w-3xl mx-auto px-4 py-5 pb-28 w-full">

          {/* ══ HEADER ══ */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <motion.img src="/nimi-logo-circle.png" alt="Nimi"
                animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
                className="w-16 h-16 rounded-full border-4 border-yellow-400 shadow-2xl shadow-yellow-500/20" />
            </div>
            <h1 className="font-baloo font-black text-[30px] text-white leading-none">Our Adventures</h1>
            <p className="theme-text-faint text-[14px] font-nunito mt-1">See what everyone is up to! ✨</p>

            {/* Friend bubbles */}
            <div className="flex justify-center mt-4 -space-x-2">
              {friends.slice(0, 6).map((f, i) => (
                <motion.div key={f.name + i}
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 200 }}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/20 border-3 theme-border flex items-center justify-center text-lg shadow-lg"
                  title={f.name}>
                  {f.avatar}
                </motion.div>
              ))}
              {friends.length > 6 && (
                <div className="w-11 h-11 rounded-full theme-card border-3 theme-border flex items-center justify-center text-[10px] font-black theme-text-faint">
                  +{friends.length - 6}
                </div>
              )}
            </div>
          </div>

          {/* ══ CELEBRATION WALL ══ */}
          {loading ? (
            <div className="py-12">
              <MagicLoader variant="community" fullPage={false} />
            </div>
          ) : creations.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16">
              <motion.div animate={{ y: [0, -12, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-yellow-500/30">
                <span className="text-5xl">🏆</span>
              </motion.div>
              <h2 className="font-baloo font-black text-white text-[24px]">No adventures shared yet!</h2>
              <p className="theme-text-faint text-[14px] mt-2 max-w-xs mx-auto">Complete a story and your achievement will appear here for all your friends to see!</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {creations.map((c, i) => {
                const color = CARD_COLORS[i % CARD_COLORS.length];
                const config = TYPE_CONFIG[c.type] || TYPE_CONFIG.certificate;
                const imgUrl = c.imageUrl ? (c.imageUrl.startsWith("/") || c.imageUrl.startsWith("http") ? c.imageUrl : getStorageUrl(c.imageUrl)) : null;
                const hasRealImage = imgUrl && !imgUrl.endsWith(".svg") && !imgUrl.includes("logo");

                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, y: 25, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 120 }}
                    whileHover={{ y: -4 }}
                    className="group">

                    <div className={`rounded-[24px] overflow-hidden shadow-xl transition-shadow group-hover:shadow-2xl ${color.bg}`}>

                      {/* Image or gradient hero */}
                      <div className="relative h-40 sm:h-44 overflow-hidden">
                        {hasRealImage ? (
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center relative">
                            <motion.span className="text-6xl drop-shadow-2xl"
                              animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
                              transition={{ duration: 3, repeat: Infinity }}>
                              {config.emoji}
                            </motion.span>
                            {/* Subtle sparkles */}
                            {["⭐", "✨", "🌟"].map((s, j) => (
                              <motion.span key={j} className="absolute text-white/20"
                                style={{ left: `${15 + j * 28}%`, top: `${20 + j * 22}%`, fontSize: 12 + j * 4 }}
                                animate={{ opacity: [0, 0.3, 0], y: [0, -8, 0] }}
                                transition={{ duration: 3 + j, repeat: Infinity, delay: j * 0.5 }}>{s}</motion.span>
                            ))}
                          </div>
                        )}
                        {/* Gradient overlay on image */}
                        {hasRealImage && <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />}

                        {/* Type badge */}
                        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                          <span className="text-[12px]">{config.emoji}</span>
                          <span className="text-white text-[9px] font-bold">{config.label}</span>
                        </div>

                        {/* Report */}
                        <button onClick={e => { e.stopPropagation(); setReportingId(c.id); }}
                          className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                          🚩
                        </button>
                      </div>

                      {/* Info section */}
                      <div className="p-4 theme-card">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ring-2 ${color.ring} bg-white/10 shadow shrink-0`}>
                            {c.childAvatar || c.childName?.[0] || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-baloo font-black text-white text-[15px] truncate">{c.childName}</p>
                            <p className="theme-text-faint text-[11px] font-nunito truncate">{c.description}</p>
                          </div>
                        </div>

                        {/* Cheer button */}
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleCheer(c.id)}
                          className={`w-full rounded-xl py-2.5 font-baloo font-bold text-[14px] flex items-center justify-center gap-2 transition-all ${
                            c.likedByUser
                              ? `${color.bg} text-white shadow-lg`
                              : "bg-white/[0.06] text-white/50 hover:bg-white/10"
                          }`}>
                          <motion.span className="text-[16px]"
                            animate={c.likedByUser ? { scale: [1, 1.4, 1], rotate: [0, -15, 15, 0] } : {}}
                            transition={{ duration: 0.5 }}>
                            {c.likedByUser ? "🎉" : "👏"}
                          </motion.span>
                          {c.likedByUser ? `Cheered! ${c.likes}` : `Cheer${c.likes > 0 ? ` · ${c.likes}` : ""}`}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
            {loading && <Loader2 className="w-6 h-6 animate-spin theme-text-muted" />}
          </div>
        </main>

        {/* ══ Report Modal ══ */}
        <AnimatePresence>
          {reportingId && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" onClick={() => { setReportingId(null); setReportReason(""); }} />
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                  transition={{ type: "spring", stiffness: 250, damping: 25 }}
                  className="w-full sm:max-w-md theme-card shadow-2xl p-6 pb-8 sm:pb-6 rounded-t-[32px] sm:rounded-[28px] border-t-2 sm:border-2 theme-border sm:mx-4">
                  <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5 sm:hidden" />
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><span className="text-2xl">🚩</span></div>
                    <h3 className="font-baloo font-black text-white text-[20px]">Report Post</h3>
                    <p className="theme-text-faint text-[13px] font-nunito mt-0.5">Tell us why this needs attention</p>
                  </div>
                  <div className="space-y-2 mb-6">
                    {[
                      { emoji: "😟", label: "Not kind or respectful" },
                      { emoji: "🚫", label: "Inappropriate content" },
                      { emoji: "😢", label: "Makes me uncomfortable" },
                      { emoji: "❓", label: "Something else" },
                    ].map(r => (
                      <motion.button key={r.label} whileTap={{ scale: 0.97 }} onClick={() => setReportReason(r.label)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all ${
                          reportReason === r.label ? "bg-red-500/12 border-2 border-red-400/25" : "bg-white/[0.03] border-2 border-white/[0.06] hover:bg-white/[0.06]"
                        }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${reportReason === r.label ? "bg-red-500/15" : "bg-white/5"}`}>{r.emoji}</div>
                        <span className={`font-nunito font-bold text-[14px] ${reportReason === r.label ? "text-red-300" : "text-white/60"}`}>{r.label}</span>
                        {reportReason === r.label && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shrink-0"><span className="text-white text-[10px]">✓</span></motion.div>}
                      </motion.button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setReportingId(null); setReportReason(""); }}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white/40 font-baloo font-bold text-[15px] rounded-2xl py-3.5 hover:bg-white/[0.08] transition">Cancel</motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={submitReport} disabled={!reportReason}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-baloo font-bold text-[15px] rounded-2xl py-3.5 shadow-lg disabled:opacity-20 transition">Report</motion.button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
