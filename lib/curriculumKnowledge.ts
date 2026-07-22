// lib/curriculumKnowledge.ts
//
// Layer 0 — Curriculum Knowledge
//
// The meta-framework that sits above all story-specific knowledge.
// Every content type in the platform (stories, coloring, games, songs, lessons,
// videos, worksheets) maps to the same skill taxonomy and learning objectives
// defined here.
//
// This means a child practicing "empathy" through:
//   • a story about a rabbit who helps a friend         (Layer 1)
//   • a coloring page of characters sharing food        (Layer 1)
//   • a Nimi quiz question about character feelings     (Layer 2)
//   • a teacher lesson on emotional vocabulary          (Layer 1)
// ...all map to CurriculumSkill "empathy" and the same objectives.
//
// The recommendation engine, teacher AI, parent AI, and Nimi can then
// answer questions like:
//   "What does this story practice?"
//   "Which activities reinforce counting this week?"
//   "What skill should we focus on next?"
//
// Design rules:
//   - All skills are defined ONCE here, never inline in features.
//   - Skills are stable identifiers (snake_case) — labels can change.
//   - Each skill carries teaching hints so AI features know HOW to teach it.
//   - mapStoryToCurriculum() is the single conversion point.

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkillCategory =
  | 'literacy'
  | 'numeracy'
  | 'social_emotional'
  | 'knowledge'
  | 'creative';

export type CurriculumSkill =
  // Literacy
  | 'reading_comprehension'
  | 'vocabulary'
  | 'listening'
  | 'speaking'
  | 'phonics'
  // Numeracy
  | 'counting'
  | 'shapes'
  | 'patterns'
  // Social-Emotional Learning
  | 'empathy'
  | 'kindness'
  | 'friendship'
  | 'problem_solving'
  | 'self_regulation'
  | 'family_values'
  // World Knowledge
  | 'nature_science'
  | 'animals'
  | 'geography'
  | 'culture'
  | 'safety'
  | 'health'
  // Creative & Cognitive
  | 'creativity'
  | 'memory'
  | 'critical_thinking';

export interface SkillDefinition {
  label:         string;
  category:      SkillCategory;
  /** What a child achieves by practicing this skill. */
  objectives:    string[];
  /** How an AI tutor should approach teaching this skill. */
  teachingHints: string[];
}

export interface CurriculumMapping {
  /** Top 1–3 skills this story primarily develops. */
  primarySkills:   CurriculumSkill[];
  /** Supporting skills present but not central. */
  secondarySkills: CurriculumSkill[];
  /** Specific learning objectives this story addresses. */
  objectives:      string[];
  /**
   * Other content types that share these objectives.
   * Populated lazily by features that know about content types.
   * Left empty here so this layer stays content-type-agnostic.
   */
  contentLinks:    { type: string; id: string; title: string }[];
}

// ── Skill definitions ─────────────────────────────────────────────────────────
// Each definition carries teaching hints — the HOW, not just the WHAT.

