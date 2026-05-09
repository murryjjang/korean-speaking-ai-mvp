export interface WordDiffToken {
  text: string
  matched: boolean
}

export interface WordDiffResult {
  refTokens: WordDiffToken[]
  recTokens: WordDiffToken[]
  mismatchedRefWords: string[]
}

function normalizeKorean(w: string): string {
  return w.replace(/[.,!?。、·]/g, '').trim()
}

/**
 * Word-level diff between a reference script and recognized text using
 * longest-common-subsequence alignment. Punctuation is stripped for comparison.
 *
 * LCS — instead of pairwise position diff — so a single skipped or inserted word
 * in the middle does not cascade into mismatches for every word that follows,
 * and trailing words a learner did say still align with the reference tail.
 */
export function computeEtriWordDiff(reference: string, recognized: string): WordDiffResult {
  const refWords = reference.split(/\s+/).filter(Boolean)
  const recWords = recognized.split(/\s+/).filter(Boolean)
  const refNorm = refWords.map(normalizeKorean)
  const recNorm = recWords.map(normalizeKorean)

  const m = refNorm.length
  const n = recNorm.length
  // dp[i][j] = LCS length for refNorm[0..i) and recNorm[0..j)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (refNorm[i - 1] === recNorm[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const refMatched = new Array<boolean>(m).fill(false)
  const recMatched = new Array<boolean>(n).fill(false)
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (refNorm[i - 1] === recNorm[j - 1]) {
      refMatched[i - 1] = true
      recMatched[j - 1] = true
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  const refTokens: WordDiffToken[] = refWords.map((text, idx) => ({ text, matched: refMatched[idx] }))
  const recTokens: WordDiffToken[] = recWords.map((text, idx) => ({ text, matched: recMatched[idx] }))
  const mismatchedRefWords: string[] = refWords.filter((_, idx) => !refMatched[idx])

  return { refTokens, recTokens, mismatchedRefWords }
}
