// lib/storyKnowledgeEngine.ts
//
// Two-layer story knowledge engine.
//
// ┌─────────────────────────────────────────────────────────────────────┐
// │  LAYER 1 · StoryKnowledgeBase  (static — cached in DB per story)  │
// │  Computed once when a story is published:                          │
// │    • pages, all vocabulary (definitions + translations)            │
// │    • characters, themes, moral lesson, educational concepts        │
// │    • discussion questions, home activities, parent talking points   │
// │  Stored in: story_knowledge_cache (migration 145)                  │
// │  TTL: 7 days, invalidated when page content changes               │
// └─────────────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────────────┐
// │  LAYER 2 · LearnerStoryContext  (dynamic — computed per child)     │
// │  Computed at runtime from live DB state:                           │
// │    • current slot / completed slots / progress %                   │
// │    • words mastered, words needing review (story-scoped)           │
// │    • story-scoped quiz accuracy + recent mistakes                  │
// │    • topics asked about this story (conversation summaries)        │
// │    • reading level, age (from learning profile)                    │
// └─────────────────────────────────────────────────────────────────────┘
//
// Combined → EnrichedStoryKnowledge (Layer 1 + Layer 2)
//
// Formatters:
//   formatEnrichedForNimi   — full context block for Nimi's system prompt
//   formatForVoice          — compact TTS-friendly block
//   formatForParent         — vocab, discussion starters, home activities
//   formatForTeacher        — full vocabulary, concepts, lesson objectives

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getStoryKnowledge,
  formatKnowledgeForPrompt,
  type StoryKnowledge,
  type VocabItem,
  type SlotInfo,
  type StoryPage,
} from "./storyKnowledge";
import { callAI, stripJson } from "./ai/aiService";
import { mapStoryToCurriculum, type CurriculumMapping, type CurriculumSkill } from "./curriculumKnowledge";

// Re-export for consumers that need the curriculum types alongside story types
export type { CurriculumMapping, CurriculumSkill };

// ── Layer 1 types ──────────────────────────────────────────────────────────────

export interface StoryCharacter {
  name:        string;
  role:        "main" | "supporting";
  description: string;
  traits:      string[];
  emotions:    string[];
}

export type EducationalConcept =
  | "counting" | "colors" | "animals" | "emotions" | "nature" | "family"
  | "friendship" | "science" | "geography" | "culture" | "safety"
  | "kindness" | "problem_solving" | "language" | "shapes" | "food";

// ── Story Graph (Layer 1 — part of StoryAnalysis) ─────────────────────────────
//
// Stores explicit relationships between characters and events, enabling
// Nimi to answer questions like "Who helped the rabbit?" or "Which pages
// mention the elephant?" without asking the LLM to re-infer from text.

export type RelationshipType =
  | "friend_of" | "helps" | "is_helped_by" | "conflicts_with"
  | "family_of"  | "meets" | "leads"        | "follows";

export interface CharacterRelationship {
  from:         string;            // character name
  to:           string;            // character name
  type:         RelationshipType;
}

export interface CharacterPageRef {
  character: string;
  pages:     number[];             // page numbers where this character appears
}

export interface StoryGraph {
  relationships:   CharacterRelationship[];
  characterPages:  CharacterPageRef[];
  /** Key story events in narrative order — powers "what happens next?" answers. */
  eventSequence:   string[];
}

// ── Story Skills (Layer 1 — part of StoryAnalysis) ───────────────────────────
//
// What each story explicitly teaches — links story content to the
// curriculum taxonomy in curriculumKnowledge.ts. The recommendation engine
// uses these to suggest stories by skill, not just by topic.

export type StorySkill = CurriculumSkill;

export interface StoryAnalysis {
  characters:             StoryCharacter[];
  educational_concepts:   EducationalConcept[];
  themes:                 string[];
  moral_lesson:           string | null;
  discussion_questions:   string[];
  home_activities:        string[];
  parent_talking_points:  string[];
  /** Explicit skills this story develops (maps to curriculum taxonomy). */
  skills:                 StorySkill[];
  /** Character relationships and page index — enables relationship queries. */
  graph:                  StoryGraph | null;
}

