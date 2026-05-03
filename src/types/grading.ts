import type { Submission, Student, Class, AIEvaluation, TeacherEvaluation, RiskFlag } from './data'
import type { RubricItem, Question } from './content'

export type GradingWizardData = {
  submission: Submission
  student: Student
  cls: Class
  aiEval: AIEvaluation | null
  existingTeacherEval: TeacherEvaluation | null
  riskFlag: RiskFlag | null
  rubricItems: RubricItem[]
  question: Question | null
  isAlreadyFinalized: boolean
}

export type TeacherEvalDraft = {
  scores: Record<string, number>
  adjustmentReasons: string[]
  privateNote: string
  publicComment: string
  strengths: string
  improvements: string
  nextActivity: string
}

export type RubricItemScore = {
  rubricItemId: string
  label: string
  maxScore: number
  aiScore: number
  teacherScore: number
  delta: number
}
