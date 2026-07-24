"use client";

/**
 * Learning Brain Tab — Parent Dashboard (Phase 4.1)
 *
 * Surfaces the Phase 3 learning profile to parents:
 *   · Reading level on the 5-level ladder (emerging → fluent)
 *   · Vocabulary growth — encountered / practiced / mastered
 *   · Daily + weekly learning goals with live progress
 *   · Quiz performance — accuracy %, strengths, weaknesses
 *
 * Self-contained: fetches its own data when mounted so the parent page
 * does not need to know about Phase 3 services.
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import supabase from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { getLearningProfile, type LearningProfile, type ReadingLevel } from "@/lib/learningProfile";
import { getVocabProgress, type VocabProgress } from "@/lib/vocabularyProgress";
import { getActiveGoals, generateGoals, type LearningGoal, type GoalType } from "@/lib/learningGoals";
import { Bone } from "@/components/ui/Bone";
import InsightsPanel from "@/components/parents/InsightsPanel";
import RecommendationsPanel from "@/components/parents/RecommendationsPanel";
import ScreenTimePanel from "@/components/parents/ScreenTimePanel";
import type { ParentAIResponse } from "@/lib/parentInsightBuilder";

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_STEPS: ReadingLevel[] = ["emerging", "beginning", "developing", "expanding", "fluent"];

const LEVEL_LABELS: Record<ReadingLevel, string> = {
  emerging:   "Emerging",
  beginning:  "Beginning",
  developing: "Developing",
  expanding:  "Expanding",
  fluent:     "Fluent",
};

const LEVEL_DESC: Record<ReadingLevel, string> = {
  emerging:   "Just beginning to explore stories — great start!",
  beginning:  "Building early reading confidence, one story at a time.",
  developing: "Making real progress — vocabulary and comprehension are growing.",
  expanding:  "A confident reader with a rich and growing vocabulary.",
  fluent:     "Advanced reader — thriving with complex ideas and stories!",
};

const LEVEL_COLOR: Record<ReadingLevel, { bg: string; text: string; border: string }> = {
  emerging:   { bg: "bg-sky-100",    text: "text-sky-700",    border: "border-sky-300" },
  beginning:  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300" },
  developing: { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-300" },
  expanding:  { bg: "bg-emerald-100",text: "text-emerald-700",border: "border-emerald-300" },
  fluent:     { bg: "bg-rose-100",   text: "text-rose-700",   border: "border-rose-300" },
};

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  chat_exchanges:   "Chats with Nimi",
  slot_completions: "Story activities",
  vocab_encounters: "New words learned",
  quiz_correct:     "Quiz answers correct",
  story_completions:"Stories completed",
};

const GOAL_TYPE_EMOJI: Record<GoalType, string> = {
  chat_exchanges:   "💬",
  slot_completions: "📚",
  vocab_encounters: "📝",
  quiz_correct:     "🎯",
  story_completions:"🏅",
};

const QUESTION_TYPE_LABEL: Record<string, string> = {
  comprehension:   "Comprehension",
  vocabulary:      "Vocabulary",
  recall:          "Recall",
  phonics:         "Phonics",
  reading:         "Reading",
  grammar:         "Grammar",
  listening:       "Listening",
  sequencing:      "Sequencing",
  inference:       "Inference",
  main_idea:       "Main Idea",
};

function qtLabel(type: string): string {
  return QUESTION_TYPE_LABEL[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  childId:   string;
  language:  string;
  childName: string;
}

export default function LearningBrainTab({ childId, language, childName }: Props) {
  // ── Phase 3 data (profile, vocab, goals) ─────────────────────────────────
  const [loading, setLoading]   = useState(true);
  const [profile, setProfile]   = useState<LearningProfile | null>(null);
  const [vocab,   setVocab]     = useState<VocabProgress | null>(null);
  const [goals,   setGoals]     = useState<LearningGoal[]>([]);

  useEffect(() => {
    setLoading(true);
    async function load() {
      const [p, v] = await Promise.all([
        getLearningProfile(supabase, childId).catch(() => null),
        getVocabProgress(supabase, childId, language).catch(() => null),
      ]);
      setProfile(p);
      setVocab(v);

      // Goals: fetch existing first; if empty, trigger generation then re-fetch.
      // We separate the generate (write) from the read so JSON parsing issues
      // with the generate RPC's jsonb return don't cause a false empty result.
      try {
        let g = await getActiveGoals(supabase, childId, language);
        if (g.length === 0) {
          // Trigger generation (idempotent RPC — safe to call repeatedly)
          await generateGoals(supabase, childId, language);
          // Re-fetch now that the rows are committed
          g = await getActiveGoals(supabase, childId, language);
        }
        setGoals(g);
      } catch (err) {
        console.error("[LearningBrainTab] goals:", err);
        setGoals([]);
      }

      setLoading(false);
    }
    void load();
  }, [childId, language]);

  // ── AI data (insights + recommendations — single fetch) ───────────────────
  const [aiData,       setAiData]       = useState<ParentAIResponse | null>(null);
  const [aiLoading,    setAiLoading]    = useState(true);
  const [aiError,      setAiError]      = useState(false);
  const [aiRefreshing, setAiRefreshing] = useState(false);

  const loadAI = useCallback(async (bust = false) => {
    if (!bust) setAiLoading(true);
    else       setAiRefreshing(true);
    setAiError(false);
    try {
      const res = await authedFetch("/api/parent-ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ childId, language, bust }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as ParentAIResponse;
      setAiData(data);
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
      setAiRefreshing(false);
    }
  }, [childId, language]);

  useEffect(() => {
    setAiData(null);
    setAiError(false);
    void loadAI(false);
  }, [childId, language, loadAI]);

  if (loading) {
    return (
      <div className="space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-36 w-full" style={{ borderRadius: "var(--leaf-r-lg)" }} />
        ))}
      </div>
    );
  }

  const readingLevel = profile?.readingLevel ?? "emerging";
  const levelIdx     = LEVEL_STEPS.indexOf(readingLevel);
  const levelStyle   = LEVEL_COLOR[readingLevel];

  const dailyGoals  = goals.filter(g => g.period === "daily");
  const weeklyGoals = goals.filter(g => g.period === "weekly");

  const hasQuizData = (profile?.quiz.totalQuestions ?? 0) >= 1;
  const hasVocab    = (vocab?.totalWords ?? 0) > 0;
  const hasGoals    = goals.length > 0;

  const todaysFocus = !aiLoading && !aiData?.insufficientData
    ? (aiData?.recommendations ?? []).find(r => r.category === "supportive_action") ?? null
    : null;

  return (
    <motion.div
      key="learning"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >

      {/* ── Today's Focus ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {todaysFocus && (
          <motion.div
            key="todays-focus"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-start gap-3 px-4 py-3.5 bg-rose-50 border border-rose-200 shadow-ds-card"
            style={{ borderRadius: "var(--leaf-r-lg)" }}
          >
            <span className="text-[20px] shrink-0 leading-none mt-0.5">💬</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-0.5">
                Do this today
              </p>
              <p className="text-[14px] font-black text-rose-800 leading-snug">
                {todaysFocus.action}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Insights ───────────────────────────────────────────────────── */}
      <InsightsPanel
        insights={aiData?.insights ?? []}
        childName={aiData?.childName ?? childName}
        generatedAt={aiData?.generatedAt ?? null}
        loading={aiLoading}
        error={aiError}
        refreshing={aiRefreshing}
        onRefresh={() => void loadAI(true)}
        insufficientData={aiData?.insufficientData}
      />

      {/* ── AI Recommendations ─────────────────────────────────────────────── */}
      <RecommendationsPanel
        recommendations={aiData?.recommendations ?? []}
        childName={aiData?.childName ?? childName}
        generatedAt={aiData?.generatedAt ?? null}
        loading={aiLoading}
        error={aiError}
        refreshing={aiRefreshing}
        onRefresh={() => void loadAI(true)}
        insufficientData={aiData?.insufficientData}
      />

      {/* ── Reading Level ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xl">📈</span>
          <h2 className="font-black text-ds-text text-[18px]">Reading Level</h2>
          <span className={`ml-auto text-[11px] font-black px-3 py-1 rounded-full border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}>
            {LEVEL_LABELS[readingLevel]}
          </span>
        </div>

        {/* 5-step ladder */}
        <div className="flex items-center gap-1 mb-5">
          {LEVEL_STEPS.map((level, i) => {
            const isPast    = i < levelIdx;
            const isCurrent = i === levelIdx;
            const isFuture  = i > levelIdx;
            return (
              <div key={level} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 300 }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-[12px] transition-all ${
                      isCurrent
                        ? `${levelStyle.bg} ${levelStyle.text} ring-2 ring-offset-2 ring-current shadow-md`
                        : isPast
                        ? "bg-[var(--nimi-green)] text-white shadow-sm"
                        : "bg-gray-100 text-gray-300"
                    }`}
                  >
                    {isPast ? "✓" : isCurrent ? (levelIdx + 1) : <span className="text-[9px]">{i + 1}</span>}
                  </motion.div>
                  <p className={`mt-1.5 text-[8px] sm:text-[9px] font-bold text-center leading-tight ${
                    isCurrent ? levelStyle.text : isPast ? "text-[var(--nimi-green)]" : "text-gray-300"
                  }`}>
                    {LEVEL_LABELS[level]}
                  </p>
                </div>
                {i < LEVEL_STEPS.length - 1 && (
                  <div className={`h-0.5 w-full mx-0.5 rounded-full -mt-4 ${isPast || isCurrent ? "bg-[var(--nimi-green)]" : "bg-gray-100"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className={`flex gap-3 items-start p-4 rounded-xl border ${levelStyle.bg} ${levelStyle.border}`}>
          <span className="text-2xl shrink-0">
            {readingLevel === "emerging" ? "🌱" : readingLevel === "beginning" ? "📖" : readingLevel === "developing" ? "🚀" : readingLevel === "expanding" ? "⭐" : "🏆"}
          </span>
          <div>
            <p className={`font-black text-[14px] ${levelStyle.text}`}>{childName} is at {LEVEL_LABELS[readingLevel]} level</p>
            <p className={`text-[12px] mt-0.5 font-semibold opacity-80 ${levelStyle.text}`}>{LEVEL_DESC[readingLevel]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 px-0.5">
          <span className="text-[12px] font-bold text-ds-muted">Stories completed:</span>
          <span className="font-black text-ds-text text-[14px]">{profile?.completedStoryCount ?? 0}</span>
        </div>
      </div>

      {/* ── Vocabulary Growth — only shown when child has vocab data ─────────── */}
      {hasVocab && (
      <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xl">📝</span>
          <h2 className="font-black text-ds-text text-[18px]">Vocabulary Growth</h2>
          <span className="ml-auto text-[12px] font-black text-ds-muted">
            {vocab!.masteryPct}% mastered
          </span>
        </div>

        {true ? (
          <>
            {/* Three stat chips */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Encountered", value: vocab!.encountered, emoji: "👀", bg: "bg-sky-50",    border: "border-sky-200",    text: "text-sky-700"    },
                { label: "Practiced",   value: vocab!.practiced,   emoji: "✏️", bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700"  },
                { label: "Mastered",    value: vocab!.mastered,    emoji: "⭐", bg: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-700"},
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`flex flex-col items-center gap-1 p-3 border rounded-2xl ${stat.bg} ${stat.border}`}
                >
                  <span className="text-xl">{stat.emoji}</span>
                  <span className={`font-black text-[22px] leading-none ${stat.text}`}>{stat.value}</span>
                  <span className={`text-[10px] font-bold ${stat.text} opacity-75`}>{stat.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Stacked progress bar */}
            <div className="mb-1.5">
              <div className="h-4 rounded-full overflow-hidden bg-gray-100 flex">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${vocab!.totalWords > 0 ? (vocab!.mastered / vocab!.totalWords) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                <motion.div
                  className="h-full bg-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${vocab!.totalWords > 0 ? (vocab!.practiced / vocab!.totalWords) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                />
                <motion.div
                  className="h-full bg-sky-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${vocab!.totalWords > 0 ? (vocab!.encountered / vocab!.totalWords) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-gray-400 font-semibold">0</span>
                <span className="text-[10px] text-gray-500 font-bold">{vocab!.totalWords} total words</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-3 flex-wrap mt-3">
              {[
                { color: "bg-emerald-500", label: "Mastered" },
                { color: "bg-amber-400",   label: "Practiced" },
                { color: "bg-sky-300",     label: "Encountered" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                  <span className="text-[11px] text-ds-muted font-semibold">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Words needing review */}
            {vocab!.reviewWords.length > 0 && (
              <div className="mt-5 pt-4 border-t border-ds-border">
                <p className="font-black text-ds-text text-[14px] mb-3">
                  🔁 Needs more practice ({vocab!.needsReview} word{vocab!.needsReview !== 1 ? "s" : ""})
                </p>
                <div className="flex flex-wrap gap-2">
                  {vocab!.reviewWords.slice(0, 8).map(w => (
                    <span
                      key={w.word}
                      className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] font-bold rounded-full"
                    >
                      {w.word}
                    </span>
                  ))}
                  {vocab!.reviewWords.length > 8 && (
                    <span className="px-3 py-1 bg-gray-50 border border-ds-border text-ds-muted text-[12px] font-bold rounded-full">
                      +{vocab!.reviewWords.length - 8} more
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-[11px] mt-2 font-nunito">
                  Nimi will naturally weave these into the next conversation to reinforce them.
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>
      )}

      {/* ── Learning Goals ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xl">🎯</span>
          <h2 className="font-black text-ds-text text-[18px]">Learning Goals</h2>
        </div>

        {!hasGoals ? (
          <p className="text-ds-muted text-[13px] font-semibold py-4 text-center">
            Goals are being set up for {childName}…
          </p>
        ) : (
          <div className="space-y-5">
            {dailyGoals.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-ds-muted uppercase tracking-widest mb-3">Today</p>
                <div className="space-y-3">
                  {dailyGoals.map((goal, i) => (
                    <GoalRow key={goal.id} goal={goal} index={i} />
                  ))}
                </div>
              </div>
            )}
            {weeklyGoals.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-ds-muted uppercase tracking-widest mb-3">This Week</p>
                <div className="space-y-3">
                  {weeklyGoals.map((goal, i) => (
                    <GoalRow key={goal.id} goal={goal} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quiz Performance — only shown when child has quiz data ──────────── */}
      {hasQuizData && (
      <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xl">🧠</span>
          <h2 className="font-black text-ds-text text-[18px]">Quiz Performance</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                <motion.circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke={
                    (profile?.quiz.accuracyPct ?? 0) >= 70 ? "#10b981"
                    : (profile?.quiz.accuracyPct ?? 0) >= 50 ? "#f59e0b"
                    : "#ef4444"
                  }
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - (profile?.quiz.accuracyPct ?? 0) / 100) }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-black text-ds-text text-[18px] leading-none">{profile?.quiz.accuracyPct ?? 0}%</span>
                <span className="text-[8px] text-ds-muted font-bold">accuracy</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-ds-text text-[15px]">
                {(profile?.quiz.accuracyPct ?? 0) >= 80 ? "Excellent! 🌟" : (profile?.quiz.accuracyPct ?? 0) >= 60 ? "Good progress 👍" : "Keep practicing! 💪"}
              </p>
              <p className="text-ds-muted text-[12px] font-semibold mt-0.5">
                {profile?.quiz.totalQuestions ?? 0} question{(profile?.quiz.totalQuestions ?? 0) !== 1 ? "s" : ""} answered
              </p>
              <p className="text-ds-muted text-[12px] font-semibold">
                {profile?.quiz.correct ?? 0} correct
              </p>
            </div>
          </div>

          {(profile?.strengths?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-black text-ds-muted uppercase tracking-widest mb-2">Strengths</p>
              <div className="flex flex-wrap gap-2">
                {profile!.strengths.map(s => (
                  <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-bold rounded-full">
                    ✅ {qtLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(profile?.weaknesses?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-black text-ds-muted uppercase tracking-widest mb-2">Needs Practice</p>
              <div className="flex flex-wrap gap-2">
                {profile!.weaknesses.map(w => (
                  <span key={w} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[12px] font-bold rounded-full">
                    🎯 {qtLabel(w)}
                  </span>
                ))}
              </div>
              <p className="text-gray-400 text-[11px] mt-2 font-nunito">
                Nimi automatically focuses more on these question types to build the skill.
              </p>
            </div>
          )}

          {(profile?.strengths?.length ?? 0) === 0 && (profile?.weaknesses?.length ?? 0) === 0 && (
            <p className="text-gray-400 text-[12px] font-nunito">
              Strengths and weaknesses appear once {childName} has answered at least 3 questions per type.
            </p>
          )}
        </div>
      </div>
      )}

      {/* ── Screen Time ────────────────────────────────────────────────────── */}
      <ScreenTimePanel childId={childId} childName={childName} ageYears={profile?.age ?? null} />

    </motion.div>
  );
}

// ── GoalRow ───────────────────────────────────────────────────────────────────

function GoalRow({ goal, index }: { goal: LearningGoal; index: number }) {
  const pct = goal.targetValue > 0 ? Math.min(100, (goal.currentValue / goal.targetValue) * 100) : 0;
  const done = goal.completed;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`p-3.5 border-2 transition-all ${
        done
          ? "bg-emerald-50 border-emerald-200"
          : "bg-gray-50 border-ds-border"
      }`}
      style={{ borderRadius: "var(--leaf-r)" }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl shrink-0">{GOAL_TYPE_EMOJI[goal.goalType]}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-black text-[13px] leading-tight ${done ? "text-emerald-700" : "text-ds-text"}`}>
            {goal.title || GOAL_TYPE_LABEL[goal.goalType] || goal.goalType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </p>
          <p className="text-[10px] text-ds-muted font-semibold">{GOAL_TYPE_LABEL[goal.goalType] ?? goal.goalType}</p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {done ? (
            <span className="text-emerald-600 font-black text-[12px]">✅ Done!</span>
          ) : (
            <span className="font-black text-ds-text text-[13px]">{goal.currentValue}/{goal.targetValue}</span>
          )}
          <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <span className="text-[10px]">⭐</span>
            <span className="text-amber-700 font-black text-[10px]">{goal.starsReward}</span>
          </div>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-gray-200">
        <motion.div
          className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-[var(--nimi-green)]"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: index * 0.06 }}
        />
      </div>
    </motion.div>
  );
}
