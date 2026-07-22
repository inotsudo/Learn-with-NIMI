/**
 * Adaptive Learning Engine — centralized calibration rules for Nimi.
 *
 * This module is the single source of truth for all adaptation decisions.
 * Nothing here knows about Supabase, React, or streaming — it is pure
 * rule logic that maps a child's learning profile into calibrated parameters,
 * then renders those parameters into reusable prompt sections.
 *
 * Consumers: app/api/nimi/route.ts (today), future quiz + content features.
 *
 * Adaptation dimensions:
 *   questionDifficulty — easy | medium | hard, driven by quiz accuracy + reading level
 *   definitionDepth    — how detailed vocabulary explanations are
 *   analogyStyle       — how concrete/abstract analogies should be
 *   sentenceTarget     — response length bracket
 *   focusStrengths     — question types child excels at (confidence boosters)
 *   focusWeaknesses    — question types child struggles with (gentle practice targets)
 */

import type { LearningProfile, ReadingLevel, QuestionType, Difficulty } from "./learningProfile";

// ── Core param type ────────────────────────────────────────────────────────────

export interface AdaptationParams {
  /** Calibrated question difficulty for this child right now. */
  questionDifficulty: Difficulty;
  /** Depth of vocabulary explanations. */
  definitionDepth: "simple" | "standard" | "rich";
  /** How concrete examples and analogies should be. */
  analogyStyle: "very_concrete" | "concrete" | "abstract";
  /** Sentence count target for Nimi's responses. */
  sentenceTarget: "1-2" | "2-3" | "3-4";
  /** Question types the child is strong at — use as confidence builders. */
  focusStrengths: QuestionType[];
  /** Question types the child struggles with — practice gently. */
  focusWeaknesses: QuestionType[];
  /** The reading level this was computed from (for prompt context). */
  readingLevel: ReadingLevel;
  /** True when quiz accuracy (≥5 questions) drove the difficulty, not just level. */
  calibratedFromQuiz: boolean;
}

// ── Adaptation rules ───────────────────────────────────────────────────────────

const LEVEL_DIFFICULTY: Record<ReadingLevel, Difficulty> = {
  emerging:   "easy",
  beginning:  "easy",
  developing: "medium",
  expanding:  "medium",
  fluent:     "hard",
};

const LEVEL_DEPTH: Record<ReadingLevel, AdaptationParams["definitionDepth"]> = {
  emerging:   "simple",
  beginning:  "simple",
  developing: "standard",
  expanding:  "rich",
  fluent:     "rich",
};

const LEVEL_ANALOGY: Record<ReadingLevel, AdaptationParams["analogyStyle"]> = {
  emerging:   "very_concrete",
  beginning:  "very_concrete",
  developing: "concrete",
  expanding:  "abstract",
  fluent:     "abstract",
};

const LEVEL_SENTENCES: Record<ReadingLevel, AdaptationParams["sentenceTarget"]> = {
  emerging:   "1-2",
  beginning:  "1-2",
  developing: "2-3",
  expanding:  "3-4",
  fluent:     "3-4",
};

/** Lift difficulty one notch: easy → medium → hard. */
function upgradeOnce(d: Difficulty): Difficulty {
  return d === "easy" ? "medium" : "hard";
}

