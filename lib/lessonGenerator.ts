/**
 * Lesson Generator — Phase 5.3
 *
 * Types, prompt formatter, and validators for AI lesson plan generation.
 * Completely independent from classroom analytics — no classroom data is
 * consumed here. Any teacher, school admin, or future curriculum tool
 * can call buildLessonPrompt() without knowing about students or progress.
 *
 * The API route is stateless: it receives a LessonGeneratorRequest,
 * calls the LLM, validates the response, and returns a LessonPlan.
 * No DB writes; no classroom context.
 */

// ── Request ───────────────────────────────────────────────────────────────────

export type LessonFocus    = "vocabulary" | "comprehension" | "both";
export type LessonAgeRange = "5-7" | "8-10" | "11+";
export type LessonDuration = 20 | 30 | 45 | 60;
export type LessonLanguage = "en" | "fr" | "rw";

export interface LessonGeneratorRequest {
  storyId?:         string;
  storyTitle:       string;      // "The Lost Bird" or "Custom Lesson"
  vocabulary:       string[];    // from story, may be empty
  language:         LessonLanguage;
  ageRange:         LessonAgeRange;
  durationMinutes:  LessonDuration;
  focus:            LessonFocus;
  customObjectives: string;      // free-text, may be empty
}

// ── Lesson plan shape ─────────────────────────────────────────────────────────

export type AssessmentType = "comprehension" | "vocabulary" | "discussion";

export interface LessonSection {
  name:             string;
  duration_minutes: number;
  activity:         string;
  teacher_script:   string;
  materials:        string[];
}

export interface VocabItem {
  word:             string;
  definition:       string;
  example_sentence: string;
}

export interface AssessmentItem {
  type:              AssessmentType;
  question:          string;
  expected_response: string;
}

