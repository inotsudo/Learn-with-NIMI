/**
 * Homework Generator — Phase 5.5
 *
 * Types, prompt builder, and validators for AI homework generation.
 *
 * Personalization hooks:
 *   - reviewWords: vocabulary words pulled from the classroom's needs_review
 *     list (child_vocabulary where needs_review = true, via classroom summary)
 *   - dominantReadingLevel: the most common reading level in the class, used
 *     to calibrate task difficulty
 *   - activeRatio: proportion of class active this week, influences how
 *     motivational the framing should be
 *
 * All three values come from get_classroom_learning_summary and are optional —
 * the generator degrades gracefully to a good general homework when they're absent.
 */

// ── Request ───────────────────────────────────────────────────────────────────

export type HomeworkFocus    = "vocabulary" | "comprehension" | "creative" | "mixed";
export type HomeworkAgeRange = "5-7" | "8-10" | "11+";
export type HomeworkDuration = 15 | 20 | 30 | 40;
export type HomeworkLanguage = "en" | "fr" | "rw";

export type TaskType =
  | "reading"
  | "comprehension"
  | "vocabulary"
  | "writing"
  | "drawing"
  | "oral"
  | "matching";

export interface HomeworkGeneratorRequest {
  storyId?:             string;
  storyTitle:           string;
  storyVocabulary:      string[];       // from get_story_lesson_context
  language:             HomeworkLanguage;
  ageRange:             HomeworkAgeRange;
  durationMinutes:      HomeworkDuration;
  focus:                HomeworkFocus;
  reviewWords:          string[];       // from classroom needs_review — key personalization input
  dominantReadingLevel: string | null;  // "emerging"|"beginning"|"developing"|"expanding"|"fluent"
  includeParentNote:    boolean;
  customInstructions:   string;
}

// ── Output shape ──────────────────────────────────────────────────────────────

export interface HomeworkVocabWord {
  word:       string;
  definition: string;
}

export interface HomeworkTask {
  type:              TaskType;
  title:             string;
  instruction:       string;      // clear, age-appropriate, self-directed
  items?:            string[];    // words, questions, items to match/circle
  answer_guide?:     string;      // shown in parent guide only
  estimated_minutes: number;
}

