"use client";

// ExplainedRecommendationCard
//
// Displays one UniversalRecommendation with its full evidence trail.
// Used in the parent portal and teacher portal wherever recommendations appear.
//
// Design:
//   Default view  — title, emoji, reason label, parentSentence (warm + concise)
//   "Why?" toggle — reveals evidence signals as chips + curriculum objectives
//   Teacher mode  — shows teacherNotes instead of parentSentence (data-forward)
//
// No fetching. Accepts pre-fetched recommendation data as props.

import React, { useState } from "react";
import type { UniversalRecommendation, EvidenceSignal, CurriculumObjective } from "@/lib/ai/types";

// ── Signal chip styling ───────────────────────────────────────────────────────

const SIGNAL_STYLE: Record<EvidenceSignal['type'], { bg: string; text: string; dot: string }> = {
  skill_gap:        { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-400"    },
  spaced_repetition:{ bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  in_progress:      { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-400"    },
  quiz_performance: { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-400"  },
  interest_match:   { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-400"   },
  achievement_unlock:{ bg: "bg-yellow-50", text: "text-yellow-700",  dot: "bg-yellow-400"  },
  level_progression:{ bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-400"  },
  time_based:       { bg: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400"    },
};

const MASTERY_COLOUR: Record<string, string> = {
  none:       "text-rose-600 bg-rose-50 border-rose-200",
  emerging:   "text-amber-700 bg-amber-50 border-amber-200",
  developing: "text-blue-700 bg-blue-50 border-blue-200",
  strong:     "text-emerald-700 bg-emerald-50 border-emerald-200",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SignalChip({ signal }: { signal: EvidenceSignal }) {
  const s = SIGNAL_STYLE[signal.type] ?? SIGNAL_STYLE.time_based;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {signal.label}
    </div>
  );
}

function ObjectiveRow({ obj }: { obj: CurriculumObjective }) {
  const colour = MASTERY_COLOUR[obj.masteryLevel ?? 'none'] ?? MASTERY_COLOUR.none;
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span className="text-gray-400 shrink-0 mt-0.5">→</span>
      <div className="flex-1 min-w-0">
        <span className="font-bold text-ds-text">{obj.skillLabel}: </span>
        <span className="text-ds-muted">{obj.objective}</span>
        {obj.masteryLevel && (
          <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black border ${colour}`}>
            {obj.masteryLevel}
            {obj.confidence !== undefined && ` · ${Math.round(obj.confidence * 100)}%`}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  rec:          UniversalRecommendation;
  /** teacher mode shows raw teacherNotes instead of parentSentence */
  role?:        'parent' | 'teacher';
  /** called when the action CTA is pressed */
  onAction?:    (href: string) => void;
  /** visual accent colour class (tailwind bg-* + border-* pair) */
  accentClass?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ExplainedRecommendationCard({
  rec,
  role = 'parent',
  onAction,
  accentClass = "bg-white border-ds-border",
}: Props) {
  const [open, setOpen] = useState(false);
  const ev = rec.evidence;

  const explanation = ev
    ? role === 'teacher' ? ev.teacherNotes : ev.parentSentence
    : rec.reasonLabel;

  const hasEvidence = ev && (ev.signals.length > 0 || ev.curriculumGoals.length > 0);

  return (
    <div className={`border rounded-xl overflow-hidden ${accentClass}`}>
      {/* Main card body */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-2">
          <span className="text-2xl leading-none shrink-0">{rec.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-ds-text text-[14px] leading-snug">{rec.title}</p>
            <p className="text-[11px] font-semibold text-ds-muted mt-0.5">{rec.reasonLabel}</p>
          </div>
          {/* Action button */}
          <a
            href={rec.href}
            onClick={e => { if (onAction) { e.preventDefault(); onAction(rec.href); } }}
            className="shrink-0 px-3 py-1.5 bg-ds-action text-white text-[11px] font-black rounded-full hover:opacity-90 transition whitespace-nowrap"
          >
            Go →
          </a>
        </div>

        {/* Explanation sentence */}
        <p className="text-[12px] leading-relaxed text-ds-muted font-nunito">
          {explanation}
        </p>

        {/* "Why?" toggle */}
        {hasEvidence && (
          <button
            onClick={() => setOpen(v => !v)}
            className="mt-3 flex items-center gap-1 text-[11px] font-bold text-ds-action hover:opacity-70 transition"
            aria-expanded={open}
          >
            <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
            {open ? 'Hide evidence' : 'Why this recommendation?'}
          </button>
        )}
      </div>

      {/* Evidence panel — revealed on toggle */}
      {open && ev && (
        <div className="border-t border-ds-border bg-gray-50/70 px-4 py-3 space-y-3">

          {/* Signal chips */}
          {ev.signals.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                Signals detected
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ev.signals.map((s, i) => <SignalChip key={i} signal={s} />)}
              </div>
              {/* Signal details */}
              <div className="mt-2 space-y-1">
                {ev.signals.map((s, i) => (
                  <p key={i} className="text-[11px] text-ds-muted font-nunito leading-relaxed">
                    <span className="font-bold text-ds-text">{s.label}:</span> {s.detail}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Curriculum objectives */}
          {ev.curriculumGoals.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                Curriculum objectives
              </p>
              <div className="space-y-1.5">
                {ev.curriculumGoals.map((obj, i) => <ObjectiveRow key={i} obj={obj} />)}
              </div>
            </div>
          )}

          {/* Teacher notes (in teacher mode only) */}
          {role === 'teacher' && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                Full evidence trail
              </p>
              <pre className="text-[10px] text-ds-muted font-mono whitespace-pre-wrap leading-relaxed bg-white border border-ds-border rounded-lg p-3 overflow-x-auto">
                {ev.teacherNotes}
              </pre>
            </div>
          )}

          {/* Data sources */}
          <div className="flex flex-wrap gap-1">
            {ev.dataSourcesUsed.map(src => (
              <span key={src} className="text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {src.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
