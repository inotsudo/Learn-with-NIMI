/**
 * Quiz Generator — Phase 5.4
 *
 * Types, prompt builder, and validators for AI quiz generation.
 * Completely independent from classroom analytics and the lesson generator.
 * No hardcoded question templates — every question is synthesised fresh
 * from story vocabulary and teacher-supplied context by the LLM.
 *
 * Reusable by any consumer: teacher portal, future student-facing quiz mode,
 * parent review sheets, admin curriculum export.
 */

// ── Request ───────────────────────────────────────────────────────────────────

export type QuestionType  = "multiple_choice" | "true_false" | "fill_blank" | "short_answer";
export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizSkill      = "comprehension" | "vocabulary" | "recall" | "inference";
export type DifficultyMix  = "easy_heavy" | "balanced" | "hard_heavy";

export interface QuizGeneratorRequest {
  storyId?:       string;
  storyTitle:     string;
  vocabulary:     string[];        // from get_story_lesson_context; may be empty
  language:       string;
  ageRange:       string;
  questionCount:  number;          // 5 | 8 | 10 | 15
  questionTypes:  QuestionType[];  // subset of the four types
  difficultyMix:  DifficultyMix;
  storyContext:   string;          // teacher-provided summary / key plot points
  customFocus:    string;          // additional teacher instructions
}

// ── Quiz output shape ─────────────────────────────────────────────────────────

export interface QuizQuestion {
  id:             string;          // generated: q1, q2, …
  type:           QuestionType;
  difficulty:     QuizDifficulty;
  skill:          QuizSkill;
  question:       string;
  options?:       string[];        // exactly 4 for multiple_choice; ["True","False"] for true_false
  correct_answer: string;          // text of correct option (MC) or the answer (others)
  explanation:    string;          // why correct — shown in teacher key
  teacher_tip?:   string;          // optional classroom discussion prompt
}