/** Layer 1: all static, story-level knowledge. Same for every learner. */
export interface StoryKnowledgeBase {
  storyId:     string;
  slug:        string;
  language:    string;
  title:       string;
  description: string | null;
  themeEmoji:  string | null;
  themeTitle:  string | null;
  ageMin:      number | null;
  ageMax:      number | null;
  isFree:      boolean;
  pages:       StoryPage[];           // all story pages
  slots:       SlotInfo[];            // all activity slots (no status — status is Layer 2)
  vocabulary:  VocabItem[];           // all vocabulary (all slots, unfiltered)
  analysis:    StoryAnalysis | null;  // AI-extracted characters, themes, graph, skills
  /** Layer 0: curriculum objectives this story maps to. */
  curriculum:  CurriculumMapping | null;
}

// ── Layer 2 types ──────────────────────────────────────────────────────────────

/** Layer 2: dynamic, per-child context computed at runtime. */
export interface LearnerStoryContext {
  childId:           string;
  // Progress
  completedSlots:    string[];      // slot keys the child has finished
  currentSlot:       string | null; // the slot they're on now
  completedSlotCount: number;
  progressPercent:   number;        // 0–100
  // Vocabulary (progress-aware)
  wordsLearned:      VocabItem[];   // from completed slots
  wordsWorking:      VocabItem[];   // from current slot (actively learning)
  wordsMastered:     string[];      // confirmed mastered via child_vocabulary
  wordsNeedReview:   string[];      // flagged needs_review via quiz failure
  // Quiz performance (story-scoped)
  storyQuizAccuracy: number | null; // 0–1, null if < 3 questions answered
  recentMistakes:    string[];      // question texts from recent wrong answers (≤5)
  // Conversation memory (story-scoped)
  topicsAsked:       string[];      // topics from recent Nimi sessions on this story
  vocabFromChat:     string[];      // words the child mastered in past Nimi sessions
  // Cross-story global mastery (no story_id filter — all stories)
  globalWordsMastered: string[];    // words mastered across ALL stories, not just this one
  // Profile
  readingLevel:      string | null;
  age:               number | null;
}

// ── Combined type ──────────────────────────────────────────────────────────────

/**
 * Full context: Layer 1 (story base) + Layer 2 (learner context).
 * The flat aliases (title, pages, etc.) keep backward compatibility with
 * existing formatters and route code.
 */
export interface EnrichedStoryKnowledge extends StoryKnowledge {
  // Layer 0 (curriculum taxonomy mapping)
  curriculum: CurriculumMapping | null;
  // Layer 1 (explicit reference)
  story:    StoryKnowledgeBase;
  // AI analysis (also on story.analysis — duplicated here for backward compat)
  analysis: StoryAnalysis | null;
  // Layer 2 (null when no childId provided)
  learner:  LearnerStoryContext | null;
}

// ── Layer 1: cache constants and AI extraction ─────────────────────────────────

const ANALYSIS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function pageFingerprint(pages: StoryPage[]): string {
  const total      = pages.reduce((acc, p) => acc + p.text.length, 0);
  const firstChunk = pages[0]?.text.slice(0, 100) ?? "";
  return `${total}:${firstChunk}`;
}

const EXTRACTION_SYSTEM = `\
You are an expert children's educational content analyser.
Extract structured educational metadata from the story text provided.
Be conservative — only include what the text actually contains.
Return ONLY valid JSON — no markdown fences, nothing else.`;

