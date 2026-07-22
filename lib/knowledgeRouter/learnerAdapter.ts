// lib/knowledgeRouter/learnerAdapter.ts
//
// Adapts assembled knowledge to the specific learner:
//   – Age-appropriate framing instructions
//   – Reading-level guidance
//   – Role-specific formatting (child vs parent vs teacher)
//   – Vocabulary scaffolding hints
//
// Returns a block of text injected into the AI prompt so the LLM
// automatically produces the right register without extra instructions.

import type { RouterLearnerProfile } from './types';

// ── Age-group descriptors ─────────────────────────────────────────────────────

function ageGroup(age: number | null): string {
  if (age === null) return 'school-age child';
  if (age <= 4)  return 'toddler (age 2–4)';
  if (age <= 6)  return 'early learner (age 5–6)';
  if (age <= 8)  return 'young reader (age 7–8)';
  if (age <= 10) return 'primary-school student (age 9–10)';
  if (age <= 13) return 'middle-school student (age 11–13)';
  return 'teenager';
}

// ── Vocabulary complexity hints ───────────────────────────────────────────────

function vocabComplexity(readingLevel: number | null, age: number | null): string {
  const level = readingLevel ?? (age ? Math.max(1, age - 4) : 4);
  if (level <= 2)  return 'Use very simple words (1–2 syllables). Short sentences. No jargon.';
  if (level <= 4)  return 'Use simple everyday words. Keep sentences short and direct.';
  if (level <= 6)  return 'Use clear, age-appropriate language. Explain any technical terms briefly.';
  if (level <= 8)  return 'Use standard vocabulary. Define specialist terms when first introduced.';
  if (level <= 10) return 'Use academic vocabulary appropriate for the topic. Avoid unnecessary simplification.';
  return 'Use precise, subject-specific vocabulary. Treat the reader as a capable learner.';
}

// ── Sentence length guidance ──────────────────────────────────────────────────

function sentenceGuidance(age: number | null): string {
  if (age === null || age >= 10) return '';
  if (age <= 5)  return 'Maximum 8 words per sentence.';
  if (age <= 7)  return 'Keep sentences under 15 words.';
  return 'Keep sentences concise and clear (under 20 words).';
}

// ── Role-specific framing ─────────────────────────────────────────────────────

function roleFrame(role: 'child' | 'parent' | 'teacher', childName: string): string {
  if (role === 'parent') {
    return `You are speaking to a parent about their child ${childName || ''}. Use supportive, informative language. Avoid jargon. Provide actionable guidance.`;
  }
  if (role === 'teacher') {
    return `You are speaking to a teacher. Use professional, pedagogically-grounded language. Include curriculum connections and evidence-based rationale where relevant.`;
  }
  // Child
  const name = childName ? `${childName} ` : '';
  return `You are speaking directly to ${name}a child. Be warm, encouraging, and age-appropriate.`;
}

// ── Language-specific guidance ────────────────────────────────────────────────

function languageGuidance(language: string): string {
  if (language === 'rw') {
    return 'Use natural, spoken Kinyarwanda as understood by children in Rwanda. Avoid literal translations from English.';
  }
  if (language === 'fr') {
    return "Use clear, friendly French appropriate for the learner's age.";
  }
  return '';
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface AdaptationBlock {
  instruction:     string;   // injected as a block into the system prompt
  readingLevel:    number;   // numeric grade level for downstream use
}

export function buildAdaptationBlock(learner: RouterLearnerProfile): AdaptationBlock {
  const level = learner.readingLevel ?? (learner.age ? Math.max(1, learner.age - 4) : 4);

  const parts: string[] = [
    roleFrame(learner.role, learner.childName),
    vocabComplexity(learner.readingLevel, learner.age),
    sentenceGuidance(learner.age),
    languageGuidance(learner.language),
  ].filter(Boolean);

  if (learner.age && learner.role === 'child') {
    parts.unshift(`The learner is a ${ageGroup(learner.age)}.`);
  }

  return {
    instruction:  parts.join(' '),
    readingLevel: level,
  };
}

// ── Format external knowledge with adaptation note ────────────────────────────

export function adaptKnowledgeForPrompt(
  sources:    Array<{ title: string; snippet: string; url: string }>,
  adaptation: AdaptationBlock,
  role:       'child' | 'parent' | 'teacher',
): string {
  if (sources.length === 0) return '';

  const lines = sources.map((s, i) =>
    `[Source ${i + 1}] ${s.title}\n${s.snippet.slice(0, 400)}`
  );

  const note = role === 'child'
    ? `\nAdapt this information for a child at reading level ${adaptation.readingLevel}.`
    : role === 'teacher'
      ? '\nYou may include pedagogical rationale and curriculum connections.'
      : '\nPresent this information in a clear, parent-friendly way.';

  return lines.join('\n\n') + note;
}