export const SKILL_DEFINITIONS: Record<CurriculumSkill, SkillDefinition> = {
  reading_comprehension: {
    label:    "Reading Comprehension",
    category: "literacy",
    objectives: [
      "Identify main characters and their roles",
      "Retell story events in sequence",
      "Understand cause and effect in the narrative",
      "Make simple predictions about what happens next",
      "Infer why a character made a certain choice",
    ],
    teachingHints: [
      "Ask 'what happened when…' before asking 'why'",
      "Reference specific page numbers to anchor events in the child's memory",
      "Retelling in their own words shows true comprehension — invite it",
      "Sequence questions ('what came first?') are strong warm-ups",
    ],
  },
  vocabulary: {
    label:    "Vocabulary Building",
    category: "literacy",
    objectives: [
      "Learn new words from story context",
      "Understand word meanings through examples",
      "Use new vocabulary words in spoken sentences",
      "Recognise words across languages",
    ],
    teachingHints: [
      "Always give the meaning before asking the child to use the word",
      "Connect the new word to something familiar: 'It's like when…'",
      "Ask 'can you use it in a sentence?' after explaining",
      "Celebrate when they use a vocabulary word unprompted",
    ],
  },
  listening: {
    label:    "Listening",
    category: "literacy",
    objectives: [
      "Follow a story from beginning to end",
      "Remember key details after hearing the story",
      "Respond to questions about what they heard",
    ],
    teachingHints: [
      "Ask recall questions to confirm what the child heard",
      "Short, clear questions work best for listening comprehension",
      "Praise specific details they remembered correctly",
    ],
  },
  speaking: {
    label:    "Speaking",
    category: "literacy",
    objectives: [
      "Express opinions about the story",
      "Use story vocabulary in spoken answers",
      "Build confidence speaking in the learning language",
    ],
    teachingHints: [
      "Invite the child to say things aloud: 'Can you say that word?'",
      "Never rush — wait patiently for spoken responses",
      "Model correct pronunciation naturally without correction",
    ],
  },
  phonics: {
    label:    "Phonics & Sounds",
    category: "literacy",
    objectives: [
      "Recognise letter sounds in story words",
      "Blend sounds to decode unfamiliar words",
    ],
    teachingHints: [
      "Point out interesting letter patterns in vocabulary words",
      "Rhymes and word families make phonics memorable",
    ],
  },
  counting: {
    label:    "Counting",
    category: "numeracy",
    objectives: [
      "Count objects in the story",
      "Sequence events using numbers",
    ],
    teachingHints: [
      "Ask 'how many…?' using story elements",
      "Count characters, items, or pages together",
    ],
  },
  shapes: {
    label:    "Shapes",
    category: "numeracy",
    objectives: [
      "Name shapes found in illustrations",
      "Connect shape names to real objects",
    ],
    teachingHints: [
      "Reference shapes visible in the story world",
      "Ask the child to find shapes around them",
    ],
  },
  patterns: {
    label:    "Patterns & Sequences",
    category: "numeracy",
    objectives: [
      "Recognise repeating events in the story",
      "Predict what comes next in a pattern",
    ],
    teachingHints: [
      "Story repetition ('the wolf huffed and puffed…') is a natural pattern hook",
      "Ask 'what do you think happens next?' to test pattern recognition",
    ],
  },
  empathy: {
    label:    "Empathy",
    category: "social_emotional",
    objectives: [
      "Recognise and name emotions in story characters",
      "Understand why a character feels a certain way",
      "Connect character feelings to their own experiences",
      "Consider multiple perspectives in a conflict",
    ],
    teachingHints: [
      "Ask 'how do you think they felt?' at emotional high points",
      "Validate the child's emotional response: 'It's okay to feel sad when…'",
      "'What would you do?' builds perspective-taking",
      "Name specific emotions rather than just 'happy' or 'sad'",
    ],
  },
  kindness: {
    label:    "Kindness",
    category: "social_emotional",
    objectives: [
      "Recognise acts of kindness in the story",
      "Understand why kindness matters to others",
      "Connect story kindness to their own daily life",
    ],
    teachingHints: [
      "Highlight the moment a character chose kindness",
      "Ask 'why did that matter to the other character?'",
      "Connect to real life: 'Can you think of a time you were kind like that?'",
    ],
  },
  friendship: {
    label:    "Friendship",
    category: "social_emotional",
    objectives: [
      "Understand what makes a good friend",
      "Identify friendship behaviours in the story",
      "Apply friendship lessons to real relationships",
    ],
    teachingHints: [
      "Ask 'what did [character] do that was a good friend thing to do?'",
      "Connect to their real friends: 'Do you and your friends ever…?'",
    ],
  },
  problem_solving: {
    label:    "Problem Solving",
    category: "social_emotional",
    objectives: [
      "Identify the problem in the story",
      "Follow how the characters solved it",
      "Generate alternative solutions",
    ],
    teachingHints: [
      "Ask 'what was the problem?' before asking 'how did they fix it?'",
      "'What would YOU have done?' opens up creative thinking",
      "Praise attempts at solutions, right or wrong",
    ],
  },
  self_regulation: {
    label:    "Self-Regulation",
    category: "social_emotional",
    objectives: [
      "Recognise moments when characters managed their emotions",
      "Understand consequences of emotional choices",
    ],
    teachingHints: [
      "Focus on moments where a character chose to calm down or wait",
      "Ask 'what happened because they made that choice?'",
    ],
  },
  family_values: {
    label:    "Family & Community",
    category: "social_emotional",
    objectives: [
      "Recognise family relationships in the story",
      "Understand the role of community in the narrative",
    ],
    teachingHints: [
      "Connect family in the story to the child's own family",
      "Celebrate cultural family structures shown in the story",
    ],
  },
  nature_science: {
    label:    "Nature & Science",
    category: "knowledge",
    objectives: [
      "Learn facts about nature, plants, weather, or science through the story",
      "Connect story elements to real-world nature observations",
    ],
    teachingHints: [
      "Extend naturally: 'The story mentions rain — do you know why it rains?'",
      "Link story facts to things the child can observe outside",
    ],
  },
  animals: {
    label:    "Animals",
    category: "knowledge",
    objectives: [
      "Learn animal names, habitats, and behaviours",
      "Distinguish between animals in the story and real life",
    ],
    teachingHints: [
      "Ask about the animal's real-world behaviours alongside the story",
      "Animal sounds and movements make lessons memorable",
    ],
  },
  geography: {
    label:    "Geography & Places",
    category: "knowledge",
    objectives: [
      "Identify places mentioned in the story",
      "Learn facts about different environments",
    ],
    teachingHints: [
      "Ask 'have you ever been somewhere like that?'",
      "Connect story settings to maps or the child's local environment",
    ],
  },
  culture: {
    label:    "Culture & Heritage",
    category: "knowledge",
    objectives: [
      "Recognise cultural practices and traditions in the story",
      "Appreciate diversity through storytelling",
    ],
    teachingHints: [
      "Highlight specific cultural details with warmth and curiosity",
      "Ask 'do you have something like that in your family?'",
    ],
  },
  safety: {
    label:    "Safety",
    category: "knowledge",
    objectives: [
      "Understand safety rules illustrated in the story",
      "Recognise dangerous situations and safe responses",
    ],
    teachingHints: [
      "Keep safety discussions positive: 'What did they do to stay safe?'",
      "Apply lessons: 'What would you do if that happened to you?'",
    ],
  },
  health: {
    label:    "Health & Wellbeing",
    category: "knowledge",
    objectives: [
      "Learn healthy habits from story characters",
      "Connect health themes to daily routines",
    ],
    teachingHints: [
      "Celebrate healthy choices characters make in the story",
      "Connect to the child's own routines: 'Do you do that too?'",
    ],
  },
  creativity: {
    label:    "Creativity & Imagination",
    category: "creative",
    objectives: [
      "Imagine alternative story outcomes",
      "Create new scenes or characters inspired by the story",
    ],
    teachingHints: [
      "Open-ended questions: 'What would you add to this story?'",
      "Encourage wild ideas: 'There are no wrong answers here!'",
    ],
  },
  memory: {
    label:    "Memory",
    category: "creative",
    objectives: [
      "Recall specific story details after reading",
      "Remember vocabulary words across sessions",
    ],
    teachingHints: [
      "Recall questions are great warm-ups: 'Do you remember…?'",
      "Spaced repetition: revisit words from previous sessions naturally",
    ],
  },
  critical_thinking: {
    label:    "Critical Thinking",
    category: "creative",
    objectives: [
      "Evaluate character decisions",
      "Consider multiple perspectives on story events",
      "Draw conclusions not explicitly stated in the text",
    ],
    teachingHints: [
      "Ask 'was that a good choice? Why / why not?'",
      "'What if…' questions are powerful at this level",
      "Encourage the child to defend their opinion with evidence from the story",
    ],
  },
};

