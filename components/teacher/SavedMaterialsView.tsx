"use client";

/**
 * SavedMaterialsView — Phase 5.6
 *
 * Lists all AI-generated materials (lessons, quizzes, homework) saved by
 * this teacher. Each card shows metadata and a full-content preview drawer.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "@/lib/supabaseClient";
import type { TeacherProfile } from "@/app/teacher/teacherAuth";
import type { LessonPlan }       from "@/lib/lessonGenerator";
import type { Quiz }             from "@/lib/quizGenerator";
import type { HomeworkDocument } from "@/lib/homeworkGenerator";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  card:     "var(--ds-surface-card,#FFFFFF)",
  border:   "var(--ds-border-primary,#E5E7EB)",
  text:     "var(--ds-text-primary,#111827)",
  muted:    "var(--ds-text-secondary,#6B7280)",
  brand:    "var(--ds-brand-primary,#15803D)",
  leaf:     "var(--leaf-r,20px 20px 20px 5px)",
  leafSm:   "var(--leaf-r-sm,14px 14px 14px 4px)",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type MaterialType = "lesson" | "quiz" | "homework";

interface MaterialMeta {
  id:          string;
  type:        MaterialType;
  title:       string;
  story_title: string | null;
  language:    string;
  created_at:  string;
}

interface FullMaterial extends MaterialMeta {
  content: LessonPlan | Quiz | HomeworkDocument;
}

// ── Type display config ───────────────────────────────────────────────────────

const TYPE_CFG: Record<MaterialType, { icon: string; label: string; bg: string; text: string; border: string }> = {
  lesson:   { icon: "🌿", label: "Lesson Plan", bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  quiz:     { icon: "🧩", label: "Quiz",        bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  homework: { icon: "📝", label: "Homework",    bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
};

const LANG_FLAG: Record<string, string> = { en: "🇬🇧", fr: "🇫🇷", rw: "🇷🇼" };

function relativeTime(iso: string): string {
  const ms  = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  const hr  = Math.floor(ms / 3_600_000);
  const day = Math.floor(ms / 86_400_000);
  if (min < 1)   return "Just now";
  if (min < 60)  return `${min}m ago`;
  if (hr  < 24)  return `${hr}h ago`;
  if (day < 7)   return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-3.5 py-1.5 text-[12px] font-black rounded-full border transition-all"
      style={{
        background:  active ? T.brand : T.card,
        color:       active ? "#fff"  : T.muted,
        borderColor: active ? T.brand : T.border,
      }}>
      {label}
    </button>
  );
}

// ── Content preview (read-only) ───────────────────────────────────────────────

function LessonPreview({ plan }: { plan: LessonPlan }) {
  const totalMins = plan.sections.reduce((sum, s) => sum + s.duration_minutes, 0);
  return (
    <div className="space-y-4 text-[13px]">
      <div>
        <p className="font-black text-[15px]" style={{ color: T.text }}>{plan.title}</p>
        <p className="font-nunito mt-0.5" style={{ color: T.muted }}>{totalMins} min · {plan.sections.length} sections</p>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: T.muted }}>Objectives</p>
        <ul className="list-disc list-inside space-y-0.5">
          {plan.objectives.map((o, i) => <li key={i} className="font-nunito" style={{ color: T.text }}>{o}</li>)}
        </ul>
      </div>
      {plan.sections.map((s, i) => (
        <div key={i} className="p-3 rounded-xl" style={{ background: "#F9FAFB", border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black" style={{ color: T.brand }}>{s.duration_minutes} min</span>
            <span className="font-black text-[13px]" style={{ color: T.text }}>{s.name}</span>
          </div>
          <p className="font-nunito text-[12px]" style={{ color: T.muted }}>{s.activity}</p>
        </div>
      ))}
    </div>
  );
}

function QuizPreview({ quiz }: { quiz: Quiz }) {
  return (
    <div className="space-y-3 text-[13px]">
      <div>
        <p className="font-black text-[15px]" style={{ color: T.text }}>{quiz.title}</p>
        <p className="font-nunito mt-0.5" style={{ color: T.muted }}>{quiz.questions.length} questions · ~{quiz.estimated_minutes} min</p>
      </div>
      {quiz.questions.slice(0, 5).map((q, i) => (
        <div key={i} className="p-3 rounded-xl" style={{ background: "#F9FAFB", border: `1px solid ${T.border}` }}>
          <p className="font-bold mb-1" style={{ color: T.text }}>{i + 1}. {q.question}</p>
          {q.type === "multiple_choice" && q.options && (
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((opt, oi) => (
                <span key={oi}
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    background: opt === q.correct_answer ? "#DCFCE7" : "#F3F4F6",
                    color:      opt === q.correct_answer ? "#15803D" : T.muted,
                    fontWeight: opt === q.correct_answer ? 800 : 600,
                  }}>
                  {opt}
                </span>
              ))}
            </div>
          )}
          {q.type !== "multiple_choice" && (
            <p className="text-[11px] font-bold" style={{ color: "#15803D" }}>✓ {q.correct_answer}</p>
          )}
        </div>
      ))}
      {quiz.questions.length > 5 && (
        <p className="text-[12px] font-nunito text-center" style={{ color: T.muted }}>
          +{quiz.questions.length - 5} more questions
        </p>
      )}
    </div>
  );
}

function HomeworkPreview({ doc }: { doc: HomeworkDocument }) {
  return (
    <div className="space-y-3 text-[13px]">
      <div>
        <p className="font-black text-[15px]" style={{ color: T.text }}>{doc.title}</p>
        <p className="font-nunito mt-0.5" style={{ color: T.muted }}>{doc.learning_focus}</p>
        <p className="text-[11px] font-bold mt-0.5" style={{ color: T.brand }}>~{doc.estimated_minutes} min</p>
      </div>
      {doc.vocabulary_spotlight.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doc.vocabulary_spotlight.slice(0, 8).map(v => (
            <span key={v.word} className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#F5F3FF", color: "#6D28D9" }}>
              {v.word}
            </span>
          ))}
        </div>
      )}
      {doc.tasks.slice(0, 4).map((t, i) => (
        <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
          style={{ background: "#F9FAFB", border: `1px solid ${T.border}` }}>
          <span className="text-[16px] shrink-0">
            {{reading:"📖",comprehension:"❓",vocabulary:"📗",writing:"✏️",drawing:"🎨",oral:"🗣",matching:"🔗"}[t.type]}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-[12px] truncate" style={{ color: T.text }}>{t.title}</p>
            <p className="text-[11px] font-nunito" style={{ color: T.muted }}>{t.estimated_minutes} min</p>
          </div>
        </div>
      ))}
      {doc.tasks.length > 4 && (
        <p className="text-[12px] font-nunito text-center" style={{ color: T.muted }}>
          +{doc.tasks.length - 4} more tasks
        </p>
      )}
    </div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  item, onClose, onDelete,
}: { item: FullMaterial; onClose: () => void; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    onDelete(item.id);
  }

  const cfg = TYPE_CFG[item.type];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full sm:max-w-2xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden"
        style={{ background: T.card }}>

        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b" style={{ borderColor: T.border }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            {cfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: cfg.text }}>
              {cfg.label}
            </p>
            <p className="font-black text-[16px] leading-snug truncate" style={{ color: T.text }}>
              {item.title}
            </p>
            <p className="text-[11px] font-nunito mt-0.5" style={{ color: T.muted }}>
              {item.story_title && `${item.story_title} · `}
              {LANG_FLAG[item.language] ?? ""} {item.language.toUpperCase()} · {relativeTime(item.created_at)}
            </p>
          </div>
          <button onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[18px] hover:bg-gray-100 transition"
            style={{ color: T.muted }}>
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          {item.type === "lesson"   && <LessonPreview   plan={item.content as LessonPlan}       />}
          {item.type === "quiz"     && <QuizPreview     quiz={item.content as Quiz}              />}
          {item.type === "homework" && <HomeworkPreview doc={item.content  as HomeworkDocument}  />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t" style={{ borderColor: T.border }}>
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 text-[12px] font-black rounded-full border transition disabled:opacity-50"
            style={{ borderColor: "#FECDD3", color: "#BE123C", background: "#FFF1F2" }}>
            {deleting ? "Deleting…" : "🗑 Delete"}
          </button>
          <button onClick={() => window.print()}
            className="px-5 py-2 text-[13px] font-black text-white rounded-full flex items-center gap-2 hover:opacity-90 transition"
            style={{ background: T.brand }}>
            🖨 Print
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { teacher: TeacherProfile | null }

export default function SavedMaterialsView({ teacher }: Props) {
  const [materials,    setMaterials]    = useState<MaterialMeta[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<MaterialType | "all">("all");
  const [activeItem,   setActiveItem]   = useState<FullMaterial | null>(null);
  const [openLoading,  setOpenLoading]  = useState<string | null>(null);
  const [toastMsg,     setToastMsg]     = useState<string | null>(null);

  function toast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  const fetchList = useCallback(async () => {
    if (!teacher) return;
    setLoading(true);
    const { data } = await supabase.rpc("list_teacher_materials", {
      p_teacher_id: teacher.id,
      p_type:       null,
    });
    setLoading(false);
    if (Array.isArray(data)) {
      setMaterials(data as MaterialMeta[]);
    }
  }, [teacher]);

  useEffect(() => { void fetchList(); }, [fetchList]);

  async function openItem(id: string) {
    if (!teacher || openLoading) return;
    setOpenLoading(id);
    const { data } = await supabase.rpc("get_teacher_material", {
      p_id:         id,
      p_teacher_id: teacher.id,
    });
    setOpenLoading(null);
    if (data) setActiveItem(data as FullMaterial);
  }

  async function deleteItem(id: string) {
    if (!teacher) return;
    await supabase.rpc("delete_teacher_material", {
      p_id:         id,
      p_teacher_id: teacher.id,
    });
    setActiveItem(null);
    setMaterials(prev => prev.filter(m => m.id !== id));
    toast("Material deleted");
  }

  const visible = filter === "all"
    ? materials
    : materials.filter(m => m.type === filter);

  const TYPES: Array<{ val: MaterialType | "all"; label: string }> = [
    { val: "all",      label: `All (${materials.length})`                                },
    { val: "lesson",   label: `🌿 Lessons (${materials.filter(m => m.type === "lesson").length})`   },
    { val: "quiz",     label: `🧩 Quizzes (${materials.filter(m => m.type === "quiz").length})`     },
    { val: "homework", label: `📝 Homework (${materials.filter(m => m.type === "homework").length})` },
  ];

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-5 right-5 z-[60] px-4 py-2.5 rounded-full text-[13px] font-black text-white shadow-lg"
            style={{ background: T.brand }}>
            ✓ {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail drawer */}
      <AnimatePresence>
        {activeItem && (
          <DetailDrawer
            item={activeItem}
            onClose={() => setActiveItem(null)}
            onDelete={deleteItem}
          />
        )}
      </AnimatePresence>

      <div className="space-y-5">

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <FilterPill key={t.val} active={filter === t.val} label={t.label}
              onClick={() => setFilter(t.val)} />
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${T.brand} transparent transparent transparent` }} />
          </div>
        )}

        {/* Empty */}
        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3"
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.leaf }}>
            <span className="text-4xl">📂</span>
            <p className="font-black text-[16px]" style={{ color: T.text }}>
              {filter === "all" ? "No saved materials yet" : `No saved ${filter}s yet`}
            </p>
            <p className="text-[13px] font-nunito text-center max-w-xs" style={{ color: T.muted }}>
              Generate a lesson, quiz, or homework assignment and click &ldquo;Save&rdquo; to store it here.
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && visible.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.map(m => {
              const cfg = TYPE_CFG[m.type];
              const isOpening = openLoading === m.id;
              return (
                <motion.button key={m.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => openItem(m.id)}
                  disabled={!!openLoading}
                  className="text-left p-5 flex flex-col gap-3 hover:shadow-sm transition-all disabled:opacity-70 group"
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.leaf,
                  }}>

                  {/* Type badge */}
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      {isOpening ? (
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: `${cfg.text} transparent transparent transparent` }} />
                      ) : cfg.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.text }}>
                      {cfg.label}
                    </span>
                    <span className="ml-auto text-[10px] font-bold" style={{ color: T.muted }}>
                      {LANG_FLAG[m.language] ?? ""} {m.language.toUpperCase()}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[14px] leading-snug group-hover:underline"
                      style={{ color: T.text }}>
                      {m.title}
                    </p>
                    {m.story_title && (
                      <p className="text-[11px] font-nunito mt-0.5 truncate" style={{ color: T.muted }}>
                        {m.story_title}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold" style={{ color: T.muted }}>
                      {relativeTime(m.created_at)}
                    </span>
                    <span className="text-[11px] font-black" style={{ color: T.brand }}>
                      Open →
                    </span>
                  </div>

                </motion.button>
              );
            })}
          </div>
        )}

      </div>
    </>
  );
}
