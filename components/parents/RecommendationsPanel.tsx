"use client";

/**
 * RecommendationsPanel — Phase 4.3 (refactored for combined parent-ai route in fix #2)
 *
 * Display-only: accepts pre-fetched data from LearningBrainTab, which calls
 * /api/parent-ai once for both insights and recommendations. No internal fetch.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Bone } from "@/components/ui/Bone";
import type { ParentRecommendation, RecommendationCategory } from "@/lib/parentInsightBuilder";

// ── Visual identity per category ──────────────────────────────────────────────

interface CategoryStyle {
  emoji:   string;
  label:   string;
  bg:      string;
  border:  string;
  text:    string;
  ctaBg:   string;
  ctaText: string;
}

const CAT_STYLE: Record<RecommendationCategory, CategoryStyle> = {
  bedtime_story: {
    emoji:   "🌙",
    label:   "Bedtime Story",
    bg:      "bg-indigo-50",
    border:  "border-indigo-200",
    text:    "text-indigo-800",
    ctaBg:   "bg-indigo-100 hover:bg-indigo-200 border-indigo-300",
    ctaText: "text-indigo-700",
  },
  review_activity: {
    emoji:   "🎮",
    label:   "Practice Activity",
    bg:      "bg-amber-50",
    border:  "border-amber-200",
    text:    "text-amber-800",
    ctaBg:   "bg-amber-100 hover:bg-amber-200 border-amber-300",
    ctaText: "text-amber-700",
  },
  reading_habit: {
    emoji:   "📅",
    label:   "Reading Habit",
    bg:      "bg-emerald-50",
    border:  "border-emerald-200",
    text:    "text-emerald-800",
    ctaBg:   "bg-emerald-100 hover:bg-emerald-200 border-emerald-300",
    ctaText: "text-emerald-700",
  },
  supportive_action: {
    emoji:   "💬",
    label:   "Try Today",
    bg:      "bg-rose-50",
    border:  "border-rose-200",
    text:    "text-rose-800",
    ctaBg:   "bg-rose-100 hover:bg-rose-200 border-rose-300",
    ctaText: "text-rose-700",
  },
};

const CAT_ORDER: RecommendationCategory[] = [
  "supportive_action",
  "bedtime_story",
  "review_activity",
  "reading_habit",
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  recommendations: ParentRecommendation[];
  childName:       string;
  generatedAt:     string | null;
  loading:         boolean;
  error:           boolean;
  refreshing:      boolean;
  onRefresh:       () => void;
  insufficientData?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecommendationsPanel({
  recommendations, childName, generatedAt,
  loading, error, refreshing, onRefresh, insufficientData,
}: Props) {

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white border border-ds-border p-5 shadow-ds-card space-y-4" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <div className="flex items-center gap-2">
          <Bone className="w-7 h-7 rounded-lg" />
          <Bone className="h-5 w-44" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2 p-4 rounded-xl bg-gray-50 border border-ds-border">
            <div className="flex items-center gap-2">
              <Bone className="w-6 h-6 rounded-md" />
              <Bone className="h-3 w-20" />
            </div>
            <Bone className="h-4 w-3/4" />
            <Bone className="h-3 w-full" />
            <Bone className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // ── Not enough data ──────────────────────────────────────────────────────
  if (insufficientData) {
    return (
      <div className="bg-white border border-ds-border p-6 shadow-ds-card flex flex-col items-center gap-3 text-center" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <span className="text-4xl">🌱</span>
        <p className="font-black text-ds-text text-[16px]">Recommendations coming soon</p>
        <p className="text-gray-400 text-[13px] font-nunito max-w-xs">
          Once {childName} completes a story or reads with Nimi, tailored suggestions will appear here.
        </p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="font-black text-ds-text text-[15px]">Couldn&apos;t load recommendations</p>
          <p className="text-gray-400 text-[12px] font-nunito">Something went wrong. Try again in a moment.</p>
          <button
            onClick={onRefresh}
            className="mt-1 px-4 py-2 bg-ds-action text-white text-[13px] font-black rounded-full hover:opacity-90 transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  const relativeTime = generatedAt
    ? (() => {
        const mins = Math.round((Date.now() - new Date(generatedAt).getTime()) / 60_000);
        if (mins < 2)  return "just now";
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
      })()
    : null;

  const grouped: ParentRecommendation[][] = CAT_ORDER
    .map(cat => recommendations.filter(r => r.category === cat))
    .filter(group => group.length > 0);

  const remainder = recommendations.filter(r => !CAT_ORDER.includes(r.category));
  if (remainder.length > 0) grouped.push(remainder);

  let cardIndex = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-ds-border p-5 shadow-ds-card"
      style={{ borderRadius: "var(--leaf-r-lg)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-base shadow-sm shrink-0">
          💡
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-ds-text text-[17px] leading-tight">What You Can Do</h2>
          {relativeTime && (
            <p className="text-ds-muted text-[10px] font-semibold">Updated {relativeTime}</p>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh recommendations"
          className="shrink-0 w-8 h-8 rounded-full border border-ds-border bg-white flex items-center justify-center hover:bg-gray-50 transition disabled:opacity-40"
          aria-label="Refresh recommendations"
        >
          <span className={`text-base ${refreshing ? "animate-spin inline-block" : ""}`}>↻</span>
        </button>
      </div>

      {/* Recommendation cards */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {grouped.map(group =>
            group.map(rec => {
              const style = CAT_STYLE[rec.category];
              const idx   = cardIndex++;
              return (
                <motion.div
                  key={`${rec.category}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07, duration: 0.25 }}
                  className={`p-4 border rounded-xl ${style.bg} ${style.border}`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[15px] leading-none">{style.emoji}</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${style.text} opacity-70`}>
                      {style.label}
                    </span>
                  </div>
                  <p className={`font-black text-[14px] leading-snug mb-1.5 ${style.text}`}>
                    {rec.title}
                  </p>
                  <p className={`text-[12px] leading-relaxed font-nunito mb-3 ${style.text} opacity-80`}>
                    {rec.description}
                  </p>
                  <div className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${style.ctaBg} ${style.border}`}>
                    <span className="text-[13px] shrink-0 mt-0.5">→</span>
                    <p className={`text-[12px] font-black leading-snug ${style.ctaText}`}>
                      {rec.action}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </AnimatePresence>

      <p className="text-[10px] text-gray-300 font-semibold text-center mt-4">
        Generated by AI · Based on {childName}&apos;s learning activity
      </p>
    </motion.div>
  );
}
