"use client";

import React, { useState, useEffect, useCallback, useRef, RefObject } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ArrowLeft, Loader2, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import MagicLoader from "@/components/magic/MagicLoader";
import AppShell from "@/components/layout/AppShell";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStorageUrl } from "@/lib/queries";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { Creation } from "@/components/community/types";

const PAGE_SIZE = 20;
const HOT_THRESHOLD = 8;

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`;
}

function mapCreation(c: any, uid: string): Creation {
  return {
    id: c.id,
    childName: c.child_name || "Friend",
    childAvatar: c.children?.avatar_url || undefined,
    age: c.age,
    description: c.description,
    imageUrl: c.image_url,
    likes: c.likes?.length || 0,
    likedByUser: c.likes?.some((l: any) => l.user_id === uid) || false,
    isPublic: true,
    type: c.type || "art",
    createdAt: c.created_at,
    status: "approved",
  };
}

// ── Type metadata ───────────────────────────────────────────────
const TYPE_META: Record<string, { emoji: string; label: string; pill: string; gradient: string }> = {
  certificate: { emoji:"🏆", label:"Story Complete",  pill:"bg-amber-500",  gradient:"from-amber-400 to-orange-500"   },
  story:       { emoji:"📖", label:"Story Complete",  pill:"bg-amber-500",  gradient:"from-amber-400 to-orange-500"   },
  challenge:   { emoji:"💪", label:"Challenge Done",  pill:"bg-blue-500",   gradient:"from-blue-500 to-indigo-600"    },
  sticker:     { emoji:"⭐", label:"Star Earned",     pill:"bg-yellow-500", gradient:"from-yellow-400 to-amber-500"   },
  art:         { emoji:"🎨", label:"Artwork",         pill:"bg-fuchsia-500",gradient:"from-fuchsia-500 to-violet-600" },
  coloring:    { emoji:"🖍️", label:"Coloring Page",   pill:"bg-purple-500", gradient:"from-purple-500 to-pink-500"   },
};
const fallbackMeta = { emoji:"✨", label:"Moment", pill:"bg-gray-400", gradient:"from-gray-400 to-slate-500" };

// ── Filters ─────────────────────────────────────────────────────
type FilterType = "all" | "stories" | "art" | "challenges" | "stars";
const FILTERS: { id: FilterType; label: string; emoji: string; types: string[] }[] = [
  { id:"all",        label:"All",        emoji:"✨", types:[] },
  { id:"stories",    label:"Stories",    emoji:"🏆", types:["certificate","story"] },
  { id:"art",        label:"Art",        emoji:"🎨", types:["art","coloring"] },
  { id:"challenges", label:"Challenges", emoji:"💪", types:["challenge"] },
  { id:"stars",      label:"Stars",      emoji:"⭐", types:["sticker"] },
];

function FilterTabs({ active, onChange }: { active: FilterType; onChange: (f: FilterType) => void }) {
  return (
    <LayoutGroup>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
        {FILTERS.map(f => {
          const on = active === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onChange(f.id)}
              className="relative shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-black transition-colors duration-150 focus:outline-none"
              style={{ color: on ? "white" : "var(--ds-text-muted)" }}
            >
              {on && (
                <motion.div
                  layoutId="cp-filter-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "var(--nimi-green)" }}
                  transition={{ type:"spring", stiffness:400, damping:34 }}
                />
              )}
              <span className="relative z-10 text-[15px] leading-none">{f.emoji}</span>
              <span className="relative z-10">{f.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

// ── Cheer burst ─────────────────────────────────────────────────
const BURST_EMOJIS = ["🎉","⭐","✨","💛","🌟","💫"];
function CheerBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 900); return () => clearTimeout(t); }, [onDone]);
  return (
    <>
      {BURST_EMOJIS.map((e, i) => (
        <motion.span
          key={i}
          className="absolute pointer-events-none select-none text-lg leading-none z-20"
          style={{ bottom: "110%", left: `${8 + i * 16}%` }}
          initial={{ opacity:1, y:0, scale:0.5 }}
          animate={{ opacity:0, y:-(44 + i * 10), x:(i%2===0?1:-1)*(10+i*5), scale:1.4 }}
          transition={{ duration:0.75, ease:"easeOut" }}
        >
          {e}
        </motion.span>
      ))}
    </>
  );
}

// ── Creation card ────────────────────────────────────────────────
function CreationCard({
  creation, index, onCheer, onReport,
}: {
  creation: Creation;
  index: number;
  onCheer: (id: string) => void;
  onReport: (id: string) => void;
}) {
  const [bursting, setBursting] = useState(false);
  const meta = TYPE_META[creation.type] ?? fallbackMeta;

  const imgUrl = creation.imageUrl
    ? (creation.imageUrl.startsWith("/") || creation.imageUrl.startsWith("http")
        ? creation.imageUrl : getStorageUrl(creation.imageUrl))
    : null;
  const hasImg = !!(imgUrl && !imgUrl.endsWith(".svg") && !imgUrl.includes("logo"));
  const isHot  = creation.likes >= HOT_THRESHOLD;

  const avatarContent = creation.childAvatar && creation.childAvatar.length <= 2
    ? creation.childAvatar
    : creation.childName?.[0]?.toUpperCase() ?? "?";

  const handleCheer = () => {
    if (!creation.likedByUser) setBursting(true);
    onCheer(creation.id);
  };

  return (
    <motion.div
      initial={{ opacity:0, y:32, scale:0.94 }}
      animate={{ opacity:1, y:0,  scale:1 }}
      exit={{ opacity:0, scale:0.94 }}
      transition={{ type:"spring", stiffness:280, damping:26, delay: Math.min(index * 0.05, 0.35) }}
      whileHover={{ y:-4, transition:{ type:"spring", stiffness:360, damping:28 } }}
      className="group rounded-3xl border border-ds-border bg-ds-surface shadow-[0_4px_20px_rgba(15,23,42,0.07)] hover:shadow-[0_14px_40px_rgba(15,23,42,0.13)] transition-shadow duration-300 overflow-visible"
    >
      {/* ── IMAGE ZONE (overflow-hidden isolated) ── */}
      <div className="relative h-48 rounded-t-3xl overflow-hidden">
        {hasImg ? (
          <img
            src={imgUrl}
            alt={creation.description ?? `${creation.childName}'s creation`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
            <motion.span
              className="text-7xl drop-shadow-2xl"
              animate={{ scale:[1, 1.08, 1] }}
              transition={{ duration:3.2, repeat:Infinity, ease:"easeInOut", delay: index * 0.18 }}
            >
              {meta.emoji}
            </motion.span>
            {/* Subtle sparkle floaters */}
            {["✨","⭐","💫"].map((s, j) => (
              <motion.span key={j}
                className="absolute text-white/20 text-sm pointer-events-none select-none"
                style={{ left:`${14+j*28}%`, top:`${18+j*22}%` }}
                animate={{ opacity:[0,0.5,0], y:[0,-10,0] }}
                transition={{ duration:2.8+j, repeat:Infinity, delay:j*0.6 }}
              >{s}</motion.span>
            ))}
          </div>
        )}

        {/* scrim for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Type badge — top right */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 ${meta.pill} text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md`}>
          <span className="text-sm leading-none">{meta.emoji}</span>
          {meta.label}
        </div>

        {/* HOT badge — top left */}
        {isHot && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
            <Flame className="w-3 h-3 fill-white" strokeWidth={0} /> HOT
          </div>
        )}

        {/* Report — top left, replaces HOT on hover */}
        <button
          onClick={e => { e.stopPropagation(); onReport(creation.id); }}
          title="Report post"
          className={`absolute top-3 left-3 w-7 h-7 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-[12px] transition-opacity ${
            isHot ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          🚩
        </button>
      </div>

      {/* ── INFO ZONE (no overflow-hidden — allows burst to escape) ── */}
      <div className="px-4 pb-4">
        {/* Avatar + name row — avatar overlaps the image boundary */}
        <div className="flex items-end gap-3 -mt-5 mb-3 relative z-10">
          <div className="w-11 h-11 rounded-full border-[3px] border-ds-surface bg-ds-border flex items-center justify-center text-base font-black text-ds-text shadow-md shrink-0"
            style={{ background: "var(--ds-surface)" }}>
            {avatarContent}
          </div>
          <div className="pb-0.5 min-w-0">
            <p className="font-black text-ds-text text-[14px] leading-tight truncate">{creation.childName}</p>
            <p className="text-ds-muted text-[11px] font-semibold">{timeAgo(creation.createdAt)}</p>
          </div>
        </div>

        {/* Description */}
        {creation.description && (
          <p className="text-ds-muted text-[12px] leading-relaxed mb-3 line-clamp-2">
            {creation.description}
          </p>
        )}

        {/* Cheer button */}
        <div className="relative">
          <AnimatePresence>
            {bursting && <CheerBurst key="burst" onDone={() => setBursting(false)} />}
          </AnimatePresence>
          <motion.button
            whileTap={{ scale:0.92 }}
            onClick={handleCheer}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[13px] font-black transition-colors duration-200"
            style={creation.likedByUser
              ? { background:"var(--nimi-green)", color:"white" }
              : { background:"var(--ds-border-primary)", color:"var(--ds-text-muted)" }
            }
          >
            <motion.span
              className="text-[16px] leading-none"
              animate={creation.likedByUser ? { scale:[1,1.6,1], rotate:[0,-18,18,0] } : {}}
              transition={{ duration:0.4 }}
            >
              {creation.likedByUser ? "🎉" : "👏"}
            </motion.span>
            <span>{creation.likedByUser ? "Cheered!" : "Cheer"}</span>
            {creation.likes > 0 && (
              <motion.span
                key={creation.likes}
                initial={{ scale:1.5, opacity:0.6 }}
                animate={{ scale:1,   opacity:1 }}
                className="text-[11px] font-black px-1.5 py-0.5 rounded-full"
                style={creation.likedByUser
                  ? { background:"rgba(255,255,255,0.25)", color:"white" }
                  : { background:"var(--ds-border)", color:"var(--ds-text-muted)" }
                }
              >
                {creation.likes}
              </motion.span>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Report modal ─────────────────────────────────────────────────
function ReportModal({ onSubmit, onCancel }: { onSubmit: (r: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  const REASONS = [
    { emoji:"😟", label:"Not kind or respectful" },
    { emoji:"🚫", label:"Inappropriate content"  },
    { emoji:"😢", label:"Makes me uncomfortable" },
    { emoji:"❓", label:"Something else"          },
  ];
  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <motion.div
          initial={{ opacity:0, y:60 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:40 }}
          transition={{ type:"spring", stiffness:340, damping:30 }}
          className="w-full sm:max-w-sm bg-ds-surface shadow-2xl p-6 pb-8 sm:pb-6 border border-ds-border rounded-t-3xl sm:rounded-3xl sm:mx-4"
        >
          <div className="w-10 h-1 bg-ds-border rounded-full mx-auto mb-5 sm:hidden" />
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🚩</span>
            </div>
            <h3 className="font-black text-ds-text text-[18px]">Report this post?</h3>
            <p className="text-ds-muted text-[12px] mt-1">Tell us what's wrong</p>
          </div>
          <div className="space-y-2 mb-5">
            {REASONS.map(r => (
              <button key={r.label} onClick={() => setReason(r.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                  reason === r.label
                    ? "border-red-200 bg-red-50"
                    : "border-transparent bg-ds-border/30 hover:bg-ds-border/60"
                }`}
              >
                <span className="text-xl">{r.emoji}</span>
                <span className={`font-bold text-[13px] ${reason === r.label ? "text-red-600" : "text-ds-text"}`}>
                  {r.label}
                </span>
                {reason === r.label && (
                  <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                    className="ml-auto w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px] font-black">✓</span>
                  </motion.div>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <button onClick={onCancel}
              className="flex-1 bg-ds-border/40 text-ds-muted font-black text-[14px] py-3 rounded-2xl hover:bg-ds-border/70 transition">
              Cancel
            </button>
            <button onClick={() => reason && onSubmit(reason)} disabled={!reason}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black text-[14px] py-3 rounded-2xl shadow-md disabled:opacity-30 transition">
              Report
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ── Main ─────────────────────────────────────────────────────────
export default function CommunityPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const [creations, setCreations]     = useState<Creation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [hasMore, setHasMore]         = useState(false);
  const [page, setPage]               = useState(0);
  const [userId, setUserId]           = useState("");
  const [friends, setFriends]         = useState<{ name: string; avatar: string }[]>([]);
  const [liking, setLiking]           = useState<Record<string, boolean>>({});
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [filter, setFilter]           = useState<FilterType>("all");
  const [totalCount, setTotalCount]   = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const { data } = await supabase.from("children").select("name, avatar_url").order("created_at");
      if (data) setFriends(data.map((c: any) => ({ name: c.name, avatar: c.avatar_url || "🌟" })));
    })();
  }, []);

  const fetchCreations = useCallback(async (pageNum: number, refresh: boolean) => {
    const from = pageNum * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("creations")
      .select(`*, likes:likes(id, user_id), children:child_id(avatar_url)`, { count:"exact" })
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(from, to);
    const mapped = (data ?? []).map((c: any) => mapCreation(c, userId));
    setCreations(prev => refresh ? mapped : [...prev, ...mapped]);
    setTotalCount(count ?? 0);
    setHasMore((count || 0) > to + 1);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void fetchCreations(0, true); }, [fetchCreations]);

  useInfiniteScroll(observerTarget as RefObject<HTMLElement>, () => {
    if (!loading && hasMore) { const n = page + 1; setPage(n); void fetchCreations(n, false); }
  });

  const handleCheer = async (id: string) => {
    const c = creations.find(x => x.id === id);
    if (!c || !userId || liking[id]) return;
    const ns = !c.likedByUser;
    setLiking(prev => ({ ...prev, [id]: true }));
    setCreations(prev => prev.map(x =>
      x.id === id ? { ...x, likedByUser: ns, likes: ns ? x.likes + 1 : Math.max(0, x.likes - 1) } : x
    ));
    if (ns) await supabase.from("likes").insert({ creation_id: id, user_id: userId });
    else    await supabase.from("likes").delete().eq("creation_id", id).eq("user_id", userId);
    setLiking(prev => ({ ...prev, [id]: false }));
  };

  const submitReport = async (reason: string) => {
    if (!reportingId) return;
    await supabase.from("creations").update({ status:"reported" }).eq("id", reportingId);
    setCreations(prev => prev.filter(c => c.id !== reportingId));
    setReportingId(null);
  };

  const filterConfig = FILTERS.find(f => f.id === filter)!;
  const visible = filter === "all" ? creations : creations.filter(c => filterConfig.types.includes(c.type));

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-4xl mx-auto px-3 py-4 sm:px-4 lg:px-6 pb-28 w-full">

          {/* ── HERO ──────────────────────────────────────────── */}
          <HeroBanner zone="communitySquare" className="mb-5">
            <button
              onClick={() => router.back()}
              className="absolute top-4 left-5 z-20 flex items-center gap-1.5 text-white/80 hover:text-white text-[13px] font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />

            {/* Floating stars */}
            {[{t:"13%",l:"4%",d:0},{t:"71%",l:"8%",d:0.55},{t:"18%",r:"5%",d:0.3},{t:"67%",r:"8%",d:0.95}].map((s,i) => (
              <motion.span key={i}
                className="absolute text-xl pointer-events-none select-none"
                style={{ top:s.t, left:(s as any).l, right:(s as any).r }}
                animate={{ opacity:[0.25,0.9,0.25], y:[0,-7,0] }}
                transition={{ duration:2.6, repeat:Infinity, delay:s.d }}
                aria-hidden
              >⭐</motion.span>
            ))}

            <div className="relative z-10 px-5 pt-12 pb-5 sm:px-7 sm:pb-6">
              {/* Title row */}
              <div className="flex items-center gap-4 mb-4">
                <motion.img src={assets.nimiCircle} alt="NIMI"
                  className="w-14 h-14 rounded-full border-2 border-white/40 shadow-xl shrink-0"
                  animate={{ y:[0,-5,0] }} transition={{ duration:2.8, repeat:Infinity }} />
                <div className="min-w-0">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5">
                    Community Square
                  </p>
                  <h1 className="font-baloo font-black text-white text-[22px] sm:text-[28px] leading-tight drop-shadow-md">
                    Friends Hub 👥
                  </h1>
                  {totalCount > 0 && (
                    <motion.p
                      initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
                      className="text-white/75 text-[12px] font-semibold mt-0.5"
                    >
                      {totalCount.toLocaleString()} adventure{totalCount !== 1 ? "s" : ""} shared ✨
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Friend bubbles */}
              {friends.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2.5">
                    {friends.slice(0, 8).map((f, i) => (
                      <motion.div key={f.name + i}
                        initial={{ scale:0, opacity:0 }}
                        animate={{ scale:1, opacity:1 }}
                        transition={{ delay:0.06 + i * 0.045, type:"spring", stiffness:380 }}
                        className="w-9 h-9 rounded-full bg-white/25 border-2 border-white/60 flex items-center justify-center text-base font-bold text-white shadow-sm backdrop-blur-sm"
                        title={f.name}
                      >
                        {f.avatar.length <= 2 ? f.avatar : f.name[0]}
                      </motion.div>
                    ))}
                    {friends.length > 8 && (
                      <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-[10px] font-black text-white">
                        +{friends.length - 8}
                      </div>
                    )}
                  </div>
                  <p className="text-white/70 text-[12px] font-semibold">
                    {friends.length} learner{friends.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </HeroBanner>

          {/* ── FILTER TABS ────────────────────────────────────── */}
          <div className="mb-4 p-1 rounded-2xl bg-ds-surface border border-ds-border">
            <FilterTabs active={filter} onChange={f => { setFilter(f); }} />
          </div>

          {/* ── FEED ───────────────────────────────────────────── */}
          {loading ? (
            <div className="py-12">
              <MagicLoader variant="community" fullPage={false} />
            </div>
          ) : visible.length === 0 ? (
            <motion.div
              initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
              className="border border-ds-border bg-ds-surface rounded-3xl px-6 py-16 text-center"
            >
              <motion.div
                animate={{ y:[0,-10,0] }} transition={{ duration:2.4, repeat:Infinity }}
                className="text-6xl mb-4"
              >
                {filter === "all" ? "🏆" : filterConfig.emoji}
              </motion.div>
              <h2 className="font-black text-ds-text text-[19px]">
                {filter === "all" ? "No adventures yet!" : `No ${filterConfig.label.toLowerCase()} posts yet`}
              </h2>
              <p className="text-ds-muted text-[13px] mt-2 max-w-[240px] mx-auto leading-relaxed">
                {filter === "all"
                  ? "Complete a story and share your first adventure!"
                  : "Try a different filter or check back soon."}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {visible.map((c, i) => (
                  <CreationCard
                    key={c.id}
                    creation={c}
                    index={i}
                    onCheer={handleCheer}
                    onReport={setReportingId}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={observerTarget} className="h-12 flex items-center justify-center mt-2">
            {!loading && hasMore && (
              <div className="flex items-center gap-2 text-ds-muted text-[12px] font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        </main>

        {/* ── Report modal ──────────────────────────────────────── */}
        <AnimatePresence>
          {reportingId && (
            <ReportModal
              key="report"
              onSubmit={submitReport}
              onCancel={() => setReportingId(null)}
            />
          )}
        </AnimatePresence>
      </PageSurface>
    </AppShell>
  );
}