// ── Mapping logic ─────────────────────────────────────────────────────────────

// Story skills (from AI extraction) → canonical CurriculumSkill
const SKILL_ALIASES: Record<string, CurriculumSkill> = {
  // Literacy
  reading_comprehension: "reading_comprehension",
  comprehension:         "reading_comprehension",
  vocabulary:            "vocabulary",
  vocab:                 "vocabulary",
  listening:             "listening",
  speaking:              "speaking",
  phonics:               "phonics",
  language:              "vocabulary",
  // Numeracy
  counting:              "counting",
  shapes:                "shapes",
  numbers:               "counting",
  patterns:              "patterns",
  // SEL
  empathy:               "empathy",
  kindness:              "kindness",
  friendship:            "friendship",
  problem_solving:       "problem_solving",
  "problem-solving":     "problem_solving",
  self_regulation:       "self_regulation",
  family_values:         "family_values",
  family:                "family_values",
  community:             "family_values",
  // Knowledge
  nature_science:        "nature_science",
  nature:                "nature_science",
  science:               "nature_science",
  animals:               "animals",
  animal:                "animals",
  geography:             "geography",
  culture:               "culture",
  safety:                "safety",
  health:                "health",
  // Creative/Cognitive
  creativity:            "creativity",
  imagination:           "creativity",
  memory:                "memory",
  critical_thinking:     "critical_thinking",
  "critical-thinking":   "critical_thinking",
};

