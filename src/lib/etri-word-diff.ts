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
 * Sequential word-level diff between a reference script and ETRI recognized text.
 * Punctuation is stripped for comparison; mismatches indicate probable pronunciation errors.
 * Exported for unit testing.
 */
export function computeEtriWordDiff(reference: string, recognized: string): WordDiffResult {
  const refWords = reference.split(/\s+/).filter(Boolean)
  const recWords = recognized.split(/\s+/).filter(Boolean)
  const maxLen = Math.max(refWords.length, recWords.length)

  const refTokens: WordDiffToken[] = []
  const recTokens: WordDiffToken[] = []
  const mismatchedRefWords: string[] = []

  for (let i = 0; i < maxLen; i++) {
    const rw = refWords[i]
    const ew = recWords[i]

    if (rw !== undefined && ew !== undefined) {
      const matched = normalizeKorean(rw) === normalizeKorean(ew)
      refTokens.push({ text: rw, matched })
      recTokens.push({ text: ew, matched })
      if (!matched) mismatchedRefWords.push(rw)
    } else if (rw !== undefined) {
      refTokens.push({ text: rw, matched: false })
      mismatchedRefWords.push(rw)
    } else if (ew !== undefined) {
      recTokens.push({ text: ew, matched: false })
    }
  }

  return { refTokens, recTokens, mismatchedRefWords }
}
