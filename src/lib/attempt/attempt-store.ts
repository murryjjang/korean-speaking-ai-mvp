export type AttemptSubmission = {
  questionId: string
  submissionId: string
  submittedAt: string
}

export type AttemptRecord = {
  attemptId: string
  setId: string
  startedAt: string
  submissions: AttemptSubmission[]
}

// Module-level store — pilot only. Resets on server restart.
const attemptStore = new Map<string, AttemptRecord>()

export function saveAttemptSubmission(
  attemptId: string,
  setId: string,
  questionId: string,
  submissionId: string,
): void {
  let record = attemptStore.get(attemptId)
  if (!record) {
    record = {
      attemptId,
      setId,
      startedAt: new Date().toISOString(),
      submissions: [],
    }
  }
  const existingIdx = record.submissions.findIndex((s) => s.questionId === questionId)
  const entry: AttemptSubmission = {
    questionId,
    submissionId,
    submittedAt: new Date().toISOString(),
  }
  if (existingIdx >= 0) {
    record.submissions[existingIdx] = entry
  } else {
    record.submissions.push(entry)
  }
  attemptStore.set(attemptId, record)
}

export function getAttempt(attemptId: string): AttemptRecord | undefined {
  return attemptStore.get(attemptId)
}