// Educational concept strings (from AI extraction) → CurriculumSkill
const CONCEPT_TO_SKILL: Record<string, CurriculumSkill> = {
  counting:    "counting",
  colors:      "creativity",
  animals:     "animals",
  emotions:    "empathy",
  nature:      "nature_science",
  family:      "family_values",
  friendship:  "friendship",
  science:     "nature_science",
  geography:   "geography",
  culture:     "culture",
  safety:      "safety",
  kindness:    "kindness",
  problem_solving: "problem_solving",
  language:    "vocabulary",
  shapes:      "shapes",
  food:        "health",
};

// Theme strings (from AI extraction) → CurriculumSkill
const THEME_TO_SKILL: Record<string, CurriculumSkill> = {
  friendship:   "friendship",
  family:       "family_values",
  kindness:     "kindness",
  courage:      "self_regulation",
  community:    "family_values",
  empathy:      "empathy",
  sharing:      "kindness",
  respect:      "kindness",
  creativity:   "creativity",
  nature:       "nature_science",
  adventure:    "critical_thinking",
  growth:       "self_regulation",
  culture:      "culture",
  diversity:    "culture",
  love:         "family_values",
  honesty:      "self_regulation",
};

/**
 * Maps story-extracted skills, concepts, and themes to the canonical curriculum.
 * Called inside the story knowledge engine after AI extraction.
 */
export function mapStoryToCurriculum(
  extractedSkills:      string[],
  educationalConcepts:  string[],
  themes:               string[],
): CurriculumMapping {
  const skillSet = new Set<CurriculumSkill>();

  // 1. Map extracted skill strings
  for (const s of extractedSkills) {
    const key = s.toLowerCase().replace(/\s+/g, "_");
    const mapped = SKILL_ALIASES[key];
    if (mapped) skillSet.add(mapped);
  }

  // 2. Map educational concepts
  for (const c of educationalConcepts) {
    const mapped = CONCEPT_TO_SKILL[c];
    if (mapped) skillSet.add(mapped);
  }

  // 3. Map themes
  for (const t of themes) {
    const mapped = THEME_TO_SKILL[t.toLowerCase()];
    if (mapped) skillSet.add(mapped);
  }

  // All stories develop reading comprehension and vocabulary by default
  skillSet.add("reading_comprehension");
  skillSet.add("vocabulary");

  const allSkills = [...skillSet];

  // Primary = first 3 (reading_comprehension and vocabulary go last so
  // content-specific skills appear first)
  const contentSpecific = allSkills.filter(
    s => s !== "reading_comprehension" && s !== "vocabulary",
  );
  const primary: CurriculumSkill[] = [
    ...contentSpecific.slice(0, 2),
    "reading_comprehension",
  ].slice(0, 3) as CurriculumSkill[];

  const secondary: CurriculumSkill[] = allSkills.filter(s => !primary.includes(s)).slice(0, 4);

  // Gather unique objectives from primary skills
  const objectives: string[] = [];
  for (const skill of primary) {
    for (const obj of SKILL_DEFINITIONS[skill]?.objectives ?? []) {
      if (!objectives.includes(obj)) objectives.push(obj);
    }
  }

  return { primarySkills: primary, secondarySkills: secondary, objectives, contentLinks: [] };
}

// ── Teaching hint lookup ───────────────────────────────────────────────────────

/**
 * Returns teaching hints for a set of curriculum skills.
 * Used by the teaching strategy to give Nimi skill-specific guidance.
 */
export function getTeachingHints(skills: CurriculumSkill[]): string[] {
  const hints: string[] = [];
  const seen  = new Set<string>();
  for (const skill of skills.slice(0, 3)) {
    for (const hint of SKILL_DEFINITIONS[skill]?.teachingHints ?? []) {
      if (!seen.has(hint)) { hints.push(hint); seen.add(hint); }
    }
  }
  return hints.slice(0, 5);
}
