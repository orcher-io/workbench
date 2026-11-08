/**
 * Fuzzy Search Utilities
 *
 * High-performance fuzzy matching algorithm optimized for tree item names
 */

export interface FuzzyMatch {
  score: number;
  indices: number[];
}

/**
 * Performs fuzzy matching on a string
 * Returns a score (higher = better match) and matched character indices
 */
export function fuzzyMatch(pattern: string, text: string): FuzzyMatch | null {
  if (!pattern) return { score: 1, indices: [] };
  if (!text) return null;

  const patternLower = pattern.toLowerCase();
  const textLower = text.toLowerCase();

  // Quick check: all pattern characters must exist in text
  let patternIdx = 0;
  for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
    if (textLower[i] === patternLower[patternIdx]) {
      patternIdx++;
    }
  }
  if (patternIdx !== patternLower.length) return null;

  // Find best match using dynamic programming approach
  const result = findBestMatch(patternLower, textLower, text);
  return result;
}

function findBestMatch(
  pattern: string,
  textLower: string,
  textOriginal: string
): FuzzyMatch {
  const n = pattern.length;
  const m = textLower.length;

  const scores: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(-Infinity));
  const paths: number[][][] = Array(n + 1)
    .fill(null)
    .map(() =>
      Array(m + 1)
        .fill(null)
        .map(() => [])
    );

  scores[0][0] = 0;

  for (let j = 1; j <= m; j++) {
    scores[0][j] = 0;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = i; j <= m; j++) {
      if (scores[i][j - 1] > scores[i][j]) {
        scores[i][j] = scores[i][j - 1];
        paths[i][j] = paths[i][j - 1];
      }

      if (textLower[j - 1] === pattern[i - 1]) {
        const prevScore = scores[i - 1][j - 1];
        if (prevScore === -Infinity) continue;

        let matchScore = 1;

        const prevIndices = paths[i - 1][j - 1];
        if (
          prevIndices.length > 0 &&
          prevIndices[prevIndices.length - 1] === j - 2
        ) {
          matchScore += 5;
        }

        if (j === 1 || isWordBoundary(textOriginal, j - 1)) {
          matchScore += 10;
        }

        if (textOriginal[j - 1] === pattern[i - 1]) {
          matchScore += 1;
        }

        if (j === 1) {
          matchScore += 15;
        }

        if (prevIndices.length > 0) {
          const gap = j - 1 - prevIndices[prevIndices.length - 1] - 1;
          matchScore -= gap * 0.5;
        }

        const totalScore = prevScore + matchScore;
        if (totalScore > scores[i][j]) {
          scores[i][j] = totalScore;
          paths[i][j] = [...prevIndices, j - 1];
        }
      }
    }
  }

  let bestScore = -Infinity;
  let bestIndices: number[] = [];

  for (let j = n; j <= m; j++) {
    if (scores[n][j] > bestScore) {
      bestScore = scores[n][j];
      bestIndices = paths[n][j];
    }
  }

  return {
    score: Math.max(0, bestScore),
    indices: bestIndices,
  };
}

function isWordBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text[index - 1];
  const curr = text[index];

  if (/[_\-./\\]/.test(prev)) return true;
  if (/[a-z]/.test(prev) && /[A-Z]/.test(curr)) return true;
  if (/\d/.test(prev) && !/\d/.test(curr)) return true;

  return false;
}

/**
 * Highlight matched characters in text
 */
export function highlightMatches(
  text: string,
  indices: number[]
): { text: string; highlighted: boolean }[] {
  if (indices.length === 0) {
    return [{ text, highlighted: false }];
  }

  const result: { text: string; highlighted: boolean }[] = [];
  const indexSet = new Set(indices);
  let currentRun = '';
  let currentHighlighted = false;

  for (let i = 0; i < text.length; i++) {
    const isHighlighted = indexSet.has(i);

    if (i === 0) {
      currentHighlighted = isHighlighted;
      currentRun = text[i];
    } else if (isHighlighted === currentHighlighted) {
      currentRun += text[i];
    } else {
      result.push({ text: currentRun, highlighted: currentHighlighted });
      currentRun = text[i];
      currentHighlighted = isHighlighted;
    }
  }

  if (currentRun) {
    result.push({ text: currentRun, highlighted: currentHighlighted });
  }

  return result;
}
