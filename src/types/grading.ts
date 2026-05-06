import type { Submission, Student, Class, AIEvaluation, TeacherEvaluation, RiskFlag } from './data'
import type { RubricItem, Question } from './content'

export type OfficialRubric = {
  id: string
  name: string
  totalMaxScore: number
  items: RubricItem[]
}

export type QuestionExtras = {
  typeId: string
  guide: string
  requiredElements: string[]
  modelAnswer: string
  teacherNotes: string
  listeningScriptForTeacherOnly?: string
  aiInformation?: string
  missionGoals?: string[]
  maxScore: number
}

export type DialogueTurnPreview = {
  role: 'ai' | 'student'
  text: string
}

export type GradingWizardData = {
  submission: Submission
  student: Student
  cls: Class
  aiEval: AIEvaluation | null
  existingTeacherEval: TeacherEvaluation | null
  riskFlag: RiskFlag | null
  rubricItems: RubricItem[]
  officialRubric: OfficialRubric
  question: Question | null
  questionExtras: QuestionExtras | null
  dialogueTurns: DialogueTurnPreview[]
  isDialogueMission: boolean
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
