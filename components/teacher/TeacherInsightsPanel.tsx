"use client";

/**
 * TeacherInsightsPanel — Phase 5.2
 *
 * Display-only. ClassroomLearningView owns the /api/teacher-insights fetch
 * and passes pre-fetched data as props. No internal network calls.
 *
 * Three sections:
 *   1. Class Insights   — classroom-level observations (strength / gap / trend / observation)
 *   2. Student Flags    — individual students worth the teacher's attention
 *   3. Focus Areas      — 2-3 actionable priorities the teacher can act on this week
 */

import { motion, AnimatePresence } from "framer-motion";
import { Bone } from "@/components/ui/Bone";
import type {
  TeacherAIResponse,
  ClassInsight,
  ClassInsightType,
  StudentFlag,
  StudentFlagType,
  FocusArea,
  FocusAreaType,
} from "@/lib/teacherInsightBuilder";

// ── Design tokens (matches teacher page T object) ─────────────────────────────

const T = {
  card:   "var(--ds-surface-card,#FFFFFF)",
  border: "var(--ds-border-primary,#E5E7EB)",
  text:   "var(--ds-text-primary,#111827)",
  muted:  "var(--ds-text-secondary,#6B7280)",
  brand:  "var(--ds-brand-primary,#15803D)",
  leaf:   "var(--leaf-r,20px 20px 20px 5px)",
  leafSm: "var(--leaf-r-sm,14px 14px 14px 4px)",
};

// ── Insight type styles ───────────────────────────────────────────────────────

interface InsightStyle { emoji: string; label: string; bg: string; border: string; text: string; pill: string }

