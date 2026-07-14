"use client";

import React, { useState, useEffect, useCallback, useRef, RefObject } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ArrowLeft, Loader2, Flame, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStorageUrl } from "@/lib/queries";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { HeroBanner } from "@/components/layout/primitives";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { Creation } from "@/components/community/types";
import { getStoryLibrary } from "@/lib/storyRepository";
import { generateCertificateImageUrl } from "@/lib/certificateImage";

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

type CreationRow = { id: string; child_name?: string | null; children?: { avatar_url?: string | null } | null; age?: number | null; description?: string | null; image_url?: string | null; likes?: { user_id: string }[] | null; type?: string | null; created_at: string };

interface PickerItem {
  key: string;
  childId: string;
  childName: string;
  childAvatar: string;
  childLanguage: string;
  storyTitle: string;
  coverUrl: string | null;
  themeEmoji: string | null;
  complete: boolean;
  progress: number;
}

function mapCreation(c: CreationRow, uid: string): Creation {
  return {
    id: c.id,
    childName: c.child_name || "Friend",
    childAvatar: c.children?.avatar_url ?? undefined,
    age: c.age ?? 0,
    description: c.description ?? undefined,
    imageUrl: c.image_url ?? "",
    likes: c.likes?.length || 0,
    likedByUser: c.likes?.some(l => l.user_id === uid) || false,
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
  const hasImg = !!(imgUrl && imgUrl.startsWith("http") && !imgUrl.endsWith(".svg"));
  const isHot  = creation.likes >= HOT_THRESHOLD;

  const AVATAR_GRADIENTS = [
    "from-violet-500 to-purple-600", "from-pink-500 to-rose-600",
    "from-blue-500 to-indigo-600",   "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",  "from-teal-500 to-cyan-600",
  ];
  const avatarGrad = AVATAR_GRADIENTS[(creation.childName?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length];
  const isAvatarPhoto = !!(creation.childAvatar?.startsWith("http"));
  const isAvatarEmoji = !isAvatarPhoto && !!(creation.childAvatar && creation.childAvatar.length <= 2);
  const avatarInitial = creation.childName?.[0]?.toUpperCase() ?? "?";

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
      className="group rounded-3xl border border-ds-border bg-ds-card shadow-[0_4px_20px_rgba(15,23,42,0.07)] hover:shadow-[0_14px_40px_rgba(15,23,42,0.13)] transition-shadow duration-300 overflow-visible"
    >
      {/* ── IMAGE ZONE (overflow-hidden isolated) ── */}
      <div className="relative w-full rounded-t-3xl overflow-hidden bg-gray-100" style={{ aspectRatio: "4/3" }}>
        {hasImg ? (
          <img
            src={imgUrl!}
            alt={creation.description ?? `${creation.childName}'s creation`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          /* Pure emoji gradient fallback */
          <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
            <motion.span
              className="text-7xl drop-shadow-2xl"
              animate={{ scale:[1, 1.08, 1] }}
              transition={{ duration:3.2, repeat:Infinity, ease:"easeInOut", delay: index * 0.18 }}
            >
              {meta.emoji}
            </motion.span>
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
          <div className={`w-11 h-11 rounded-full border-[3px] border-ds-surface bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-base font-black text-white shadow-md shrink-0 overflow-hidden`}>
            {isAvatarPhoto
              ? <img src={creation.childAvatar!} alt={creation.childName} className="w-full h-full object-cover" />
              : isAvatarEmoji
              ? <span className="text-[19px] leading-none">{creation.childAvatar}</span>
              : avatarInitial}
          </div>
          <div className="pb-0.5 min-w-0">
            <p className="font-black text-ds-text text-[14px] leading-tight truncate">{creation.childName}</p>
            <p className="text-ds-muted text-[11px] font-semibold">{timeAgo(creation.createdAt)}</p>
          </div>
        </div>

        {/* Description */}
        {creation.description && (
          <p className="text-ds-text/70 text-[12.5px] leading-relaxed mb-3 line-clamp-2 font-medium">
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
          className="w-full sm:max-w-sm bg-ds-card shadow-2xl p-6 pb-8 sm:pb-6 border border-ds-border rounded-t-3xl sm:rounded-3xl sm:mx-4"
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

// ── Shimmer skeleton ─────────────────────────────────────────────
function PickerSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-2xl border border-ds-border overflow-hidden relative bg-ds-card">
      <div className="w-12 h-12 rounded-xl shrink-0 bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 rounded-lg bg-gray-200" />
        <div className="h-2.5 w-2/5 rounded-lg bg-gray-200 opacity-60" />
      </div>
      <div className="w-20 h-8 rounded-xl shrink-0 bg-gray-200" />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg,transparent 20%,rgba(255,255,255,0.25) 50%,transparent 80%)" }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
      />
    </div>
  );
}

// ── Share Picker Sheet ───────────────────────────────────────────
function SharePickerSheet({
  open, onClose, items, loading, sharingKey, onShare,
}: {
  open: boolean;
  onClose: () => void;
  items: PickerItem[];
  loading: boolean;
  sharingKey: string | null;
  onShare: (item: PickerItem) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 z-50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[28px] overflow-hidden shadow-[0_-12px_48px_rgba(0,0,0,0.22)]"
            style={{ maxHeight: "85vh", background: "var(--ds-surface-card)" }}
          >
            {/* Gradient header band */}
            <div className="relative shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg,#059669 0%,#10b981 55%,#34d399 100%)" }}>
              {/* Decorative circles */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/8 pointer-events-none" />

              {/* Pull handle */}
              <div className="w-10 h-1.5 bg-white/40 rounded-full mx-auto mt-3 mb-0" />

              <div className="flex items-center justify-between px-5 pt-4 pb-5">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-[26px] shadow-md"
                  >🚀</motion.div>
                  <div>
                    <h3 className="font-baloo font-black text-white text-[20px] leading-tight drop-shadow-sm">
                      Share an Adventure
                    </h3>
                    <p className="text-white/70 text-[12px] font-semibold mt-0.5">
                      Pick a story to celebrate with your community
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-[14px] font-black hover:bg-white/30 transition-colors shrink-0"
                >✕</button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-3 bg-ds-page" style={{ scrollbarWidth: "none" }}>
              {loading ? (
                <>
                  <PickerSkeleton />
                  <PickerSkeleton />
                  <PickerSkeleton />
                </>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                    className="text-7xl mb-5"
                  >📖</motion.div>
                  <p className="font-baloo font-black text-ds-text text-[20px]">No adventures yet!</p>
                  <p className="text-ds-muted text-[13px] mt-2 leading-relaxed max-w-[240px]">
                    Complete a story mission and your achievements will appear here to share 🌟
                  </p>
                </div>
              ) : (
                items.map((item, i) => {
                  const isSharing = sharingKey === item.key;
                  const coverSrc = item.coverUrl ? getStorageUrl(item.coverUrl) : null;
                  const pct = Math.round(item.progress * 100);
                  const done = item.complete;

                  return (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.055, type: "spring", stiffness: 300, damping: 26 }}
                      className="rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.07)] bg-white" style={{ border: "1px solid #E5E7EB" }}
                    >
                      {/* Top row: cover + info + button */}
                      <div className="flex items-center gap-3 p-3">
                        {/* Square cover */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-2xl shadow-sm"
                          style={{ background: done ? "linear-gradient(135deg,#a7f3d0,#6ee7b7)" : "linear-gradient(135deg,#fde68a,#fcd34d)" }}>
                          {coverSrc
                            ? <img src={coverSrc} alt={item.storyTitle} className="w-full h-full object-cover" />
                            : <span>{item.themeEmoji ?? "📖"}</span>
                          }
                        </div>

                        {/* Text info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-baloo font-black text-ds-text text-[14px] leading-snug truncate">
                            {item.storyTitle}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-ds-muted text-[11px] font-semibold truncate">{item.childName}</span>
                            <span className="text-gray-300 text-[9px]">•</span>
                            <span className="text-[10px] font-black text-sky-500">📖 Story</span>
                          </div>
                        </div>

                        {/* Post button */}
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => onShare(item)}
                          disabled={!!sharingKey}
                          className="shrink-0 flex items-center justify-center gap-1.5 font-baloo font-black text-[12px] text-white px-3.5 py-2 rounded-xl shadow-sm disabled:opacity-40 min-w-[68px]"
                          style={{ background: done ? "linear-gradient(135deg,#059669,#10b981)" : "linear-gradient(135deg,#d97706,#f59e0b)" }}
                        >
                          {isSharing
                            ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <>{done ? "🏆" : "⭐"} Post</>
                          }
                        </motion.button>
                      </div>

                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Floating Share FAB ───────────────────────────────────────────
function ShareFAB({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.7 }}
      whileHover={{ scale: 1.06, y: -2 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className="fixed bottom-[88px] right-4 z-40 flex items-center gap-2.5 pl-4 pr-5 py-3.5 rounded-2xl text-white font-baloo font-black text-[14px] shadow-[0_8px_28px_rgba(5,150,105,0.45)]"
      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
      aria-label="Share your adventure"
    >
      {/* Pulse ring */}
      <motion.span
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{ scale: [1, 1.22, 1.22], opacity: [0.55, 0, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        style={{ background: "#10b981" }}
      />
      <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <Plus className="w-4 h-4" strokeWidth={3} />
      </div>
      <span className="relative">Share</span>
      <span className="text-[17px] leading-none">⭐</span>
    </motion.button>
  );
}

// ── Main ─────────────────────────────────────────────────────────
export default function CommunityPage() {
  const { t, language } = useLanguage();
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

  // Share picker
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [pickerItems, setPickerItems]   = useState<PickerItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [sharingKey, setSharingKey]     = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: { user } }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("children").select("name, avatar_url").order("created_at"),
      ]);
      if (user) setUserId(user.id);
      if (data) setFriends(data.map((c: { name: string | null; avatar_url: string | null }) => ({ name: c.name ?? "Friend", avatar: c.avatar_url || "🌟" })));
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
    const mapped = (data ?? [])
      .filter(c => {
        const url = (c.image_url as string | null) ?? "";
        return !url.startsWith("/") && !url.startsWith("assets/");
      })
      .map(c => mapCreation(c as CreationRow, userId));
    setCreations(prev => refresh ? mapped : [...prev, ...mapped]);
    setTotalCount(prev => refresh ? mapped.length : prev + mapped.length);
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
    // Optimistic update — UI responds instantly, no spinner needed.
    setLiking(prev => ({ ...prev, [id]: true }));
    setCreations(prev => prev.map(x =>
      x.id === id ? { ...x, likedByUser: ns, likes: ns ? x.likes + 1 : Math.max(0, x.likes - 1) } : x
    ));
    try {
      if (ns) await supabase.from("likes").insert({ creation_id: id, user_id: userId });
      else    await supabase.from("likes").delete().eq("creation_id", id).eq("user_id", userId);
    } catch {
      // Roll back the optimistic update on network/DB failure.
      setCreations(prev => prev.map(x =>
        x.id === id ? { ...x, likedByUser: c.likedByUser, likes: c.likes } : x
      ));
    } finally {
      setLiking(prev => ({ ...prev, [id]: false }));
    }
  };

  const submitReport = async (reason: string) => {
    if (!reportingId) return;
    await supabase.from("creations").update({ status:"reported" }).eq("id", reportingId);
    setCreations(prev => prev.filter(c => c.id !== reportingId));
    setReportingId(null);
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      const [{ data: kids }, { data: storiesRaw }] = await Promise.all([
        supabase.from("children").select("id, name, avatar_url, language"),
        supabase.from("stories")
          .select("id, title, cover_url, theme_emoji")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      const all: PickerItem[] = [];
      for (const kid of (kids ?? []) as { id: string; name: string | null; avatar_url: string | null; language: string | null }[]) {
        for (const s of (storiesRaw ?? []) as { id: string; title: string; cover_url: string | null; theme_emoji: string | null }[]) {
          all.push({
            key: `${kid.id}-${s.id}`,
            childId: kid.id,
            childName: kid.name ?? "Friend",
            childAvatar: kid.avatar_url ?? "🌟",
            childLanguage: kid.language ?? "en",
            storyTitle: s.title,
            coverUrl: s.cover_url,
            themeEmoji: s.theme_emoji,
            complete: false,
            progress: 0,
          });
        }
      }
      setPickerItems(all);
    } catch (err) {
      console.error("[openPicker]", err);
      setPickerItems([]);
    }
    setPickerLoading(false);
  };

  const sharePickerItem = async (item: PickerItem) => {
    if (sharingKey) return;
    setSharingKey(item.key);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSharingKey(null); return; }

    const shareType = item.complete ? "certificate" : "sticker";

    // For certificates: generate personalized image from the admin-configured template
    let shareImg = "";
    if (shareType === "certificate") {
      const certUrl = await generateCertificateImageUrl(item.childName, item.childLanguage);
      if (certUrl) shareImg = certUrl;
    } else {
      const raw = item.coverUrl ? getStorageUrl(item.coverUrl) : null;
      shareImg = (raw && raw.startsWith("http")) ? raw : "";
    }

    const { error } = await supabase.from("creations").insert({
      parent_id: user.id,
      child_id: item.childId,
      child_name: item.childName,
      description: item.complete
        ? `${item.childName} completed the story: ${item.storyTitle}! 🏆`
        : `${item.childName} is ${Math.round(item.progress * 100)}% through: ${item.storyTitle}! 📖`,
      type: shareType,
      status: "approved",
      is_public: true,
      image_url: shareImg,
    });

    if (error) console.error("[sharePickerItem]", error.message);
    setSharingKey(null);
    setPickerOpen(false);
    setPage(0);
    void fetchCreations(0, true);
  };

  const filterConfig = FILTERS.find(f => f.id === filter)!;
  const visible = filter === "all" ? creations : creations.filter(c => filterConfig.types.includes(c.type));

  return (
    <AppShell>
      <main className="max-w-4xl mx-auto px-3 py-4 sm:px-4 lg:px-6 pb-24 w-full content-enter">

        {/* ── HERO ──────────────────────────────────────────────── */}
        <HeroBanner zone="communitySquare" className="mb-5">
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-5 z-20 flex items-center gap-1.5 text-white/80 hover:text-white text-[13px] font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-1/2 right-16 w-20 h-20 rounded-full bg-white/8 pointer-events-none" />

          {/* Floating stars */}
          {([ {t:"12%",l:"5%",d:0},{t:"70%",l:"9%",d:0.55},{t:"15%",r:"6%",d:0.3},{t:"65%",r:"9%",d:0.95} ] as Array<{t:string;d:number;l?:string;r?:string}>).map((s,i) => (
            <motion.span key={i}
              className="absolute text-xl pointer-events-none select-none"
              style={{ top:s.t, left:s.l, right:s.r }}
              animate={{ opacity:[0.25,0.9,0.25], y:[0,-8,0] }}
              transition={{ duration:2.6, repeat:Infinity, delay:s.d }}
              aria-hidden
            >⭐</motion.span>
          ))}

          <div className="relative z-10 px-5 pt-12 pb-6 sm:px-8 sm:pb-7">
            {/* Title row */}
            <div className="flex items-center gap-4 mb-5">
              <motion.img src={assets.nimiCircle} alt="NIMI"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-white/50 shadow-2xl shrink-0"
                animate={{ y:[0,-6,0] }} transition={{ duration:2.8, repeat:Infinity }} />
              <div className="min-w-0">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.18em] mb-1">
                  Community Square
                </p>
                <h1 className="font-baloo font-black text-white text-[26px] sm:text-[32px] leading-tight drop-shadow-lg">
                  Friends Hub 👥
                </h1>
                <p className="text-white/70 text-[12px] font-semibold mt-0.5">
                  Where every adventure gets celebrated
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {totalCount > 0 && (
                <motion.div
                  initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
                  className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white/90" />
                  <span className="text-white text-[12px] font-black">
                    {totalCount} adventure{totalCount !== 1 ? "s" : ""}
                  </span>
                </motion.div>
              )}
              {friends.length > 0 && (
                <motion.div
                  initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
                  className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1.5"
                >
                  <span className="text-white/90 text-[13px]">👥</span>
                  <span className="text-white text-[12px] font-black">
                    {friends.length} learner{friends.length !== 1 ? "s" : ""}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Friend bubbles */}
            {friends.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {friends.slice(0, 8).map((f, i) => {
                    const isEmoji = f.avatar.length <= 2;
                    const FRIEND_GRADS = [
                      "from-violet-400 to-purple-500","from-pink-400 to-rose-500",
                      "from-blue-400 to-indigo-500","from-emerald-400 to-teal-500",
                      "from-amber-400 to-orange-500","from-cyan-400 to-sky-500",
                    ];
                    const grad = FRIEND_GRADS[f.name.charCodeAt(0) % FRIEND_GRADS.length];
                    return (
                    <motion.div key={f.name + i}
                      initial={{ scale:0, opacity:0 }}
                      animate={{ scale:1, opacity:1 }}
                      transition={{ delay:0.06 + i * 0.045, type:"spring", stiffness:380 }}
                      className={`w-9 h-9 rounded-full border-2 border-white/70 flex items-center justify-center text-[15px] font-bold text-white shadow-md ${isEmoji ? "bg-white/25 backdrop-blur-sm" : `bg-gradient-to-br ${grad}`}`}
                      title={f.name}
                    >
                      {isEmoji ? f.avatar : f.name[0]}
                    </motion.div>
                    );
                  })}
                  {friends.length > 8 && (
                    <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-[10px] font-black text-white">
                      +{friends.length - 8}
                    </div>
                  )}
                </div>
                <p className="text-white/70 text-[12px] font-semibold">Active now</p>
              </div>
            )}
          </div>
        </HeroBanner>

        {/* ── FILTER TABS ───────────────────────────────────────── */}
        <div className="mb-5 p-1 rounded-2xl bg-ds-card border border-ds-border shadow-sm">
          <FilterTabs active={filter} onChange={f => { setFilter(f); }} />
        </div>

        {/* ── FEED ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
            {Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="h-64 leaf-lg" />)}
          </div>
        ) : visible.length === 0 ? (
          <motion.div
            initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
            className="border border-ds-border bg-ds-card rounded-3xl px-6 py-20 text-center"
          >
            <motion.div
              animate={{ y:[0,-10,0] }} transition={{ duration:2.4, repeat:Infinity }}
              className="text-7xl mb-5"
            >
              {filter === "all" ? "🌟" : filterConfig.emoji}
            </motion.div>
            <h2 className="font-baloo font-black text-ds-text text-[20px] mb-2">
              {filter === "all" ? "Nothing shared yet!" : `No ${filterConfig.label.toLowerCase()} posts yet`}
            </h2>
            <p className="text-ds-muted text-[13px] max-w-[240px] mx-auto leading-relaxed mb-6">
              {filter === "all"
                ? "Complete a story or challenge to share your first adventure!"
                : "Try a different filter or come back soon — someone's working on it! 🎨"}
            </p>
            <motion.button
              whileTap={{ scale:0.95 }}
              onClick={() => router.push("/stories")}
              className="inline-flex items-center gap-2 font-baloo font-black text-white text-[13px] px-5 py-2.5 rounded-2xl shadow-md"
              style={{ background:"var(--nimi-green)" }}
            >
              <span>Start a Story</span> <span className="text-[15px]">📖</span>
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Section label */}
            <div className="flex items-center justify-between mb-4">
              <p className="font-nunito font-bold text-ds-muted text-[12px] uppercase tracking-widest">
                Recently Shared
              </p>
              <p className="font-nunito font-bold text-ds-muted text-[11px]">
                {visible.length} post{visible.length !== 1 ? "s" : ""}
              </p>
            </div>

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

              {/* "Be next!" CTA card */}
              {!hasMore && (
                <motion.div
                  initial={{ opacity:0, scale:0.9 }}
                  animate={{ opacity:1, scale:1 }}
                  transition={{ delay: Math.min(visible.length * 0.05, 0.4) + 0.1 }}
                  onClick={openPicker}
                  className="relative rounded-3xl overflow-hidden cursor-pointer group"
                  style={{ minHeight: "280px",
                    background: "linear-gradient(135deg,#ecfdf5,#d1fae5)",
                    border: "2px dashed #6ee7b7",
                  }}
                  whileHover={{ scale: 1.02, transition: { type:"spring", stiffness:340, damping:26 } }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Floating bg emojis */}
                  {["🌟","🎨","💪","📖"].map((e, i) => (
                    <motion.span key={i}
                      className="absolute text-2xl opacity-10 pointer-events-none select-none"
                      style={{ top:`${15+i*20}%`, left:`${10+i*22}%` }}
                      animate={{ y:[0,-8,0], rotate:[0,15,-15,0] }}
                      transition={{ duration:3+i*0.5, repeat:Infinity, delay:i*0.4 }}
                    >{e}</motion.span>
                  ))}

                  <div className="relative z-10 h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
                    <motion.div
                      animate={{ y:[0,-6,0] }}
                      transition={{ duration:2.4, repeat:Infinity, ease:"easeInOut" }}
                      className="w-16 h-16 rounded-2xl bg-emerald-400/20 border-2 border-emerald-300/40 flex items-center justify-center"
                    >
                      <span className="text-3xl">🚀</span>
                    </motion.div>
                    <div>
                      <p className="font-baloo font-black text-emerald-700 text-[16px]">
                        Your turn!
                      </p>
                      <p className="font-nunito text-emerald-600/70 text-[12px] mt-1 leading-relaxed">
                        Finish a story or challenge<br/>and your post appears here ✨
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500 group-hover:bg-emerald-600 transition-colors text-white font-black text-[12px] px-4 py-2 rounded-full shadow-md">
                      <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Start a Story
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={observerTarget} className="h-10 flex items-center justify-center mt-3">
          {!loading && hasMore && (
            <div className="flex items-center gap-2 text-ds-muted text-[12px] font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading more...
            </div>
          )}
        </div>
      </main>

      {/* ── Floating share button ───────────────────────────────── */}
      <ShareFAB onClick={openPicker} />

      {/* ── Share picker sheet ──────────────────────────────────── */}
      <SharePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        items={pickerItems}
        loading={pickerLoading}
        sharingKey={sharingKey}
        onShare={sharePickerItem}
      />

      {/* ── Report modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {reportingId && (
          <ReportModal
            key="report"
            onSubmit={submitReport}
            onCancel={() => setReportingId(null)}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
