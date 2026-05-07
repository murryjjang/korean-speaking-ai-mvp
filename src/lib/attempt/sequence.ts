import questionSetsJson from '@/src/content/question-sets.json'

/** Returns question IDs in set order. Empty array if setId not found. */
export function getAssessmentSetSequence(setId: string): string[] {
  const set = questionSetsJson.find((s) => s.id === setId)
  if (!set) return []
  return [...set.questions]
    .sort((a, b) => a.order - b.order)
    .map((q) => q.questionId)
}

/** Returns the next question ID in the set, or null if questionId is last or not found. */
export function getNextQuestionInSet(setId: string, questionId: string): string | null {
  const seq = getAssessmentSetSequence(setId)
  const idx = seq.indexOf(questionId)
  if (idx < 0 || idx >= seq.length - 1) return null
  return seq[idx + 1]
}

/** Returns true if questionId is the last question in the set. */
export function isLastQuestionInSet(setId: string, questionId: string): boolean {
  const seq = getAssessmentSetSequence(setId)
  return seq.length > 0 && seq.indexOf(questionId) === seq.length - 1
}
