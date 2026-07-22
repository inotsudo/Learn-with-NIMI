"use client";

/**
 * QuizGeneratorView — Phase 5.4
 *
 * Three-step flow: configure → generating → quiz view
 *
 * The quiz view has two modes:
 *   Student View  — questions and options, answers hidden (printable handout)
 *   Answer Key    — correct answers highlighted, explanations visible (teacher use)
 *
 * Completely independent from classroom analytics.
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authedFetch } from "@/lib/authedFetch";
import supabase from "@/lib/supabaseClient";
import { useSaveMaterial } from "@/lib/useSaveMaterial";
import type { TeacherProfile } from "@/app/teacher/teacherAuth";
import type {
  Quiz,
  QuizQuestion,
  QuestionType,
  QuizDifficulty,
  QuizSkill,
  DifficultyMix,
} from "@/lib/quizGenerator";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  page:      "var(--ds-surface-page,#F9FAFB)",
  card:      "var(--ds-surface-card,#FFFFFF)",
  border:    "var(--ds-border-primary,#E5E7EB)",
  text:      "var(--ds-text-primary,#111827)",
  muted:     "var(--ds-text-secondary,#6B7280)",
  brand:     "var(--ds-brand-primary,#15803D)",
  leaf:      "var(--leaf-r,20px 20px 20px 5px)",
  leafSm:    "var(--leaf-r-sm,14px 14px 14px 4px)",
};

// ── Badge metadata ────────────────────────────────────────────────────────────

const TYPE_META: Record<QuestionType, { label: string; icon: string; bg: string; text: string }> = {
  multiple_choice: { label: "Multiple Choice", icon: "🔵", bg: "#EFF6FF", text: "#1D4ED8" },
  true_false:      { label: "True / False",    icon: "🟡", bg: "#FFFBEB", text: "#92400E" },
  fill_blank:      { label: "Fill the Blank",  icon: "🟢", bg: "#F0FDF4", text: "#166534" },
  short_answer:    { label: "Short Answer",    icon: "🔴", bg: "#FFF1F2", text: "#BE123C" },
};

const DIFF_META: Record<QuizDifficulty, { label: string; color: string }> = {
  easy:   { label: "Easy",   color: "#22C55E" },
  medium: { label: "Medium", color: "#F59E0B" },
  hard:   { label: "Hard",   color: "#EF4444" },
};

const SKILL_META: Record<QuizSkill, string> = {
  comprehension: "Comprehension",
  vocabulary:    "Vocabulary",
  recall:        "Recall",
  inference:     "Inference",
};

// ── Story prop type ───────────────────────────────────────────────────────────

interface StoryRef { story_id: string; story_title: string }

// ── Helper components ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>
      {children}
    </p>
  );
}

function FieldCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-5 space-y-4" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf }}>
      {children}
    </div>
  );
}

function PillGroup<V extends string>({
  label, options, value, onChange,
}: { label: string; options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className="px-3.5 py-1.5 text-[12px] font-black rounded-full border transition-all"
            style={{
              background:  value === opt.value ? T.brand : T.card,
              color:       value === opt.value ? "#fff"  : T.muted,
              borderColor: value === opt.value ? T.brand : T.border,
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Checkbox group for multi-select question types
function CheckGroup({
  label, options, values, onChange,
}: {
  label:    string;
  options:  { value: QuestionType; label: string; icon: string }[];
  values:   QuestionType[];
  onChange: (v: QuestionType[]) => void;
}) {
  const toggle = (val: QuestionType) => {
    if (values.includes(val)) {
      if (values.length > 1) onChange(values.filter(v => v !== val));
    } else {
      onChange([...values, val]);
    }
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map(opt => {
          const active = values.includes(opt.value);
          return (
            <button key={opt.value} onClick={() => toggle(opt.value)}
              className="flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold rounded-xl border text-left transition-all"
              style={{
                background:  active ? "#F0FDF4" : T.card,
                borderColor: active ? T.brand   : T.border,
                color:       active ? T.brand   : T.muted,
              }}>
              <span>{opt.icon}</span>
              <span className="leading-tight">{opt.label}</span>
              {active && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  q, index, showAnswers,
}: { q: QuizQuestion; index: number; showAnswers: boolean }) {
  const typeMeta = TYPE_META[q.type];
  const diffMeta = DIFF_META[q.difficulty];

  return (
    <div className="p-5 rounded-2xl border"
      style={{ background: T.card, borderColor: T.border }}>

      {/* Question header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Number */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[13px] text-white shrink-0"
          style={{ background: T.brand }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: typeMeta.bg, color: typeMeta.text }}>
              {typeMeta.icon} {typeMeta.label}
            </span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
              style={{ background: diffMeta.color }}>
              {diffMeta.label}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#F3F4F6", color: T.muted }}>
              {SKILL_META[q.skill]}
            </span>
          </div>
          {/* Question text */}
          <p className="font-black text-[15px] leading-snug" style={{ color: T.text }}>
            {q.question}
          </p>
        </div>
      </div>

      {/* Options / answer area */}
      {q.type === "multiple_choice" && q.options && (
        <div className="ml-11 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {q.options.map((opt, i) => {
            const isCorrect = opt.toLowerCase() === q.correct_answer.toLowerCase() ||
              q.correct_answer.toLowerCase().includes(opt.toLowerCase()) ||
              opt.toLowerCase().includes(q.correct_answer.toLowerCase());
            const label = ["A", "B", "C", "D"][i] ?? String.fromCharCode(65 + i);
            return (
              <div key={i}
                className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-[13px] font-nunito transition-colors"
                style={{
                  background:  showAnswers && isCorrect ? "#F0FDF4" : "#F9FAFB",
                  borderColor: showAnswers && isCorrect ? T.brand   : T.border,
                  color:       showAnswers && isCorrect ? T.brand   : T.text,
                  fontWeight:  showAnswers && isCorrect ? 700        : 400,
                }}>
                <span className="font-black text-[12px] shrink-0 mt-0.5" style={{ color: T.muted }}>{label}.</span>
                <span className="flex-1">{opt}</span>
                {showAnswers && isCorrect && <span className="shrink-0 text-[14px]">✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {q.type === "true_false" && (
        <div className="ml-11 flex gap-3">
          {["True", "False"].map(opt => {
            const isCorrect = opt.toLowerCase() === q.correct_answer.toLowerCase();
            return (
              <div key={opt}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[13px] font-bold transition-colors"
                style={{
                  background:  showAnswers && isCorrect ? "#F0FDF4" : "#F9FAFB",
                  borderColor: showAnswers && isCorrect ? T.brand   : T.border,
                  color:       showAnswers && isCorrect ? T.brand   : T.text,
                }}>
                <span className="text-[14px]">{opt === "True" ? "○" : "○"}</span>
                {opt}
                {showAnswers && isCorrect && <span>✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {q.type === "fill_blank" && (
        <div className="ml-11">
          {showAnswers ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ background: "#F0FDF4", border: `1px solid #BBF7D0` }}>
              <span className="text-[13px] font-black" style={{ color: T.brand }}>Answer:</span>
              <span className="text-[13px] font-bold font-nunito" style={{ color: T.brand }}>{q.correct_answer}</span>
            </div>
          ) : (
            <div className="h-9 rounded-xl" style={{ background: "#F9FAFB", border: `1px solid ${T.border}` }} />
          )}
        </div>
      )}

      {q.type === "short_answer" && (
        <div className="ml-11">
          {showAnswers ? (
            <div className="px-4 py-3 rounded-xl text-[13px] font-nunito leading-relaxed"
              style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, color: "#166534" }}>
              <span className="font-black">Model answer: </span>{q.correct_answer}
            </div>
          ) : (
            <div className="space-y-1.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 rounded-lg" style={{ background: "#F9FAFB", border: `1px solid ${T.border}` }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explanation and tip — teacher key only */}
      {showAnswers && (
        <div className="ml-11 mt-4 space-y-2">
          {q.explanation && (
            <p className="text-[12px] font-nunito leading-relaxed px-3 py-2 rounded-lg"
              style={{ background: "#FFFBEB", color: "#78350F", border: "1px solid #FDE68A" }}>
              💡 {q.explanation}
            </p>
          )}
          {q.teacher_tip && (
            <p className="text-[11px] font-nunito leading-relaxed px-3 py-2 rounded-lg"
              style={{ background: "#F5F3FF", color: "#3B0764", border: "1px solid #DDD6FE" }}>
              🗣 {q.teacher_tip}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Step = "configure" | "generating" | "quiz";

interface Props {
  teacher: TeacherProfile | null;
  stories: StoryRef[];
}

export default function QuizGeneratorView({ teacher, stories }: Props) {
  // Config state
  const [storyId,       setStoryId]       = useState("");
  const [language,      setLanguage]      = useState("en");
  const [ageRange,      setAgeRange]      = useState("8-10");
  const [questionCount, setQuestionCount] = useState("8");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["multiple_choice", "true_false"]);
  const [difficultyMix, setDifficultyMix] = useState<DifficultyMix>("balanced");
  const [storyContext,  setStoryContext]  = useState("");
  const [customFocus,   setCustomFocus]   = useState("");

  // Flow state
  const [step,        setStep]        = useState<Step>("configure");
  const [quiz,        setQuiz]        = useState<Quiz | null>(null);
  const [genAt,       setGenAt]       = useState<string | null>(null);
  const [genError,    setGenError]    = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const { save, saving: isSaving, savedId, reset: resetSave } = useSaveMaterial(teacher?.id);

  const selectedStory = stories.find(s => s.story_id === storyId) ?? null;
  const storyTitle    = selectedStory?.story_title ?? "Custom Quiz";

  // ── Generate ───────────────────────────────────────────────────────────────
  const generate = useCallback(async (regenerate = false) => {
    if (!teacher) return;
    setStep("generating");
    setGenError(null);
    if (!regenerate) { setQuiz(null); resetSave(); }
    setShowAnswers(false);

    try {
      let vocabulary: string[] = [];
      if (storyId) {
        const { data: ctx } = await supabase.rpc("get_story_lesson_context", {
          p_story_id: storyId,
          p_language: language,
        });
        if (ctx && Array.isArray((ctx as Record<string, unknown>).vocabulary)) {
          vocabulary = ((ctx as Record<string, unknown>).vocabulary as unknown[])
            .filter((w): w is string => typeof w === "string");
        }
      }

      const res = await authedFetch("/api/quiz-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId:       storyId || undefined,
          storyTitle,
          vocabulary,
          language,
          ageRange,
          questionCount: Number(questionCount),
          questionTypes,
          difficultyMix,
          storyContext,
          customFocus,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { quiz: Quiz; generatedAt: string };
      setQuiz(data.quiz);
      setGenAt(data.generatedAt);
      setStep("quiz");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed. Please try again.");
      setStep("configure");
    }
  }, [teacher, storyId, storyTitle, language, ageRange, questionCount, questionTypes, difficultyMix, storyContext, customFocus]);

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => { window.print(); }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #quiz-print-root, #quiz-print-root * { visibility: visible !important; }
          #quiz-print-root { position: fixed; top: 0; left: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6">

        {/* ── Config form ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {step !== "quiz" && (
            <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Left column */}
                <div className="space-y-4">
                  <FieldCard>
                    {/* Story picker */}
                    <div>
                      <Label>Story (optional)</Label>
                      <select value={storyId} onChange={e => setStoryId(e.target.value)}
                        className="w-full px-4 py-2.5 text-[13px] focus:outline-none transition"
                        style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text, background: T.card }}>
                        <option value="">No specific story — custom topic</option>
                        {stories.map(s => (
                          <option key={s.story_id} value={s.story_id}>{s.story_title}</option>
                        ))}
                      </select>
                    </div>
                    <PillGroup
                      label="Language"
                      value={language}
                      onChange={setLanguage}
                      options={[
                        { value: "en", label: "🇬🇧 English"     },
                        { value: "fr", label: "🇫🇷 French"      },
                        { value: "rw", label: "🇷🇼 Kinyarwanda" },
                      ]}
                    />
                    <PillGroup
                      label="Student Age"
                      value={ageRange}
                      onChange={setAgeRange}
                      options={[
                        { value: "5-7",  label: "5–7 yrs"  },
                        { value: "8-10", label: "8–10 yrs" },
                        { value: "11+",  label: "11+ yrs"  },
                      ]}
                    />
                  </FieldCard>

                  <FieldCard>
                    <PillGroup
                      label="Number of Questions"
                      value={questionCount}
                      onChange={setQuestionCount}
                      options={[
                        { value: "5",  label: "5 questions"  },
                        { value: "8",  label: "8 questions"  },
                        { value: "10", label: "10 questions" },
                        { value: "15", label: "15 questions" },
                      ]}
                    />
                    <PillGroup
                      label="Difficulty Mix"
                      value={difficultyMix}
                      onChange={setDifficultyMix}
                      options={[
                        { value: "easy_heavy", label: "Mostly Easy"   },
                        { value: "balanced",   label: "Balanced"      },
                        { value: "hard_heavy", label: "Challenging"   },
                      ]}
                    />
                  </FieldCard>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <FieldCard>
                    <CheckGroup
                      label="Question Types"
                      values={questionTypes}
                      onChange={setQuestionTypes}
                      options={[
                        { value: "multiple_choice", label: "Multiple Choice", icon: "🔵" },
                        { value: "true_false",      label: "True / False",    icon: "🟡" },
                        { value: "fill_blank",      label: "Fill the Blank",  icon: "🟢" },
                        { value: "short_answer",    label: "Short Answer",    icon: "🔴" },
                      ]}
                    />
                  </FieldCard>

                  <FieldCard>
                    <div>
                      <Label>Story Summary (optional)</Label>
                      <textarea
                        value={storyContext}
                        onChange={e => setStoryContext(e.target.value)}
                        rows={3}
                        placeholder="Paste a short summary or key plot points so the AI can write better comprehension questions."
                        className="w-full px-4 py-3 text-[13px] leading-relaxed resize-none focus:outline-none transition font-nunito"
                        style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
                      />
                    </div>
                    <div>
                      <Label>Custom Focus (optional)</Label>
                      <textarea
                        value={customFocus}
                        onChange={e => setCustomFocus(e.target.value)}
                        rows={2}
                        placeholder="e.g. Focus on animal vocabulary. Include at least 2 inference questions."
                        className="w-full px-4 py-3 text-[13px] leading-relaxed resize-none focus:outline-none transition font-nunito"
                        style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
                      />
                    </div>
                  </FieldCard>

                  {genError && (
                    <div className="px-4 py-3 rounded-xl text-[13px] font-nunito"
                      style={{ background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3" }}>
                      ⚠️ {genError}
                    </div>
                  )}

                  <button onClick={() => generate()}
                    className="w-full py-4 text-white font-black text-[15px] flex items-center justify-center gap-2.5 transition hover:opacity-90"
                    style={{ background: T.brand, borderRadius: T.leaf }}>
                    ✨ Generate Quiz
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Generating spinner ───────────────────────────────────────────── */}
        <AnimatePresence>
          {step === "generating" && (
            <motion.div key="spinner"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-5"
              style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf }}>
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${T.brand} transparent transparent transparent` }} />
                <span className="absolute inset-0 flex items-center justify-center text-xl">✏️</span>
              </div>
              <div className="text-center">
                <p className="font-black text-[17px]" style={{ color: T.text }}>Writing your quiz…</p>
                <p className="text-[13px] font-nunito mt-1.5" style={{ color: T.muted }}>
                  The AI is crafting questions, distractors, and answer keys.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quiz view ────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {step === "quiz" && quiz && (
            <motion.div key="quiz"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-5">

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("configure")}
                    className="px-4 py-2 text-[13px] font-black rounded-full border hover:bg-gray-50 transition"
                    style={{ borderColor: T.border, color: T.muted }}>
                    ← Edit config
                  </button>
                  <button onClick={() => generate(true)}
                    className="px-4 py-2 text-[13px] font-black rounded-full border hover:bg-gray-50 transition"
                    style={{ borderColor: T.brand, color: T.brand }}>
                    ↻ Regenerate
                  </button>
                  {savedId ? (
                    <span className="px-4 py-2 text-[13px] font-black rounded-full"
                      style={{ background: "#F0FDF4", color: T.brand, border: "1px solid #BBF7D0" }}>
                      ✓ Saved
                    </span>
                  ) : (
                    <button
                      onClick={() => quiz && save({
                        type: "quiz", title: quiz.title, storyTitle: storyTitle !== "Custom Quiz" ? storyTitle : undefined,
                        language, content: quiz,
                      })}
                      disabled={isSaving}
                      className="px-4 py-2 text-[13px] font-black rounded-full border hover:bg-gray-50 transition disabled:opacity-50"
                      style={{ borderColor: T.border, color: T.muted }}>
                      {isSaving ? "Saving…" : "💾 Save"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Student / Key toggle */}
                  <div className="flex rounded-full overflow-hidden border"
                    style={{ borderColor: T.border }}>
                    {[
                      { val: false, label: "👤 Student View" },
                      { val: true,  label: "🗝 Answer Key"   },
                    ].map(({ val, label }) => (
                      <button key={String(val)} onClick={() => setShowAnswers(val)}
                        className="px-4 py-2 text-[12px] font-black transition"
                        style={{
                          background: showAnswers === val ? T.brand : T.card,
                          color:      showAnswers === val ? "#fff"  : T.muted,
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={handlePrint}
                    className="px-5 py-2 text-[13px] font-black text-white rounded-full flex items-center gap-2 hover:opacity-90 transition"
                    style={{ background: T.brand }}>
                    🖨 Print
                  </button>
                </div>
              </div>

              {/* Printable content */}
              <div id="quiz-print-root">

                {/* Quiz header */}
                <div className="p-7 mb-5"
                  style={{ background: T.brand, borderRadius: T.leaf }}>
                  <p className="text-[11px] font-black uppercase tracking-widest text-green-200 mb-2">
                    {showAnswers ? "Answer Key — Teacher Copy" : "Quiz — Student Copy"}
                  </p>
                  <h1 className="font-baloo font-black text-[22px] text-white leading-tight mb-4">{quiz.title}</h1>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: "📚", val: storyTitle },
                      { icon: "🌐", val: { en:"English", fr:"French", rw:"Kinyarwanda" }[language] ?? language },
                      { icon: "👥", val: `Ages ${ageRange}` },
                      { icon: "❓", val: `${quiz.questions.length} questions` },
                      { icon: "⏱",  val: `~${quiz.estimated_minutes} min` },
                    ].map(({ icon, val }) => (
                      <span key={val}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold text-white"
                        style={{ background: "rgba(255,255,255,0.18)" }}>
                        {icon} {val}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Student name + date line */}
                {!showAnswers && (
                  <div className="mb-5 flex gap-8">
                    {["Name", "Date", "Class"].map(f => (
                      <div key={f} className="flex-1">
                        <p className="text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: T.muted }}>{f}</p>
                        <div className="h-8 border-b-2" style={{ borderColor: T.border }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Difficulty summary strip */}
                <div className="flex gap-4 mb-5 no-print">
                  {(["easy", "medium", "hard"] as QuizDifficulty[]).map(d => {
                    const count = quiz.questions.filter(q => q.difficulty === d).length;
                    const meta  = DIFF_META[d];
                    return count > 0 ? (
                      <div key={d} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                        <span className="text-[11px] font-bold" style={{ color: T.muted }}>
                          {count} {meta.label}
                        </span>
                      </div>
                    ) : null;
                  })}
                  <div className="flex items-center gap-1.5 ml-auto no-print">
                    {questionTypes.map(t => {
                      const count = quiz.questions.filter(q => q.type === t).length;
                      const meta  = TYPE_META[t];
                      return count > 0 ? (
                        <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: meta.bg, color: meta.text }}>
                          {meta.icon} {count}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  {quiz.questions.map((q, i) => (
                    <QuestionCard key={q.id} q={q} index={i} showAnswers={showAnswers} />
                  ))}
                </div>

                {/* Teacher notes — answer key only */}
                {showAnswers && quiz.teacher_notes && (
                  <div className="mt-5 p-5 rounded-2xl"
                    style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#92400E" }}>
                      💡 Teacher Notes
                    </p>
                    <p className="text-[13px] font-nunito leading-relaxed" style={{ color: "#78350F" }}>
                      {quiz.teacher_notes}
                    </p>
                  </div>
                )}

                {genAt && (
                  <p className="text-[10px] text-center mt-4 font-semibold no-print" style={{ color: "#D1D5DB" }}>
                    Generated by AI · {new Date(genAt).toLocaleString()} · NIMIPIKO Teacher Portal
                  </p>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
