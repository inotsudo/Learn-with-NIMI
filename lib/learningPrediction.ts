// lib/learningPrediction.ts
//
// Learning Outcome Prediction — the "Expected Result" layer.
//
// Before a learner starts recommended content, Nimi predicts:
//   • Which vocabulary words will improve
//   • Which curriculum skills will advance
//   • What quiz accuracy to expect after completion
//   • Specific, measurable success criteria
//
// Pure function — no DB, no LLM. Deterministic from learner signals.
//
// Prediction model:
//   - Vocabulary: predicted_retention rises by VOCAB_GAIN_RATE per encounter
//   - Skills: confidence rises by SKILL_GAIN_RATE, bounded by the story's coverage
//   - Quiz: modelled as current_accuracy + improvement_headroom × QUIZ_GAIN_RATE
//   - Confidence in prediction: higher when more data points exist
//
// Calibration constants are conservative — better to under-predict and
// over-deliver than the reverse. A 87% success score on a conservative
// prediction means more than 87% on an inflated one.

import { SKILL_DEFINITIONS } from "./curriculumKnowledge";
import type { CurriculumSkill } from "./curriculumKnowledge";
import type { SkillMasteryRow, ConceptReviewRow } from "./learnerKnowledgeGraph";
import type { CurriculumMapping } from "./storyKnowledgeEngine";

// ── Constants ─────────────────────────────────────────────────────────────────

// How much retention improves per story encounter with the word
const VOCAB_GAIN_RATE    = 0.12;
// How much skill confidence improves after targeted story
const SKILL_GAIN_RATE    = 0.08;
// How much quiz accuracy improves — headroom × this rate
const QUIZ_GAIN_RATE     = 0.30;
// Minimum predicted quiz accuracy for any learner
const QUIZ_FLOOR         = 0.55;
// Quiz improvement cap (no prediction > this)
const QUIZ_CAP           = 0.92;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SuccessCriterion {
  metric:      'quiz_accuracy' | 'vocab_mastery' | 'retention_improvement' | 'skill_confidence';
  description: string;   // "Answer empathy questions with 80% accuracy"
  threshold:   number;   // 0.80
  weight:      number;   // 0–1 (weights must sum to ~1 across all criteria for the rec)
}

export interface SkillGainPrediction {
  skill:            CurriculumSkill | string;
  skillLabel:       string;
  fromLevel:        string;           // "emerging"
  toLevel:          string;           // "developing" (predicted after story)
  fromConfidence:   number;           // 0–1 current
  toConfidence:     number;           // 0–1 predicted
}

export interface RetentionGainPrediction {
  word:  string;
  from:  number;       // current predicted_retention
  to:    number;       // predicted after story
}

export interface LearningOutcomePrediction {
  // What we expect the learner to achieve
  expectedVocabGains:      string[];                  // words expected to improve
  expectedSkillGains:      SkillGainPrediction[];     // skills expected to advance
  expectedRetentionGains:  RetentionGainPrediction[]; // spaced-rep words expected to recover
  expectedQuizAccuracy:    number | null;             // predicted accuracy after story

  // Specific, verifiable success criteria (shown to parents/teachers)
  successCriteria:         SuccessCriterion[];

  // How confident we are in this prediction (drives the "★★☆ Likely outcome" label)
  predictionConfidence:    number;   // 0–1

  // Formatted output for UI
  outcomeStatements:       string[]; // "✓ identify four basic emotions"
  measurementMethods:      string[]; // "Quiz accuracy on empathy questions"
}

// ── Mastery level helpers ─────────────────────────────────────────────────────

function nextLevel(current: string): string {
  if (current === 'none')       return 'emerging';
  if (current === 'emerging')   return 'developing';
  if (current === 'developing') return 'strong';
  return 'strong';
}

function confidenceForLevel(level: string): number {
  return level === 'strong' ? 0.90 : level === 'developing' ? 0.75 : level === 'emerging' ? 0.55 : 0.35;
}

function predictedConfidenceGain(current: number): number {
  // Diminishing returns: lower confidence = more room to grow
  const headroom = 1.0 - current;
  return Math.min(headroom * SKILL_GAIN_RATE * 2, 0.15);
}

// ── Quiz accuracy prediction ───────────────────────────────────────────────────

function predictQuizAccuracy(
  currentAccuracy:    number | null,
  skillMastery:       SkillMasteryRow[],
  targetSkills:       (CurriculumSkill | string)[],
): number | null {
  if (currentAccuracy === null && skillMastery.length === 0) return null;

  const baseline = currentAccuracy ?? 0.50;
  // How weak is the learner in the target skills?
  const targetMastery = skillMastery.filter(m => targetSkills.includes(m.curriculum_skill));
  const avgTargetConf = targetMastery.length > 0
    ? targetMastery.reduce((acc, m) => acc + m.avg_confidence, 0) / targetMastery.length
    : baseline;

  // More room to improve when currently weak
  const headroom = 1.0 - Math.max(baseline, avgTargetConf);
  const gain     = headroom * QUIZ_GAIN_RATE;

  return Math.min(QUIZ_CAP, Math.max(QUIZ_FLOOR, baseline + gain));
}

