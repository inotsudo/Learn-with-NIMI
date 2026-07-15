"use client";

import React, { useState, useEffect, useCallback, useRef, RefObject } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ArrowLeft, Loader2, Flame, Plus, Sparkles } from "lucide-react";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import supabase from "@/lib/supabaseClient";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { getStorageUrl } from "@/lib/queries";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getComponentVariant, type ComponentVariant } from "@/lib/design-system/componentVariants";
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
  certificate:   { emoji:"🏆", label:"Story Complete",  pill:"bg-amber-500",  gradient:"from-amber-400 to-orange-500"   },
  story:         { emoji:"🏆", label:"Story Complete",  pill:"bg-amber-500",  gradient:"from-amber-400 to-orange-500"   },
  story_progress:{ emoji:"📖", label:"On Adventure",    pill:"bg-sky-500",    gradient:"from-sky-400 to-blue-500"       },
  challenge:     { emoji:"💪", label:"Challenge Done",  pill:"bg-blue-500",   gradient:"from-blue-500 to-indigo-600"    },
  sticker:       { emoji:"⭐", label:"Star Earned",     pill:"bg-yellow-500", gradient:"from-yellow-400 to-amber-500"   },
  art:           { emoji:"🎨", label:"Artwork",         pill:"bg-fuchsia-500",gradient:"from-fuchsia-500 to-violet-600" },
  coloring:      { emoji:"🖍️", label:"Coloring Page",   pill:"bg-purple-500", gradient:"from-purple-500 to-pink-500"   },
};
const fallbackMeta = { emoji:"✨", label:"Moment", pill:"bg-gray-400", gradient:"from-gray-400 to-slate-500" };

// ── Filters ─────────────────────────────────────────────────────
type FilterType = "all" | "stories" | "art" | "challenges" | "stars";
const FILTERS: { id: FilterType; label: string; emoji: string; types: string[] }[] = [
  { id:"all",        label:"All",        emoji:"✨", types:[] },
  { id:"stories",    label:"Stories",    emoji:"🏆", types:["certificate","story","story_progress"] },
  { id:"art",        label:"Art",        emoji:"🎨", types:["art","coloring"] },
  { id:"challenges", label:"Challenges", emoji:"💪", types:["challenge"] },
  { id:"stars",      label:"Stars",      emoji:"⭐", types:["sticker"] },
];

