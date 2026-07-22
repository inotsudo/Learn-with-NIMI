/**
 * Teacher Insight Builder — Phase 5.2
 *
 * Normalizes classroom-level learning data into a TeacherClassroomContext,
 * formats it for the LLM, and validates structured AI output.
 *
 * Reusable by any consumer: the teacher portal, school admin dashboards,
 * weekly teacher digest emails, or cross-class comparison reports.
 * All callers share the same formatters and validators — only the
 * data source and transport layer differ.
 */

import type { TeacherProfile } from "@/app/teacher/teacherAuth";

// ── Normalized classroom context ──────────────────────────────────────────────

export interface StudentRow {
  child_id:          string;
  name:              string;
  language:          string;
  reading_level:     "emerging" | "beginning" | "developing" | "expanding" | "fluent";
  completed_stories: number;
  mastered_words:    number;
  total_words:       number;
  quiz_questions:    number;
  quiz_accuracy_pct: number | null;
}

export interface TeacherClassroomContext {
  teacherName:   string;
  className:     string | null;
  totalStudents: number;
  reading: {
    emerging: number; beginning: number; developing: number;
    expanding: number; fluent: number;
  };
  vocab: {
    totalWords: number; mastered: number; practiced: number;
    encountered: number; needsReview: number; masteryPct: number;
  };
  quiz: {
    totalQuestions: number; correct: number; accuracyPct: number | null;
  };
  engagement: {
    activeToday: number; activeThisWeek: number; slotsThisWeek: number;
  };
  students: StudentRow[];
}

// ── AI output types ───────────────────────────────────────────────────────────

export type ClassInsightType = "strength" | "gap" | "trend" | "observation";

export interface ClassInsight {
  type:  ClassInsightType;
  title: string;   // ≤60 chars
  body:  string;   // 1-2 sentences
}

export type StudentFlagType = "struggling" | "excelling" | "at_risk" | "improving";

export interface StudentFlag {
  child_id:   string;
  name:       string;
  flag_type:  StudentFlagType;
  reason:     string;   // ≤80 chars — grounded in data
  suggestion: string;   // ≤80 chars — starts with verb
}

export type FocusAreaType =
  | "vocabulary"
  | "comprehension"
  | "reading_habit"
  | "quiz_accuracy"
  | "engagement";

export interface FocusArea {
  area:   FocusAreaType;
  title:  string;   // ≤55 chars
  detail: string;   // 1-2 sentences
  action: string;   // ≤80 chars — starts with verb
}

export interface TeacherAIResponse {
  class_insights:  ClassInsight[];
  student_flags:   StudentFlag[];
  focus_areas:     FocusArea[];
  generatedAt:     string;
  cached?:         boolean;
  insufficientData?: boolean;
}

// ── Normalize raw JSONB from get_classroom_learning_summary ───────────────────

export function normalizeClassroomSummary(
  raw:     Record<string, unknown>,
  teacher: Pick<TeacherProfile, "name" | "class_name">,
): TeacherClassroomContext {
  const rl  = (raw.reading_levels  ?? {}) as Record<string, unknown>;
  const v   = (raw.vocabulary      ?? {}) as Record<string, unknown>;
  const q   = (raw.quiz            ?? {}) as Record<string, unknown>;
  const eng = (raw.engagement      ?? {}) as Record<string, unknown>;

  const students: StudentRow[] = Array.isArray(rl.per_student)
    ? (rl.per_student as Record<string, unknown>[]).map(s => ({
        child_id:          String(s.child_id ?? ""),
        name:              String(s.name ?? ""),
        language:          String(s.language ?? "en"),
        reading_level:     (s.reading_level as StudentRow["reading_level"]) ?? "emerging",
        completed_stories: Number(s.completed_stories ?? 0),
        mastered_words:    Number(s.mastered_words ?? 0),
        total_words:       Number(s.total_words ?? 0),
        quiz_questions:    Number(s.quiz_questions ?? 0),
        quiz_accuracy_pct: s.quiz_accuracy_pct != null ? Number(s.quiz_accuracy_pct) : null,
      }))
    : [];

  return {
    teacherName:   teacher.name,
    className:     teacher.class_name ?? null,
    totalStudents: Number(rl.total ?? 0),
    reading: {
      emerging:   Number(rl.emerging   ?? 0),
      beginning:  Number(rl.beginning  ?? 0),
      developing: Number(rl.developing ?? 0),
      expanding:  Number(rl.expanding  ?? 0),
      fluent:     Number(rl.fluent     ?? 0),
    },
    vocab: {
      totalWords:  Number(v.total_words  ?? 0),
      mastered:    Number(v.mastered     ?? 0),
      practiced:   Number(v.practiced    ?? 0),
      encountered: Number(v.encountered  ?? 0),
      needsReview: Number(v.needs_review ?? 0),
      masteryPct:  Number(v.mastery_pct  ?? 0),
    },
    quiz: {
      totalQuestions: Number(q.total_questions ?? 0),
      correct:        Number(q.correct         ?? 0),
      accuracyPct:    q.accuracy_pct != null ? Number(q.accuracy_pct) : null,
    },
    engagement: {
      activeToday:   Number(eng.active_today        ?? 0),
      activeThisWeek:Number(eng.active_this_week    ?? 0),
      slotsThisWeek: Number(eng.slots_done_this_week ?? 0),
    },
    students,
  };
}

// ── Minimum data gate ─────────────────────────────────────────────────────────

export function hasEnoughClassroomData(ctx: TeacherClassroomContext): boolean {
  // Need at least 2 students and some recorded learning activity
  if (ctx.totalStudents < 2) return false;
  return (
    ctx.vocab.totalWords       > 0 ||
    ctx.quiz.totalQuestions    > 0 ||
    ctx.engagement.slotsThisWeek > 0
  );
}