/** Drop difficulty one notch: hard → medium → easy. */
function downgradeOnce(d: Difficulty): Difficulty {
  return d === "hard" ? "medium" : "easy";
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Derives calibrated adaptation parameters from the child's learning profile.
 *
 * Priority chain for question difficulty:
 *   1. Quiz accuracy (when ≥ 5 questions answered) — most responsive signal.
 *   2. Reading level (derived from completed story count) — structural baseline.
 *   3. Story ageMin fallback — used only when no profile is available.
 *
 * All other dimensions (depth, analogy style, sentence length) are derived
 * from reading level only — quiz data does not change these because they
 * reflect general cognitive development, not momentary performance.
 */
export function getAdaptationParams(
  profile: LearningProfile | null,
  storyAgeMin: number | null = null,
): AdaptationParams {
  // ── No profile at all: fall back to story age signal (pre-3.1 behavior) ──
  if (!profile) {
    const fallback: Difficulty =
      storyAgeMin == null ? "medium" :
      storyAgeMin <= 4    ? "easy"   :
      storyAgeMin <= 6    ? "medium" : "hard";

    return {
      questionDifficulty: fallback,
      definitionDepth:    "standard",
      analogyStyle:       "concrete",
      sentenceTarget:     "2-3",
      focusStrengths:     [],
      focusWeaknesses:    [],
      readingLevel:       "developing",
      calibratedFromQuiz: false,
    };
  }

  const { readingLevel, quiz, strengths, weaknesses } = profile;

  // ── Step 1: reading-level baseline ───────────────────────────────────────
  let difficulty: Difficulty = LEVEL_DIFFICULTY[readingLevel];
  let calibratedFromQuiz = false;

  // ── Step 2: quiz adjustment (requires ≥ 5 data points) ───────────────────
  if (quiz.totalQuestions >= 5 && quiz.accuracyPct != null) {
    const pct = quiz.accuracyPct;
    if (pct >= 80) {
      difficulty        = upgradeOnce(difficulty);
      calibratedFromQuiz = true;
    } else if (pct < 50) {
      difficulty        = downgradeOnce(difficulty);
      calibratedFromQuiz = true;
    }
    // 50-79% → keep the reading-level baseline; quiz confirms it
  }

  // ── Step 3: story-age cross-check when quiz data is thin ─────────────────
  // If the story targets a different age band, nudge difficulty to match
  // (but don't let it exceed reading-level baseline by more than one step).
  if (!calibratedFromQuiz && storyAgeMin != null) {
    const storyDifficulty: Difficulty =
      storyAgeMin <= 4 ? "easy" :
      storyAgeMin <= 6 ? "medium" : "hard";

    if (storyDifficulty !== difficulty) {
      // Split the difference: move one step toward the story's target.
      difficulty = storyDifficulty === "hard" && difficulty === "easy"
        ? "medium"
        : storyDifficulty === "easy" && difficulty === "hard"
        ? "medium"
        : storyDifficulty;
    }
  }

  return {
    questionDifficulty: difficulty,
    definitionDepth:    LEVEL_DEPTH[readingLevel],
    analogyStyle:       LEVEL_ANALOGY[readingLevel],
    sentenceTarget:     LEVEL_SENTENCES[readingLevel],
    focusStrengths:     strengths  as QuestionType[],
    focusWeaknesses:    weaknesses as QuestionType[],
    readingLevel,
    calibratedFromQuiz,
  };
}

// ── Prompt section builders ────────────────────────────────────────────────────

/**
 * Builds the VOCABULARY section of Nimi's system prompt, calibrated to the
 * child's definition depth and analogy style.
 *
 * Replaces the hardcoded vocabulary protocol in the route so every feature
 * that calls Nimi gets consistent, profile-aware vocabulary instructions.
 */
export function buildVocabProtocol(params: AdaptationParams): string {
  const explainStep: Record<AdaptationParams["definitionDepth"], string> = {
    simple: `\
  2. EXPLAIN IT — One short, plain sentence. No dictionary language. Use "It means..." or "It's when...". This child is still building vocabulary — keep it as simple as possible.`,
    standard: `\
  2. EXPLAIN IT — 1–2 clear sentences. Avoid dictionary language. Use "It's like when..." or "Think of it as..." to make the idea concrete for a young child.`,
    rich: `\
  2. EXPLAIN IT — Define it clearly (1 sentence), then say why the word matters and when you'd use it. A thoughtful comparison is welcome here — this child can handle more.`,
  };

  const exampleStep: Record<AdaptationParams["analogyStyle"], string> = {
    very_concrete: `\
  3. STORY EXAMPLE — Use a character or object from the story in the simplest sentence possible: "[Character] [did something]." One sentence only.`,
    concrete: `\
  3. STORY EXAMPLE — Create a short, friendly sentence using a character or moment from the story. Make it feel warm and natural.`,
    abstract: `\
  3. STORY EXAMPLE — Create a sentence using the word in the story's world. You can then optionally add a real-life comparison to deepen understanding.`,
  };

  return `\
VOCABULARY ("what does X mean?" / "how do you say X?") — Follow these steps in order:
  1. FIND IT — Check the VOCABULARY LEARNED and CURRENTLY LEARNING lists above. Each entry shows the word, its meaning, and translations in brackets like [EN: word | FR: word | RW: word].
${explainStep[params.definitionDepth]}
${exampleStep[params.analogyStyle]}
  4. OFFER TRANSLATIONS — If other-language translations are shown in the vocabulary list, share them naturally: "In French it's [word]! In Kinyarwanda it's [word]! Cool, right?" Only share languages that are listed — never guess translations that are not in the list.
  5. INVITE PRACTICE — End with a gentle nudge: "Can you say [word]?" or "Can you try using it in a sentence?"
  If the word is not in any list, look for it in the STORY TEXT above and explain from context. If it is not in the story at all, give a simple honest explanation and tie it back: "That word isn't in our story, but it reminds me of when..."`;
}

/**
 * Builds the COMPREHENSION QUESTIONS section of Nimi's system prompt.
 *
 * Replaces the hardcoded buildComprehensionProtocol(storyAgeMin) in the route.
 * Question difficulty is now driven by the child's learning profile instead of
 * only the story's target age.
 */
export function buildQuestionProtocol(params: AdaptationParams): string {
  const { questionDifficulty, focusStrengths, focusWeaknesses, calibratedFromQuiz } = params;

  const easyExamples = `\
  • "Who is the main character in our story?"
  • "What did [character] do?"
  • "Where did the story happen?"
  • "What happened at the beginning / the end?"`;

  const mediumExamples = `\
  • "Why did [character] do [action]?"
  • "How do you think [character] felt when...?"
  • "What was [character]'s problem? How did they solve it?"
  • "Was [character] right to [action]? Why?"`;

  const hardExamples = `\
  • "What do you think the story was trying to teach us?"
  • "Was [character]'s choice a good one? What would you have done differently?"
  • "How would the story change if [character] had acted differently?"
  • "Can you find a message in this story that applies to real life?"`;

  const vocabExamples = `\
  • "Can you use the word '[learned vocab word]' in your own sentence?"
  • "In the story, [character] [did something]. Which vocabulary word describes that?"
  • "What's the opposite of '[vocab word]'?"`;

  const personalExamples = `\
  • "Has anything like this ever happened to you?"
  • "What was your favourite part, and why?"
  • "If you could be any character, who would you choose?"`;

  const sections: Record<Difficulty, { primary: string; secondary: string }> = {
    easy: {
      primary:   `PRIMARY — RECALL questions (right level for this child):\n${easyExamples}`,
      secondary: `SECONDARY — UNDERSTANDING (occasional stretch):\n${mediumExamples}`,
    },
    medium: {
      primary:   `PRIMARY — UNDERSTANDING questions (right level for this child):\n${mediumExamples}`,
      secondary: `SECONDARY — RECALL (use as a warm-up):\n${easyExamples}`,
    },
    hard: {
      primary:   `PRIMARY — CRITICAL THINKING questions (right level for this child):\n${hardExamples}`,
      secondary: `SECONDARY — UNDERSTANDING (use for variety):\n${mediumExamples}`,
    },
  };

  const { primary, secondary } = sections[questionDifficulty];

  const calibrationNote = calibratedFromQuiz
    ? " (calibrated from this child's actual quiz history)"
    : "";

  const strengthsNote = focusStrengths.length > 0
    ? `\n- This child excels at ${focusStrengths.join(" and ")} questions — use these types as confidence-builders to start a session.`
    : "";

  const weaknessNote = focusWeaknesses.length > 0
    ? `\n- This child finds ${focusWeaknesses.join(" and ")} questions harder — gently include more of these to build the skill, always with encouragement.`
    : "";

  return `\
${primary}

${secondary}

VOCABULARY APPLICATION (mix in occasionally at any level):
${vocabExamples}

PERSONAL CONNECTION (use once per session to make it meaningful):
${personalExamples}

RULES FOR ALL COMPREHENSION QUESTIONS${calibrationNote}:
- Only ask about content in the STORY TEXT and VOCABULARY sections above — never about events or characters not shown there.
- One question at a time. Wait for the child to answer before asking another.
- Do not repeat the same question type twice in a row.
- Keep questions short, warm, and clearly worded — one sentence.
- After the child answers:
    ✓ Celebrate the effort first: "Great thinking!", "Oh, I love that answer!"
    ✓ If the answer is correct, add one interesting related detail from the story.
    ✓ If the answer is incorrect, correct it warmly: "Almost! In the story it was actually..." — then explain simply.
    ✓ Offer the next question only if the child seems to want to continue.
- If the child says they don't know, give a small hint using words from the story text, then ask again.${strengthsNote}${weaknessNote}`;
}

/**
 * Builds the CONVERSATION STYLE section of Nimi's system prompt.
 *
 * Calibrated to the child's reading level via sentence target. The
 * `languageInstruction` bullet is injected by the caller so the route
 * remains the single place that constructs language-specific rules.
 */
export function buildToneSection(
  params: AdaptationParams,
  languageInstruction: string,
): string {
  const sentenceGuidance: Record<AdaptationParams["sentenceTarget"], string> = {
    "1-2": "1 to 2 short sentences — very simple and warm",
    "2-3": "2 to 3 sentences — friendly and clear",
    "3-4": "3 to 4 sentences — you can go into a bit more depth here",
  };

  const depthNote =
    params.readingLevel === "emerging" || params.readingLevel === "beginning"
      ? "Use very simple words and very short sentences. Give lots of encouragement — every response should feel like a high-five."
      : params.readingLevel === "developing"
      ? "Balance simplicity with engagement. This child is growing — meet them where they are."
      : "This child can handle more sophisticated ideas. Don't oversimplify — be engaging and add a little more colour.";

  const strengthLine =
    params.focusStrengths.length > 0
      ? `\n- This child is strong at ${params.focusStrengths.join(" and ")} — lean into these to build momentum.`
      : "";

  return `\
CONVERSATION STYLE:
- ${sentenceGuidance[params.sentenceTarget]} — age-appropriate.
- ${depthNote}
- Ask follow-up questions to keep the child talking: "What did YOU think?", "Who was your favourite character?", "Would you do what they did?"
- Celebrate their curiosity: "Great question!", "Oh, you noticed that too!"
- Weave in a vocabulary word or character name naturally when it fits.
- Add an emoji or two 🌟🦁 — but keep it light, not every message.
- Never say anything scary or confusing.${strengthLine}
- ${languageInstruction}`;
}