function FilterTabs({ active, onChange }: { active: FilterType; onChange: (f: FilterType) => void }) {
  return (
    <LayoutGroup>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {FILTERS.map(f => {
          const on = active === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onChange(f.id)}
              className="relative shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-black transition-colors duration-150 focus:outline-none border"
              style={{
                color: on ? "white" : "var(--ds-text-muted)",
                borderColor: on ? "transparent" : "var(--ds-border-primary)",
              }}
            >
              {on && (
                <motion.div
                  layoutId="cp-filter-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "var(--nimi-green)" }}
                  transition={{ type:"spring", stiffness:400, damping:34 }}
                />
              )}
              <span className="relative z-10 text-[14px] leading-none">{f.emoji}</span>
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
  const avatarInitial = creation.childName?.[0]?.toUpperCase() ?? "?";

  const handleCheer = () => {
    if (!creation.likedByUser) setBursting(true);
    onCheer(creation.id);
  };

  return (
    <motion.div
      initial={{ opacity:0, y:24, scale:0.96 }}
      animate={{ opacity:1, y:0,  scale:1 }}
      exit={{ opacity:0, scale:0.96 }}
      transition={{ type:"spring", stiffness:300, damping:28, delay: Math.min(index * 0.05, 0.3) }}
      whileHover={{ y:-3, transition:{ type:"spring", stiffness:400, damping:30 } }}
      className="group rounded-2xl border border-ds-border bg-ds-card shadow-ds-card hover:shadow-[0_12px_36px_rgba(15,23,42,0.12)] transition-shadow duration-300 overflow-hidden"
    >
      {/* ── CARD HEADER: avatar + name + type badge ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-ds-border">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center font-black text-white shrink-0 overflow-hidden shadow-sm`}>
          {creation.childAvatar
            ? <ChildAvatar avatarUrl={creation.childAvatar} name={creation.childName} size={44} className="w-full h-full" />
            : <span className="text-[16px]">{avatarInitial}</span>
          }
        </div>

        {/* Name + timestamp */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-ds-text text-[14px] leading-tight truncate">{creation.childName}</p>
          <p className="text-ds-muted text-[11px] font-medium mt-0.5">{timeAgo(creation.createdAt)}</p>
        </div>

        {/* Type badge */}
        <span className={`shrink-0 flex items-center gap-1.5 ${meta.pill} text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm`}>
          <span className="text-[11px] leading-none">{meta.emoji}</span>
          {meta.label}
        </span>

        {/* Report */}
        <button
          onClick={e => { e.stopPropagation(); onReport(creation.id); }}
          title="Report post"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] text-ds-muted opacity-0 group-hover:opacity-100 hover:bg-ds-border transition-all ml-1"
        >🚩</button>
      </div>

      {/* ── IMAGE ── */}
      <div className="relative w-full overflow-hidden bg-ds-border" style={{ aspectRatio:"3/4" }}>
        {hasImg ? (
          <img
            src={imgUrl!}
            alt={creation.description ?? `${creation.childName}'s creation`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
            <motion.span
              className="text-6xl drop-shadow-xl"
              animate={{ scale:[1,1.07,1] }}
              transition={{ duration:3, repeat:Infinity, ease:"easeInOut", delay: index * 0.2 }}
            >{meta.emoji}</motion.span>
          </div>
        )}

        {isHot && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
            <Flame className="w-3 h-3 fill-white" strokeWidth={0} /> HOT
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 pt-3 pb-4">
        {creation.description && (
          <p className="text-ds-text text-[13px] leading-relaxed line-clamp-2 mb-3">
            {creation.description}
          </p>
        )}

        {/* Cheer row */}
        <div className="relative flex items-center gap-2">
          <AnimatePresence>
            {bursting && <CheerBurst key="burst" onDone={() => setBursting(false)} />}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale:0.93 }}
            onClick={handleCheer}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-black transition-all duration-200 ${
              creation.likedByUser
                ? "text-white shadow-md shadow-emerald-500/20"
                : "bg-ds-page border border-ds-border text-ds-muted hover:border-[var(--nimi-green)] hover:text-[var(--nimi-green)]"
            }`}
            style={creation.likedByUser ? { background:"var(--nimi-green)" } : {}}
          >
            <motion.span
              className="text-[15px] leading-none"
              animate={creation.likedByUser ? { scale:[1,1.5,1], rotate:[0,-15,15,0] } : {}}
              transition={{ duration:0.35 }}
            >
              {creation.likedByUser ? "🎉" : "👏"}
            </motion.span>
            <span>{creation.likedByUser ? "Cheered!" : "Cheer"}</span>
            {creation.likes > 0 && (
              <motion.span
                key={creation.likes}
                initial={{ scale:1.4, opacity:0 }}
                animate={{ scale:1,   opacity:1 }}
                className="text-[11px] font-black px-1.5 py-0.5 rounded-full"
                style={creation.likedByUser
                  ? { background:"rgba(255,255,255,0.22)", color:"white" }
                  : { background:"var(--ds-border-primary)", color:"var(--ds-text-muted)" }
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
  open, onClose, items, loading, sharingKey, onSelect: onShare, cv,
}: {
  open: boolean;
  onClose: () => void;
  items: PickerItem[];
  loading: boolean;
  sharingKey: string | null;
  onSelect: (item: PickerItem) => void;
  cv: ComponentVariant;
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
            <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${cv.zoneGradients.communitySquare}`}>
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
                        <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-2xl shadow-sm bg-gradient-to-br ${done ? "from-emerald-100 to-teal-200" : "from-amber-100 to-yellow-200"}`}>
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
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-ds-muted text-[11px] font-semibold truncate">{item.childName}</span>
                            {done ? (
                              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">🏆 Complete</span>
                            ) : (
                              <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full">📖 {pct}% done</span>
                            )}
                          </div>
                          {/* Progress bar */}
                          {!done && (
                            <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                              <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>

                        {/* Post button */}
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => onShare(item)}
                          disabled={!!sharingKey}
                          className={`shrink-0 flex items-center justify-center gap-1.5 font-baloo font-black text-[12px] px-3.5 py-2 rounded-xl shadow-sm disabled:opacity-40 min-w-[68px] bg-gradient-to-r ${done ? `${cv.zoneGradients.communitySquare} text-white` : "from-amber-400 to-amber-500 text-amber-950"}`}
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

// ── Caption editor sheet ─────────────────────────────────────────
const CAPTION_MAX = 280;

function CaptionSheet({
  item, caption, onCaptionChange, onPost, onBack, posting, cv,
}: {
  item: PickerItem | null;
  caption: string;
  onCaptionChange: (v: string) => void;
  onPost: () => void;
  onBack: () => void;
  posting: boolean;
  cv: ComponentVariant;
}) {
  const coverSrc = item?.coverUrl ? getStorageUrl(item.coverUrl) : null;
  const remaining = CAPTION_MAX - caption.length;

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[60] backdrop-blur-sm"
            onClick={onBack}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col rounded-t-[28px] overflow-hidden shadow-[0_-12px_48px_rgba(0,0,0,0.28)]"
            style={{ maxHeight: "90vh", background: "var(--ds-surface-card)" }}
          >
            {/* Pull handle */}
            <div className="w-10 h-1.5 bg-ds-border rounded-full mx-auto mt-3 shrink-0" />

            {/* Header row */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-4 border-b border-ds-border shrink-0">
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-ds-card border border-ds-border flex items-center justify-center text-ds-muted hover:text-ds-text hover:bg-ds-border transition-all shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-ds-text text-[17px] leading-tight">Write a caption</h3>
                <p className="text-ds-muted text-[12px] font-medium mt-0.5">Tell the community about this adventure</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-4 bg-ds-page" style={{ scrollbarWidth: "none" }}>
              {/* Story preview card */}
              <div className="flex items-center gap-3 bg-ds-card border border-ds-border rounded-2xl p-3">
                <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-2xl shadow-sm bg-gradient-to-br ${item.complete ? "from-emerald-100 to-teal-200" : "from-amber-100 to-yellow-200"}`}>
                  {coverSrc
                    ? <img src={coverSrc} alt={item.storyTitle} className="w-full h-full object-cover" />
                    : <span>{item.themeEmoji ?? "📖"}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="font-black text-ds-text text-[14px] truncate">{item.storyTitle}</p>
                  <p className="text-ds-muted text-[12px] font-medium">{item.childName}</p>
                  <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${item.complete ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
                    {item.complete ? "🏆 Story Complete" : `📖 ${Math.round(item.progress * 100)}% done`}
                  </span>
                </div>
              </div>

              {/* Caption textarea */}
              <div>
                <label className="block text-ds-text font-black text-[13px] mb-2">Caption</label>
                <textarea
                  value={caption}
                  onChange={e => onCaptionChange(e.target.value.slice(0, CAPTION_MAX))}
                  rows={4}
                  placeholder="Write something about this achievement…"
                  className="w-full bg-ds-card border border-ds-border rounded-2xl px-4 py-3 text-ds-text text-[14px] leading-relaxed resize-none focus:outline-none focus:border-[var(--nimi-green)] transition-colors placeholder:text-ds-muted"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-[11px] font-semibold ${remaining < 30 ? "text-orange-500" : "text-ds-muted"}`}>
                    {remaining} left
                  </span>
                </div>
              </div>

              {/* Post button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onPost}
                disabled={posting || caption.trim().length === 0}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[15px] text-white shadow-lg disabled:opacity-50 bg-gradient-to-r ${cv.zoneGradients.communitySquare}`}
              >
                {posting
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Posting…</>
                  : <><span className="text-[17px]">🚀</span> Post to Community</>
                }
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Floating Share FAB ───────────────────────────────────────────
function ShareFAB({ onClick, cv }: { onClick: () => void; cv: ComponentVariant }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.7 }}
      whileHover={{ scale: 1.06, y: -2 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={`fixed bottom-[88px] right-4 z-40 flex items-center gap-2.5 pl-4 pr-5 py-3.5 rounded-2xl text-white font-baloo font-black text-[14px] shadow-[0_8px_28px_rgba(5,150,105,0.45)] bg-gradient-to-br ${cv.zoneGradients.communitySquare}`}
      aria-label="Share your adventure"
    >
      {/* Pulse ring */}
      <motion.span
        className={`absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-br ${cv.zoneGradients.communitySquare}`}
        animate={{ scale: [1, 1.22, 1.22], opacity: [0.55, 0, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
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
  const v = getComponentVariant(themeId);

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

  // Caption editor
  const [captionItem, setCaptionItem]   = useState<PickerItem | null>(null);
  const [captionText, setCaptionText]   = useState("");

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
    if (refresh) setTotalCount(count ?? 0);
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
      const { data: kids } = await supabase
        .from("children")
        .select("id, name, avatar_url, language");

      const all: PickerItem[] = [];
      for (const kid of (kids ?? []) as { id: string; name: string | null; avatar_url: string | null; language: string | null }[]) {
        const lang = (kid.language ?? "en") as Language;
        const lib = await getStoryLibrary(kid.id, lang);
        // Only show stories the child has actually started
        const started = lib.filter(s => s.complete || s.progress > 0);
        for (const s of started) {
          all.push({
            key: `${kid.id}-${s.sid}`,
            childId: kid.id,
            childName: kid.name ?? "Friend",
            childAvatar: kid.avatar_url ?? "🌟",
            childLanguage: lang,
            storyTitle: s.title,
            coverUrl: s.cover_url,
            themeEmoji: s.theme_emoji,
            complete: s.complete,
            progress: s.progress,
          });
        }
      }
      // Completed stories first, then by progress descending
      all.sort((a, b) => {
        if (a.complete !== b.complete) return a.complete ? -1 : 1;
        return b.progress - a.progress;
      });
      setPickerItems(all);
    } catch (err) {
      console.error("[openPicker]", err);
      setPickerItems([]);
    }
    setPickerLoading(false);
  };

  const defaultCaption = (item: PickerItem) => {
    const pct = Math.round(item.progress * 100);
    return item.complete
      ? `${item.childName} just completed "${item.storyTitle}"! 🏆 What an adventure!`
      : `${item.childName} is ${pct}% through "${item.storyTitle}" — cheering them on helps! 📖`;
  };

  const handleSelectForCaption = (item: PickerItem) => {
    setCaptionText(defaultCaption(item));
    setCaptionItem(item);
  };

  const sharePickerItem = async () => {
    if (!captionItem || sharingKey) return;
    const item = captionItem;
    setSharingKey(item.key);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSharingKey(null); return; }

    const shareType = item.complete ? "certificate" : "story_progress";

    let shareImg = "";
    if (shareType === "certificate") {
      const certUrl = await generateCertificateImageUrl(item.childName, item.childLanguage);
      if (certUrl) shareImg = certUrl;
    }
    if (!shareImg) {
      const raw = item.coverUrl ? getStorageUrl(item.coverUrl) : null;
      if (raw && raw.startsWith("http")) shareImg = raw;
    }

    const { error } = await supabase.from("creations").insert({
      parent_id: user.id,
      child_id: item.childId,
      child_name: item.childName,
      description: captionText.trim() || defaultCaption(item),
      type: shareType,
      status: "approved",
      is_public: true,
      image_url: shareImg,
    });

    if (error) console.error("[sharePickerItem]", error.message);
    setSharingKey(null);
    setCaptionItem(null);
    setCaptionText("");
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
        <div className="mb-5">
          <FilterTabs active={filter} onChange={f => { setFilter(f); }} />
        </div>

        {/* ── FEED ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-2">
            {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-[520px] rounded-2xl" />)}
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
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background:"var(--nimi-green)" }} />
                <p className="font-black text-ds-text text-[13px] uppercase tracking-wider">
                  Recently Shared
                </p>
              </div>
              <span className="text-ds-muted text-[12px] font-semibold bg-ds-card border border-ds-border px-2.5 py-1 rounded-full">
                {visible.length} post{visible.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                  className="relative rounded-2xl overflow-hidden cursor-pointer group bg-ds-card border-2 border-dashed border-ds-border"
                  style={{ minHeight: "520px" }}
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
                      className="w-16 h-16 rounded-2xl bg-ds-card border-2 border-ds-border flex items-center justify-center shadow-ds-card"
                    >
                      <span className="text-3xl">🚀</span>
                    </motion.div>
                    <div>
                      <p className="font-baloo font-black text-ds-text text-[16px]">
                        Your turn!
                      </p>
                      <p className="font-nunito text-ds-muted text-[12px] mt-1 leading-relaxed">
                        Finish a story or challenge<br/>and your post appears here ✨
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 bg-gradient-to-r ${v.zoneGradients.communitySquare} text-white font-black text-[12px] px-4 py-2 rounded-full shadow-md`}>
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
      <ShareFAB onClick={openPicker} cv={v} />

      {/* ── Share picker sheet ──────────────────────────────────── */}
      <SharePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        items={pickerItems}
        loading={pickerLoading}
        sharingKey={sharingKey}
        onSelect={handleSelectForCaption}
        cv={v}
      />

      {/* ── Caption editor sheet ────────────────────────────────── */}
      <CaptionSheet
        item={captionItem}
        caption={captionText}
        onCaptionChange={setCaptionText}
        onPost={sharePickerItem}
        onBack={() => setCaptionItem(null)}
        posting={!!sharingKey}
        cv={v}
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