const INSIGHT_STYLE: Record<ClassInsightType, InsightStyle> = {
  strength: {
    emoji: "⭐", label: "Strength",
    bg: "#F0FDF4", border: "#BBF7D0", text: "#14532D", pill: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  gap: {
    emoji: "🎯", label: "Gap",
    bg: "#FFFBEB", border: "#FDE68A", text: "#78350F", pill: "bg-amber-100 text-amber-700 border-amber-200",
  },
  trend: {
    emoji: "📈", label: "Trend",
    bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A5F", pill: "bg-blue-100 text-blue-700 border-blue-200",
  },
  observation: {
    emoji: "💡", label: "Observation",
    bg: "#F5F3FF", border: "#DDD6FE", text: "#3B0764", pill: "bg-violet-100 text-violet-700 border-violet-200",
  },
};

// ── Student flag styles ───────────────────────────────────────────────────────

interface FlagStyle { emoji: string; label: string; bg: string; border: string; text: string; ctaBg: string; ctaText: string }

const FLAG_STYLE: Record<StudentFlagType, FlagStyle> = {
  struggling: {
    emoji: "🆘", label: "Needs Support",
    bg: "#FFF1F2", border: "#FECDD3", text: "#881337",
    ctaBg: "#FFF1F2", ctaText: "#BE123C",
  },
  at_risk: {
    emoji: "⚠️", label: "Inactive",
    bg: "#FFF7ED", border: "#FED7AA", text: "#7C2D12",
    ctaBg: "#FFF7ED", ctaText: "#C2410C",
  },
  excelling: {
    emoji: "🌟", label: "Excelling",
    bg: "#F0FDF4", border: "#BBF7D0", text: "#14532D",
    ctaBg: "#F0FDF4", ctaText: "#166534",
  },
  improving: {
    emoji: "🚀", label: "Improving",
    bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A5F",
    ctaBg: "#EFF6FF", ctaText: "#1D4ED8",
  },
};

// ── Focus area styles ─────────────────────────────────────────────────────────

interface AreaStyle { emoji: string; label: string; bg: string; border: string; text: string; ctaBg: string; ctaText: string }

const AREA_STYLE: Record<FocusAreaType, AreaStyle> = {
  vocabulary: {
    emoji: "📗", label: "Vocabulary",
    bg: "#F5F3FF", border: "#DDD6FE", text: "#3B0764",
    ctaBg: "#EDE9FE", ctaText: "#5B21B6",
  },
  comprehension: {
    emoji: "📖", label: "Comprehension",
    bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A5F",
    ctaBg: "#DBEAFE", ctaText: "#1D4ED8",
  },
  reading_habit: {
    emoji: "📅", label: "Reading Habit",
    bg: "#F0FDF4", border: "#BBF7D0", text: "#14532D",
    ctaBg: "#DCFCE7", ctaText: "#166534",
  },
  quiz_accuracy: {
    emoji: "🎯", label: "Quiz Accuracy",
    bg: "#FFFBEB", border: "#FDE68A", text: "#78350F",
    ctaBg: "#FEF3C7", ctaText: "#92400E",
  },
  engagement: {
    emoji: "⚡", label: "Engagement",
    bg: "#FFF1F2", border: "#FECDD3", text: "#881337",
    ctaBg: "#FFE4E6", ctaText: "#BE123C",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 2)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf, padding: "24px" }}>
      <div className="flex items-center gap-2 mb-5">
        <Bone className="w-8 h-8 rounded-lg" />
        <Bone className="h-5 w-40" />
        <div className="ml-auto"><Bone className="w-8 h-8 rounded-full" /></div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="p-4 rounded-xl space-y-2" style={{ background: "#F9FAFB", border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2">
            <Bone className="w-5 h-5 rounded" />
            <Bone className="h-3.5 w-32" />
          </div>
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  aiData:     TeacherAIResponse | null;
  loading:    boolean;
  error:      boolean;
  refreshing: boolean;
  onRefresh:  (bust?: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeacherInsightsPanel({ aiData, loading, error, refreshing, onRefresh }: Props) {

  if (loading) return <LoadingSkeleton />;

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center"
        style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf, padding: "24px" }}>
        <span className="text-3xl">⚠️</span>
        <p className="font-black text-[15px]" style={{ color: T.text }}>Couldn&apos;t generate insights</p>
        <p className="text-[12px] font-nunito" style={{ color: T.muted }}>Something went wrong. Try again in a moment.</p>
        <button onClick={() => onRefresh(true)}
          className="mt-1 px-4 py-2 text-white text-[13px] font-black rounded-full hover:opacity-90 transition"
          style={{ background: T.brand }}>
          Try again
        </button>
      </div>
    );
  }

  // Not enough data
  if (!aiData || aiData.insufficientData) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center"
        style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf, padding: "24px" }}>
        <span className="text-4xl">🌱</span>
        <p className="font-black text-[16px]" style={{ color: T.text }}>AI insights coming soon</p>
        <p className="text-[13px] font-nunito max-w-xs" style={{ color: T.muted }}>
          Once your students have completed some activities, AI-generated observations will appear here.
        </p>
      </div>
    );
  }

  const { class_insights, student_flags, focus_areas, generatedAt } = aiData;
  const genTime = generatedAt ? relativeTime(generatedAt) : null;

  const flagOrder: StudentFlagType[] = ["struggling", "at_risk", "improving", "excelling"];
  const sortedFlags = [...student_flags].sort(
    (a, b) => flagOrder.indexOf(a.flag_type) - flagOrder.indexOf(b.flag_type),
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-0"
      style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf, overflow: "hidden" }}>

      {/* ── Panel header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shadow-sm shrink-0"
          style={{ background: "linear-gradient(135deg,#15803D,#22c55e)" }}>
          🧠
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-baloo font-black text-[17px] leading-tight" style={{ color: T.text }}>
            AI Class Insights
          </h2>
          {genTime && (
            <p className="text-[10px] font-semibold" style={{ color: T.muted }}>Updated {genTime}</p>
          )}
        </div>
        <button
          onClick={() => onRefresh(true)}
          disabled={refreshing}
          className="shrink-0 w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50 transition disabled:opacity-40"
          style={{ borderColor: T.border }}
          title="Refresh insights"
        >
          <span className={`text-base ${refreshing ? "animate-spin inline-block" : ""}`}>↻</span>
        </button>
      </div>

      <div className="p-6 space-y-7">

        {/* ── Section 1: Class Observations ──────────────────────────────── */}
        {class_insights.length > 0 && (
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: T.muted }}>
              Class Overview
            </p>
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {class_insights.map((ins: ClassInsight, i: number) => {
                  const style = INSIGHT_STYLE[ins.type];
                  return (
                    <motion.div key={`${ins.type}-${i}`}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.22 }}
                      className="flex gap-3 p-4 rounded-xl border"
                      style={{ background: style.bg, borderColor: style.border }}>
                      <span className="text-[20px] shrink-0 leading-none mt-0.5">{style.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-black text-[14px] leading-tight" style={{ color: style.text }}>
                            {ins.title}
                          </p>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.pill} shrink-0`}>
                            {style.label}
                          </span>
                        </div>
                        <p className="text-[12px] leading-relaxed font-nunito" style={{ color: style.text, opacity: 0.85 }}>
                          {ins.body}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </section>
        )}

        {/* ── Section 2: Student Flags ────────────────────────────────────── */}
        {sortedFlags.length > 0 && (
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: T.muted }}>
              Students to Check In With
            </p>
            <div className="space-y-3">
              {sortedFlags.map((flag: StudentFlag, i: number) => {
                const style = FLAG_STYLE[flag.flag_type];
                return (
                  <motion.div key={flag.child_id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.22 }}
                    className="p-4 rounded-xl border"
                    style={{ background: style.bg, borderColor: style.border }}>
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-[12px] text-white"
                        style={{ background: T.brand }}>
                        {initials(flag.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-black text-[14px]" style={{ color: style.text }}>{flag.name}</p>
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
                            style={{ background: style.ctaBg, color: style.ctaText, borderColor: style.border }}>
                            {style.emoji} {style.label}
                          </span>
                        </div>
                        <p className="text-[12px] font-nunito mb-2" style={{ color: style.text, opacity: 0.85 }}>
                          {flag.reason}
                        </p>
                        <div className="flex items-start gap-1.5 p-2.5 rounded-lg border text-[11px] font-black"
                          style={{ background: style.ctaBg, borderColor: style.border, color: style.ctaText }}>
                          <span className="shrink-0">→</span>
                          <span>{flag.suggestion}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Section 3: Focus Areas ──────────────────────────────────────── */}
        {focus_areas.length > 0 && (
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: T.muted }}>
              Priorities This Week
            </p>
            <div className="space-y-3">
              {focus_areas.map((fa: FocusArea, i: number) => {
                const style = AREA_STYLE[fa.area];
                return (
                  <motion.div key={`${fa.area}-${i}`}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.22 }}
                    className="p-4 rounded-xl border"
                    style={{ background: style.bg, borderColor: style.border }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[15px] leading-none">{style.emoji}</span>
                      <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: style.text, opacity: 0.7 }}>
                        {style.label}
                      </span>
                    </div>
                    <p className="font-black text-[14px] leading-snug mb-1.5" style={{ color: style.text }}>
                      {fa.title}
                    </p>
                    <p className="text-[12px] leading-relaxed font-nunito mb-3" style={{ color: style.text, opacity: 0.8 }}>
                      {fa.detail}
                    </p>
                    <div className="flex items-start gap-2 p-3 rounded-lg border text-[12px] font-black transition-colors"
                      style={{ background: style.ctaBg, borderColor: style.border, color: style.ctaText }}>
                      <span className="shrink-0 mt-0.5">→</span>
                      <span>{fa.action}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

      </div>

      <p className="text-[10px] text-center pb-4 font-semibold" style={{ color: "#D1D5DB" }}>
        Generated by AI · Based on your class&apos;s recorded learning activity
      </p>
    </motion.div>
  );
}
