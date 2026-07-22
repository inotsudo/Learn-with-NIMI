"use client";

// LearningOutcomeCard
//
// Shows the full prediction → outcome loop for one recommendation:
//   • "Before" panel: Expected Learning Outcomes + success criteria
//   • "After" panel: Actual results vs prediction (after story completion)
//   • Success score with breakdown (when outcome data is available)
//
// Used in the parent portal and teacher portal wherever recommendations appear.

import React, { useState } from "react";
import type { LearningOutcomePrediction, SuccessCriterion } from "@/lib/learningPrediction";
import { confidenceLabel } from "@/lib/learningPrediction";
import { formatSuccessScore } from "@/lib/outcomeEvaluator";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OutcomeBreakdownItem {
  metric:      string;
  label:       string;
  predicted:   number;
  actual:      number;
  improvement: number;
  contribution: number;
}

interface MeasuredOutcome {
  successScore:      number;
  predictionAccuracy: number;
  beatPrediction:    boolean;
  breakdown:         OutcomeBreakdownItem[];
}

interface Props {
  storyTitle:  string;
  prediction:  LearningOutcomePrediction;
  outcome?:    MeasuredOutcome;   // null = not yet measured (story not completed)
  role?:       'parent' | 'teacher';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConfidenceStars({ confidence }: { confidence: number }) {
  const label = confidenceLabel(confidence);
  const stars = label.startsWith('★★★') ? 3 : label.startsWith('★★') ? 2 : 1;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map(i => (
        <span key={i} className={`text-[14px] ${i <= stars ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
      ))}
      <span className="text-[10px] font-semibold text-ds-muted ml-1">
        {label.replace('★★★ ', '').replace('★★☆ ', '').replace('★☆☆ ', '')}
      </span>
    </div>
  );
}

function OutcomeStatement({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-emerald-500 font-black text-[13px] shrink-0 mt-px">✓</span>
      <span className="text-[12px] text-ds-text font-nunito leading-relaxed">{text}</span>
    </div>
  );
}

function MeasurementMethod({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
      <span className="text-[11px] text-ds-muted font-nunito">{text}</span>
    </div>
  );
}

function CriterionRow({ c }: { c: SuccessCriterion }) {
  const thresholdPct = Math.round(c.threshold * 100);
  const metricIcon: Record<string, string> = {
    quiz_accuracy:          '📝',
    vocab_mastery:          '📖',
    retention_improvement:  '🔁',
    skill_confidence:       '🧠',
  };
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span>{metricIcon[c.metric] ?? '●'}</span>
      <span className="flex-1 text-ds-muted font-nunito">{c.description}</span>
      <span className="font-black text-ds-text shrink-0">
        {c.metric === 'quiz_accuracy' || c.metric === 'skill_confidence' || c.metric === 'retention_improvement'
          ? `≥ ${thresholdPct}%`
          : `≥ ${thresholdPct}%`}
      </span>
    </div>
  );
}

function BreakdownBar({ item }: { item: OutcomeBreakdownItem }) {
  const actualPct = Math.round(item.actual * 100);
  const predPct   = Math.round(item.predicted * 100);
  const exceeded  = item.improvement >= 0;
  const colour    = exceeded ? 'bg-emerald-400' : 'bg-rose-400';
  const barWidth  = Math.min(100, Math.round(item.actual / Math.max(item.predicted, 0.001) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ds-muted font-nunito truncate flex-1 mr-2">{item.label}</span>
        <span className={`font-black shrink-0 ${exceeded ? 'text-emerald-600' : 'text-rose-600'}`}>
          {actualPct}% {exceeded ? '↑' : '↓'} (predicted {predPct}%)
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colour}`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LearningOutcomeCard({ storyTitle, prediction, outcome, role = 'parent' }: Props) {
  const [tab, setTab] = useState<'before' | 'after'>(outcome ? 'after' : 'before');
  const [showCriteria, setShowCriteria] = useState(false);

  const hasOutcome = !!outcome;
  const scoreDisplay = hasOutcome ? formatSuccessScore(outcome!.successScore) : null;

  return (
    <div className="border border-ds-border rounded-xl overflow-hidden bg-white shadow-ds-card">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-ds-border bg-gradient-to-br from-indigo-50 to-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-1">
              Learning Outcome
            </p>
            <p className="font-black text-ds-text text-[15px] leading-snug">{storyTitle}</p>
          </div>
          {/* Success score badge (when available) */}
          {scoreDisplay && (
            <div className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl bg-${scoreDisplay.colour}-50 border border-${scoreDisplay.colour}-200`}>
              <span className={`text-[22px] font-black text-${scoreDisplay.colour}-600 leading-none`}>
                {scoreDisplay.icon} {scoreDisplay.label}
              </span>
              <span className={`text-[9px] font-bold text-${scoreDisplay.colour}-500 mt-0.5`}>
                {scoreDisplay.detail}
              </span>
            </div>
          )}
        </div>
        <div className="mt-2">
          <ConfidenceStars confidence={prediction.predictionConfidence} />
        </div>
      </div>

      {/* Tab switcher */}
      {hasOutcome && (
        <div className="flex border-b border-ds-border">
          {(['before', 'after'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-[12px] font-black transition-colors ${
                tab === t
                  ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50'
                  : 'text-ds-muted hover:text-ds-text'
              }`}
            >
              {t === 'before' ? '🔮 Prediction' : '📊 Actual Results'}
            </button>
          ))}
        </div>
      )}

      {/* Before panel — prediction */}
      {tab === 'before' && (
        <div className="p-4 space-y-4">

          {/* Expected outcomes */}
          {prediction.outcomeStatements.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                After completing this story
              </p>
              <div className="space-y-1.5">
                {prediction.outcomeStatements.map((s, i) => (
                  <OutcomeStatement key={i} text={s} />
                ))}
              </div>
            </div>
          )}

          {/* Success criteria (collapsible) */}
          {prediction.successCriteria.length > 0 && (
            <div>
              <button
                onClick={() => setShowCriteria(v => !v)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-ds-action hover:opacity-70 transition mb-2"
              >
                <span className={`transition-transform ${showCriteria ? 'rotate-90' : ''}`}>▶</span>
                {showCriteria ? 'Hide success criteria' : "How we’ll measure success"}
              </button>
              {showCriteria && (
                <div className="space-y-2 pl-2 border-l-2 border-indigo-100">
                  {prediction.successCriteria.map((c, i) => <CriterionRow key={i} c={c} />)}
                </div>
              )}
            </div>
          )}

          {/* Measurement methods */}
          {prediction.measurementMethods.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                Measured using
              </p>
              <div className="space-y-1">
                {prediction.measurementMethods.map((m, i) => (
                  <MeasurementMethod key={i} text={m} />
                ))}
              </div>
            </div>
          )}

          {/* Teacher: show raw prediction numbers */}
          {role === 'teacher' && prediction.expectedQuizAccuracy !== null && (
            <div className="bg-gray-50 rounded-lg p-3 border border-ds-border">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Model output</p>
              <div className="space-y-1 font-mono text-[10px] text-ds-muted">
                <div>Predicted quiz accuracy: {Math.round(prediction.expectedQuizAccuracy * 100)}%</div>
                <div>Prediction confidence: {Math.round(prediction.predictionConfidence * 100)}%</div>
                {prediction.expectedVocabGains.length > 0 && (
                  <div>Vocab targets: {prediction.expectedVocabGains.join(', ')}</div>
                )}
                {prediction.expectedSkillGains.map((g, i) => (
                  <div key={i}>{g.skillLabel}: {g.fromLevel} → {g.toLevel} ({Math.round(g.fromConfidence * 100)}% → {Math.round(g.toConfidence * 100)}%)</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* After panel — actual outcomes */}
      {tab === 'after' && outcome && (
        <div className="p-4 space-y-4">

          {/* Breakdown bars */}
          {outcome.breakdown.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">
                Prediction vs actual
              </p>
              <div className="space-y-3">
                {outcome.breakdown.map((item, i) => (
                  <BreakdownBar key={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Prediction accuracy */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-ds-border">
            <span className="text-[11px] text-ds-muted font-nunito">Nimi&apos;s prediction accuracy</span>
            <span className={`text-[12px] font-black ${outcome.predictionAccuracy >= 0.7 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {Math.round(outcome.predictionAccuracy * 100)}%
            </span>
          </div>

          {outcome.beatPrediction && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-emerald-500 text-[14px]">✓</span>
              <p className="text-[11px] font-bold text-emerald-700">
                Results exceeded prediction — recommendation engine is learning correctly.
              </p>
            </div>
          )}

          <p className="text-[10px] text-gray-300 text-center font-semibold">
            These results will improve future recommendations for this learner.
          </p>
        </div>
      )}
    </div>
  );
}
