/**
 * pronunciationAnalyzer — Phase 6.3
 *
 * Client-side pronunciation analysis. Compares what a student said against
 * what they were supposed to say, producing a word-level diff and an overall
 * accuracy score. No LLM required for the scoring — pure string algorithms.
 *
 * The API route at /api/pronunciation-coach calls this logic, then adds an
 * LLM-generated encouragement message and specific pronunciation tips.
 */

// ── Levenshtein distance ──────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // Row-only DP (O(n) space)
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i, ...Array(n).fill(0)] as number[];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

// ── Word normalisation ────────────────────────────────────────────────────────

function normalise(word: string): string {
  return word.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
}

function tokenise(text: string): string[] {
  return text.trim().split(/\s+/).map(normalise).filter(w => w.length > 0);
}

// ── Per-word similarity ───────────────────────────────────────────────────────

function wordSimilarity(expected: string, spoken: string): number {
  if (!expected && !spoken) return 1;
  if (!expected || !spoken) return 0;
  if (expected === spoken) return 1;
  const dist = levenshtein(expected, spoken);
  return Math.max(0, 1 - dist / Math.max(expected.length, spoken.length));
}

// ── Word status thresholds ────────────────────────────────────────────────────
// correct → ≥ 85% similar (minor accent/spelling variant)
// close   → ≥ 55% (recognised but mispronounced)
// missed  → < 55% (not recognised or skipped)

const CORRECT_THRESHOLD = 0.85;
const CLOSE_THRESHOLD   = 0.55;

export type WordStatus = "correct" | "close" | "missed" | "extra";

export interface WordResult {
  expected:    string;   // the word the student should say
  spoken:      string;   // the closest word the STT captured
  similarity:  number;   // 0–1
  status:      WordStatus;
}

// ── Alignment (greedy, window of 4) ──────────────────────────────────────────
// For each expected word, look at the next 4 spoken words and pick the best
// matching one. Skipped spoken words become "extra" words appended at the end.

function alignWords(expected: string[], spoken: string[]): WordResult[] {
  const results: WordResult[] = [];
  const consumed = new Set<number>();   // indices of spoken words already matched

  for (const expectedWord of expected) {
    let bestSim  = -1;
    let bestIdx  = -1;

    // Search in a window of 4 unconsumed words starting from the first unconsumed index
    let windowStart = 0;
    while (windowStart < spoken.length && consumed.has(windowStart)) windowStart++;

    for (let wi = windowStart; wi < Math.min(windowStart + 4, spoken.length); wi++) {
      if (consumed.has(wi)) continue;
      const sim = wordSimilarity(expectedWord, spoken[wi]);
      if (sim > bestSim) { bestSim = sim; bestIdx = wi; }
    }

    const status: WordStatus =
      bestSim >= CORRECT_THRESHOLD ? "correct" :
      bestSim >= CLOSE_THRESHOLD   ? "close"   : "missed";

    const matched = bestSim >= CLOSE_THRESHOLD && bestIdx >= 0;

    results.push({
      expected:   expectedWord,
      spoken:     matched ? spoken[bestIdx] : "",
      similarity: matched ? bestSim : 0,
      status,
    });

    if (matched) consumed.add(bestIdx);
  }

  return results;
}

// ── Overall score (0–100) ─────────────────────────────────────────────────────
// correct = 100%, close = 60%, missed = 0%

function computeScore(results: WordResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => {
    return sum + (r.status === "correct" ? 1 : r.status === "close" ? 0.6 : 0);
  }, 0);
  return Math.round((total / results.length) * 100);
}

// ── Stars (1–5) from score ────────────────────────────────────────────────────

export function scoreToStars(score: number): number {
  if (score >= 95) return 5;
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface PronunciationAnalysis {
  words:         WordResult[];
  score:         number;    // 0–100
  stars:         number;    // 1–5
  correctCount:  number;
  closeCount:    number;
  missedCount:   number;
  missedWords:   string[];  // list of words with status "missed"
  closeWords:    string[];  // list of words with status "close"
}

export function analysePronunciation(
  expected: string,
  spoken:   string,
): PronunciationAnalysis {
  const expectedWords = tokenise(expected);
  const spokenWords   = tokenise(spoken);

  const words   = alignWords(expectedWords, spokenWords);
  const score   = computeScore(words);
  const stars   = scoreToStars(score);

  const correct = words.filter(w => w.status === "correct");
  const close   = words.filter(w => w.status === "close");
  const missed  = words.filter(w => w.status === "missed");

  return {
    words,
    score,
    stars,
    correctCount: correct.length,
    closeCount:   close.length,
    missedCount:  missed.length,
    missedWords:  missed.map(w => w.expected),
    closeWords:   close.map(w => w.expected),
  };
}

// Re-export for convenience
export { tokenise, wordSimilarity };