// ── Prompt formatter ──────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  emerging: "Emerging", beginning: "Beginning", developing: "Developing",
  expanding: "Expanding", fluent: "Fluent",
};
const LANG_LABEL: Record<string, string> = {
  en: "English", fr: "French", rw: "Kinyarwanda",
};

export function formatClassroomContextForPrompt(ctx: TeacherClassroomContext): string {
  const className = ctx.className ?? "this class";
  const lines: string[] = [
    `CLASS: ${className} — ${ctx.totalStudents} student${ctx.totalStudents !== 1 ? "s" : ""}`,
    `TEACHER: ${ctx.teacherName}`,
    "",
    "READING LEVELS:",
    `  Emerging: ${ctx.reading.emerging} | Beginning: ${ctx.reading.beginning} | Developing: ${ctx.reading.developing} | Expanding: ${ctx.reading.expanding} | Fluent: ${ctx.reading.fluent}`,
    "",
    "VOCABULARY (class totals):",
  ];

  if (ctx.vocab.totalWords > 0) {
    lines.push(
      `  Total words: ${ctx.vocab.totalWords}`,
      `  Mastered: ${ctx.vocab.mastered} (${ctx.vocab.masteryPct}%) | Practiced: ${ctx.vocab.practiced} | Encountered: ${ctx.vocab.encountered}`,
    );
    if (ctx.vocab.needsReview > 0) {
      lines.push(`  Flagged for review: ${ctx.vocab.needsReview} words`);
    }
  } else {
    lines.push("  No vocabulary data yet");
  }

  lines.push("", "QUIZ PERFORMANCE:");
  if (ctx.quiz.totalQuestions > 0) {
    const acc = ctx.quiz.accuracyPct !== null ? `${ctx.quiz.accuracyPct}%` : "n/a";
    lines.push(`  Total questions: ${ctx.quiz.totalQuestions} | Correct: ${ctx.quiz.correct} | Accuracy: ${acc}`);
  } else {
    lines.push("  No quiz data yet");
  }

  lines.push(
    "",
    "ENGAGEMENT THIS WEEK:",
    `  Active today: ${ctx.engagement.activeToday} / ${ctx.totalStudents}`,
    `  Active this week: ${ctx.engagement.activeThisWeek} / ${ctx.totalStudents}`,
    `  Activities completed: ${ctx.engagement.slotsThisWeek}`,
    "",
    "STUDENT DETAIL:",
  );

  for (const s of ctx.students) {
    const quiz = s.quiz_questions >= 3
      ? `, Quiz: ${s.quiz_accuracy_pct ?? "n/a"}% (${s.quiz_questions}q)`
      : ", Quiz: insufficient data";
    const vocab = s.total_words > 0
      ? `, Vocab mastered: ${s.mastered_words}/${s.total_words}`
      : ", Vocab: none";
    lines.push(
      `  - ${s.name} [${LANG_LABEL[s.language] ?? s.language}] | Level: ${LEVEL_LABEL[s.reading_level]} | Stories: ${s.completed_stories}${vocab}${quiz}`,
    );
  }

  return lines.join("\n");
}

// ── Validators ────────────────────────────────────────────────────────────────

const VALID_INSIGHT_TYPES = new Set<ClassInsightType>([
  "strength", "gap", "trend", "observation",
]);

export function validateClassInsights(raw: unknown): ClassInsight[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .filter(x =>
      VALID_INSIGHT_TYPES.has(x.type as ClassInsightType) &&
      typeof x.title === "string" && x.title.trim() !== "" &&
      typeof x.body  === "string" && x.body.trim()  !== ""
    )
    .map(x => ({
      type:  x.type  as ClassInsightType,
      title: String(x.title).slice(0, 120).trim(),
      body:  String(x.body).trim(),
    }))
    .slice(0, 6);
}

const VALID_FLAG_TYPES = new Set<StudentFlagType>([
  "struggling", "excelling", "at_risk", "improving",
]);

export function validateStudentFlags(
  raw:           unknown,
  validChildIds: Set<string>,
): StudentFlag[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .filter(x =>
      typeof x.child_id   === "string" && validChildIds.has(x.child_id) &&
      typeof x.name       === "string" && x.name.trim()       !== "" &&
      VALID_FLAG_TYPES.has(x.flag_type as StudentFlagType)    &&
      typeof x.reason     === "string" && x.reason.trim()     !== "" &&
      typeof x.suggestion === "string" && x.suggestion.trim() !== ""
    )
    .map(x => ({
      child_id:   String(x.child_id),
      name:       String(x.name).trim(),
      flag_type:  x.flag_type  as StudentFlagType,
      reason:     String(x.reason).slice(0, 160).trim(),
      suggestion: String(x.suggestion).slice(0, 160).trim(),
    }))
    .slice(0, 5);
}

const VALID_FOCUS_AREAS = new Set<FocusAreaType>([
  "vocabulary", "comprehension", "reading_habit", "quiz_accuracy", "engagement",
]);

export function validateFocusAreas(raw: unknown): FocusArea[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .filter(x =>
      VALID_FOCUS_AREAS.has(x.area as FocusAreaType) &&
      typeof x.title  === "string" && x.title.trim()  !== "" &&
      typeof x.detail === "string" && x.detail.trim() !== "" &&
      typeof x.action === "string" && x.action.trim() !== ""
    )
    .map(x => ({
      area:   x.area   as FocusAreaType,
      title:  String(x.title).slice(0, 120).trim(),
      detail: String(x.detail).trim(),
      action: String(x.action).slice(0, 160).trim(),
    }))
    .slice(0, 4);
}