// ── Vocabulary gain prediction ─────────────────────────────────────────────────

function predictVocabGains(
  conceptsToReview: ConceptReviewRow[],
  storyVocab:       string[],
): { gains: RetentionGainPrediction[]; words: string[] } {
  const storySet = new Set(storyVocab.map(w => w.toLowerCase()));

  // Words that (a) need review AND (b) appear in the story — prime candidates
  const targeted = conceptsToReview.filter(c => storySet.has(c.concept_name.toLowerCase()));

  const gains: RetentionGainPrediction[] = targeted.map(c => ({
    word: c.concept_name,
    from: c.predicted_retention,
    to:   Math.min(1.0, c.predicted_retention + VOCAB_GAIN_RATE),
  }));

  return { gains, words: targeted.map(c => c.concept_name) };
}

// ── Skill gain prediction ──────────────────────────────────────────────────────

function predictSkillGains(
  skillMastery:  SkillMasteryRow[],
  targetSkills:  (CurriculumSkill | string)[],
): SkillGainPrediction[] {
  return targetSkills
    .map(skill => {
      const existing = skillMastery.find(m => m.curriculum_skill === skill);
      const fromLevel = existing?.mastery_level ?? 'none';
      const fromConf  = existing?.avg_confidence ?? 0.20;
      const gain      = predictedConfidenceGain(fromConf);
      const toConf    = Math.min(0.95, fromConf + gain);
      // Level only advances if confidence crosses the threshold
      const toLevel   = toConf >= 0.85 ? 'strong'
                      : toConf >= 0.65 ? 'developing'
                      : toConf >= 0.40 ? 'emerging'
                      : 'none';
      return {
        skill,
        skillLabel:     SKILL_DEFINITIONS[skill as CurriculumSkill]?.label ?? String(skill).replace(/_/g, ' '),
        fromLevel,
        toLevel,
        fromConfidence: fromConf,
        toConfidence:   toConf,
      };
    })
    .filter(g => g.toConfidence > g.fromConfidence); // only meaningful gains
}

// ── Success criteria builder ───────────────────────────────────────────────────

function buildSuccessCriteria(
  quizPrediction:   number | null,
  vocabGains:       RetentionGainPrediction[],
  skillGains:       SkillGainPrediction[],
  targetSkills:     (CurriculumSkill | string)[],
): SuccessCriterion[] {
  const criteria: SuccessCriterion[] = [];

  // Quiz accuracy criterion (if we have a prediction)
  if (quizPrediction !== null) {
    const threshold = Math.max(0.65, quizPrediction - 0.05); // allow 5% below prediction
    criteria.push({
      metric:      'quiz_accuracy',
      description: `Answer ${targetSkills[0] ? `${SKILL_DEFINITIONS[targetSkills[0] as CurriculumSkill]?.label ?? String(targetSkills[0])} ` : ''}questions with ${Math.round(threshold * 100)}% accuracy`,
      threshold,
      weight:      0.40,
    });
  }

  // Vocabulary retention criterion
  if (vocabGains.length > 0) {
    const avgTarget = vocabGains.reduce((acc, g) => acc + g.to, 0) / vocabGains.length;
    criteria.push({
      metric:      'retention_improvement',
      description: `Recall ${vocabGains.map(g => `"${g.word}"`).join(', ')} above ${Math.round(avgTarget * 100)}% retention`,
      threshold:   avgTarget,
      weight:      vocabGains.length > 1 ? 0.35 : 0.30,
    });
  }

  // Skill confidence criterion
  if (skillGains.length > 0) {
    const best = skillGains[0]; // strongest predicted gain
    criteria.push({
      metric:      'skill_confidence',
      description: `Advance ${best.skillLabel} from "${best.fromLevel}" to "${best.toLevel}"`,
      threshold:   best.toConfidence,
      weight:      0.25,
    });
  }

  // Normalise weights to sum to 1.0
  const total = criteria.reduce((acc, c) => acc + c.weight, 0);
  if (total > 0 && Math.abs(total - 1.0) > 0.01) {
    for (const c of criteria) c.weight = c.weight / total;
  }

  return criteria;
}

// ── Outcome statements (human-readable) ───────────────────────────────────────

