"use client";

/**
 * HomeworkGeneratorView — Phase 5.5
 *
 * Three-step flow: configure → generating → homework view
 *
 * Key personalization feature: "Load class context" button fetches the
 * classroom learning summary to pull vocabulary review words and the class's
 * dominant reading level — both are forwarded to the AI to calibrate the
 * homework to where the class actually is.
 *
 * Two print modes: Student Copy (clean handout) and Parent Guide
 * (includes answer guides and parent tips).
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authedFetch } from "@/lib/authedFetch";
import supabase from "@/lib/supabaseClient";
import { useSaveMaterial } from "@/lib/useSaveMaterial";
import type { TeacherProfile } from "@/app/teacher/teacherAuth";
import type {
  HomeworkDocument,
  HomeworkTask,
  HomeworkVocabWord,
  HomeworkFocus,
  HomeworkAgeRange,
  HomeworkDuration,
  HomeworkLanguage,
  TaskType,
} from "@/lib/homeworkGenerator";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  card:      "var(--ds-surface-card,#FFFFFF)",
  border:    "var(--ds-border-primary,#E5E7EB)",
  text:      "var(--ds-text-primary,#111827)",
  muted:     "var(--ds-text-secondary,#6B7280)",
  brand:     "var(--ds-brand-primary,#15803D)",
  leaf:      "var(--leaf-r,20px 20px 20px 5px)",
  leafSm:    "var(--leaf-r-sm,14px 14px 14px 4px)",
};

// ── Task type metadata ────────────────────────────────────────────────────────

const TASK_META: Record<TaskType, { icon: string; label: string; bg: string; text: string }> = {
  reading:       { icon: "📖", label: "Read",        bg: "#EFF6FF", text: "#1D4ED8" },
  comprehension: { icon: "❓", label: "Questions",   bg: "#FFFBEB", text: "#92400E" },
  vocabulary:    { icon: "📗", label: "Vocabulary",  bg: "#F5F3FF", text: "#6D28D9" },
  writing:       { icon: "✏️", label: "Write",       bg: "#F0FDF4", text: "#166534" },
  drawing:       { icon: "🎨", label: "Draw",        bg: "#FFF1F2", text: "#BE123C" },
  oral:          { icon: "🗣",  label: "Speak",       bg: "#ECFDF5", text: "#064E3B" },
  matching:      { icon: "🔗", label: "Match",       bg: "#F5F3FF", text: "#4C1D95" },
};

// ── Classroom context snapshot ────────────────────────────────────────────────

interface ClassContext {
  dominantLevel:   string;
  reviewWords:     string[];
  totalStudents:   number;
  activeThisWeek:  number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface StoryRef { story_id: string; story_title: string }

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>
      {children}
    </p>
  );
}

function FieldCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-5 space-y-4"
      style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf }}>
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

// ── Writing / drawing space ───────────────────────────────────────────────────

function WritingLines({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2 mt-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-7 border-b" style={{ borderColor: "#D1D5DB" }} />
      ))}
    </div>
  );
}

function DrawingBox() {
  return (
    <div className="mt-2 h-36 rounded-xl border-2 border-dashed flex items-center justify-center"
      style={{ borderColor: "#D1D5DB" }}>
      <span className="text-[13px] font-nunito" style={{ color: "#D1D5DB" }}>Draw here</span>
    </div>
  );
}

// ── Task renderer ─────────────────────────────────────────────────────────────

function TaskCard({
  task, index, showGuide,
}: { task: HomeworkTask; index: number; showGuide: boolean }) {
  const meta = TASK_META[task.type];

  return (
    <div className="p-5 rounded-2xl border" style={{ background: T.card, borderColor: T.border }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[13px] text-white shrink-0"
          style={{ background: T.brand }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-[15px]" style={{ color: T.text }}>{task.title}</span>
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: meta.bg, color: meta.text }}>
              {meta.icon} {meta.label}
            </span>
            <span className="text-[10px] font-bold ml-auto shrink-0" style={{ color: T.muted }}>
              {task.estimated_minutes} min
            </span>
          </div>
        </div>
      </div>

      {/* Instruction */}
      <p className="text-[13px] font-nunito leading-relaxed mb-3 ml-11" style={{ color: T.text }}>
        {task.instruction}
      </p>

      {/* Type-specific rendering */}
      <div className="ml-11">

        {/* Comprehension: numbered questions + answer lines */}
        {task.type === "comprehension" && task.items && (
          <div className="space-y-4">
            {task.items.map((q, i) => (
              <div key={i}>
                <p className="text-[13px] font-bold mb-1" style={{ color: T.text }}>
                  {i + 1}. {q}
                </p>
                <WritingLines count={2} />
              </div>
            ))}
          </div>
        )}

        {/* Vocabulary: two-column word + write activity */}
        {task.type === "vocabulary" && task.items && (
          <div className="grid grid-cols-2 gap-2">
            {task.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "#F9FAFB", border: `1px solid ${T.border}` }}>
                <span className="text-[12px] font-bold" style={{ color: T.brand }}>{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* Matching: two-column side by side */}
        {task.type === "matching" && task.items && task.items.length >= 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              {task.items.filter((_, i) => i % 2 === 0).map((item, i) => (
                <div key={i} className="px-3 py-2 rounded-xl text-[12px] font-bold"
                  style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {task.items.filter((_, i) => i % 2 === 1).map((item, i) => (
                <div key={i} className="px-3 py-2 rounded-xl text-[12px] font-nunito"
                  style={{ background: "#F9FAFB", border: `1px solid ${T.border}`, color: T.muted }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Writing: lined space */}
        {task.type === "writing" && (
          <>
            {task.items && task.items.length > 0 && (
              <div className="space-y-1 mb-2">
                {task.items.map((starter, i) => (
                  <p key={i} className="text-[12px] font-bold" style={{ color: T.muted }}>
                    → {starter}
                  </p>
                ))}
              </div>
            )}
            <WritingLines count={5} />
          </>
        )}

        {/* Drawing: box */}
        {task.type === "drawing" && (
          <>
            {task.items && task.items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {task.items.map((lbl, i) => (
                  <span key={i} className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "#FFF1F2", color: "#BE123C" }}>
                    Label: {lbl}
                  </span>
                ))}
              </div>
            )}
            <DrawingBox />
          </>
        )}

        {/* Oral: speech bubble visual */}
        {task.type === "oral" && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
            <span className="text-xl shrink-0">🗣</span>
            <p className="text-[12px] font-nunito leading-relaxed" style={{ color: "#064E3B" }}>
              Tell a family member or read to them out loud!
            </p>
          </div>
        )}

        {/* Reading: minimal — the instruction covers it */}
        {task.type === "reading" && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <span className="text-xl shrink-0">📖</span>
            <p className="text-[12px] font-nunito leading-relaxed" style={{ color: "#1E3A5F" }}>
              Read carefully — then move on to the next activity.
            </p>
          </div>
        )}

        {/* Answer guide — parent/teacher view only */}
        {showGuide && task.answer_guide && (
          <div className="mt-3 px-3 py-2.5 rounded-xl text-[12px] font-nunito leading-relaxed"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#78350F" }}>
            <span className="font-black">✓ Answer guide: </span>{task.answer_guide}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Step = "configure" | "generating" | "homework";

interface Props {
  teacher: TeacherProfile | null;
  stories: StoryRef[];
}

export default function HomeworkGeneratorView({ teacher, stories }: Props) {

  // Config state
  const [storyId,            setStoryId]            = useState("");
  const [language,           setLanguage]           = useState<HomeworkLanguage>("en");
  const [ageRange,           setAgeRange]           = useState<HomeworkAgeRange>("8-10");
  const [duration,           setDuration]           = useState("20");
  const [focus,              setFocus]              = useState<HomeworkFocus>("mixed");
  const [includeParent,      setIncludeParent]      = useState(true);
  const [reviewWords,        setReviewWords]        = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  // Class context
  const [classCtx,      setClassCtx]      = useState<ClassContext | null>(null);
  const [ctxLoading,    setCtxLoading]    = useState(false);
  const [ctxError,      setCtxError]      = useState<string | null>(null);

  // Flow state
  const [step,        setStep]        = useState<Step>("configure");
  const [homework,    setHomework]    = useState<HomeworkDocument | null>(null);
  const [genAt,       setGenAt]       = useState<string | null>(null);
  const [genError,    setGenError]    = useState<string | null>(null);
  const [showGuide,   setShowGuide]   = useState(false);

  const { save, saving: isSaving, savedId, reset: resetSave } = useSaveMaterial(teacher?.id);

  const selectedStory = stories.find(s => s.story_id === storyId) ?? null;
  const storyTitle    = selectedStory?.story_title ?? "Custom Homework";

  // ── Load class context ─────────────────────────────────────────────────────
  // Fires two RPCs in parallel:
  //   1. get_classroom_learning_summary — for dominant reading level + engagement
  //   2. get_classroom_review_words     — for actual word list with student counts
  const loadClassContext = useCallback(async () => {
    if (!teacher) return;
    setCtxLoading(true);
    setCtxError(null);

    const [summaryResult, reviewResult] = await Promise.all([
      supabase.rpc("get_classroom_learning_summary", { p_teacher_id: teacher.id }),
      supabase.rpc("get_classroom_review_words",     { p_teacher_id: teacher.id }),
    ]);

    setCtxLoading(false);

    if (summaryResult.error || !summaryResult.data) {
      setCtxError("Couldn't load class data. Check your connection.");
      return;
    }

    const d   = summaryResult.data as Record<string, unknown>;
    const rl  = (d.reading_levels ?? {}) as Record<string, unknown>;
    const eng = (d.engagement     ?? {}) as Record<string, unknown>;

    // Dominant reading level: highest non-zero bucket from fluent → emerging
    const LEVELS = ["fluent","expanding","developing","beginning","emerging"] as const;
    const dominant = LEVELS.find(l => Number(rl[l] ?? 0) > 0) ?? "emerging";

    // Review words from the dedicated RPC (actual word strings, sorted by class-wide frequency)
    type ReviewWordRow = { word: string; student_count: number };
    const rw = reviewResult.data as Record<string, unknown> | null;
    const wordRows: ReviewWordRow[] = Array.isArray(rw?.review_words)
      ? (rw.review_words as unknown[])
          .filter((w): w is ReviewWordRow =>
            typeof (w as ReviewWordRow).word === "string" && (w as ReviewWordRow).word.length > 0)
      : [];

    const wordList = wordRows.map(r => r.word);

    const ctx: ClassContext = {
      dominantLevel:  dominant,
      reviewWords:    wordList,
      totalStudents:  Number(rl.total ?? 0),
      activeThisWeek: Number(eng.active_this_week ?? 0),
    };

    setClassCtx(ctx);

    // Auto-populate textarea only if teacher hasn't typed anything yet
    if (wordList.length > 0 && !reviewWords.trim()) {
      setReviewWords(wordList.join(", "));
    }
  }, [teacher, reviewWords]);

  // ── Generate homework ──────────────────────────────────────────────────────
  const generate = useCallback(async (regenerate = false) => {
    if (!teacher) return;
    setStep("generating");
    setGenError(null);
    if (!regenerate) { setHomework(null); resetSave(); }
    setShowGuide(false);

    try {
      // Fetch story vocabulary
      let storyVocabulary: string[] = [];
      if (storyId) {
        const { data: ctx } = await supabase.rpc("get_story_lesson_context", {
          p_story_id: storyId,
          p_language: language,
        });
        if (ctx && Array.isArray((ctx as Record<string, unknown>).vocabulary)) {
          storyVocabulary = ((ctx as Record<string, unknown>).vocabulary as unknown[])
            .filter((w): w is string => typeof w === "string");
        }
      }

      // Parse teacher-supplied review words (comma or newline separated)
      const parsedReviewWords = reviewWords
        .split(/[,\n]+/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0 && !w.startsWith("("));

      const res = await authedFetch("/api/homework-generator", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId:              storyId || undefined,
          storyTitle,
          storyVocabulary,
          language,
          ageRange,
          durationMinutes:      Number(duration),
          focus,
          reviewWords:          parsedReviewWords,
          dominantReadingLevel: classCtx?.dominantLevel ?? null,
          includeParentNote:    includeParent,
          customInstructions,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { homework: HomeworkDocument; generatedAt: string };
      setHomework(data.homework);
      setGenAt(data.generatedAt);
      setStep("homework");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed. Please try again.");
      setStep("configure");
    }
  }, [teacher, storyId, storyTitle, language, ageRange, duration, focus, reviewWords,
      classCtx, includeParent, customInstructions]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #hw-print-root, #hw-print-root * { visibility: visible !important; }
          #hw-print-root { position: fixed; top: 0; left: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6">

        {/* ── Config form ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {step !== "homework" && (
            <motion.div key="form"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Left column */}
                <div className="space-y-4">
                  <FieldCard>
                    <div>
                      <Label>Story (optional)</Label>
                      <select value={storyId} onChange={e => setStoryId(e.target.value)}
                        className="w-full px-4 py-2.5 text-[13px] focus:outline-none"
                        style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm,
                                 color: T.text, background: T.card }}>
                        <option value="">No specific story</option>
                        {stories.map(s => (
                          <option key={s.story_id} value={s.story_id}>{s.story_title}</option>
                        ))}
                      </select>
                    </div>
                    <PillGroup label="Language" value={language} onChange={setLanguage}
                      options={[
                        { value: "en", label: "🇬🇧 English"     },
                        { value: "fr", label: "🇫🇷 French"      },
                        { value: "rw", label: "🇷🇼 Kinyarwanda" },
                      ]} />
                    <PillGroup label="Student Age" value={ageRange} onChange={setAgeRange}
                      options={[
                        { value: "5-7",  label: "5–7 yrs"  },
                        { value: "8-10", label: "8–10 yrs" },
                        { value: "11+",  label: "11+ yrs"  },
                      ]} />
                  </FieldCard>

                  <FieldCard>
                    <PillGroup label="Homework Duration" value={duration} onChange={setDuration}
                      options={[
                        { value: "15", label: "15 min" },
                        { value: "20", label: "20 min" },
                        { value: "30", label: "30 min" },
                        { value: "40", label: "40 min" },
                      ]} />
                    <PillGroup label="Homework Focus" value={focus} onChange={setFocus}
                      options={[
                        { value: "vocabulary",    label: "📗 Vocabulary"     },
                        { value: "comprehension", label: "📖 Comprehension"  },
                        { value: "creative",      label: "🎨 Creative"       },
                        { value: "mixed",         label: "⚡ Mixed"          },
                      ]} />
                  </FieldCard>
                </div>

                {/* Right column */}
                <div className="space-y-4">

                  {/* ── Class context card ──────────────────────────────── */}
                  <div className="p-5 space-y-3"
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Personalize for your class</Label>
                        <p className="text-[12px] font-nunito" style={{ color: T.muted }}>
                          Load your class&apos;s reading level and vocabulary gaps.
                        </p>
                      </div>
                      <button
                        onClick={loadClassContext}
                        disabled={ctxLoading}
                        className="shrink-0 px-3.5 py-2 text-[12px] font-black rounded-full border transition disabled:opacity-50"
                        style={{ borderColor: T.brand, color: T.brand, background: "#F0FDF4" }}>
                        {ctxLoading ? "Loading…" : classCtx ? "↻ Refresh" : "📊 Load"}
                      </button>
                    </div>

                    {ctxError && (
                      <p className="text-[12px] font-nunito" style={{ color: "#BE123C" }}>{ctxError}</p>
                    )}

                    {classCtx && (
                      <div className="p-3 rounded-xl space-y-2"
                        style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black" style={{ color: T.brand }}>
                            {classCtx.totalStudents} students
                          </span>
                          <span className="text-[11px]" style={{ color: T.muted }}>·</span>
                          <span className="text-[11px] font-bold capitalize" style={{ color: T.brand }}>
                            Mostly {classCtx.dominantLevel} level
                          </span>
                          <span className="text-[11px]" style={{ color: T.muted }}>·</span>
                          <span className="text-[11px] font-bold" style={{ color: T.brand }}>
                            {classCtx.activeThisWeek} active this week
                          </span>
                        </div>
                        {classCtx.reviewWords.length > 0 ? (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5"
                              style={{ color: "#166534" }}>
                              🔁 {classCtx.reviewWords.length} words auto-loaded for review
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {classCtx.reviewWords.slice(0, 10).map(w => (
                                <span key={w}
                                  className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: "#DCFCE7", color: "#14532D" }}>
                                  {w}
                                </span>
                              ))}
                              {classCtx.reviewWords.length > 10 && (
                                <span className="text-[10px] font-bold" style={{ color: T.muted }}>
                                  +{classCtx.reviewWords.length - 10} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] font-nunito" style={{ color: "#166534" }}>
                            No words currently flagged for review. Reading level will calibrate task difficulty.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <FieldCard>
                    <div>
                      <Label>Vocabulary words to review</Label>
                      <textarea
                        value={reviewWords}
                        onChange={e => setReviewWords(e.target.value)}
                        rows={3}
                        placeholder="e.g. forest, river, brave, hungry&#10;One word per line or comma-separated."
                        className="w-full px-4 py-3 text-[13px] leading-relaxed resize-none focus:outline-none font-nunito"
                        style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
                      />
                      <p className="text-[11px] mt-1 font-nunito" style={{ color: T.muted }}>
                        The AI will build at least one activity around these words.
                      </p>
                    </div>

                    {/* Parent note toggle */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIncludeParent(p => !p)}
                        className="w-10 h-5 rounded-full relative transition-colors shrink-0"
                        style={{ background: includeParent ? T.brand : "#D1D5DB" }}>
                        <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                          style={{ left: includeParent ? "calc(100% - 18px)" : "2px" }} />
                      </button>
                      <span className="text-[13px] font-bold" style={{ color: T.text }}>
                        Include parent note
                      </span>
                    </div>

                    <div>
                      <Label>Custom Instructions (optional)</Label>
                      <textarea
                        value={customInstructions}
                        onChange={e => setCustomInstructions(e.target.value)}
                        rows={2}
                        placeholder="e.g. Include a drawing activity. Make it suitable for a student who missed class."
                        className="w-full px-4 py-3 text-[13px] leading-relaxed resize-none focus:outline-none font-nunito"
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
                    className="w-full py-4 text-white font-black text-[15px] flex items-center justify-center gap-2.5 hover:opacity-90 transition"
                    style={{ background: T.brand, borderRadius: T.leaf }}>
                    ✨ Generate Homework
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
                <span className="absolute inset-0 flex items-center justify-center text-xl">📝</span>
              </div>
              <div className="text-center">
                <p className="font-black text-[17px]" style={{ color: T.text }}>Creating homework…</p>
                <p className="text-[13px] font-nunito mt-1.5" style={{ color: T.muted }}>
                  The AI is writing tasks, vocabulary activities, and a parent note.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Homework view ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {step === "homework" && homework && (
            <motion.div key="hw"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-5">

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("configure")}
                    className="px-4 py-2 text-[13px] font-black rounded-full border hover:bg-gray-50 transition"
                    style={{ borderColor: T.border, color: T.muted }}>
                    ← Edit
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
                      onClick={() => homework && save({
                        type: "homework", title: homework.title,
                        storyTitle: storyTitle !== "Custom Homework" ? storyTitle : undefined,
                        language, content: homework,
                      })}
                      disabled={isSaving}
                      className="px-4 py-2 text-[13px] font-black rounded-full border hover:bg-gray-50 transition disabled:opacity-50"
                      style={{ borderColor: T.border, color: T.muted }}>
                      {isSaving ? "Saving…" : "💾 Save"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-full overflow-hidden border" style={{ borderColor: T.border }}>
                    {[
                      { val: false, label: "👤 Student Copy" },
                      { val: true,  label: "📋 Parent Guide" },
                    ].map(({ val, label }) => (
                      <button key={String(val)} onClick={() => setShowGuide(val)}
                        className="px-4 py-2 text-[12px] font-black transition"
                        style={{
                          background: showGuide === val ? T.brand : T.card,
                          color:      showGuide === val ? "#fff"  : T.muted,
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => window.print()}
                    className="px-5 py-2 text-[13px] font-black text-white rounded-full flex items-center gap-2 hover:opacity-90 transition"
                    style={{ background: T.brand }}>
                    🖨 Print
                  </button>
                </div>
              </div>

              {/* Printable content */}
              <div id="hw-print-root">

                {/* Parent note — top of the page, only if toggled/selected */}
                {(showGuide || includeParent) && homework.parent_intro && (
                  <div className="p-6 mb-5"
                    style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: T.leaf }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#92400E" }}>
                      📬 Dear Parent / Guardian
                    </p>
                    <p className="text-[13px] font-nunito leading-relaxed" style={{ color: "#78350F" }}>
                      {homework.parent_intro}
                    </p>
                    {showGuide && homework.teacher_notes && (
                      <div className="mt-3 pt-3" style={{ borderTop: "1px solid #FDE68A" }}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#92400E" }}>
                          📌 Teacher Notes (internal — do not print for students)
                        </p>
                        <p className="text-[12px] font-nunito leading-relaxed" style={{ color: "#78350F" }}>
                          {homework.teacher_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Homework header */}
                <div className="p-7 mb-5"
                  style={{ background: T.brand, borderRadius: T.leaf }}>
                  <p className="text-[11px] font-black uppercase tracking-widest text-green-200 mb-2">
                    Homework
                  </p>
                  <h1 className="font-baloo font-black text-[22px] text-white leading-tight mb-3">
                    {homework.title}
                  </h1>
                  <p className="text-green-100 text-[13px] font-nunito mb-4">
                    {homework.learning_focus}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: "📚", val: storyTitle },
                      { icon: "🌐", val: { en:"English", fr:"French", rw:"Kinyarwanda" }[language] ?? language },
                      { icon: "👥", val: `Ages ${ageRange}` },
                      { icon: "⏱", val: `~${homework.estimated_minutes} min` },
                      { icon: "🎯", val: { vocabulary:"Vocabulary", comprehension:"Comprehension", creative:"Creative", mixed:"Mixed" }[focus] },
                    ].map(({ icon, val }) => (
                      <span key={val}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold text-white"
                        style={{ background: "rgba(255,255,255,0.18)" }}>
                        {icon} {val}
                      </span>
                    ))}
                  </div>
                  {classCtx && (
                    <p className="text-green-200 text-[11px] font-semibold mt-3">
                      📊 Personalized for your class · {classCtx.dominantLevel} level · {classCtx.totalStudents} students
                    </p>
                  )}
                </div>

                {/* Name / date line */}
                <div className="mb-5 flex gap-8">
                  {["Name", "Date", "Class"].map(f => (
                    <div key={f} className="flex-1">
                      <p className="text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: T.muted }}>{f}</p>
                      <div className="h-8 border-b-2" style={{ borderColor: T.border }} />
                    </div>
                  ))}
                </div>

                {/* Vocabulary spotlight */}
                {homework.vocabulary_spotlight.length > 0 && (
                  <div className="mb-5 p-5"
                    style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: T.leaf }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "#4C1D95" }}>
                      📗 Vocabulary to Know
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {homework.vocabulary_spotlight.map((v: HomeworkVocabWord) => (
                        <div key={v.word} className="flex gap-2 items-baseline">
                          <span className="font-black text-[13px] shrink-0" style={{ color: "#6D28D9" }}>
                            {v.word}:
                          </span>
                          <span className="text-[12px] font-nunito leading-relaxed" style={{ color: "#3B0764" }}>
                            {v.definition}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                <div className="space-y-4">
                  {homework.tasks.map((task: HomeworkTask, i: number) => (
                    <TaskCard key={i} task={task} index={i} showGuide={showGuide} />
                  ))}
                </div>

                {/* Encouragement footer */}
                {homework.encouragement && (
                  <div className="mt-5 p-4 text-center rounded-2xl"
                    style={{ background: T.brand }}>
                    <p className="font-baloo font-black text-[16px] text-white">
                      ⭐ {homework.encouragement}
                    </p>
                  </div>
                )}

                {genAt && (
                  <p className="text-[10px] text-center mt-3 font-semibold no-print"
                    style={{ color: "#D1D5DB" }}>
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