function buildExtractionPrompt(base: StoryKnowledge): string {
  const pageText   = base.pages.map(p => `Page ${p.pageNumber}: ${p.text}`).join("\n");
  const vocabWords = [...base.vocabularyLearned, ...base.vocabularyCurrent]
    .map(v => v.word).join(", ");

  return `\
STORY TITLE: "${base.title}"
DESCRIPTION: ${base.description ?? "(none)"}
AGE RANGE: ${base.ageMin != null ? `${base.ageMin}–${base.ageMax ?? base.ageMin}` : "unknown"}

STORY TEXT:
${pageText}

VOCABULARY WORDS (admin-curated): ${vocabWords || "(none listed)"}

Analyse this children's story and return exactly this JSON shape:
{
  "characters": [
    {
      "name": "character name as it appears in the story",
      "role": "main OR supporting",
      "description": "1 sentence — who they are and what they do",
      "traits": ["brave", "curious"],
      "emotions": ["happy", "scared"]
    }
  ],
  "educational_concepts": ["counting", "colors", "animals", "emotions", "nature", "family", "friendship", "science", "geography", "culture", "safety", "kindness", "problem_solving", "language", "shapes", "food"],
  "themes": ["friendship", "family", "courage"],
  "moral_lesson": "One warm sentence capturing the core lesson, or null",
  "discussion_questions": [
    "What did [character] do when [event]?",
    "How did [character] feel when [moment]?"
  ],
  "home_activities": [
    "Draw your favourite character from the story",
    "Act out the part where [event] happened"
  ],
  "parent_talking_points": [
    "Ask your child which character they liked most and why",
    "The story explores [theme] — connect it to your family by..."
  ],
  "skills": ["reading_comprehension", "vocabulary", "empathy", "kindness", "friendship", "problem_solving", "animals", "nature_science", "counting", "shapes", "culture", "family_values", "creativity", "critical_thinking", "memory", "safety", "health", "geography"],
  "graph": {
    "relationships": [
      { "from": "CharacterA", "to": "CharacterB", "type": "helps" },
      { "from": "CharacterB", "to": "CharacterC", "type": "friend_of" }
    ],
    "characterPages": [
      { "character": "CharacterA", "pages": [1, 2, 4] },
      { "character": "CharacterB", "pages": [3, 4, 5] }
    ],
    "eventSequence": [
      "First key event in story order",
      "Second key event",
      "Third key event",
      "Resolution or final event"
    ]
  }
}

STRICT RULES:
- characters: only characters who appear explicitly in the story text; max 6
- educational_concepts: ONLY from the list above; only concepts actually present
- themes: 1–4 short phrases; plain language a parent understands
- moral_lesson: 1 sentence max; null if not applicable
- discussion_questions: 2–4; reference actual characters or events
- home_activities: 2–3; practical, no special materials required
- parent_talking_points: 2–3 warm conversation starters for parents
- skills: ONLY from the list above; pick the skills this story genuinely develops; include reading_comprehension and vocabulary always; max 6 total
- graph.relationships: only explicit relationships from the text; use types: friend_of | helps | is_helped_by | conflicts_with | family_of | meets | leads | follows; max 8
- graph.characterPages: list which story pages each character appears on; max 6 characters
- graph.eventSequence: 3–6 key events in story order; one sentence each; never spoil events beyond page 3 of a not-yet-started story
- Return ONLY the JSON — no explanation, no markdown`;
}