function buildOutcomeStatements(
  quizPrediction:   number | null,
  vocabGains:       RetentionGainPrediction[],
  skillGains:       SkillGainPrediction[],
  curriculum:       CurriculumMapping | null,
): string[] {
  const statements: string[] = [];

  // Skill objectives from curriculum layer (authoritative educational language)
  if (curriculum) {
    for (const skill of curriculum.primarySkills.slice(0, 2)) {
      const def = SKILL_DEFINITIONS[skill];
      if (def?.objectives?.[0]) {
        statements.push(def.objectives[0]);
      }
    }
  }

  // Specific vocabulary outcomes
  if (vocabGains.length > 0) {
    const words = vocabGains.slice(0, 3).map(g => `"${g.word}"`).join(', ');
    statements.push(`Correctly use the ${vocabGains.length === 1 ? 'word' : 'words'} ${words}`);
  }

  // Quiz outcome
  if (quizPrediction !== null) {
    const firstSkill = skillGains[0]?.skillLabel;
    statements.push(`Answer ${firstSkill ? `${firstSkill.toLowerCase()} ` : ''}questions with at least ${Math.round(quizPrediction * 100)}% accuracy`);
  }

  // Skill advancement
  for (const g of skillGains.slice(0, 2)) {
    if (g.fromLevel !== g.toLevel) {
      statements.push(`Demonstrate ${g.skillLabel.toLowerCase()} skills at the "${g.toLevel}" level`);
    }
  }

  return statements.slice(0, 4); // cap at 4 statements for readability
}

// ── Measurement methods ───────────────────────────────────────────────────────

function buildMeasurementMethods(criteria: SuccessCriterion[]): string[] {
  const methods: string[] = [];
  for (const c of criteria) {
    if (c.metric === 'quiz_accuracy')         methods.push('Quiz performance on story-specific questions');
    if (c.metric === 'retention_improvement') methods.push('Vocabulary recall (spaced repetition retention score)');
    if (c.metric === 'skill_confidence')      methods.push('Curriculum skill confidence (knowledge graph)');
    if (c.metric === 'vocab_mastery')         methods.push('Word mastery tracking (child_vocabulary)');
  }
  // Always include conversation quality — this is Nimi-specific
  methods.push('Quality of empathy responses in Nimi conversation');
  return [...new Set(methods)]; // deduplicate
}

// ── Prediction confidence ─────────────────────────────────────────────────────

function computePredictionConfidence(
  quizDataPoints:    number,  // how many quiz answers exist
  conceptsTracked:   number,  // how many concepts in knowledge graph
  skillsTracked:     number,  // how many skills with mastery data
): number {
  // Each data source contributes confidence
  let conf = 0.35; // baseline (some data always exists after first interaction)

  if (quizDataPoints >= 10)       conf += 0.25;
  else if (quizDataPoints >= 5)   conf += 0.15;
  else if (quizDataPoints >= 3)   conf += 0.08;

  if (conceptsTracked >= 10)      conf += 0.20;
  else if (conceptsTracked >= 5)  conf += 0.12;
  else if (conceptsTracked >= 2)  conf += 0.06;

  if (skillsTracked >= 3)         conf += 0.15;
  else if (skillsTracked >= 1)    conf += 0.08;

  return Math.min(0.90, conf); // cap at 90% — never claim certainty
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface PredictionInput {
  skillMastery:      SkillMasteryRow[];
  conceptsToReview:  ConceptReviewRow[];
  curriculum:        CurriculumMapping | null;
  storyVocab:        string[];              // vocab words from the story
  currentQuizAccuracy: number | null;       // learner's current accuracy
  quizDataPoints:    number;                // how many quiz answers exist
}

/**
 * Builds a complete Learning Outcome Prediction for one recommendation.
 *
 * Called by the recommendation route before persisting. Pure function —
 * the same inputs always produce the same prediction.
 */
export function buildLearningPrediction(input: PredictionInput): LearningOutcomePrediction {
  const {
    skillMastery, conceptsToReview, curriculum, storyVocab,
    currentQuizAccuracy, quizDataPoints,
  } = input;

  const targetSkills: (CurriculumSkill | string)[] = curriculum
    ? [...curriculum.primarySkills, ...curriculum.secondarySkills]
    : [];

  const { gains: retentionGains, words: vocabWords } = predictVocabGains(conceptsToReview, storyVocab);
  const skillGains       = predictSkillGains(skillMastery, targetSkills);
  const quizPrediction   = predictQuizAccuracy(currentQuizAccuracy, skillMastery, targetSkills);
  const successCriteria  = buildSuccessCriteria(quizPrediction, retentionGains, skillGains, targetSkills);
  const outcomeStatements = buildOutcomeStatements(quizPrediction, retentionGains, skillGains, curriculum);
  const measurementMethods = buildMeasurementMethods(successCriteria);

  const predictionConfidence = computePredictionConfidence(
    quizDataPoints,
    conceptsToReview.length,
    skillMastery.length,
  );

  return {
    expectedVocabGains:     vocabWords,
    expectedSkillGains:     skillGains,
    expectedRetentionGains: retentionGains,
    expectedQuizAccuracy:   quizPrediction,
    successCriteria,
    predictionConfidence,
    outcomeStatements,
    measurementMethods,
  };
}

/**
 * Returns a confidence label for display.
 * "★★★ High confidence" / "★★☆ Likely outcome" / "★☆☆ Early estimate"
 */
export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return '★★★ High confidence';
  if (confidence >= 0.55) return '★★☆ Likely outcome';
  return '★☆☆ Early estimate';
}
