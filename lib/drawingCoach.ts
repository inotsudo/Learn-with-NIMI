/**
 * Drawing Coach — Phase 7.2
 *
 * Types and prompt builder for step-by-step drawing lessons.
 * The coach generates 5-7 easy steps for drawing a subject
 * related to the child's story or chosen theme.
 */

export interface DrawingSubject {
  id:    string;
  label: string;
  emoji: string;
  hint:  string;   // one-line description of what we'll draw
}

// Predefined subjects — the coach picks one per session or the child chooses.
export const DRAWING_SUBJECTS: DrawingSubject[] = [
  { id: "bird",       label: "A Happy Bird",      emoji: "🐦", hint: "A simple bird with wings spread wide" },
  { id: "sun",        label: "The Sunrise",        emoji: "🌅", hint: "Hills with a big sun rising above them" },
  { id: "elephant",  label: "A Friendly Elephant", emoji: "🐘", hint: "A big round elephant with kind eyes" },
  { id: "tree",       label: "A Baobab Tree",      emoji: "🌳", hint: "Africa's famous upside-down tree" },
  { id: "fish",       label: "A River Fish",        emoji: "🐟", hint: "A colorful fish swimming in the river" },
  { id: "house",      label: "A Village Home",     emoji: "🏠", hint: "A simple house with a round roof" },
  { id: "flower",     label: "A Sunflower",         emoji: "🌻", hint: "A tall flower with big golden petals" },
  { id: "butterfly",  label: "A Butterfly",         emoji: "🦋", hint: "A beautiful butterfly on a leaf" },
];

export interface DrawingStep {
  step:        number;
  instruction: string;   // e.g. "Draw a big circle for the head"
  tip:         string;   // e.g. "Go slowly and don't worry if it's not perfect!"
  shape_hint:  string;   // emoji/symbol hint: "⭕", "〰️", "△"
}

export interface DrawingCoachRequest {
  subject:    DrawingSubject;
  language:   string;
  ageRange:   string;
  childName:  string;
}

export interface DrawingCoachResponse {
  title:       string;          // "Let's draw a happy bird!"
  intro:       string;          // One sentence setup
  steps:       DrawingStep[];   // 5-7 steps
  finish_msg:  string;          // What to say when done
}

export interface DrawingFeedbackRequest {
  subject:    string;    // subject label
  childNote:  string;    // "I drew it!" or brief description
  childName:  string;
  language:   string;
}

export interface DrawingFeedbackResponse {
  praise:       string;
  encourage:    string;
}

// ── Prompt builders ───────────────────────────────────────────────────────────

export function buildDrawingCoachPrompt(req: DrawingCoachRequest): string {
  const ageNote =
    req.ageRange === "5-7"  ? "Very simple shapes only — circles, lines, ovals. Use basic shape names." :
    req.ageRange === "8-10" ? "Simple shapes but you can add details like feathers or petals." :
                              "Can include shading hints and proportions.";

  const lang = req.language === "fr" ? "French" : "English";

  return `\
You are Nimi, a friendly art teacher for African primary-school children.
Create a simple step-by-step drawing lesson for: ${req.subject.label} (${req.subject.hint}).
Child: ${req.childName}, age range: ${req.ageRange}. ${ageNote}

Rules:
- Exactly 6 steps. Each builds on the previous.
- instruction: clear action in one sentence. Start with a verb. NO markdown.
- tip: ONE short encouragement or technique hint (max 12 words).
- shape_hint: ONE emoji that looks like the shape being drawn (⭕ △ ▭ 〰️ ✨ etc.)
- title: fun 5-word title starting with "Let's draw"
- intro: 1 warm sentence to excite the child about this drawing
- finish_msg: 1 congratulatory sentence, mentioning ${req.childName} by name
- All text in ${lang}

Respond ONLY with valid JSON, no code fences:
{
  "title": "...",
  "intro": "...",
  "steps": [
    { "step": 1, "instruction": "...", "tip": "...", "shape_hint": "..." }
  ],
  "finish_msg": "..."
}`;
}

export function buildDrawingFeedbackPrompt(req: DrawingFeedbackRequest): string {
  return `\
You are Nimi, a warm art coach. ${req.childName} just finished drawing ${req.subject}.
They said: "${req.childNote}"

Write 2 fields:
- praise: 2 warm sentences praising their work specifically. Make them feel like a real artist.
- encourage: 1 sentence inviting them to try another drawing.
No markdown. Language: ${req.language === "fr" ? "French" : "English"}.

Respond ONLY with valid JSON: { "praise": "...", "encourage": "..." }`;
}

// ── Response validators ───────────────────────────────────────────────────────

export function validateDrawingCoachResponse(raw: unknown): DrawingCoachResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.steps) || r.steps.length < 3) return null;
  const steps = r.steps.slice(0, 8).map((s, i) => {
    const o = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
    return {
      step:        i + 1,
      instruction: typeof o.instruction === "string" ? o.instruction.slice(0, 200) : `Step ${i + 1}`,
      tip:         typeof o.tip         === "string" ? o.tip.slice(0, 120)         : "Take your time!",
      shape_hint:  typeof o.shape_hint  === "string" ? o.shape_hint.slice(0, 4)    : "✏️",
    };
  });
  return {
    title:      typeof r.title      === "string" ? r.title.slice(0, 80)      : "Let's draw!",
    intro:      typeof r.intro      === "string" ? r.intro.slice(0, 200)     : "",
    steps,
    finish_msg: typeof r.finish_msg === "string" ? r.finish_msg.slice(0, 200): "Amazing work!",
  };
}

export function validateDrawingFeedbackResponse(raw: unknown): DrawingFeedbackResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const praise = typeof r.praise === "string" ? r.praise.slice(0, 400) : null;
  if (!praise) return null;
  return {
    praise,
    encourage: typeof r.encourage === "string" ? r.encourage.slice(0, 200) : "Keep creating!",
  };
}
