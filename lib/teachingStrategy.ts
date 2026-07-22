// lib/teachingStrategy.ts
//
// Teaching Strategy — Layer 3 decision logic inside the AI orchestrator.
//
// Pure function, no DB, no LLM.
// Takes what we know (Layers 0–2) and decides HOW to teach THIS child TODAY
// with THIS story. The output is a concrete set of rules injected into
// Nimi's system prompt before any conversation turn.
//
// This transforms Nimi from "an assistant that knows the content" into
// "a tutor that adapts its teaching style to each learner."
//
// Input sources:
//   adaptationParams   → AdaptationParams  (lib/adaptiveLearning.ts)
//     — global reading level, question difficulty, definition depth
//     — overall quiz accuracy, strengths/weaknesses
//   learner            → LearnerStoryContext  (lib/storyKnowledgeEngine.ts)
//     — story-scoped quiz accuracy + recent mistakes
//     — words mastered and needing review for THIS story
//     — topics the child has already asked about
//   analysis           → StoryAnalysis  (lib/storyKnowledgeEngine.ts)
//     — characters, themes, moral lesson
//   curriculum         → CurriculumMapping  (lib/curriculumKnowledge.ts)
//     — primary/secondary skills this story develops
//     — teaching hints per skill

import type { AdaptationParams } from "./adaptiveLearning";
import type { LearnerStoryContext, StoryAnalysis } from "./storyKnowledgeEngine";
import type { CurriculumMapping, CurriculumSkill } from "./curriculumKnowledge";
import { getTeachingHints } from "./curriculumKnowledge";

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuestionApproach =
  | 'recall'              // "What happened when…?" — for beginners / after mistakes
  | 'inference'           // "Why did…?" "How did they feel?" — intermediate
  | 'critical_thinking'   // "Was that a good choice?" "What would you have done?" — advanced
  | 'empathy'             // "How do you think [character] felt?" — when SEL skills are primary
  | 'personal_connection' // "Has that ever happened to you?" — always a warm closer
  | 'vocabulary_drill';   // Reinforce specific words — when needs_review list is long

export type EnergyLevel =
  | 'high_encouragement' // Child is struggling (low accuracy or many review words)
  | 'balanced'           // Child is progressing normally
  | 'challenging';       // Child is excelling (high accuracy, few review words)

export interface TeachingStrategy {
  /** Explicit rules rendered into Nimi's system prompt. */
  rules:             string[];
  /** What kind of question Nimi should lean toward in this conversation. */
  questionApproach:  QuestionApproach;
  /** Vocabulary words to weave into conversation naturally (≤3). */
  reinforceVocab:    string[];
  /** Overall tone calibration. */
  energyLevel:       EnergyLevel;
  /** Which curriculum skills to emphasise in this conversation. */
  skillFocus:        CurriculumSkill[];
  /** Skill-specific teaching hints from the curriculum layer. */
  skillHints:        string[];
}

// ── Signal derivation ─────────────────────────────────────────────────────────

interface Signals {
  storyAccuracy:     number | null;  // 0–1, story-scoped quiz accuracy
  globalAccuracy:    number | null;  // 0–1, overall accuracy from profile
  needsReviewCount:  number;
  masteredCount:     number;
  progressPercent:   number;
  topicsAlreadyCovered: string[];
  readingLevel:      string;
  age:               number | null;
}

function deriveSignals(
  adaptParams: AdaptationParams,
  learner:     LearnerStoryContext | null,
): Signals {
  const globalAccuracyPct = adaptParams.calibratedFromQuiz ? null : null;
  // AdaptationParams doesn't expose raw accuracy — use readingLevel as proxy
  const levelAccuracy: Record<string, number> = {
    emerging:   0.40,
    beginning:  0.50,
    developing: 0.65,
    expanding:  0.78,
    fluent:     0.90,
  };

  return {
    storyAccuracy:        learner?.storyQuizAccuracy ?? null,
    globalAccuracy:       levelAccuracy[adaptParams.readingLevel] ?? 0.60,
    needsReviewCount:     learner?.wordsNeedReview.length    ?? 0,
    masteredCount:        learner?.wordsMastered.length      ?? 0,
    progressPercent:      learner?.progressPercent           ?? 0,
    topicsAlreadyCovered: learner?.topicsAsked               ?? [],
    readingLevel:         adaptParams.readingLevel,
    age:                  learner?.age                       ?? null,
  };
}

// ── Core decision logic ───────────────────────────────────────────────────────

