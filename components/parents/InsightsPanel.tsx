"use client";

/**
 * InsightsPanel — Phase 4.2 (refactored for combined parent-ai route in fix #2)
 *
 * Display-only: accepts pre-fetched data from LearningBrainTab, which calls
 * /api/parent-ai once for both insights and recommendations. No internal fetch.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Bone } from "@/components/ui/Bone";
import type { InsightResult, InsightType } from "@/lib/parentInsightBuilder";

// ── Visual identity per insight type ─────────────────────────────────────────

interface InsightStyle {
  emoji:  string;
  label:  string;
  bg:     string;
  border: string;
  pill:   string;
  text:   string;
}

const TYPE_STYLE: Record<InsightType, InsightStyle> = {
  strength: {
    emoji:  "⭐",
    label:  "Strength",
    bg:     "bg-emerald-50",
    border: "border-emerald-200",
    pill:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    text:   "text-emerald-800",
  },
  improvement: {
    emoji:  "📈",
    label:  "Improving",
    bg:     "bg-blue-50",
    border: "border-blue-200",
    pill:   "bg-blue-100 text-blue-700 border-blue-200",
    text:   "text-blue-800",
  },
  needs_support: {
    emoji:  "🎯",
    label:  "To support",
    bg:     "bg-amber-50",
    border: "border-amber-200",
    pill:   "bg-amber-100 text-amber-700 border-amber-200",
    text:   "text-amber-800",
  },
  observation: {
    emoji:  "💡",
    label:  "Observation",
    bg:     "bg-violet-50",
    border: "border-violet-200",
    pill:   "bg-violet-100 text-violet-700 border-violet-200",
    text:   "text-violet-800",
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  insights:     InsightResult[];
  childName:    string;
  generatedAt:  string | null;
  loading:      boolean;
  error:        boolean;
  refreshing:   boolean;
  onRefresh:    () => void;
  insufficientData?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InsightsPanel({
  insights, childName, generatedAt,
  loading, error, refreshing, onRefresh, insufficientData,
}: Props) {

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white border border-ds-border p-5 shadow-ds-card space-y-4" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <div className="flex items-center gap-2">
          <Bone className="w-7 h-7 rounded-lg" />
          <Bone className="h-5 w-36" />
        </div>
        {[80, 60, 70].map((w, i) => (
          <div key={i} className="space-y-2 p-4 rounded-xl bg-gray-50 border border-ds-border">
            <Bone className={`h-4 w-${w === 80 ? "4/5" : w === 60 ? "3/5" : "3/4"}`} />
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-4/5" />
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
        <p className="font-black text-ds-text text-[16px]">Insights coming soon</p>
        <p className="text-gray-400 text-[13px] font-nunito max-w-xs">
          Once {childName} completes a story or has a few chats with Nimi, personalised observations will appear here.
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
          <p className="font-black text-ds-text text-[15px]">Couldn&apos;t generate insights</p>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-ds-border p-5 shadow-ds-card"
      style={{ borderRadius: "var(--leaf-r-lg)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-base shadow-sm shrink-0">
          🧠
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-ds-text text-[17px] leading-tight">Nimi&apos;s Observations</h2>
          {relativeTime && (
            <p className="text-ds-muted text-[10px] font-semibold">Updated {relativeTime}</p>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh insights"
          className="shrink-0 w-8 h-8 rounded-full border border-ds-border bg-white flex items-center justify-center hover:bg-gray-50 transition disabled:opacity-40"
          aria-label="Refresh insights"
        >
          <span className={`text-base ${refreshing ? "animate-spin inline-block" : ""}`}>↻</span>
        </button>
      </div>

      {/* Insight cards */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const style = TYPE_STYLE[insight.type];
            return (
              <motion.div
                key={`${insight.type}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.25 }}
                className={`flex gap-3 p-4 border rounded-xl ${style.bg} ${style.border}`}
              >
                <span className="text-[22px] shrink-0 leading-none mt-0.5">{style.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className={`font-black text-[14px] leading-tight ${style.text}`}>{insight.title}</p>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.pill} shrink-0`}>
                      {TYPE_STYLE[insight.type].label}
                    </span>
                  </div>
                  <p className={`text-[12px] leading-relaxed font-nunito ${style.text} opacity-85`}>
                    {insight.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      <p className="text-[10px] text-gray-300 font-semibold text-center mt-4">
        Generated by AI · Based on {childName}&apos;s learning activity
      </p>
    </motion.div>
  );
}
