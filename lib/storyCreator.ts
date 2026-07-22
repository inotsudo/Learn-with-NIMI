/**
 * Story Creator — Phase 7.3
 *
 * Types and prompt builder for child-authored AI stories.
 * The child provides a hero name, setting, and problem;
 * the AI generates a short illustrated story in return.
 */

export const STORY_SETTINGS = [
  { id: "forest",  label: "Deep Forest",      emoji: "🌲" },
  { id: "village", label: "A Village",         emoji: "🏘️" },
  { id: "river",   label: "By the River",      emoji: "🌊" },
  { id: "sky",     label: "High in the Sky",   emoji: "☁️" },
  { id: "savanna", label: "The Savanna",        emoji: "🦁" },
  { id: "school",  label: "At School",          emoji: "🏫" },
  { id: "market",  label: "The Market",         emoji: "🛒" },
  { id: "night",   label: "Under the Stars",    emoji: "🌙" },
] as const;

export const STORY_HEROES = [
  { id: "child",     label: "A Brave Child",     emoji: "👦" },
  { id: "animal",    label: "A Clever Animal",   emoji: "🐒" },
  { id: "bird",      label: "A Magical Bird",    emoji: "🦜" },
  { id: "elder",     label: "A Wise Elder",      emoji: "👴" },
  { id: "twins",     label: "Twins",             emoji: "👯" },
] as const;

export const STORY_PROBLEMS = [
  { id: "lost",      label: "Something is lost",         emoji: "🔍" },
  { id: "storm",     label: "A big storm is coming",     emoji: "⛈️" },
  { id: "friend",    label: "A friend needs help",       emoji: "🤝" },
  { id: "gift",      label: "Finding the perfect gift",  emoji: "🎁" },
  { id: "journey",   label: "A long journey",            emoji: "🗺️" },
  { id: "mystery",   label: "A secret mystery",          emoji: "🔮" },
] as const;

export type StorySetting = typeof STORY_SETTINGS[number]["id"];
export type StoryHero    = typeof STORY_HEROES[number]["id"];
export type StoryProblem = typeof STORY_PROBLEMS[number]["id"];

export interface StoryCreatorRequest {
  heroName:     string;        // child-provided name
  heroType:     StoryHero;
  setting:      StorySetting;
  problem:      StoryProblem;
  language:     string;        // en | fr | rw
  ageRange:     string;
  childName:    string;        // author's name
  childMoments: [string, string, string]; // child-authored narrative moments
}

export interface StoryParagraph {
  text:  string;
  emoji: string;   // thematic emoji acting as chapter illustration
}

export interface CreatedStory {
  title:       string;
  paragraphs:  StoryParagraph[];   // 5 paragraphs
  moral:       string;             // one-sentence lesson
  author_note: string;             // "A story by {childName}!"
}

// ── Prompt ────────────────────────────────────────────────────────────────────

export function buildStoryCreatorPrompt(req: StoryCreatorRequest): string {
  const settingLabel = STORY_SETTINGS.find(s => s.id === req.setting)?.label ?? req.setting;
  const heroLabel    = STORY_HEROES.find(h => h.id === req.heroType)?.label  ?? req.heroType;
  const problemLabel = STORY_PROBLEMS.find(p => p.id === req.problem)?.label ?? req.problem;
  const lang = req.language === "fr" ? "French" : "English";

  const ageNote =
    req.ageRange === "5-7"  ? "Very simple sentences, max 2 per paragraph. Fun and repetitive patterns help." :
    req.ageRange === "8-10" ? "Short paragraphs (3-4 sentences). Clear adventure arc." :
                              "Richer language, can include dialogue and vivid descriptions.";

  const [moment1, moment2, moment3] = req.childMoments;

  return `\
You are a master African children's storyteller helping a child named "${req.childName}" co-author their own story. They have written three key moments — you must weave your paragraphs around theirs.

STORY INGREDIENTS:
- Hero: "${req.heroName}" (${heroLabel})
- Setting: ${settingLabel}
- Problem/Adventure: ${problemLabel}

THE CHILD'S OWN WORDS (preserve these as the heart of the story):
- Moment 1 — Discovery: "${moment1}"
- Moment 2 — Heroic action: "${moment2}"
- Moment 3 — The ending: "${moment3}"

YOUR JOB — write exactly 5 paragraphs:
  Paragraph 1 (yours): Opening. Set the scene. Introduce ${req.heroName} in ${settingLabel}. Lead into Moment 1.
  Paragraph 2 (child's words): Use the child's Moment 1 text almost verbatim. Only fix obvious spelling errors. Keep their voice. Short paragraph.
  Paragraph 3 (yours): Rising tension. The ${problemLabel} challenge peaks. Bridge naturally to the child's action.
  Paragraph 4 (child's words): Use the child's Moment 2 text almost verbatim. Keep their voice. Short paragraph.
  Paragraph 5 (yours + child ending): Resolution. Work in the child's Moment 3 as the final feeling or line. End with hope.

RULES:
- Each paragraph has an emoji matching its moment.
- Age: ${req.ageRange}. ${ageNote}
- title: a catchy story title (max 7 words)
- moral: a single sentence lesson e.g. "Courage can overcome any challenge."
- author_note: "A story by ${req.childName}!"
- NO markdown anywhere — plain text only.
- Language: ${lang}
- NEVER replace or summarise the child's words — include them as written.

Respond ONLY with valid JSON, no code fences:
{
  "title": "...",
  "paragraphs": [
    { "text": "...", "emoji": "..." }
  ],
  "moral": "...",
  "author_note": "..."
}`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

export function validateCreatedStory(raw: unknown): CreatedStory | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.paragraphs) || r.paragraphs.length < 3) return null;

  const paragraphs = r.paragraphs.slice(0, 7).map(p => {
    const o = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
    return {
      text:  typeof o.text  === "string" ? o.text.slice(0, 600)  : "",
      emoji: typeof o.emoji === "string" ? o.emoji.slice(0, 4)   : "📖",
    };
  }).filter(p => p.text.length > 0);

  if (paragraphs.length === 0) return null;

  return {
    title:       typeof r.title       === "string" ? r.title.slice(0, 100)       : "My Story",
    paragraphs,
    moral:       typeof r.moral       === "string" ? r.moral.slice(0, 200)       : "",
    author_note: typeof r.author_note === "string" ? r.author_note.slice(0, 100) : "",
  };
}