async function fetchAnalysis(
  supabase:  SupabaseClient,
  base:      StoryKnowledge,
): Promise<StoryAnalysis | null> {
  if (base.pages.length === 0) return null;

  const fingerprint = pageFingerprint(base.pages);

  // Check DB cache
  const { data: cached } = await supabase
    .from("story_knowledge_cache")
    .select("analysis, analyzed_at, pages_fingerprint")
    .eq("story_id", base.storyId)
    .eq("language", base.language)
    .maybeSingle();

  if (cached?.analysis) {
    const fresh       = (Date.now() - new Date(cached.analyzed_at).getTime()) < ANALYSIS_TTL_MS;
    const sameContent = cached.pages_fingerprint === fingerprint;
    if (fresh && sameContent) return cached.analysis as StoryAnalysis;
  }

  // AI extraction
  let analysis: StoryAnalysis | null = null;
  try {
    const raw    = stripJson((await callAI({
      type:        "story_analyze",
      system:      EXTRACTION_SYSTEM,
      prompt:      buildExtractionPrompt(base),
      temperature: 0.3,
      maxTokens:   1200,
    })).content);
    const parsed = JSON.parse(raw) as Partial<StoryAnalysis>;

    const rawGraph = (parsed as Record<string, unknown>).graph as Partial<StoryGraph> | null | undefined;
    const graph: StoryGraph | null = rawGraph ? {
      relationships:  Array.isArray(rawGraph.relationships)  ? rawGraph.relationships.slice(0, 8)  : [],
      characterPages: Array.isArray(rawGraph.characterPages) ? rawGraph.characterPages.slice(0, 6) : [],
      eventSequence:  Array.isArray(rawGraph.eventSequence)  ? rawGraph.eventSequence.slice(0, 6)  : [],
    } : null;

    const rawSkills = (parsed as Record<string, unknown>).skills;

    analysis = {
      characters:            Array.isArray(parsed.characters)            ? parsed.characters.slice(0, 6)            : [],
      educational_concepts:  Array.isArray(parsed.educational_concepts)  ? parsed.educational_concepts               : [],
      themes:                Array.isArray(parsed.themes)                ? parsed.themes.slice(0, 4)                 : [],
      moral_lesson:          typeof parsed.moral_lesson === "string"     ? parsed.moral_lesson.trim() || null        : null,
      discussion_questions:  Array.isArray(parsed.discussion_questions)  ? parsed.discussion_questions.slice(0, 4)   : [],
      home_activities:       Array.isArray(parsed.home_activities)       ? parsed.home_activities.slice(0, 3)        : [],
      parent_talking_points: Array.isArray(parsed.parent_talking_points) ? parsed.parent_talking_points.slice(0, 3)  : [],
      skills:                Array.isArray(rawSkills)                    ? (rawSkills as StorySkill[]).slice(0, 6)   : ["reading_comprehension", "vocabulary"],
      graph,
    };

    // Persist (fire-and-forget)
    void supabase.from("story_knowledge_cache").upsert(
      { story_id: base.storyId, language: base.language, analysis, analyzed_at: new Date().toISOString(), pages_fingerprint: fingerprint },
      { onConflict: "story_id,language" },
    ).then(({ error }) => {
      if (error) console.error("[storyKnowledgeEngine] cache upsert:", error.message);
    });
  } catch (err) {
    console.error("[storyKnowledgeEngine] AI extraction failed:", err);
  }

  return analysis;
}

// ── Layer 2: learner context fetcher ──────────────────────────────────────────

/**
 * Fetches all dynamic, per-child data for a specific story.
 * Runs all DB queries in parallel. Any individual query failure returns safe
 * defaults so the overall context is always returned.
 */