export interface Quiz {
  title:              string;
  estimated_minutes:  number;
  questions:          QuizQuestion[];
  teacher_notes:      string;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

const LANG_LABEL: Record<string, string> = {
  en: "English", fr: "French", rw: "Kinyarwanda",
};

const AGE_LABEL: Record<string, string> = {
  "5-7":  "Early primary (ages 5–7)",
  "8-10": "Primary (ages 8–10)",
  "11+":  "Upper primary (ages 11+)",
};

const TYPE_DESC: Record<QuestionType, string> = {
  multiple_choice: "4-option multiple choice with one correct answer and three plausible distractors",
  true_false:      "a statement students judge as TRUE or FALSE",
  fill_blank:      "a sentence with one key word removed and replaced by _____ that students complete",
  short_answer:    "an open-ended question requiring 1–3 sentences from the student",
};

const MIX_DESC: Record<DifficultyMix, string> = {
  easy_heavy:  "about 60 % easy, 30 % medium, 10 % hard — focus on confidence and recall",
  balanced:    "roughly equal easy / medium / hard — general purpose assessment",
  hard_heavy:  "about 10 % easy, 30 % medium, 60 % hard — challenging revision or stretch",
};

export function buildQuizPrompt(req: QuizGeneratorRequest): string {
  const lines: string[] = [
    `STORY: ${req.storyId ? `"${req.storyTitle}"` : "Custom quiz — no specific story"}`,
    `LANGUAGE: ${LANG_LABEL[req.language] ?? req.language}`,
    `STUDENT LEVEL: ${AGE_LABEL[req.ageRange] ?? req.ageRange}`,
    `TOTAL QUESTIONS: ${req.questionCount}`,
    `DIFFICULTY MIX: ${MIX_DESC[req.difficultyMix]}`,
    "",
    "QUESTION TYPES TO USE:",
    ...req.questionTypes.map(t => `  - ${t}: ${TYPE_DESC[t]}`),
    "",
  ];

  if (req.vocabulary.length > 0) {
    lines.push(`VOCABULARY FROM STORY: ${req.vocabulary.slice(0, 20).join(", ")}`);
  } else {
    lines.push("VOCABULARY: None provided — choose suitable words for the level and topic");
  }

  if (req.storyContext.trim()) {
    lines.push("", "STORY SUMMARY / KEY POINTS (provided by teacher):", req.storyContext.trim());
  }

  if (req.customFocus.trim()) {
    lines.push("", "TEACHER'S CUSTOM INSTRUCTIONS:", req.customFocus.trim());
  }

  return lines.join("\n");
}

export const QUIZ_SYSTEM_PROMPT = `\
You are a primary-school assessment specialist creating a varied, age-appropriate
quiz for an African classroom. Every question must be synthesised from the story
and vocabulary provided — never copied from a template.

TASK: Read the quiz request below and return a single JSON object.

REQUIRED FORMAT — return ONLY valid JSON, no markdown fences:
{
  "title": "...",
  "estimated_minutes": N,
  "questions": [
    {
      "type": "multiple_choice|true_false|fill_blank|short_answer",
      "difficulty": "easy|medium|hard",
      "skill": "comprehension|vocabulary|recall|inference",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": "...",
      "explanation": "...",
      "teacher_tip": "..."
    }
  ],
  "teacher_notes": "..."
}

RULES:

title:
  - Specific to the story and focus, not generic ("Quiz on The Lost Bird" not "Reading Quiz")

estimated_minutes:
  - Roughly 2 min per easy/MC question, 3 min per medium, 4 min per hard/short-answer

questions (generate EXACTLY the requested count):
  - Distribute types across the full set — no more than 60 % of any single type
  - Honour the difficulty mix as closely as the count allows
  - Vary the skills: aim for at least 2 distinct skill types across the full quiz
  - Each question must test something different — no repetition of essentially the same idea

  multiple_choice:
    - options: exactly 4 items; distractors must be plausible, not obviously wrong
    - correct_answer: the text of the correct option (NOT "A" or "B" — the full text)
    - Do NOT label options with A/B/C/D in the JSON; the UI adds labels

  true_false:
    - question: a clear, unambiguous statement
    - options: exactly ["True", "False"]
    - correct_answer: "True" or "False"

  fill_blank:
    - question: a sentence with exactly ONE blank written as _____
    - correct_answer: the missing word or short phrase
    - options: omit (leave out of the object entirely)

  short_answer:
    - question: an open-ended question; cannot be answered "Yes/No"
    - correct_answer: a model answer (1–2 sentences) that earns full marks
    - explanation: describes what to look for in a good student response
    - options: omit

explanation:
  - Always present; 1–2 sentences explaining WHY the answer is correct
  - Grounded in the story or vocabulary — not just restating the answer

teacher_tip (optional):
  - A discussion question or classroom activity to extend this question
  - Only include when genuinely useful; omit rather than pad

teacher_notes:
  - 2–4 sentences: pacing advice, differentiation, common misconceptions to watch for

ONLY output the JSON object — nothing else.`;

// ── Validators ────────────────────────────────────────────────────────────────

const VALID_TYPES      = new Set<QuestionType>(["multiple_choice", "true_false", "fill_blank", "short_answer"]);
const VALID_DIFFS      = new Set<QuizDifficulty>(["easy", "medium", "hard"]);
const VALID_SKILLS     = new Set<QuizSkill>(["comprehension", "vocabulary", "recall", "inference"]);

function isStr(x: unknown): x is string {
  return typeof x === "string" && String(x).trim() !== "";
}

function str(x: unknown, max = 400): string {
  return String(x ?? "").slice(0, max).trim();
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function validateQuestion(raw: Record<string, unknown>, index: number): QuizQuestion | null {
  const type = raw.type as QuestionType;
  if (!VALID_TYPES.has(type))       return null;
  if (!VALID_DIFFS.has(raw.difficulty as QuizDifficulty)) return null;

  const skill: QuizSkill = VALID_SKILLS.has(raw.skill as QuizSkill)
    ? (raw.skill as QuizSkill)
    : "comprehension";

  if (!isStr(raw.question))         return null;
  if (!isStr(raw.correct_answer))   return null;
  if (!isStr(raw.explanation))      return null;

  // Type-specific option validation
  const rawOpts = Array.isArray(raw.options) ? (raw.options as unknown[]).filter(isStr) as string[] : [];

  if (type === "multiple_choice") {
    if (rawOpts.length < 2) return null;   // need at least 2 options; UI can pad
    // Correct answer must be one of the options (case-insensitive fallback)
    const ca = str(raw.correct_answer, 200);
    const found = rawOpts.some(o => o.toLowerCase() === ca.toLowerCase());
    if (!found) {
      // Try to match by substring — LLM sometimes truncates
      const partial = rawOpts.find(o => o.toLowerCase().includes(ca.toLowerCase()) || ca.toLowerCase().includes(o.toLowerCase()));
      if (!partial) return null;
    }
  }

  if (type === "true_false") {
    const ca = str(raw.correct_answer, 10).toLowerCase();
    if (ca !== "true" && ca !== "false") return null;
  }

  const options: string[] | undefined =
    type === "multiple_choice" ? rawOpts.slice(0, 4) :
    type === "true_false"      ? ["True", "False"]   :
    undefined;

  return {
    id:             `q${index + 1}`,
    type,
    difficulty:     raw.difficulty as QuizDifficulty,
    skill,
    question:       str(raw.question,       300),
    options,
    correct_answer: str(raw.correct_answer, 200),
    explanation:    str(raw.explanation,    400),
    teacher_tip:    isStr(raw.teacher_tip) ? str(raw.teacher_tip, 300) : undefined,
  };
}

export function validateQuiz(raw: unknown): Quiz | null {
  if (!isObj(raw)) return null;

  const title = str(raw.title, 120);
  if (!title) return null;

  const estimated_minutes = typeof raw.estimated_minutes === "number"
    ? Math.max(1, Math.min(120, Math.round(raw.estimated_minutes)))
    : 20;

  const questions: QuizQuestion[] = Array.isArray(raw.questions)
    ? (raw.questions as unknown[])
        .filter(isObj)
        .map((q, i) => validateQuestion(q as Record<string, unknown>, i))
        .filter((q): q is QuizQuestion => q !== null)
        .slice(0, 20)
    : [];

  if (questions.length === 0) return null;

  const teacher_notes = str(raw.teacher_notes, 800);

  return { title, estimated_minutes, questions, teacher_notes };
}