function pickEnergyLevel(signals: Signals): EnergyLevel {
  // Use story-specific accuracy when available; fall back to profile level
  const accuracy = signals.storyAccuracy ?? signals.globalAccuracy ?? 0.60;
  if (accuracy < 0.50 || signals.needsReviewCount >= 3) return "high_encouragement";
  if (accuracy >= 0.80 && signals.needsReviewCount === 0) return "challenging";
  return "balanced";
}

function pickQuestionApproach(
  signals:     Signals,
  adaptParams: AdaptationParams,
  curriculum:  CurriculumMapping | null,
): QuestionApproach {
  // If child has many words to review, drill vocabulary first
  if (signals.needsReviewCount >= 3) return "vocabulary_drill";

  // SEL skills (empathy, kindness, friendship) → empathy questions
  const selSkills = new Set<CurriculumSkill>([
    "empathy", "kindness", "friendship", "self_regulation", "family_values",
  ]);
  const hasSEL = curriculum?.primarySkills.some(s => selSkills.has(s)) ?? false;

  const accuracy = signals.storyAccuracy ?? signals.globalAccuracy ?? 0.60;

  if (hasSEL && accuracy >= 0.55) return "empathy";
  if (adaptParams.questionDifficulty === "hard") return "critical_thinking";
  if (adaptParams.questionDifficulty === "medium" && accuracy >= 0.65) return "inference";
  if (adaptParams.questionDifficulty === "easy" || accuracy < 0.55) return "recall";
  return "inference";
}

function pickReinforcedVocab(
  learner:  LearnerStoryContext | null,
  analysis: StoryAnalysis | null,
): string[] {
  if (!learner) return [];

  // Priority 1: words flagged for review this story
  if (learner.wordsNeedReview.length > 0) {
    return learner.wordsNeedReview.slice(0, 3);
  }

  // Priority 2: words the child is actively working on (not yet mastered)
  const masteredSet = new Set(learner.wordsMastered);
  const activeVocab = learner.wordsWorking
    .filter(v => !masteredSet.has(v.word))
    .map(v => v.word)
    .slice(0, 3);
  if (activeVocab.length > 0) return activeVocab;

  return [];
}

// ── Rule assembly ─────────────────────────────────────────────────────────────

