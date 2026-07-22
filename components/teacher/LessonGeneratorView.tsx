"use client";

/**
 * LessonGeneratorView — Phase 5.3
 *
 * Three-step flow:
 *   configure → generating → plan
 *
 * Completely independent from classroom analytics. The component only knows
 * about stories (for the picker) and lesson configuration. No student data
 * is consumed or displayed here.
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authedFetch } from "@/lib/authedFetch";
import supabase from "@/lib/supabaseClient";
import { useSaveMaterial } from "@/lib/useSaveMaterial";
import type { TeacherProfile } from "@/app/teacher/teacherAuth";
import type {
  LessonPlan,
  LessonSection,
  VocabItem,
  AssessmentItem,
  LessonFocus,
  LessonAgeRange,
  LessonLanguage,
} from "@/lib/lessonGenerator";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  page:      "var(--ds-surface-page,#F9FAFB)",
  card:      "var(--ds-surface-card,#FFFFFF)",
  border:    "var(--ds-border-primary,#E5E7EB)",
  text:      "var(--ds-text-primary,#111827)",
  muted:     "var(--ds-text-secondary,#6B7280)",
  brand:     "var(--ds-brand-primary,#15803D)",
  brandSoft: "var(--ds-brand-soft,rgba(21,128,61,0.10))",
  leaf:      "var(--leaf-r,20px 20px 20px 5px)",
  leafSm:    "var(--leaf-r-sm,14px 14px 14px 4px)",
};

// ── Story type (subset of StoryBreakdown from teacher/page.tsx) ───────────────

interface StoryRef {
  story_id:    string;
  story_title: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  teacher: TeacherProfile | null;
  stories: StoryRef[];
}

// ── Section colour palette (cycles if > 6 sections) ──────────────────────────

const SECTION_COLORS = [
  { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A5F", dot: "#3B82F6" },
  { bg: "#F0FDF4", border: "#BBF7D0", text: "#14532D", dot: "#22C55E" },
  { bg: "#FFFBEB", border: "#FDE68A", text: "#78350F", dot: "#F59E0B" },
  { bg: "#F5F3FF", border: "#DDD6FE", text: "#3B0764", dot: "#8B5CF6" },
  { bg: "#FFF1F2", border: "#FECDD3", text: "#881337", dot: "#F43F5E" },
  { bg: "#ECFDF5", border: "#A7F3D0", text: "#064E3B", dot: "#10B981" },
];

const ASSESSMENT_TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  comprehension: { bg: "#EFF6FF", text: "#1D4ED8", label: "Comprehension" },
  vocabulary:    { bg: "#F5F3FF", text: "#6D28D9", label: "Vocabulary"    },
  discussion:    { bg: "#F0FDF4", text: "#166534", label: "Discussion"    },
};

// ── Field label + helpers ─────────────────────────────────────────────────────

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

// ── Pill selector ─────────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  label, options, value, onChange,
}: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className="px-3.5 py-1.5 text-[12px] font-black rounded-full border transition-all"
            style={{
              background:   value === opt.value ? T.brand : T.card,
              color:        value === opt.value ? "#fff"   : T.muted,
              borderColor:  value === opt.value ? T.brand  : T.border,
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Step = "configure" | "generating" | "plan";

export default function LessonGeneratorView({ teacher, stories }: Props) {
  // ── Config form state ──────────────────────────────────────────────────────
  const [storyId,    setStoryId]    = useState<string>("");
  const [language,   setLanguage]   = useState<LessonLanguage>("en");
  const [ageRange,   setAgeRange]   = useState<LessonAgeRange>("8-10");
  const [duration,   setDuration]   = useState<string>("45");
  const [focus,      setFocus]      = useState<LessonFocus>("both");
  const [objectives, setObjectives] = useState("");

  // ── Flow state ─────────────────────────────────────────────────────────────
  const [step,      setStep]       = useState<Step>("configure");
  const [plan,      setPlan]       = useState<LessonPlan | null>(null);
  const [genAt,     setGenAt]      = useState<string | null>(null);
  const [genError,  setGenError]   = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const { save, saving: isSaving, savedId, reset: resetSave } = useSaveMaterial(teacher?.id);

  // ── Selected story display title ───────────────────────────────────────────
  const selectedStory = stories.find(s => s.story_id === storyId) ?? null;
  const storyTitle    = selectedStory?.story_title ?? "Custom Lesson";

  // ── Generate ───────────────────────────────────────────────────────────────
  const generate = useCallback(async (regenerate = false) => {
    if (!teacher) return;
    setStep("generating");
    setGenError(null);
    if (!regenerate) { setPlan(null); resetSave(); }

    try {
      // Fetch vocabulary from story if one is selected
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

      const res = await authedFetch("/api/lesson-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId:         storyId || undefined,
          storyTitle,
          vocabulary,
          language,
          ageRange,
          durationMinutes: Number(duration),
          focus,
          customObjectives: objectives,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { plan: LessonPlan; generatedAt: string };
      setPlan(data.plan);
      setGenAt(data.generatedAt);
      setStep("plan");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed. Please try again.");
      setStep("configure");
    }
  }, [teacher, storyId, storyTitle, language, ageRange, duration, focus, objectives]);

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => { window.print(); }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #lesson-print-root, #lesson-print-root * { visibility: visible !important; }
          #lesson-print-root { position: fixed; top: 0; left: 0; width: 100%; padding: 16px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6">

        {/* ── Configure form (always visible, collapses visually when plan is shown) */}
        <AnimatePresence mode="wait">
          {step !== "plan" && (
            <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Left column */}
                <div className="space-y-4">
                  <FieldCard>
                    {/* Story picker */}
                    <div>
                      <Label>Story (optional)</Label>
                      <select
                        value={storyId}
                        onChange={e => {
                          setStoryId(e.target.value);
                          // Auto-detect language from story slug hint if possible
                        }}
                        className="w-full px-4 py-2.5 text-[13px] focus:outline-none transition"
                        style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text, background: T.card }}
                      >
                        <option value="">No specific story — custom theme</option>
                        {stories.map(s => (
                          <option key={s.story_id} value={s.story_id}>{s.story_title}</option>
                        ))}
                      </select>
                      <p className="text-[11px] mt-1.5 font-nunito" style={{ color: T.muted }}>
                        Selecting a story pulls in its vocabulary automatically.
                      </p>
                    </div>

                    {/* Language */}
                    <PillGroup
                      label="Language"
                      value={language}
                      onChange={setLanguage}
                      options={[
                        { value: "en", label: "🇬🇧 English"      },
                        { value: "fr", label: "🇫🇷 French"       },
                        { value: "rw", label: "🇷🇼 Kinyarwanda"  },
                      ]}
                    />
                  </FieldCard>

                  <FieldCard>
                    {/* Age range */}
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

                    {/* Duration */}
                    <PillGroup
                      label="Lesson Duration"
                      value={duration}
                      onChange={setDuration}
                      options={[
                        { value: "20", label: "20 min" },
                        { value: "30", label: "30 min" },
                        { value: "45", label: "45 min" },
                        { value: "60", label: "60 min" },
                      ]}
                    />
                  </FieldCard>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <FieldCard>
                    {/* Focus */}
                    <PillGroup
                      label="Lesson Focus"
                      value={focus}
                      onChange={setFocus}
                      options={[
                        { value: "vocabulary",    label: "📗 Vocabulary"     },
                        { value: "comprehension", label: "📖 Comprehension"  },
                        { value: "both",          label: "⚡ Both"           },
                      ]}
                    />
                  </FieldCard>

                  <FieldCard>
                    {/* Custom objectives */}
                    <div>
                      <Label>Custom Objectives (optional)</Label>
                      <textarea
                        value={objectives}
                        onChange={e => setObjectives(e.target.value)}
                        rows={5}
                        placeholder="e.g. Students will identify rhyming words. Students will retell the story in 3 sentences."
                        className="w-full px-4 py-3 text-[13px] leading-relaxed resize-none focus:outline-none transition font-nunito"
                        style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
                      />
                      <p className="text-[11px] mt-1 font-nunito" style={{ color: T.muted }}>
                        Leave blank and the AI will choose appropriate objectives.
                      </p>
                    </div>
                  </FieldCard>

                  {genError && (
                    <div className="px-4 py-3 rounded-xl text-[13px] font-nunito"
                      style={{ background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3" }}>
                      ⚠️ {genError}
                    </div>
                  )}

                  <button
                    onClick={() => generate()}
                    className="w-full py-4 text-white font-black text-[15px] flex items-center justify-center gap-2.5 transition hover:opacity-90"
                    style={{ background: T.brand, borderRadius: T.leaf }}>
                    ✨ Generate Lesson Plan
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
                <span className="absolute inset-0 flex items-center justify-center text-xl">✨</span>
              </div>
              <div className="text-center">
                <p className="font-black text-[17px]" style={{ color: T.text }}>Building your lesson plan…</p>
                <p className="text-[13px] font-nunito mt-1.5" style={{ color: T.muted }}>
                  The AI is writing sections, vocabulary, and assessment questions.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Generated plan ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {step === "plan" && plan && (
            <motion.div key="plan"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-5">

              {/* ── Plan actions bar ───────────────────────────────────────── */}
              <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep("configure")}
                    className="px-4 py-2 text-[13px] font-black rounded-full border hover:bg-gray-50 transition"
                    style={{ borderColor: T.border, color: T.muted }}>
                    ← Edit config
                  </button>
                  <button
                    onClick={() => generate(true)}
                    className="px-4 py-2 text-[13px] font-black rounded-full border hover:bg-gray-50 transition"
                    style={{ borderColor: T.brand, color: T.brand }}>
                    ↻ Regenerate
                  </button>
                  {savedId ? (
                    <span className="px-4 py-2 text-[13px] font-black rounded-full"
                      style={{ background: "#F0FDF4", color: T.brand, border: `1px solid #BBF7D0` }}>
                      ✓ Saved
                    </span>
                  ) : (
                    <button
                      onClick={() => plan && save({
                        type: "lesson", title: plan.title, storyTitle: storyTitle !== "Custom Lesson" ? storyTitle : undefined,
                        language, content: plan,
                      })}
                      disabled={isSaving}
                      className="px-4 py-2 text-[13px] font-black rounded-full border hover:bg-gray-50 transition disabled:opacity-50"
                      style={{ borderColor: T.border, color: T.muted }}>
                      {isSaving ? "Saving…" : "💾 Save"}
                    </button>
                  )}
                </div>
                <button
                  onClick={handlePrint}
                  className="px-5 py-2 text-[13px] font-black text-white rounded-full flex items-center gap-2 hover:opacity-90 transition"
                  style={{ background: T.brand }}>
                  🖨 Print Lesson
                </button>
              </div>

              {/* ── Printable content ──────────────────────────────────────── */}
              <div id="lesson-print-root" ref={printRef}>

                {/* Plan header */}
                <div className="p-7"
                  style={{ background: T.brand, borderRadius: T.leaf }}>
                  <p className="text-[11px] font-black uppercase tracking-widest text-green-200 mb-2">Lesson Plan</p>
                  <h1 className="font-baloo font-black text-[24px] text-white leading-tight mb-4">{plan.title}</h1>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: "🌐", val: { en:"English", fr:"French", rw:"Kinyarwanda" }[language] ?? language },
                      { icon: "👥", val: `Ages ${ageRange}` },
                      { icon: "⏱", val: `${Number(duration)} min` },
                      { icon: "📚", val: storyTitle },
                      { icon: "🎯", val: { vocabulary:"Vocabulary", comprehension:"Comprehension", both:"Vocab + Comprehension" }[focus] },
                    ].map(({ icon, val }) => (
                      <span key={val}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold text-white"
                        style={{ background: "rgba(255,255,255,0.18)" }}>
                        {icon} {val}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Objectives */}
                {plan.objectives.length > 0 && (
                  <div className="p-6 mt-4"
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf }}>
                    <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: T.muted }}>Learning Objectives</p>
                    <ul className="space-y-2">
                      {plan.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5"
                            style={{ background: T.brand }}>
                            {i + 1}
                          </span>
                          <span className="text-[13px] font-nunito leading-relaxed" style={{ color: T.text }}>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sections timeline */}
                <div className="mt-4"
                  style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf, overflow: "hidden" }}>
                  <div className="px-6 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: T.muted }}>Lesson Sections</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: T.border }}>
                    {plan.sections.map((sec: LessonSection, i: number) => {
                      const col = SECTION_COLORS[i % SECTION_COLORS.length];
                      return (
                        <div key={i} className="p-5 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
                          {/* Time + name */}
                          <div className="flex md:flex-col items-start gap-3 md:gap-2">
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: col.dot }} />
                              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: T.muted }}>
                                {sec.duration_minutes} min
                              </span>
                            </div>
                            <span className="font-black text-[14px]" style={{ color: T.text }}>{sec.name}</span>
                          </div>
                          {/* Content */}
                          <div className="space-y-3">
                            <p className="text-[13px] font-nunito leading-relaxed" style={{ color: T.text }}>{sec.activity}</p>
                            {sec.teacher_script && (
                              <div className="px-4 py-3 rounded-xl text-[12px] font-nunito leading-relaxed italic"
                                style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}>
                                💬 {sec.teacher_script}
                              </div>
                            )}
                            {sec.materials.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: T.muted }}>Materials:</span>
                                {sec.materials.map((m, j) => (
                                  <span key={j} className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                                    style={{ background: "#F3F4F6", color: T.muted }}>
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vocabulary */}
                {plan.vocabulary_focus.length > 0 && (
                  <div className="mt-4"
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf, overflow: "hidden" }}>
                    <div className="px-6 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: T.muted }}>📗 Vocabulary Focus</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${T.border}` }}>
                            {["Word", "Definition", "Example"].map(h => (
                              <th key={h} className="text-left px-5 py-3 text-[11px] font-black uppercase tracking-wider"
                                style={{ color: T.muted }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: T.border }}>
                          {plan.vocabulary_focus.map((v: VocabItem, i: number) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3">
                                <span className="font-black text-[13px]" style={{ color: T.brand }}>{v.word}</span>
                              </td>
                              <td className="px-5 py-3 text-[13px] font-nunito leading-relaxed" style={{ color: T.text }}>
                                {v.definition}
                              </td>
                              <td className="px-5 py-3 text-[12px] font-nunito italic leading-relaxed" style={{ color: T.muted }}>
                                {v.example_sentence}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Assessment */}
                {plan.assessment.length > 0 && (
                  <div className="mt-4 p-6"
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf }}>
                    <p className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color: T.muted }}>
                      🎯 Assessment Questions
                    </p>
                    <div className="space-y-4">
                      {plan.assessment.map((a: AssessmentItem, i: number) => {
                        const typeStyle = ASSESSMENT_TYPE_STYLE[a.type] ?? ASSESSMENT_TYPE_STYLE.comprehension;
                        return (
                          <div key={i} className="space-y-2">
                            <div className="flex items-start gap-3">
                              <span className="font-black text-[14px] shrink-0 mt-0.5" style={{ color: T.brand }}>
                                Q{i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="font-black text-[14px]" style={{ color: T.text }}>{a.question}</p>
                                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                    style={{ background: typeStyle.bg, color: typeStyle.text }}>
                                    {typeStyle.label}
                                  </span>
                                </div>
                                {a.expected_response && (
                                  <p className="text-[12px] font-nunito leading-relaxed px-3 py-2 rounded-lg"
                                    style={{ background: "#F9FAFB", color: T.muted }}>
                                    → {a.expected_response}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Teacher notes */}
                {plan.teacher_notes && (
                  <div className="mt-4 p-6"
                    style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: T.leaf }}>
                    <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: "#92400E" }}>
                      💡 Teacher Notes
                    </p>
                    <p className="text-[13px] font-nunito leading-relaxed" style={{ color: "#78350F" }}>
                      {plan.teacher_notes}
                    </p>
                  </div>
                )}

                {/* Footer */}
                {genAt && (
                  <p className="text-[10px] text-center mt-3 font-semibold no-print" style={{ color: "#D1D5DB" }}>
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
