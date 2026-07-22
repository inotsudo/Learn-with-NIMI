// ── Emotion Detector ──────────────────────────────────────────────
// Pure function — no LLM, no DB. Analyzes recent child messages and
// returns an EmotionSignal with recommended adjustments for Nimi.
//
// Design choices:
//   - Analyzes only the CHILD's messages (role === 'user'), not Nimi's
//   - Uses the last N messages (default 6) to detect trends
//   - Frustration/boredom = lower stakes than over-detecting excitement
//   - Never adjusts more than one dimension at a time to avoid instability
//   - Never surfaces emotion labels to the user

import type { EmotionSignal, EmotionAdjustments, EmotionType } from '@/lib/ai/types';

interface Message {
  role:    'user' | 'assistant';
  content: string;
}

const NEUTRAL_ADJUSTMENTS: EmotionAdjustments = {
  sentenceTarget:     '2-3',
  encouragement:      'normal',
  questionDifficulty: 'keep',
  toneShift:          'neutral',
};

// ── Signal detectors ─────────────────────────────────────────────

function avgWordCount(msgs: string[]): number {
  if (msgs.length === 0) return 10;
  const total = msgs.reduce((s, m) => s + m.trim().split(/\s+/).length, 0);
  return total / msgs.length;
}

function hasFrustrationMarkers(msgs: string[]): boolean {
  const pattern = /\b(i\s*don'?t\s*know|i\s*give\s*up|i\s*can'?t|this\s*is\s*hard|too\s*hard|i\s*don'?t\s*understand|ugh|argh|urgh|help\s*me|i\s*hate\s*this)\b/i;
  return msgs.some(m => pattern.test(m));
}

function hasRepetition(msgs: string[]): boolean {
  if (msgs.length < 3) return false;
  const last  = msgs.at(-1)?.toLowerCase().trim() ?? '';
  const prev  = msgs.at(-3)?.toLowerCase().trim() ?? '';
  if (!last || !prev) return false;
  // Same or very similar message sent twice in last 3 turns
  return last === prev || (last.length > 4 && prev.includes(last));
}

function hasExcitement(msgs: string[]): boolean {
  const pattern = /[!]{2,}|wow|amazing|cool|awesome|yay|yes+|i\s*did\s*it|i\s*love/i;
  const excCount = msgs.filter(m => pattern.test(m)).length;
  return excCount >= Math.max(2, msgs.length * 0.4);
}

function hasConfidence(msgs: string[]): boolean {
  if (msgs.length === 0) return false;
  const avgLen = avgWordCount(msgs);
  const hasElaboration = msgs.some(m => m.includes(' because ') || m.includes(' since ') || m.includes(' so '));
  const hasSelfCorrection = msgs.some(m => /actually|i\s*mean|wait,?\s*no/i.test(m));
  return avgLen >= 12 && (hasElaboration || hasSelfCorrection);
}

function hasHesitation(msgs: string[]): boolean {
  const pattern = /\bmaybe\b|\bi\s*think\b|\bprobably\b|\bum+\b|\buh+\b|\bnot\s*sure\b|\bsorry\b/i;
  const hesCount = msgs.filter(m => pattern.test(m)).length;
  return hesCount >= Math.max(2, msgs.length * 0.4);
}

function isBored(msgs: string[]): boolean {
  if (msgs.length < 4) return false;
  const avgLen = avgWordCount(msgs);
  // Trend toward shorter messages
  const recentAvg = avgWordCount(msgs.slice(-3));
  const earlyAvg  = avgWordCount(msgs.slice(0, 3));
  const declining = earlyAvg > 5 && recentAvg < 3;
  return (avgLen < 3) || declining;
}

// ── Adjustment map ───────────────────────────────────────────────

const EMOTION_ADJUSTMENTS: Record<EmotionType, EmotionAdjustments> = {
  frustrated: {
    sentenceTarget:     '1-2',
    encouragement:      'high',
    questionDifficulty: 'lower',
    toneShift:          'warmer',
  },
  bored: {
    sentenceTarget:     '1-2',
    encouragement:      'normal',
    questionDifficulty: 'raise',
    toneShift:          'energetic',
  },
  excited: {
    sentenceTarget:     '2-3',
    encouragement:      'high',
    questionDifficulty: 'raise',
    toneShift:          'energetic',
  },
  confident: {
    sentenceTarget:     '3-4',
    encouragement:      'low',
    questionDifficulty: 'raise',
    toneShift:          'neutral',
  },
  hesitant: {
    sentenceTarget:     '1-2',
    encouragement:      'high',
    questionDifficulty: 'lower',
    toneShift:          'warmer',
  },
  neutral: NEUTRAL_ADJUSTMENTS,
};

// ── Main export ──────────────────────────────────────────────────

export function detectEmotion(
  messages: Message[],
  windowSize = 6
): EmotionSignal {
  // Only analyze child messages in the recent window
  const childMsgs = messages
    .filter(m => m.role === 'user')
    .slice(-windowSize)
    .map(m => m.content);

  if (childMsgs.length < 2) {
    return { emotion: 'neutral', confidence: 0, adjustments: NEUTRAL_ADJUSTMENTS };
  }

  // Score each emotion independently
  const scores: Record<EmotionType, number> = {
    frustrated: 0,
    bored:      0,
    excited:    0,
    confident:  0,
    hesitant:   0,
    neutral:    0.3,  // baseline
  };

  if (hasFrustrationMarkers(childMsgs)) scores.frustrated += 0.7;
  if (hasRepetition(childMsgs))         scores.frustrated += 0.3;
  if (isBored(childMsgs))               scores.bored      += 0.6;
  if (hasExcitement(childMsgs))         scores.excited    += 0.8;
  if (hasConfidence(childMsgs))         scores.confident  += 0.7;
  if (hasHesitation(childMsgs))         scores.hesitant   += 0.6;

  // Frustration overrides boredom when both fire
  if (scores.frustrated > 0.3 && scores.bored > 0.3) scores.bored *= 0.5;

  const top = (Object.entries(scores) as [EmotionType, number][])
    .sort((a, b) => b[1] - a[1])[0];

  const emotion    = top[0];
  const confidence = Math.min(top[1], 1.0);

  // Below confidence threshold, treat as neutral
  if (confidence < 0.4) {
    return { emotion: 'neutral', confidence, adjustments: NEUTRAL_ADJUSTMENTS };
  }

  return { emotion, confidence, adjustments: EMOTION_ADJUSTMENTS[emotion] };
}

// ── Prompt injection helper ──────────────────────────────────────
// Appends emotion-driven guidance to a system prompt.
// Only adds text when signal is strong enough to act on.

export function injectEmotionGuidance(
  systemPrompt: string,
  signal:       EmotionSignal
): string {
  if (signal.confidence < 0.4 || signal.emotion === 'neutral') return systemPrompt;

  const { adjustments: adj, emotion } = signal;

  const lines: string[] = ['\n\n## Tone Calibration (current session)'];

  if (emotion === 'frustrated') {
    lines.push('The child seems to be finding this challenging right now.');
    lines.push('Use shorter, warmer responses. Celebrate any effort immediately.');
    lines.push('Do NOT ask difficult questions this turn — offer encouragement first.');
  } else if (emotion === 'bored') {
    lines.push('The child seems less engaged. Pick up the energy!');
    lines.push('Keep responses crisp. Add a fun question or mini-challenge.');
  } else if (emotion === 'excited') {
    lines.push('The child is energised — match their enthusiasm.');
    lines.push('You can introduce a harder question or stretch activity.');
  } else if (emotion === 'confident') {
    lines.push('The child is performing well. You can challenge them more.');
    lines.push('Reduce scaffolding — let them work a bit harder before helping.');
  } else if (emotion === 'hesitant') {
    lines.push('The child seems unsure of themselves right now.');
    lines.push('Give lots of reassurance. Ask easier questions to rebuild confidence.');
  }

  lines.push(`Response length target: ${adj.sentenceTarget} sentences.`);

  return systemPrompt + lines.join('\n');
}