export interface HomeworkDocument {
  title:                string;
  estimated_minutes:    number;
  learning_focus:       string;           // 1 sentence
  parent_intro:         string;           // warm note: what to do, how to help
  vocabulary_spotlight: HomeworkVocabWord[];  // 4–8 words
  tasks:                HomeworkTask[];
  encouragement:        string;           // closing motivational line for student
  teacher_notes:        string;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

const LANG_LABEL: Record<HomeworkLanguage, string> = {
  en: "English", fr: "French", rw: "Kinyarwanda",
};

const AGE_LABEL: Record<HomeworkAgeRange, string> = {
  "5-7":  "Early primary (ages 5–7) — very simple instructions, drawing/oral tasks preferred",
  "8-10": "Primary (ages 8–10) — short written tasks, fill-in-blank, simple sentences",
  "11+":  "Upper primary (ages 11+) — paragraphs, opinion questions, creative writing",
};

const LEVEL_LABEL: Record<string, string> = {
  emerging:   "just starting out (0 stories completed)",
  beginning:  "early reader (1–2 stories completed)",
  developing: "growing reader (3–5 stories completed)",
  expanding:  "confident reader (6–10 stories completed)",
  fluent:     "fluent reader (11+ stories completed)",
};

const FOCUS_DESC: Record<HomeworkFocus, string> = {
  vocabulary:    "vocabulary acquisition — every task should reinforce specific words",
  comprehension: "reading comprehension — focus on understanding, retelling, inference",
  creative:      "creative expression — drawing, oral storytelling, imaginative writing",
  mixed:         "mixed skills — balance vocabulary, comprehension, and one creative task",
};

const TASK_DESCS: Record<TaskType, string> = {
  reading:        "student reads aloud or silently, may be to a family member",
  comprehension:  "question(s) about the story with short written answer",
  vocabulary:     "hands-on vocabulary activity (match, fill-blank, use in sentence, draw)",
  writing:        "short writing prompt — 1–5 sentences depending on age",
  drawing:        "draw and label a scene, character, or vocabulary word",
  oral:           "speaking task — retell to a family member, describe, explain",
  matching:       "draw lines to match word with definition or picture description",
};

export function buildHomeworkPrompt(req: HomeworkGeneratorRequest): string {
  const storyLine = req.storyId
    ? `STORY: "${req.storyTitle}"`
    : `STORY: No specific story — create theme-based homework suitable for the language and level`;

  const lines: string[] = [
    storyLine,
    `LANGUAGE: ${LANG_LABEL[req.language]}`,
    `STUDENT LEVEL: ${AGE_LABEL[req.ageRange]}`,
    `TOTAL DURATION: ${req.durationMinutes} minutes`,
    `HOMEWORK FOCUS: ${FOCUS_DESC[req.focus]}`,
    "",
  ];

  // Class-level personalization data
  if (req.dominantReadingLevel) {
    const levelDesc = LEVEL_LABEL[req.dominantReadingLevel] ?? req.dominantReadingLevel;
    lines.push(`CLASS READING LEVEL: Most students are ${levelDesc} — calibrate tasks accordingly`);
  }

  if (req.reviewWords.length > 0) {
    lines.push(
      `PRIORITY VOCABULARY (these words need review — build at least one task around them):`,
      `  ${req.reviewWords.slice(0, 10).join(", ")}`,
    );
  }

  if (req.storyVocabulary.length > 0 && req.reviewWords.length === 0) {
    lines.push(`STORY VOCABULARY: ${req.storyVocabulary.slice(0, 15).join(", ")}`);
  }

  lines.push(
    `INCLUDE PARENT NOTE: ${req.includeParentNote ? "Yes — write a warm, practical note parents can follow" : "No"}`,
  );

  if (req.customInstructions.trim()) {
    lines.push("", "TEACHER'S CUSTOM INSTRUCTIONS:", req.customInstructions.trim());
  }

  return lines.join("\n");
}

export const HOMEWORK_SYSTEM_PROMPT = `\
You are a primary-school homework designer creating a take-home assignment for an
African classroom. The homework must be completable without a teacher present —
a student should be able to work through it alone or with a parent.

TASK: Read the homework request and return a single JSON object.

REQUIRED FORMAT — return ONLY valid JSON, no markdown:
{
  "title": "...",
  "estimated_minutes": N,
  "learning_focus": "...",
  "parent_intro": "...",
  "vocabulary_spotlight": [
    { "word": "...", "definition": "..." }
  ],
  "tasks": [
    {
      "type": "reading|comprehension|vocabulary|writing|drawing|oral|matching",
      "title": "...",
      "instruction": "...",
      "items": ["..."],
      "answer_guide": "...",
      "estimated_minutes": N
    }
  ],
  "encouragement": "...",
  "teacher_notes": "..."
}

FIELD RULES:

title:
  - Specific and inviting ("My Homework: The Lost Bird" not just "Homework")

estimated_minutes:
  - Must match the requested total duration; tasks must sum to exactly this

learning_focus (1 sentence):
  - What skill or knowledge this homework develops — clear to a non-teacher parent

parent_intro (2–4 sentences):
  - Warm, encouraging tone
  - Explain what the child is learning
  - Give 1–2 practical tips for helping at home
  - Tell them how long it should take

vocabulary_spotlight (4–8 words):
  - Prioritise words from PRIORITY VOCABULARY if provided
  - Fill the rest from story vocabulary or level-appropriate words
  - definition: simple enough for the student to read themselves

tasks (3–6 tasks; durations must sum to estimated_minutes):
  - instruction: write directly to the student ("Read the sentences below…", "Draw a picture of…")
  - Keep instructions short — 1–3 sentences; use simple language for the age group
  - items: array of strings needed for the task
    * comprehension: the question(s)
    * vocabulary: the words or word–definition pairs
    * matching: alternating items to match ["word1", "definition1", "word2", "definition2"]
    * writing: sentence starters or prompts (or omit if the instruction is enough)
    * drawing: labels to add to the drawing
    * oral: omit
    * reading: omit
  - answer_guide: model answer or what to look for — shown only to parents, not students
    * For comprehension: what a complete answer looks like
    * For vocabulary: correct matches/answers
    * For writing: what to check for
    * Omit for drawing and oral tasks
  - estimated_minutes: realistic for the age group

TYPE GUIDANCE:
  - reading: use for ages 5+ when there's a story; "Read this part of the story aloud to someone at home"
  - comprehension: 1–3 questions; answers should be 1–3 sentences for 8+, one word/phrase for 5–7
  - vocabulary: ALWAYS include at least one vocabulary task if PRIORITY VOCABULARY is given
  - writing: ages 5–7 → 1–2 sentences; 8–10 → 3–5 sentences; 11+ → a short paragraph
  - drawing: very effective for 5–7; optional for 8+; avoid for 11+ unless creative focus
  - oral: include at least one oral task — talking is as important as writing for young learners
  - matching: good for vocabulary practice; provide an even number of items (word + definition pairs)

encouragement (1 warm sentence):
  - Address the student directly; celebrate the effort, not just the result

teacher_notes (2–4 sentences):
  - Note any activities that need printed materials or special setup
  - Differentiation tips (how to simplify for struggling students or extend for advanced)
  - Any parent questions to watch for

ONLY output the JSON object — nothing else.`;

// ── Validators ────────────────────────────────────────────────────────────────

const VALID_TASK_TYPES = new Set<TaskType>([
  "reading", "comprehension", "vocabulary", "writing", "drawing", "oral", "matching",
]);

function isStr(x: unknown): x is string {
  return typeof x === "string" && String(x).trim() !== "";
}

function str(x: unknown, max = 600): string {
  return String(x ?? "").slice(0, max).trim();
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function validateHomeworkDocument(raw: unknown): HomeworkDocument | null {
  if (!isObj(raw)) return null;

  const title = str(raw.title, 120);
  if (!title) return null;

  const estimated_minutes = typeof raw.estimated_minutes === "number"
    ? Math.max(1, Math.min(120, Math.round(raw.estimated_minutes)))
    : 20;

  const learning_focus = str(raw.learning_focus, 200);
  const parent_intro   = str(raw.parent_intro,   800);
  const encouragement  = str(raw.encouragement,  200);
  const teacher_notes  = str(raw.teacher_notes,  600);

  const vocabulary_spotlight: HomeworkVocabWord[] = Array.isArray(raw.vocabulary_spotlight)
    ? (raw.vocabulary_spotlight as unknown[])
        .filter(isObj)
        .filter(v => isStr(v.word) && isStr(v.definition))
        .map(v => ({ word: str(v.word, 60).toLowerCase(), definition: str(v.definition, 200) }))
        .slice(0, 10)
    : [];

  const tasks: HomeworkTask[] = Array.isArray(raw.tasks)
    ? (raw.tasks as unknown[])
        .filter(isObj)
        .filter(t => VALID_TASK_TYPES.has(t.type as TaskType) && isStr(t.instruction))
        .map(t => ({
          type:              t.type as TaskType,
          title:             str(t.title,       80),
          instruction:       str(t.instruction, 400),
          items:             Array.isArray(t.items)
            ? (t.items as unknown[]).filter(isStr).map(s => str(s, 200)).slice(0, 20)
            : undefined,
          answer_guide:      isStr(t.answer_guide) ? str(t.answer_guide, 400) : undefined,
          estimated_minutes: typeof t.estimated_minutes === "number"
            ? Math.max(1, Math.min(40, Math.round(t.estimated_minutes)))
            : 5,
        }))
        .slice(0, 8)
    : [];

  if (tasks.length === 0) return null;

  return {
    title, estimated_minutes, learning_focus, parent_intro,
    vocabulary_spotlight, tasks, encouragement, teacher_notes,
  };
}