function buildRules(
  signals:          Signals,
  energy:           EnergyLevel,
  qApproach:        QuestionApproach,
  reinforceVocab:   string[],
  curriculum:       CurriculumMapping | null,
  analysis:         StoryAnalysis | null,
): string[] {
  const rules: string[] = [];

  // 1. Sentence length and depth (from adaptParams, reflected in readingLevel)
  const sentenceRule: Record<string, string> = {
    emerging:   "Use 1–2 very short sentences. One idea per message.",
    beginning:  "Use 1–2 short, clear sentences. One idea per message.",
    developing: "Use 2–3 sentences. You can connect two ideas if they flow naturally.",
    expanding:  "Use 2–4 sentences. Engage with deeper ideas. Add colour and detail.",
    fluent:     "Use 3–4 rich sentences. This child can handle complexity — be engaging.",
  };
  const sentRule = sentenceRule[signals.readingLevel];
  if (sentRule) rules.push(sentRule);

  // 2. Question approach
  const qRules: Record<QuestionApproach, string> = {
    recall:             "Ask recall questions: 'What happened when…?' 'Who did…?' — concrete and grounded in the story text.",
    inference:          "Ask inference questions: 'Why did [character] do that?' 'How do you think they felt?' — require thinking beyond the words.",
    critical_thinking:  "Ask critical thinking questions: 'Was that a good choice?' 'What would YOU have done?' 'What does this teach us?' — encourage the child to form and defend opinions.",
    empathy:            "Focus on emotional questions: 'How did [character] feel?' 'Why was that hard for them?' 'Can you think of a time you felt like that?' — build emotional intelligence.",
    personal_connection:"Ask personal connection questions: 'Has that ever happened to you?' 'Which character is most like you?' — make the story feel real.",
    vocabulary_drill:   "Gently reinforce vocabulary in every response. Use needs-review words in natural sentences. Ask: 'Do you remember what [word] means?' before explaining.",
  };
  rules.push(qRules[qApproach]);

  // 3. Vocabulary reinforcement
  if (reinforceVocab.length > 0) {
    rules.push(`Naturally weave these words into the conversation: ${reinforceVocab.map(w => `"${w}"`).join(", ")} — use them in context, not as a list.`);
  }

  // 4. Energy and tone
  const energyRules: Record<EnergyLevel, string> = {
    high_encouragement: "Praise every attempt enthusiastically. If they make a mistake, correct warmly: 'Almost! The answer was…' then cheer them on. Never let a wrong answer end without encouragement.",
    balanced:           "Balance praise with gentle challenge. Celebrate correct answers warmly. Gently correct mistakes with a hint first.",
    challenging:        "This child is excelling — mild praise is enough. Challenge them with harder follow-ups. Introduce synonyms or comparisons. Don't oversimplify.",
  };
  rules.push(energyRules[energy]);

  // 5. Avoid repeating topics already covered in past sessions
  if (signals.topicsAlreadyCovered.length > 0) {
    const covered = signals.topicsAlreadyCovered.slice(0, 4).join(", ");
    rules.push(`Topics already discussed in past sessions: ${covered}. Don't repeat these verbatim — find a new angle or connect them to something new.`);
  }

  // 6. Story progress
  if (signals.progressPercent === 0) {
    rules.push("The child is just starting this story — keep the focus on the opening pages and introductory vocabulary. Don't reference events they haven't reached yet.");
  } else if (signals.progressPercent === 100) {
    rules.push("The child has completed all story activities — they know the full story. You can discuss any part of it, ask synthesis questions, or connect it to other stories.");
  } else {
    rules.push(`The child is ${signals.progressPercent}% through the story activities — only discuss content from completed and current activities.`);
  }

  // 7. Moral lesson hook (if present)
  if (analysis?.moral_lesson && qApproach !== "recall") {
    rules.push(`The story's core lesson is: "${analysis.moral_lesson}" — guide the child toward this insight when the conversation naturally allows it.`);
  }

  // 8. Story-specific quiz context
  if (signals.storyAccuracy !== null) {
    const pct = Math.round(signals.storyAccuracy * 100);
    if (pct < 50) {
      rules.push(`This child has answered ${pct}% of questions about this story correctly — simplify your questions and offer more hints before giving answers.`);
    } else if (pct >= 85) {
      rules.push(`This child has answered ${pct}% of questions about this story correctly — they're confident with this content. Stretch them with harder questions.`);
    }
  }

  return rules;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Derives a concrete teaching strategy for Nimi from all available context.
 *
 * Called once per conversation turn in the Nimi route, after:
 *   1. AdaptationParams have been computed (global profile)
 *   2. LearnerStoryContext has been fetched (story-specific dynamic data)
 *   3. StoryAnalysis is available (static AI-extracted content knowledge)
 *   4. CurriculumMapping has been derived (Layer 0 skill taxonomy)
 *
 * Returns a TeachingStrategy that gets formatted and injected into the
 * Nimi system prompt as the final, most-specific layer of instruction.
 */
export function deriveTeachingStrategy(
  adaptParams: AdaptationParams,
  learner:     LearnerStoryContext | null,
  analysis:    StoryAnalysis | null,
  curriculum:  CurriculumMapping | null,
): TeachingStrategy {
  const signals       = deriveSignals(adaptParams, learner);
  const energy        = pickEnergyLevel(signals);
  const qApproach     = pickQuestionApproach(signals, adaptParams, curriculum);
  const reinforceVocab = pickReinforcedVocab(learner, analysis);
  const rules         = buildRules(signals, energy, qApproach, reinforceVocab, curriculum, analysis);
  const skillFocus    = curriculum?.primarySkills ?? [];
  const skillHints    = getTeachingHints(skillFocus);

  return { rules, questionApproach: qApproach, reinforceVocab, energyLevel: energy, skillFocus, skillHints };
}

// ── Formatter ─────────────────────────────────────────────────────────────────

/**
 * Renders a TeachingStrategy as a system-prompt block.
 *
 * Placed at the end of the Nimi system prompt, after story knowledge and
 * adaptation sections, as the most specific instruction layer.
 */
export function formatTeachingStrategyForPrompt(
  strategy:   TeachingStrategy,
  childName:  string,
): string {
  const lines: string[] = [
    `## Teaching Strategy for ${childName || "this child"} — apply for this conversation`,
  ];

  if (strategy.skillFocus.length > 0) {
    lines.push(`Skills to develop: ${strategy.skillFocus.join(", ")}`);
  }

  lines.push("");
  lines.push("Rules:");
  for (const rule of strategy.rules) {
    lines.push(`✓ ${rule}`);
  }

  if (strategy.skillHints.length > 0) {
    lines.push("");
    lines.push("Skill-specific teaching hints:");
    for (const hint of strategy.skillHints) {
      lines.push(`→ ${hint}`);
    }
  }

  return lines.join("\n");
}
