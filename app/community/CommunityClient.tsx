"use client";

import React, { useState, useEffect, useCallback, useRef, RefObject } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ArrowLeft, Loader2, Flame, Plus, Sparkles, Crown } from "lucide-react";
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
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { Creation } from "@/components/community/types";
import { getStoryLibrary } from "@/lib/storyRepository";
import { generateCertificateImageUrl } from "@/lib/certificateImage";
import { getActiveSubscription } from "@/lib/payments/products";

const PAGE_SIZE = 20;
const HOT_THRESHOLD = 8;

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(dateStr: string, t: (k: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return t("communityJustNow");
  if (m < 60) return `${m}${t("communityTimeMinAgo")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t("communityTimeHourAgo")}`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}${t("communityTimeDayAgo")}` : `${Math.floor(d / 7)}${t("communityTimeWeekAgo")}`;
}

type CreationRow = { id: string; parent_id?: string | null; child_name?: string | null; child_avatar_url?: string | null; age?: number | null; description?: string | null; image_url?: string | null; likes?: { user_id: string }[] | null; type?: string | null; status?: string | null; created_at: string };

interface PickerItem {
  key: string;
  childId: string;
  childName: string;
  childAvatar: string;
  childLanguage: string;
  childAge: number | null;
  storyTitle: string;
  storySlug: string;
  coverUrl: string | null;
  themeEmoji: string | null;
  complete: boolean;
  progress: number;
}

function mapCreation(c: CreationRow, uid: string): Creation {
  return {
    id: c.id,
    parentId: c.parent_id ?? undefined,
    childName: c.child_name || "Friend",
    childAvatar: c.child_avatar_url ?? undefined,
    age: c.age ?? 0,
    description: c.description ?? undefined,
    imageUrl: c.image_url ?? "",
    likes: c.likes?.length || 0,
    likedByUser: c.likes?.some(l => l.user_id === uid) || false,
    isPublic: true,
    type: c.type || "art",
    createdAt: c.created_at,
    status: (c.status ?? "approved") as Creation["status"],
  };
}

// ── Type metadata ───────────────────────────────────────────────
const TYPE_META: Record<string, { emoji: string; labelKey: string; pill: string; gradient: string }> = {
  certificate:   { emoji:"🏆", labelKey:"communityTypeStoryComplete",  pill:"bg-amber-500",  gradient:"from-amber-400 to-orange-500"   },
  story:         { emoji:"🏆", labelKey:"communityTypeStoryComplete",  pill:"bg-amber-500",  gradient:"from-amber-400 to-orange-500"   },
  story_progress:{ emoji:"📖", labelKey:"communityTypeOnAdventure",    pill:"bg-sky-500",    gradient:"from-sky-400 to-blue-500"       },
  challenge:     { emoji:"💪", labelKey:"communityTypeChallengeDone",  pill:"bg-blue-500",   gradient:"from-blue-500 to-indigo-600"    },
  sticker:       { emoji:"⭐", labelKey:"communityTypeStarEarned",     pill:"bg-yellow-500", gradient:"from-yellow-400 to-amber-500"   },
  art:           { emoji:"🎨", labelKey:"communityTypeArtwork",        pill:"bg-fuchsia-500",gradient:"from-fuchsia-500 to-violet-600" },
  coloring:      { emoji:"🖍️", labelKey:"communityTypeColoring",       pill:"bg-purple-500", gradient:"from-purple-500 to-pink-500"   },
};
const fallbackMeta = { emoji:"✨", labelKey:"communityTypeMoment", pill:"bg-gray-400", gradient:"from-gray-400 to-slate-500" };

// ── Filters ─────────────────────────────────────────────────────

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
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Pending review", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Live",           cls: "bg-[var(--ds-brand-soft)] text-[var(--ds-text-brand)] border-[var(--ds-border-brand)]" },
  rejected: { label: "Rejected",       cls: "bg-red-100 text-red-600 border-red-200" },
  reported: { label: "Under review",   cls: "bg-orange-100 text-orange-600 border-orange-200" },
};

function CreationCard({
  creation, index, onCheer, onReport, isOwn, showStatus,
}: {
  creation: Creation;
  index: number;
  onCheer: (id: string) => void;
  onReport: (id: string) => void;
  isOwn: boolean;
  showStatus?: boolean;
}) {
  const { t } = useLanguage();
  const [bursting, setBursting] = useState(false);
  const meta = TYPE_META[creation.type] ?? fallbackMeta;

  const imgUrl = creation.imageUrl
    ? (creation.imageUrl.startsWith("/") || creation.imageUrl.startsWith("http")
        ? creation.imageUrl : getStorageUrl(creation.imageUrl))
    : null;
  const hasImg = !!(imgUrl && imgUrl.startsWith("http") && !imgUrl.endsWith(".svg"));
  const isHot  = creation.likes >= HOT_THRESHOLD;
  const isProgress = creation.type === "story_progress";
  const progressPct = isProgress
    ? parseInt(creation.description?.match(/(\d+)%/)?.[1] ?? "0")
    : 0;
  const circumference = 2 * Math.PI * 40;

  const AVATAR_GRADIENTS = [
    "from-violet-500 to-purple-600", "from-pink-500 to-rose-600",
    "from-blue-500 to-indigo-600",   "from-[#C9A84C] to-[#F5C842]",
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
            : <span className="text-base">{avatarInitial}</span>
          }
        </div>

        {/* Name + timestamp + status badge */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-ds-text text-sm leading-tight truncate">{creation.childName}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-ds-muted text-2xs font-medium">{timeAgo(creation.createdAt, t)}</p>
            {showStatus && creation.status && STATUS_BADGE[creation.status] && (
              <span className={`text-4xs font-black px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[creation.status].cls}`}>
                {STATUS_BADGE[creation.status].label}
              </span>
            )}
          </div>
        </div>

        {/* Type badge */}
        <span className={`shrink-0 flex items-center gap-1.5 ${meta.pill} text-white text-3xs font-black px-3 py-1.5 rounded-full shadow-sm`}>
          <span className="text-2xs leading-none">{meta.emoji}</span>
          {t(meta.labelKey)}
        </span>

        {/* Actions — report button (own posts have no client-side delete) */}
        {!isOwn && (
          <div className="flex items-center gap-1 transition-all ml-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={e => { e.stopPropagation(); onReport(creation.id); }}
              title="Report post"
              className="w-7 h-7 rounded-full flex items-center justify-center text-2xs text-ds-muted hover:bg-ds-border transition-all"
            >🚩</button>
          </div>
        )}
      </div>

      {/* ── IMAGE ── */}
      <div className="relative w-full overflow-hidden bg-ds-border" style={{ aspectRatio:"4/3" }}>
        {isProgress ? (
          /* Story-progress: horizontal layout for 4:3 landscape frame */
          <div className="absolute inset-0 flex items-center justify-center gap-6 px-6" style={{ background: "linear-gradient(135deg, #06101F 0%, #0D1E3A 50%, #1A3558 100%)" }}>
            {/* Cover thumbnail */}
            <div className="shrink-0">
              {hasImg ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl border-[3px] border-white/40">
                  <img src={imgUrl!} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl border-[3px] border-white/40 bg-[var(--ds-surface-card)]/20 flex items-center justify-center">
                  {creation.childAvatar
                    ? <ChildAvatar avatarUrl={creation.childAvatar} name={creation.childName} size={80} className="w-full h-full" />
                    : <span className="text-4xl">📖</span>
                  }
                </div>
              )}
            </div>
            {/* Progress ring */}
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progressPct / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-black text-xl leading-none">{progressPct}%</span>
                <span className="text-white/70 text-4xs font-semibold mt-0.5">{t("communityProgressDone")}</span>
              </div>
            </div>
          </div>
        ) : hasImg ? (
          <img
            src={imgUrl!}
            alt={creation.description ?? `${creation.childName}'s creation`}
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
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
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-orange-500 text-white text-3xs font-black px-2 py-0.5 rounded-full shadow-md">
            <Flame className="w-3 h-3 fill-white" strokeWidth={0} /> {t("communityHot")}
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 pt-3 pb-4">
        {creation.description && (
          <p className="text-ds-text text-sml leading-relaxed line-clamp-2 mb-3">
            {creation.description}
          </p>
        )}

        {/* Cheer row — hidden for own non-approved posts and own approved posts */}
        {showStatus && creation.status !== "approved" ? (
          <p className="text-ds-muted text-2xs font-semibold text-center py-2">
            {creation.status === "pending" ? "⏳ Awaiting admin review before going live" :
             creation.status === "reported" ? "🔍 Being reviewed by our team" :
             "This post has been removed from the community."}
          </p>
        ) : isOwn ? null : (
        <div className="relative flex items-center gap-2">
          <AnimatePresence>
            {bursting && <CheerBurst key="burst" onDone={() => setBursting(false)} />}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale:0.93 }}
            onClick={handleCheer}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sml font-black transition-all duration-200 ${
              creation.likedByUser
                ? "shadow-md"
                : "bg-ds-page border border-ds-border text-ds-muted"
            }`}
            style={creation.likedByUser
              ? { background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F", boxShadow: "0 4px 16px rgba(201,168,76,0.30)" }
              : {}}
          >
            <motion.span
              className="text-mbase leading-none"
              animate={creation.likedByUser ? { scale:[1,1.5,1], rotate:[0,-15,15,0] } : {}}
              transition={{ duration:0.35 }}
            >
              {creation.likedByUser ? "🎉" : "👏"}
            </motion.span>
            <span>{creation.likedByUser ? t("communityCheered") : t("communityCheer")}</span>
            {creation.likes > 0 && (
              <motion.span
                key={creation.likes}
                initial={{ scale:1.4, opacity:0 }}
                animate={{ scale:1, opacity:1 }}
                className="text-2xs font-black min-w-[20px] text-center px-1.5 py-0.5 rounded-full"
                style={creation.likedByUser
                  ? { background:"rgba(255,255,255,0.22)", color:"#07111F" }
                  : { background:"rgba(255,255,255,0.15)", color:"rgba(240,232,212,0.70)" }
                }
              >
                {creation.likes}
              </motion.span>
            )}
          </motion.button>
        </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Report modal ─────────────────────────────────────────────────
function ReportModal({ onSubmit, onCancel }: { onSubmit: (r: string) => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const REASONS = [
    { emoji:"😟", labelKey:"communityReportReason1" },
    { emoji:"🚫", labelKey:"communityReportReason2" },
    { emoji:"😢", labelKey:"communityReportReason3" },
    { emoji:"❓", labelKey:"communityReportReason4" },
  ];
  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <motion.div
          initial={{ opacity:0, y:60 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:40 }}
          transition={{ type:"spring", stiffness:340, damping:30 }}
          className="w-full sm:max-w-sm bg-ds-card shadow-2xl p-6 pb-8 sm:pb-6 border border-ds-border rounded-t-3xl sm:leaf-lg sm:mx-4"
        >
          <div className="w-10 h-1 bg-ds-border rounded-full mx-auto mb-5 sm:hidden" />
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🚩</span>
            </div>
            <h3 className="font-black text-ds-text text-lg">{t("communityReportTitle")}</h3>
            <p className="text-ds-muted text-xs mt-1">{t("communityReportSubtitle")}</p>
          </div>
          <div className="space-y-2 mb-5">
            {REASONS.map(r => (
              <button key={r.labelKey} onClick={() => setReason(r.labelKey)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                  reason === r.labelKey
                    ? "border-red-200 bg-red-50"
                    : "border-transparent bg-ds-border/30 hover:bg-ds-border/60"
                }`}
              >
                <span className="text-xl">{r.emoji}</span>
                <span className={`font-bold text-sml ${reason === r.labelKey ? "text-red-600" : "text-ds-text"}`}>
                  {t(r.labelKey)}
                </span>
                {reason === r.labelKey && (
                  <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                    className="ml-auto w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-3xs font-black">✓</span>
                  </motion.div>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <button onClick={onCancel}
              className="flex-1 bg-ds-border/40 text-ds-muted font-black text-sm py-3 rounded-2xl hover:bg-ds-border/70 transition">
              {t("communityCancel")}
            </button>
            <button onClick={() => reason && onSubmit(reason)} disabled={!reason}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black text-sm py-3 rounded-2xl shadow-md disabled:opacity-30 transition">
              {t("communityReport")}
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
      <div className="w-12 h-12 rounded-xl shrink-0 bg-[var(--ds-border-primary)]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 rounded-lg bg-[var(--ds-border-primary)]" />
        <div className="h-2.5 w-2/5 rounded-lg bg-[var(--ds-border-primary)] opacity-60" />
      </div>
      <div className="w-20 h-8 rounded-xl shrink-0 bg-[var(--ds-border-primary)]" />
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
  open, onClose, items, loading, sharingKey, onSelect: onShare, allShared, cv,
}: {
  open: boolean;
  onClose: () => void;
  items: PickerItem[];
  loading: boolean;
  sharingKey: string | null;
  onSelect: (item: PickerItem) => void;
  allShared: boolean;
  cv: ComponentVariant;
}) {
  const { t } = useLanguage();
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
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--ds-surface-card)]/10 pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-[var(--ds-surface-card)]/8 pointer-events-none" />

              {/* Pull handle */}
              <div className="w-10 h-1.5 bg-[var(--ds-surface-card)]/40 rounded-full mx-auto mt-3 mb-0" />

              <div className="flex items-center justify-between px-5 pt-4 pb-5">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-12 h-12 rounded-2xl bg-[var(--ds-surface-card)]/20 border border-white/30 flex items-center justify-center text-2.5xl shadow-md"
                  >🚀</motion.div>
                  <div>
                    <h3 className="font-baloo font-black text-white text-xl leading-tight drop-shadow-sm">
                      {t("communityShareTitle")}
                    </h3>
                    <p className="text-white/70 text-xs font-semibold mt-0.5">
                      {t("communityShareSubtitle")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-[var(--ds-surface-card)]/20 border border-white/30 flex items-center justify-center text-white text-sm font-black hover:bg-[var(--ds-surface-card)]/30 transition-colors shrink-0"
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
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                    className="text-7xl mb-5"
                  >{allShared ? "🌟" : "📖"}</motion.div>
                  <p className="font-baloo font-black text-ds-text text-xl">
                    {allShared ? t("communityAllCaughtUp") : t("communityNoAdventures")}
                  </p>
                  <p className="text-ds-muted text-sml mt-2 leading-relaxed max-w-[240px]">
                    {allShared ? t("communityAllSharedDesc") : t("communityNoAdventuresDesc")}
                  </p>
                  {allShared && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-ds-border bg-ds-card"
                    >
                      <span className="text-lg">🎓</span>
                      <p className="text-ds-text text-xs font-black">{t("communityNewStoriesUnlock")}</p>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-2">
                  {items.map((item, i) => {
                    const isSharing = sharingKey === item.key;
                    const coverSrc = item.coverUrl ? getStorageUrl(item.coverUrl) : null;
                    const pct = Math.round(item.progress * 100);
                    const done = item.complete;

                    return (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.045, type: "spring", stiffness: 300, damping: 26 }}
                        className="rounded-2xl overflow-hidden border border-ds-border bg-ds-card"
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          {/* Cover */}
                          <div className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-xl shadow-sm bg-gradient-to-br ${done ? "from-[#C9A84C] to-[#F5C842]" : "from-amber-200 to-yellow-300"}`}>
                            {coverSrc
                              ? <img src={coverSrc} alt={item.storyTitle} className="w-full h-full object-cover" />
                              : <span>{item.themeEmoji ?? "📖"}</span>
                            }
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-ds-text text-sml leading-snug truncate">{item.storyTitle}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 bg-ds-border">
                                <ChildAvatar avatarUrl={item.childAvatar} name={item.childName} size={16} className="w-full h-full" />
                              </div>
                              <span className="text-ds-muted text-2xs font-semibold truncate">{item.childName}</span>
                              <span className={`text-3xs font-black px-1.5 py-0.5 rounded-full ${done ? "bg-amber-50 text-amber-600" : ""}`}
                                style={!done ? { background: "rgba(201,168,76,0.15)", color: "#C9A84C" } : {}}>
                                {done ? "🏆" : `${pct}%`}
                              </span>
                            </div>
                            {!done && (
                              <div className="mt-1 h-1 bg-ds-border rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(to right,#F5C842,#C9A84C)" }} />
                              </div>
                            )}
                          </div>

                          {/* Post button */}
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => onShare(item)}
                            disabled={!!sharingKey}
                            className={`shrink-0 flex items-center justify-center gap-1 font-black text-2xs px-3 py-1.5 rounded-xl disabled:opacity-40 bg-gradient-to-r ${done ? `${cv.zoneGradients.communitySquare} text-white` : "from-amber-400 to-amber-500 text-amber-950"}`}
                          >
                            {isSharing
                              ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              : <>{done ? "🏆" : "⭐"} {t("communityPost")}</>
                            }
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
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
  const { t } = useLanguage();
  const [consentChecked, setConsentChecked] = useState(false);
  // Reset consent each time a new item is opened
  const prevItemKey = useRef<string | null>(null);
  if (item?.key !== prevItemKey.current) {
    prevItemKey.current = item?.key ?? null;
    if (consentChecked) setConsentChecked(false);
  }
  const coverSrc = item?.coverUrl ? getStorageUrl(item.coverUrl) : null;
  const remaining = CAPTION_MAX - caption.length;

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-nav backdrop-blur-sm"
            onClick={onBack}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-nav rounded-t-[28px] shadow-[0_-16px_56px_rgba(0,0,0,0.35)]"
            style={{ background: "var(--ds-surface-card)" }}
          >
            {/* Pull handle */}
            <div className="w-10 h-1.5 bg-ds-border rounded-full mx-auto mt-3" />

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-ds-page border border-ds-border flex items-center justify-center text-ds-muted hover:text-ds-text transition-all shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-black text-ds-text text-lg leading-tight">{t("communityAddCaption")}</h3>
            </div>

            {/* Story preview */}
            <div className="mx-5 mb-4 rounded-2xl overflow-hidden border border-ds-border flex" style={{ background: "var(--ds-surface-card)" }}>
              <div className={`w-20 h-24 shrink-0 relative overflow-hidden flex items-center justify-center text-3xl bg-gradient-to-br ${item.complete ? "from-[#0D1E3A] to-[#1A3558]" : "from-amber-400 to-orange-500"}`}>
                {coverSrc
                  ? <img src={coverSrc} alt={item.storyTitle} className="w-full h-full object-cover" />
                  : <span className="drop-shadow">{item.themeEmoji ?? "📖"}</span>
                }
              </div>
              <div className="flex-1 px-3.5 py-3 flex flex-col justify-between min-w-0">
                <div>
                  <p className="font-black text-ds-text text-sm leading-snug truncate">{item.storyTitle}</p>
                  <p className="text-ds-muted text-xs font-medium mt-0.5">{item.childName}</p>
                </div>
                <span className={`self-start inline-flex items-center gap-1 text-3xs font-black px-2.5 py-1 rounded-full ${item.complete ? "bg-amber-100 text-amber-700" : ""}`}
                  style={!item.complete ? { background: "rgba(201,168,76,0.15)", color: "#C9A84C" } : {}}>
                  {item.complete ? t("communityCompleted") : `📖 ${Math.round(item.progress * 100)}${t("communityThrough")}`}
                </span>
              </div>
            </div>

            {/* Textarea with inline counter */}
            <div className="mx-5 mb-4 relative">
              <textarea
                value={caption}
                onChange={e => onCaptionChange(e.target.value.slice(0, CAPTION_MAX))}
                rows={3}
                placeholder={t("communityCaptionPlaceholder")}
                className="w-full bg-ds-page border border-ds-border rounded-2xl px-4 py-3 pb-8 text-ds-text text-sm leading-relaxed resize-none focus:outline-none focus:border-[var(--ds-border-brand)] transition-colors placeholder:text-ds-muted"
              />
              <span className={`absolute bottom-3 right-4 text-2xs font-semibold pointer-events-none ${remaining < 30 ? "text-orange-500" : "text-ds-muted"}`}>
                {remaining}
              </span>
            </div>

            {/* Consent checkbox */}
            <div className="mx-5 mb-4 flex items-start gap-3">
              <input
                id="community-consent"
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-[#C9A84C] cursor-pointer"
              />
              <label htmlFor="community-consent" className="text-ds-muted text-xs leading-relaxed cursor-pointer select-none">
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#C9A84C" }}>
                  Terms of Use
                </a>{" "}
                and confirm I have the right to share this content on Nimipiko.
              </label>
            </div>

            {/* Post button */}
            <div className="px-5 pb-8">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onPost}
                disabled={posting || caption.trim().length === 0 || !consentChecked}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-base text-white shadow-lg disabled:opacity-50 bg-gradient-to-r ${cv.zoneGradients.communitySquare}`}
              >
                {posting
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {t("communityPosting")}</>
                  : <><span className="text-lg">🚀</span> {t("communityPostToCommunity")}</>
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
  const { t } = useLanguage();
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.7 }}
      whileHover={{ scale: 1.06, y: -2 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={`fixed bottom-[100px] right-4 z-40 flex items-center gap-2 sm:gap-2.5 pl-3 pr-4 sm:pl-4 sm:pr-5 py-2.5 sm:py-3.5 rounded-2xl text-white font-baloo font-black text-sml sm:text-sm shadow-[0_8px_28px_rgba(5,150,105,0.45)] bg-gradient-to-br ${cv.zoneGradients.communitySquare}`}
      aria-label="Share your adventure"
    >
      {/* Pulse ring */}
      <motion.span
        className={`absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-br ${cv.zoneGradients.communitySquare}`}
        animate={{ scale: [1, 1.22, 1.22], opacity: [0.55, 0, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
      />
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[var(--ds-surface-card)]/20 flex items-center justify-center shrink-0">
        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
      </div>
      <span className="relative">{t("communityShareFAB")}</span>
      <span className="text-mbase sm:text-mlg leading-none">⭐</span>
    </motion.button>
  );
}

// ── Main ─────────────────────────────────────────────────────────
interface Props {
  initialUserId?: string;
  initialHasSubscription?: boolean;
}

export default function CommunityClient({ initialUserId, initialHasSubscription }: Props = {}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const v = getComponentVariant(themeId);

  const [creations, setCreations]     = useState<Creation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [page, setPage]               = useState(0);
  const pageRef                       = useRef(0);
  const [userId, setUserId]           = useState("");
  const [hasSubscription, setHasSubscription] = useState(false);
  const [friends, setFriends]         = useState<{ name: string; avatar: string }[]>([]);
  const [liking, setLiking]           = useState<Record<string, boolean>>({});
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [totalCount, setTotalCount]   = useState(0);
  const [communityTotal, setCommunityTotal] = useState(0);
  const [toast, setToast]             = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Filters
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [myPostsOnly, setMyPostsOnly] = useState(false);

  // Share picker
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [pickerItems, setPickerItems]   = useState<PickerItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [sharingKey, setSharingKey]     = useState<string | null>(null);
  const [allShared, setAllShared]       = useState(false);

  // Caption editor
  const [captionItem, setCaptionItem]   = useState<PickerItem | null>(null);
  const [captionText, setCaptionText]   = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Debounce search input by 400 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    void (async () => {
      // Fetch unfiltered community total once for the hero stat
      const { count } = await supabase
        .from("creations")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .eq("is_public", true);
      setCommunityTotal(count ?? 0);

      if (initialUserId !== undefined) {
        setUserId(initialUserId);
        setHasSubscription(!!initialHasSubscription);
        const { data } = await supabase.from("children").select("name, avatar_url").order("created_at");
        if (data) setFriends(data.map((c: { name: string | null; avatar_url: string | null }) => ({ name: c.name ?? "Friend", avatar: c.avatar_url || "🌟" })));
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const [{ data }, sub] = await Promise.all([
        supabase.from("children").select("name, avatar_url").order("created_at"),
        user ? getActiveSubscription(user.id) : Promise.resolve(null),
      ]);
      if (user) {
        setUserId(user.id);
        setHasSubscription(!!sub);
      }
      if (data) setFriends(data.map((c: { name: string | null; avatar_url: string | null }) => ({ name: c.name ?? "Friend", avatar: c.avatar_url || "🌟" })));
    })();
  }, []);

  const fetchCreations = useCallback(async (pageNum: number, refresh: boolean) => {
    if (refresh) {
      setIsRefreshing(creations.length > 0);
      setLoading(creations.length === 0);
      pageRef.current = 0;
      setPage(0);
    }
    const from = pageNum * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let q = supabase
      .from("creations")
      .select(`id, parent_id, child_name, child_avatar_url, age, description, image_url, type, status, created_at, likes:likes(id, user_id)`, { count: "exact" });

    if (myPostsOnly && userId) {
      q = q.eq("parent_id", userId);
    } else {
      q = q.eq("status", "approved").eq("is_public", true);
    }

    // "certificate" filter includes legacy "story" type rows — both render identically
    if (typeFilter === "certificate") {
      q = q.or("type.eq.certificate,type.eq.story");
    } else if (typeFilter !== "all") {
      q = q.eq("type", typeFilter);
    }

    if (debouncedSearch.trim()) {
      const s = debouncedSearch.trim();
      q = q.or(`description.ilike.%${s}%,child_name.ilike.%${s}%`);
    }

    const { data, count } = await q.order("created_at", { ascending: false }).range(from, to);

    const mapped = (data ?? [])
      .filter(c => {
        const url = (c.image_url as string | null) ?? "";
        return !url.startsWith("/") && !url.startsWith("assets/");
      })
      .map(c => mapCreation(c as CreationRow, userId));
    setCreations(prev => refresh ? mapped : [...prev, ...mapped]);
    if (refresh) setTotalCount(count ?? 0);
    setHasMore((count || 0) > to + 1);
    pageRef.current = pageNum;
    setLoading(false);
    setIsRefreshing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, myPostsOnly, typeFilter, debouncedSearch]);

  useEffect(() => { void fetchCreations(0, true); }, [fetchCreations]);

  // Realtime cheer notifications — watch likes inserted on own posts
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("community-cheers")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "likes" }, payload => {
        const creationId = (payload.new as { creation_id: string; user_id: string }).creation_id;
        const likerId    = (payload.new as { creation_id: string; user_id: string }).user_id;
        if (likerId === userId) return; // ignore own cheer
        setCreations(prev => {
          const post = prev.find(c => c.id === creationId && c.parentId === userId);
          if (post) showToast(t("communityToastCheered").replace("{name}", post.childName));
          return prev;
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useInfiniteScroll(observerTarget as RefObject<HTMLElement>, () => {
    if (!loading && hasMore) {
      const n = pageRef.current + 1;
      pageRef.current = n;
      setPage(n);
      void fetchCreations(n, false);
    }
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
    const id = reportingId;
    setReportingId(null);
    const snapshot = creations;
    setCreations(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase
      .from("creations")
      .update({ status: "reported", report_reason: reason })
      .eq("id", id);
    if (error) {
      setCreations(snapshot);
      showToast("Couldn't submit report — please try again.");
    } else {
      showToast(t("communityReportConfirm"));
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      // Fetch already-shared story keys for this parent (reliable dedup via story_key column)
      const { data: existing } = await supabase
        .from("creations")
        .select("story_key")
        .eq("parent_id", userId)
        .not("story_key", "is", null);

      const alreadyShared = new Set((existing ?? []).map((r: { story_key: string }) => r.story_key));

      const { data: kids } = await supabase
        .from("children")
        .select("id, name, avatar_url, language, age");

      // Load all children's story libraries in parallel
      const kidList = (kids ?? []) as { id: string; name: string | null; avatar_url: string | null; language: string | null; age: number | null }[];
      const libs = await Promise.all(
        kidList.map(kid => getStoryLibrary(kid.id, (kid.language ?? "en") as Language))
      );

      const all: PickerItem[] = [];
      for (let i = 0; i < kidList.length; i++) {
        const kid  = kidList[i];
        const lang = (kid.language ?? "en") as Language;
        const lib  = libs[i];
        const started = lib.filter(s => {
          if (!s.complete && s.progress <= 0) return false;
          return !alreadyShared.has(`${kid.id}-${s.sid}`);
        });
        for (const s of started) {
          all.push({
            key: `${kid.id}-${s.sid}`,
            childId: kid.id,
            childName: kid.name ?? "Friend",
            childAvatar: kid.avatar_url ?? "🌟",
            childLanguage: lang,
            childAge: kid.age ?? null,
            storyTitle: s.title,
            storySlug: s.slug,
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
      // Were there started stories that got filtered out by dedup?
      setAllShared(all.length === 0 && alreadyShared.size > 0);
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
      ? t("communityDefaultCaptionComplete").replace("{name}", item.childName).replace("{title}", item.storyTitle)
      : t("communityDefaultCaptionProgress").replace("{name}", item.childName).replace("{pct}", String(pct)).replace("{title}", item.storyTitle);
  };

  const handleSelectForCaption = (item: PickerItem) => {
    setCaptionText(defaultCaption(item));
    setCaptionItem(item);
  };

  const sharePickerItem = async () => {
    if (!captionItem || sharingKey || !userId) return;
    const item = captionItem;
    setSharingKey(item.key);

    const shareType = item.complete ? "certificate" : "story_progress";

    let shareImg = "";
    if (shareType === "certificate") {
      const certUrl = await generateCertificateImageUrl(item.childName, item.childLanguage, item.childId, item.storySlug);
      if (certUrl) shareImg = certUrl;
    }
    if (!shareImg) {
      const raw = item.coverUrl ? getStorageUrl(item.coverUrl) : null;
      if (raw && raw.startsWith("http")) shareImg = raw;
    }

    const { error } = await supabase.from("creations").insert({
      parent_id:        userId,
      child_id:         item.childId,
      child_name:       item.childName,
      child_avatar_url: item.childAvatar ?? null,
      age:              item.childAge ?? null,
      story_key:        item.key,
      description:      captionText.trim() || defaultCaption(item),
      type:             shareType,
      status:           "pending",
      is_public:        false,
      image_url:        shareImg,
    });

    if (error) { console.error("[sharePickerItem]", error.message); }
    else { showToast(t("communityToastPosted").replace("{name}", item.childName)); }
    setSharingKey(null);
    setCaptionItem(null);
    setCaptionText("");
    setPickerOpen(false);
    setPage(0);
    void fetchCreations(0, true);
  };

  const visible = creations;

  return (
    <AppShell>
      <main className="max-w-4xl mx-auto px-3 py-4 sm:px-4 lg:px-6 pb-24 w-full content-enter">

        {/* ── HERO ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden -mx-3 sm:-mx-4 lg:-mx-6 -mt-4 mb-5" style={{ minHeight: 260, background:"#5ec8f0" }}>
          {/* Zone-specific background — community scene with Nimi + kids */}
          <img src="/community-header.png" alt="" aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-center select-none pointer-events-none" />
          {/* Strong left mask so text is always readable */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(95deg,rgba(255,255,255,.96) 0%,rgba(255,255,255,.82) 42%,rgba(255,255,255,.30) 62%,transparent 78%)" }} />
          <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
            style={{ background: "linear-gradient(to top, #f8f2e7, transparent)" }} />

          {/* Left content */}
          <div className="relative z-10 flex min-h-[260px] flex-col justify-end px-5 pb-10 pt-8 sm:px-10" style={{ maxWidth: "62%" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-baloo text-[11px] font-black -rotate-1"
                style={{ background:"#ffd331", color:"#092d78" }}>
                {t("communityEyebrow")} 👥
              </span>
              {communityTotal > 0 && (
                <span className="flex items-center gap-1 text-[#082b78] text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm"
                  style={{ background:"rgba(255,255,255,0.9)", border:"1px solid #c8d9ef" }}>
                  <Sparkles className="w-3 h-3 text-[#ffc400]" /> {communityTotal}
                </span>
              )}
            </div>
            <h1 className="font-baloo font-black text-[#0e368b] leading-tight"
              style={{ fontSize: "clamp(1.7rem,4.5vw,2.5rem)", textShadow:"0 2px 0 rgba(255,255,255,0.95)" }}>
              {t("communityHeroTitle")}
            </h1>
            <p className="mt-1 font-baloo font-bold text-[14px] text-[#123a87]"
              style={{ textShadow:"0 1px 0 rgba(255,255,255,0.85)" }}>
              {t("communityHeroSubtitle")}
            </p>
            <div className="mt-2 h-[3px] w-40 -rotate-[3deg] rounded-full bg-[#ffc400]" />
            {friends.length > 0 && (
              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  {friends.slice(0, 5).map((f, i) => {
                    const FRIEND_GRADS = [
                      "from-violet-400 to-purple-500","from-pink-400 to-rose-500",
                      "from-blue-400 to-indigo-500","from-emerald-400 to-teal-500",
                      "from-amber-400 to-orange-500",
                    ];
                    const grad = FRIEND_GRADS[f.name.charCodeAt(0) % FRIEND_GRADS.length];
                    return (
                      <motion.div key={f.name + i}
                        initial={{ scale:0, opacity:0 }}
                        animate={{ scale:1, opacity:1 }}
                        transition={{ delay:0.06 + i * 0.045, type:"spring", stiffness:380 }}
                        className={`w-7 h-7 rounded-full border-2 border-white overflow-hidden flex items-center justify-center font-bold text-white shadow-md bg-gradient-to-br ${grad}`}
                        title={f.name}
                      >
                        <ChildAvatar avatarUrl={f.avatar} name={f.name} size={28} className="w-full h-full" />
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-[#123a87] text-xs font-bold" style={{ textShadow:"0 1px 0 rgba(255,255,255,.85)" }}>
                  {friends.length} {t("communityLearnerCount")}
                </p>
              </div>
            )}
          </div>
          {/* No character overlay — Nimi & kids are in the photo */}
        </section>

        {/* ── FILTER BAR ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-5">
          {/* Row 1: search + My Posts toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="search"
                placeholder="Search posts…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-ds-card border border-ds-border rounded-2xl text-sml text-ds-text placeholder:text-ds-muted focus:outline-none focus:border-[var(--ds-border-brand)] transition-colors"
              />
            </div>
            <button
              onClick={() => { setMyPostsOnly(p => !p); setSearch(""); setTypeFilter("all"); }}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black border transition-all"
              style={myPostsOnly
                ? { background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F", borderColor: "rgba(201,168,76,0.50)" }
                : undefined}
            >
              <span className="text-sml">👤</span> My Posts
            </button>
          </div>

          {/* Row 2: type filter chips — fades right on mobile to hint scrollability */}
          <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {([
              { key: "all",           label: "All" },
              { key: "art",           label: "🎨 Art" },
              { key: "coloring",      label: "🖍️ Coloring" },
              { key: "certificate",   label: "🏆 Completed" },
              { key: "story_progress",label: "📖 In Progress" },
              { key: "challenge",     label: "💪 Challenge" },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className="shrink-0 px-3 py-1.5 rounded-full text-2xs font-black border transition-all whitespace-nowrap"
                style={typeFilter === f.key
                  ? { background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F", borderColor: "rgba(201,168,76,0.50)" }
                  : undefined}
              >{f.label}</button>
            ))}
          </div>
          {/* Right fade hint — hidden on desktop where all chips are visible */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[#f8f2e7] to-transparent sm:hidden" />
          </div>
        </div>

        {/* ── FEED ──────────────────────────────────────────────── */}
        {loading && creations.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="leaf-lg overflow-hidden border border-ds-border">
                <Bone className="w-full h-44 rounded-none" />
                <div className="p-4 space-y-2">
                  <Bone className="h-4 w-3/4" />
                  <Bone className="h-3 w-1/2" />
                  <div className="flex items-center gap-3 pt-1">
                    <Bone className="h-7 w-16 rounded-full" />
                    <Bone className="h-7 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !loading && creations.length === 0 ? (
          <motion.div
            initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
            className="border border-ds-border bg-ds-card leaf-lg px-6 py-16 text-center"
          >
            <motion.div
              animate={{ y:[0,-10,0] }} transition={{ duration:2.4, repeat:Infinity }}
              className="text-6xl mb-5"
            >
              {myPostsOnly ? "📭" : search || typeFilter !== "all" ? "🔍" : "🌟"}
            </motion.div>
            <h2 className="font-baloo font-black text-ds-text text-xl mb-2">
              {myPostsOnly ? "No posts yet" : search || typeFilter !== "all" ? "No results found" : t("communityEmptyTitle")}
            </h2>
            <p className="text-ds-muted text-sml max-w-[280px] mx-auto leading-relaxed mb-6">
              {myPostsOnly
                ? "Start reading a story, then tap the Share button below to celebrate your child's progress with the community!"
                : search || typeFilter !== "all"
                ? "Try a different search term or remove the filter to see all posts."
                : t("communityEmptyDesc")}
            </p>
            {myPostsOnly ? (
              <motion.button
                whileTap={{ scale:0.95 }}
                onClick={openPicker}
                className="inline-flex items-center gap-2 font-baloo font-black text-white text-sml px-5 py-2.5 rounded-2xl shadow-md"
                style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F" }}
              >
                <Plus className="w-4 h-4" strokeWidth={3} /> Share your first post ⭐
              </motion.button>
            ) : search || typeFilter !== "all" ? (
              <motion.button
                whileTap={{ scale:0.95 }}
                onClick={() => { setSearch(""); setTypeFilter("all"); }}
                className="inline-flex items-center gap-2 font-baloo font-black text-ds-muted text-sml px-5 py-2.5 rounded-2xl border border-ds-border"
              >
                Clear filters
              </motion.button>
            ) : (
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale:0.95 }}
                  onClick={() => router.push("/stories")}
                  className="inline-flex items-center gap-2 font-baloo font-black text-white text-sml px-5 py-2.5 rounded-2xl shadow-md"
                  style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F" }}
                >
                  {t("communityStartStory")} <span className="text-mbase">📖</span>
                </motion.button>
                <p className="text-ds-muted text-2xs">
                  Then tap the <strong>Share ⭐</strong> button to post here!
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 transition-opacity duration-200 ${isRefreshing ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
              <AnimatePresence mode="popLayout">
                {visible.map((c, i) => (
                  <React.Fragment key={c.id}>
                    <CreationCard
                      creation={c}
                      index={i}
                      onCheer={handleCheer}
                      onReport={setReportingId}
                      isOwn={c.parentId === userId}
                      showStatus={myPostsOnly}
                    />
                    {i === 3 && !hasSubscription && (
                      <motion.div
                        key="club-upsell"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="col-span-1 sm:col-span-2"
                      >
                        <a
                          href="/pricing"
                          className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl p-5 sm:p-6 shadow-ds-club overflow-hidden relative no-underline"
                          style={{ background: "linear-gradient(135deg, var(--ds-club-hover) 0%, var(--ds-club-primary) 100%)" }}
                        >
                          <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[var(--ds-surface-card)]/20 flex items-center justify-center shadow-inner">
                            <Crown className="w-8 h-8 sm:w-9 sm:h-9 text-yellow-300 drop-shadow" />
                          </div>
                          <div className="flex-1 text-center sm:text-left">
                            <p className="font-baloo font-black text-white text-mlg sm:text-xl leading-tight mb-0.5">
                              Share premium story achievements 👑
                            </p>
                            <p className="text-white/80 text-sml font-semibold leading-snug">
                              Club members can share certificate completions for all stories — including exclusive premium adventures.
                            </p>
                          </div>
                          <div className="shrink-0 mt-2 sm:mt-0">
                            <span className="inline-flex items-center gap-1.5 bg-[var(--ds-surface-card)] text-ds-club-text font-baloo font-black text-sml px-4 py-2 rounded-2xl shadow whitespace-nowrap">
                              <Crown className="w-3.5 h-3.5" /> Join Club
                            </span>
                          </div>
                        </a>
                      </motion.div>
                    )}
                  </React.Fragment>
                ))}
              </AnimatePresence>

              {/* "Be next!" CTA card */}
            </div>
          </>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={observerTarget} className="h-10 flex items-center justify-center mt-3">
          {!loading && hasMore && (
            <div className="flex items-center gap-2 text-ds-muted text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("communityLoadingMore")}
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
        allShared={allShared}
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

      {/* ── Toast ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed bottom-[140px] left-1/2 -translate-x-1/2 z-popover flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sml font-black whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F", boxShadow: "0 8px 24px rgba(201,168,76,0.40)" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