export async function getLearnerStoryContext(
  supabase: SupabaseClient,
  childId:  string,
  storyId:  string,
  language: string,
  // Pass already-fetched slot data (from getStoryKnowledge) to avoid re-query
  slots?:    SlotInfo[],
  wordsLearned?: VocabItem[],
  wordsWorking?: VocabItem[],
): Promise<LearnerStoryContext> {
  const [profileRes, vocabRes, quizRes, summaryRes, globalVocabRes] = await Promise.allSettled([
    // Reading level and age
    supabase.rpc("get_child_learning_profile", { p_child_id: childId }),
    // Story-scoped vocab mastery and review flags
    supabase
      .from("child_vocabulary")
      .select("word, status, needs_review")
      .eq("child_id", childId)
      .eq("language", language)
      .eq("story_id", storyId),
    // Story-scoped quiz results (most recent 20)
    supabase
      .from("child_quiz_results")
      .select("answered_correctly, question_text")
      .eq("child_id", childId)
      .eq("story_id", storyId)
      .order("created_at", { ascending: false })
      .limit(20),
    // Topics discussed in Nimi sessions for this story
    supabase
      .from("conversation_summaries")
      .select("key_topics, mastered_vocab")
      .eq("child_id", childId)
      .eq("story_id", storyId)
      .order("created_at", { ascending: false })
      .limit(3),
    // Cross-story: all words mastered globally (no story_id filter)
    // Enables Nimi to say "You know 'delight' from The Talking Faces!"
    supabase
      .from("child_vocabulary")
      .select("word")
      .eq("child_id", childId)
      .eq("language", language)
      .eq("status", "mastered"),
  ]);

  // Profile
  let readingLevel: string | null = null;
  let age: number | null          = null;
  if (profileRes.status === "fulfilled" && profileRes.value.data) {
    const p = profileRes.value.data as Record<string, unknown>;
    readingLevel = typeof p.reading_level === "string" ? p.reading_level : null;
    age          = typeof p.age          === "number" ? p.age          : null;
  }

  // Vocab mastery
  let wordsMastered:   string[] = [];
  let wordsNeedReview: string[] = [];
  if (vocabRes.status === "fulfilled" && Array.isArray(vocabRes.value.data)) {
    type VRow = { word: string; status: string; needs_review: boolean };
    for (const row of vocabRes.value.data as VRow[]) {
      if (row.status === "mastered")  wordsMastered.push(row.word);
      if (row.needs_review)           wordsNeedReview.push(row.word);
    }
  }

  // Quiz performance
  let storyQuizAccuracy: number | null = null;
  let recentMistakes:    string[]      = [];
  if (quizRes.status === "fulfilled" && Array.isArray(quizRes.value.data)) {
    type QRow = { answered_correctly: boolean; question_text: string };
    const rows      = quizRes.value.data as QRow[];
    const correct   = rows.filter(r => r.answered_correctly).length;
    if (rows.length >= 3) storyQuizAccuracy = correct / rows.length;
    recentMistakes = rows
      .filter(r => !r.answered_correctly)
      .slice(0, 5)
      .map(r => r.question_text);
  }

  // Topics and chat vocab
  let topicsAsked:  string[] = [];
  let vocabFromChat: string[] = [];
  if (summaryRes.status === "fulfilled" && Array.isArray(summaryRes.value.data)) {
    type SRow = { key_topics: string[]; mastered_vocab: string[] };
    for (const row of summaryRes.value.data as SRow[]) {
      topicsAsked  = [...new Set([...topicsAsked,  ...(row.key_topics    ?? [])])];
      vocabFromChat = [...new Set([...vocabFromChat, ...(row.mastered_vocab ?? [])])];
    }
    topicsAsked  = topicsAsked.slice(0, 8);
    vocabFromChat = vocabFromChat.slice(0, 10);
  }

  // Cross-story global mastery
  let globalWordsMastered: string[] = [];
  if (globalVocabRes.status === "fulfilled" && Array.isArray(globalVocabRes.value.data)) {
    globalWordsMastered = (globalVocabRes.value.data as Array<{ word: string }>)
      .map(r => r.word);
  }

  // Slot summary (derived from passed-in slots or defaults)
  const resolvedSlots    = slots ?? [];
  const completedSlots   = resolvedSlots.filter(s => s.status === "completed").map(s => s.slotKey);
  const currentSlotInfo  = resolvedSlots.find(s => s.status === "current") ?? null;
  const completedCount   = completedSlots.length;
  const progressPercent  = resolvedSlots.length > 0
    ? Math.round((completedCount / resolvedSlots.length) * 100)
    : 0;

  return {
    childId,
    completedSlots,
    currentSlot:       currentSlotInfo?.slotKey ?? null,
    completedSlotCount: completedCount,
    progressPercent,
    wordsLearned:      wordsLearned  ?? [],
    wordsWorking:      wordsWorking  ?? [],
    wordsMastered,
    wordsNeedReview,
    storyQuizAccuracy,
    recentMistakes,
    topicsAsked,
    vocabFromChat,
    globalWordsMastered,
    readingLevel,
    age,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns Layer 1 (static story base) without child context.
 * Useful for admin dashboards, recommendation engines, and Teacher AI
 * when no specific child is in scope.
 */
export async function getStoryKnowledgeBase(
  supabase:  SupabaseClient,
  storyId:   string,
  language:  string,
): Promise<StoryKnowledgeBase | null> {
  const base = await getStoryKnowledge(supabase, storyId, language, null);
  if (!base) return null;

  const analysis = await fetchAnalysis(supabase, base).catch(() => null);
  const allVocab = [...base.vocabularyLearned, ...base.vocabularyCurrent];
  const curriculum = analysis
    ? mapStoryToCurriculum(analysis.skills, analysis.educational_concepts, analysis.themes)
    : null;

  return {
    storyId:     base.storyId,
    slug:        base.slug,
    language:    base.language,
    title:       base.title,
    description: base.description,
    themeEmoji:  base.themeEmoji,
    themeTitle:  base.themeTitle,
    ageMin:      base.ageMin,
    ageMax:      base.ageMax,
    isFree:      base.isFree,
    pages:       base.pages,
    slots:       base.slots,
    vocabulary:  allVocab,
    analysis,
    curriculum,
  };
}

/**
 * Returns Layer 1 + Layer 2 combined for a specific child.
 *
 * Layer 1 is cached in DB (5-min in-process + 7-day persistent).
 * Layer 2 is always fresh — all queries run in parallel.
 *
 * Non-fatal: if Layer 2 fails entirely, Layer 1 is still returned with
 * learner = null so Nimi always has story content to work with.
 */
export async function getEnrichedStoryKnowledge(
  supabase:  SupabaseClient,
  storyId:   string,
  language:  string,
  childId?:  string | null,
): Promise<EnrichedStoryKnowledge | null> {
  // Layer 1: base knowledge (progress-aware slot filtering for vocab)
  const base = await getStoryKnowledge(supabase, storyId, language, childId);
  if (!base) return null;

  // Layer 1: AI analysis — run in parallel with Layer 2 fetch
  const [analysisResult, learnerResult] = await Promise.allSettled([
    fetchAnalysis(supabase, base),
    childId
      ? getLearnerStoryContext(supabase, childId, storyId, language, base.slots, base.vocabularyLearned, base.vocabularyCurrent)
      : Promise.resolve(null),
  ]);

  const analysis = analysisResult.status === "fulfilled" ? analysisResult.value : null;
  const learner  = learnerResult.status  === "fulfilled" ? learnerResult.value  : null;

  const allVocab   = [...base.vocabularyLearned, ...base.vocabularyCurrent];
  const curriculum = analysis
    ? mapStoryToCurriculum(analysis.skills, analysis.educational_concepts, analysis.themes)
    : null;

  const storyBase: StoryKnowledgeBase = {
    storyId:     base.storyId,
    slug:        base.slug,
    language:    base.language,
    title:       base.title,
    description: base.description,
    themeEmoji:  base.themeEmoji,
    themeTitle:  base.themeTitle,
    ageMin:      base.ageMin,
    ageMax:      base.ageMax,
    isFree:      base.isFree,
    pages:       base.pages,
    slots:       base.slots,
    vocabulary:  allVocab,
    analysis,
    curriculum,
  };

  return {
    // Layer 0 (curriculum objectives)
    curriculum,
    // Layer 1 (explicit)
    story:    storyBase,
    // Layer 2
    learner,
    // AI analysis shortcut
    analysis,
    // Flat backward-compat surface (StoryKnowledge shape)
    ...base,
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCharacters(characters: StoryCharacter[]): string {
  if (characters.length === 0) return "";
  const lines = ["CHARACTERS:"];
  for (const c of characters) {
    const traits = c.traits.slice(0, 3).join(", ");
    lines.push(`• ${c.name} [${c.role}]${traits ? ` (${traits})` : ""} — ${c.description}`);
  }
  return lines.join("\n");
}

function fmtLearnerBlock(learner: LearnerStoryContext): string {
  const lines: string[] = [];

  if (learner.wordsMastered.length > 0) {
    lines.push(`Words confirmed mastered: ${learner.wordsMastered.slice(0, 8).join(", ")}`);
  }
  if (learner.wordsNeedReview.length > 0) {
    lines.push(`Needs reinforcement: ${learner.wordsNeedReview.slice(0, 5).join(", ")} — weave these in naturally`);
  }
  if (learner.storyQuizAccuracy !== null) {
    const pct = Math.round(learner.storyQuizAccuracy * 100);
    lines.push(`Story quiz accuracy: ${pct}%${pct < 50 ? " — keep explanations simple and encouraging" : ""}`);
  }
  if (learner.recentMistakes.length > 0) {
    lines.push(`Recent stumbles: ${learner.recentMistakes.slice(0, 3).join("; ")}`);
  }
  if (learner.topicsAsked.length > 0) {
    lines.push(`Topics asked before: ${learner.topicsAsked.slice(0, 5).join(", ")} — don't repeat verbatim`);
  }
  if (learner.readingLevel) {
    lines.push(`Reading level: ${learner.readingLevel}`);
  }

  return lines.length > 0 ? `LEARNER CONTEXT:\n${lines.map(l => `  ${l}`).join("\n")}` : "";
}

/**
 * Full Nimi system prompt block. Layer 1 (story + characters + themes) plus
 * Layer 2 (mastered words, review words, quiz accuracy, topics asked).
 */
export function formatEnrichedForNimi(k: EnrichedStoryKnowledge): string {
  const base = formatKnowledgeForPrompt(k);
  const extras: string[] = [];

  if (k.analysis) {
    const charBlock = fmtCharacters(k.analysis.characters);
    if (charBlock) extras.push(charBlock);
    if (k.analysis.themes.length > 0)               extras.push(`THEMES: ${k.analysis.themes.join(", ")}`);
    if (k.analysis.moral_lesson)                     extras.push(`MORAL LESSON: ${k.analysis.moral_lesson}`);
    if (k.analysis.educational_concepts.length > 0) extras.push(`EDUCATIONAL CONCEPTS: ${k.analysis.educational_concepts.join(", ")}`);
  }

  if (k.learner) {
    const learnerBlock = fmtLearnerBlock(k.learner);
    if (learnerBlock) extras.push(learnerBlock);
  }

  return extras.length > 0 ? `${base}\n\n${extras.join("\n\n")}` : base;
}

/**
 * Compact block for voice conversations.
 * Short enough to not overwhelm TTS — title, characters, key vocab, lesson.
 */
export function formatForVoice(k: EnrichedStoryKnowledge): string {
  const lines: string[] = [`Story: "${k.title}"`];

  if (k.analysis?.characters.length) {
    const mains = k.analysis.characters.filter(c => c.role === "main").map(c => c.name);
    if (mains.length) lines.push(`Main characters: ${mains.join(", ")}`);
  }

  // Prefer words the child is actively working on
  const keyVocab = (k.learner?.wordsWorking ?? k.vocabularyCurrent).slice(0, 3);
  if (keyVocab.length) {
    lines.push(`Key words: ${keyVocab.map(v => `${v.word} (${v.meaning})`).join("; ")}`);
  }

  if (k.analysis?.moral_lesson) lines.push(`Story lesson: ${k.analysis.moral_lesson}`);

  // Learner hint for Nimi to use in voice mode
  if (k.learner?.wordsNeedReview.length) {
    lines.push(`Reinforce: ${k.learner.wordsNeedReview.slice(0, 2).join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Parent AI block: vocab list, mastery status, discussion questions,
 * home activities, and conversation starters informed by Layer 2.
 */
export function formatForParent(k: EnrichedStoryKnowledge): string {
  const lines: string[] = [`## Story Context: "${k.title}"`];
  if (k.description) lines.push(k.description);

  // Vocab with mastery signal from Layer 2
  const allVocab = [...k.vocabularyLearned, ...k.vocabularyCurrent];
  if (allVocab.length > 0) {
    lines.push("\n### Words Your Child Is Learning");
    const mastered = new Set(k.learner?.wordsMastered ?? []);
    const review   = new Set(k.learner?.wordsNeedReview ?? []);
    for (const v of allVocab.slice(0, 10)) {
      const flag = mastered.has(v.word) ? " ✅" : review.has(v.word) ? " ⚠️ (needs practice)" : "";
      lines.push(`• ${v.word}${v.emoji ? ` ${v.emoji}` : ""} — ${v.meaning}${flag}`);
    }
  }

  if (k.analysis) {
    if (k.analysis.themes.length > 0)
      lines.push(`\n### Story Themes\n${k.analysis.themes.join(", ")}`);
    if (k.analysis.moral_lesson)
      lines.push(`\n### Lesson\n${k.analysis.moral_lesson}`);
    if (k.analysis.educational_concepts.length > 0)
      lines.push(`\n### Concepts Covered\n${k.analysis.educational_concepts.join(", ")}`);
    if (k.analysis.discussion_questions.length > 0) {
      lines.push("\n### Discussion Questions (ask your child)");
      for (const q of k.analysis.discussion_questions) lines.push(`• ${q}`);
    }
    if (k.analysis.home_activities.length > 0) {
      lines.push("\n### Home Activities");
      for (const a of k.analysis.home_activities) lines.push(`• ${a}`);
    }
    if (k.analysis.parent_talking_points.length > 0) {
      lines.push("\n### Conversation Starters");
      for (const p of k.analysis.parent_talking_points) lines.push(`• ${p}`);
    }
  }

  // Layer 2: progress summary for the parent AI to reference
  if (k.learner) {
    const { progressPercent, storyQuizAccuracy } = k.learner;
    const progressNote = `Progress: ${progressPercent}% through story activities`;
    const quizNote     = storyQuizAccuracy !== null
      ? `, quiz accuracy: ${Math.round(storyQuizAccuracy * 100)}%`
      : "";
    lines.push(`\n### Learning Progress\n${progressNote}${quizNote}`);
  }

  return lines.join("\n");
}

/**
 * Teacher AI block: full vocabulary (with cross-language translations),
 * educational concepts, characters, lesson objectives, activities.
 * Layer 2 adds class-level insight signals where relevant.
 */
export function formatForTeacher(k: EnrichedStoryKnowledge): string {
  const ageLabel =
    k.ageMin != null && k.ageMax != null ? ` | Ages ${k.ageMin}–${k.ageMax}` :
    k.ageMin != null ? ` | Ages ${k.ageMin}+` : "";
  const lines: string[] = [`## Story: "${k.title}"${ageLabel}`];
  if (k.description) lines.push(k.description);

  const allVocab = [...k.vocabularyLearned, ...k.vocabularyCurrent];
  if (allVocab.length > 0) {
    lines.push("\n### Vocabulary");
    for (const v of allVocab) {
      const xlangs = Object.entries(v.translations ?? {})
        .map(([l, t]) => `${l.toUpperCase()}: ${t.word}`)
        .join(", ");
      lines.push(`• ${v.word}${v.emoji ? ` ${v.emoji}` : ""} — ${v.meaning}${xlangs ? ` [${xlangs}]` : ""}`);
    }
  }

  if (k.analysis) {
    if (k.analysis.educational_concepts.length > 0)
      lines.push(`\n### Educational Concepts\n${k.analysis.educational_concepts.join(", ")}`);
    if (k.analysis.themes.length > 0)
      lines.push(`\n### Themes\n${k.analysis.themes.join(", ")}`);
    if (k.analysis.moral_lesson)
      lines.push(`\n### Moral Lesson\n${k.analysis.moral_lesson}`);
    if (k.analysis.characters.length > 0) {
      lines.push("\n### Characters");
      for (const c of k.analysis.characters)
        lines.push(`• ${c.name} (${c.role}) — ${c.description}`);
    }
    if (k.analysis.discussion_questions.length > 0) {
      lines.push("\n### Discussion Questions");
      for (const q of k.analysis.discussion_questions) lines.push(`• ${q}`);
    }
    if (k.analysis.home_activities.length > 0) {
      lines.push("\n### Suggested Activities / Homework");
      for (const a of k.analysis.home_activities) lines.push(`• ${a}`);
    }
  }

  return lines.join("\n");
}