export interface LessonPlan {
  title:            string;
  objectives:       string[];
  sections:         LessonSection[];
  vocabulary_focus: VocabItem[];
  assessment:       AssessmentItem[];
  teacher_notes:    string;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

const LANG_LABEL: Record<LessonLanguage, string> = {
  en: "English", fr: "French", rw: "Kinyarwanda",
};

const AGE_LABEL: Record<LessonAgeRange, string> = {
  "5-7":  "Early primary (ages 5–7)",
  "8-10": "Primary (ages 8–10)",
  "11+":  "Upper primary (ages 11+)",
};

const FOCUS_LABEL: Record<LessonFocus, string> = {
  vocabulary:    "vocabulary acquisition and word practice",
  comprehension: "reading comprehension and critical thinking",
  both:          "vocabulary acquisition AND reading comprehension equally",
};

export function buildLessonPrompt(req: LessonGeneratorRequest): string {
  const storyLine = req.storyId
    ? `STORY: "${req.storyTitle}"`
    : `STORY: No specific story — create a general lesson suitable for the language and level`;

  const vocabLine = req.vocabulary.length > 0
    ? `STORY VOCABULARY: ${req.vocabulary.slice(0, 20).join(", ")}`
    : `STORY VOCABULARY: None provided — choose 5–8 appropriate words for the level`;

  const objectivesLine = req.customObjectives.trim()
    ? `TEACHER'S CUSTOM OBJECTIVES:\n${req.customObjectives.trim()}`
    : `TEACHER'S CUSTOM OBJECTIVES: None — generate 2–4 objectives appropriate for the story and level`;

  return [
    storyLine,
    `LANGUAGE: ${LANG_LABEL[req.language]}`,
    `STUDENT LEVEL: ${AGE_LABEL[req.ageRange]}`,
    `TOTAL DURATION: ${req.durationMinutes} minutes`,
    `LESSON FOCUS: ${FOCUS_LABEL[req.focus]}`,
    vocabLine,
    objectivesLine,
  ].join("\n");
}

export const LESSON_SYSTEM_PROMPT = `\
You are an expert primary-school lesson planner creating a structured,
age-appropriate lesson plan for a teacher in an African classroom context.

TASK: Read the lesson request below and return a single JSON object representing
a complete, ready-to-use lesson plan. Every section must fit within the total
duration. The plan should feel warm, engaging, and realistic for a classroom.

REQUIRED JSON FORMAT — return ONLY valid JSON, no markdown:
{
  "title": "...",
  "objectives": ["...", "..."],
  "sections": [
    {
      "name": "...",
      "duration_minutes": N,
      "activity": "...",
      "teacher_script": "...",
      "materials": ["..."]
    }
  ],
  "vocabulary_focus": [
    { "word": "...", "definition": "...", "example_sentence": "..." }
  ],
  "assessment": [
    { "type": "comprehension|vocabulary|discussion", "question": "...", "expected_response": "..." }
  ],
  "teacher_notes": "..."
}

RULES:
- title: concise, describes exactly this lesson (not generic)
- objectives: 2–4 measurable statements starting with "Students will be able to…"
- sections: 4–6 sections whose duration_minutes sum to EXACTLY the total duration
  - Typical flow: Warm-Up → Vocabulary Intro → Story Time → Discussion → Practice → Wrap-Up
  - Adjust the number and length of sections to fit the duration and focus
  - activity: 1–3 sentences describing what students and teacher do
  - teacher_script: what the teacher says verbatim to open the section ("Say to students: …")
  - materials: list only what's genuinely needed (whiteboard, printed cards, etc.); [] if none
- vocabulary_focus: 5–8 words — use words from STORY VOCABULARY if provided, else choose suitable ones
  - definition: simple, age-appropriate (no jargon)
  - example_sentence: short, uses the word naturally
- assessment: 3–5 questions — mix of comprehension, vocabulary, and discussion types
  - expected_response: describes what a good student answer looks like (not the exact words)
- teacher_notes: 2–4 sentences of practical advice: pacing tips, differentiation, cultural context
- Write content appropriate for the specified age range and African classroom context
- If no story is specified, make the lesson theme-based (e.g. animals, family, market day)
- ONLY output the JSON object — nothing else`;

// ── Validators ────────────────────────────────────────────────────────────────

function str(x: unknown, maxLen = 400): string {
  return String(x ?? "").slice(0, maxLen).trim();
}

function isStr(x: unknown): x is string {
  return typeof x === "string" && String(x).trim() !== "";
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

const VALID_ASSESSMENT_TYPES = new Set<AssessmentType>(["comprehension", "vocabulary", "discussion"]);

export function validateLessonPlan(raw: unknown): LessonPlan | null {
  if (!isObj(raw)) return null;

  const title      = str(raw.title, 120);
  if (!title) return null;

  const objectives: string[] = Array.isArray(raw.objectives)
    ? (raw.objectives as unknown[]).filter(isStr).map(s => str(s, 200)).slice(0, 6)
    : [];

  const sections: LessonSection[] = Array.isArray(raw.sections)
    ? (raw.sections as unknown[])
        .filter(isObj)
        .filter(s => isStr(s.name) && typeof s.duration_minutes === "number" && isStr(s.activity))
        .map(s => ({
          name:             str(s.name, 60),
          duration_minutes: Math.max(1, Math.min(60, Math.round(Number(s.duration_minutes)))),
          activity:         str(s.activity, 600),
          teacher_script:   str(s.teacher_script, 600),
          materials:        Array.isArray(s.materials)
            ? (s.materials as unknown[]).filter(isStr).map(m => str(m, 80)).slice(0, 8)
            : [],
        }))
        .slice(0, 8)
    : [];

  const vocabulary_focus: VocabItem[] = Array.isArray(raw.vocabulary_focus)
    ? (raw.vocabulary_focus as unknown[])
        .filter(isObj)
        .filter(v => isStr(v.word) && isStr(v.definition))
        .map(v => ({
          word:             str(v.word, 60).toLowerCase(),
          definition:       str(v.definition, 200),
          example_sentence: str(v.example_sentence, 200),
        }))
        .slice(0, 12)
    : [];

  const assessment: AssessmentItem[] = Array.isArray(raw.assessment)
    ? (raw.assessment as unknown[])
        .filter(isObj)
        .filter(a => VALID_ASSESSMENT_TYPES.has(a.type as AssessmentType) && isStr(a.question))
        .map(a => ({
          type:              a.type as AssessmentType,
          question:          str(a.question, 300),
          expected_response: str(a.expected_response, 300),
        }))
        .slice(0, 8)
    : [];

  const teacher_notes = str(raw.teacher_notes, 800);

  if (sections.length === 0) return null;

  return { title, objectives, sections, vocabulary_focus, assessment, teacher_notes };
}
