import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader, Badge } from '@/src/components/ui'
import {
  mockSubmissions,
  mockStudents,
  mockClasses,
  mockAIEvaluations,
  mockRiskFlags,
} from '@/src/lib/mock/data'
import { getDraft } from '@/src/lib/mock/teacher-grading-store'
import rubricsJson from '@/src/content/rubrics.json'
import questionsJson from '@/src/content/questions.json'
import type { GradingWizardData, OfficialRubric, QuestionExtras, DialogueTurnPreview } from '@/src/types/grading'
import type { Question } from '@/src/types/content'
import { GradingWizard } from './grading-wizard'

const FALLBACK_RUBRIC_ID = 'rubric-speaking-01'

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'info' | 'success' | 'warning' }
> = {
  pending: { label: '채점 대기', variant: 'default' },
  ai_evaluated: { label: 'AI 평가 완료', variant: 'info' },
  teacher_reviewed: { label: '교수자 검토', variant: 'warning' },
  finalized: { label: '확정', variant: 'success' },
}

// Mock dialogue turns for dialogue_mission submissions — teacher review preview.
// In production these would come from the dialogue submission store.
const MOCK_DIALOGUE_TURNS: Record<string, DialogueTurnPreview[]> = {
  'sub-022': [
    { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
    { role: 'student', text: '아이스 아메리카노 하나 주세요.' },
    { role: 'ai', text: '아이스 아메리카노 하나요. 사이즈는 어떻게 해 드릴까요?' },
    { role: 'student', text: '보통으로 해 주세요.' },
    { role: 'ai', text: '포장이세요, 매장 이용이세요?' },
    { role: 'student', text: '포장해 주세요.' },
    { role: 'ai', text: '알겠습니다. 잠시만 기다려 주세요.' },
    { role: 'student', text: '감사합니다.' },
  ],
}

export default async function SubmissionGradingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const submission = mockSubmissions.find((s) => s.id === id)
  if (!submission) notFound()

  const student = mockStudents.find((s) => s.id === submission.studentId)
  if (!student) notFound()

  const cls = mockClasses.find((c) => c.id === submission.classId)
  if (!cls) notFound()

  const aiEval = mockAIEvaluations.find((e) => e.submissionId === id) ?? null
  const existingTeacherEval = getDraft(id) ?? null
  const riskFlag = mockRiskFlags.find((r) => r.studentId === student.id) ?? null

  // Load question from JSON (may have extra official fields beyond the Question type)
  const questionRaw = submission.questionId
    ? (questionsJson.find((q) => q.id === submission.questionId) ?? null)
    : null
  const question = questionRaw as Question | null

  // Select correct rubric: prefer question's rubricId, fall back to legacy
  const qFields = questionRaw as Record<string, unknown> | null
  const rubricId = (qFields?.rubricId as string | undefined) ?? FALLBACK_RUBRIC_ID
  const rubricRaw =
    (rubricsJson as Array<Record<string, unknown>>).find((r) => r.id === rubricId) ??
    (rubricsJson as Array<Record<string, unknown>>).find((r) => r.id === FALLBACK_RUBRIC_ID)!

  const officialRubric: OfficialRubric = {
    id: rubricRaw.id as string,
    name: rubricRaw.name as string,
    totalMaxScore: rubricRaw.totalMaxScore as number,
    items: rubricRaw.items as OfficialRubric['items'],
  }

  // Populate questionExtras with official question metadata
  const questionExtras: QuestionExtras | null = qFields
    ? {
        typeId: (qFields.typeId as string) ?? '',
        guide: (qFields.guide as string) ?? '',
        requiredElements: (qFields.requiredElements as string[]) ?? [],
        modelAnswer: (qFields.modelAnswer as string) ?? '',
        teacherNotes: (qFields.teacherNotes as string) ?? '',
        listeningScriptForTeacherOnly: qFields.listeningScriptForTeacherOnly as string | undefined,
        aiInformation: qFields.aiInformation as string | undefined,
        missionGoals: qFields.missionGoals as string[] | undefined,
        maxScore: (qFields.maxScore as number) ?? 100,
      }
    : null

  const isDialogueMission = questionExtras?.typeId === 'qt-dialogue-mission'

  // Dialogue turns — from mock store for demo; production would query dialogue submission store
  const dialogueTurns: DialogueTurnPreview[] = MOCK_DIALOGUE_TURNS[id] ?? []

  const isAlreadyFinalized = existingTeacherEval?.isFinalized ?? false
  const effectiveStatus = isAlreadyFinalized ? 'finalized' : submission.status
  const statusCfg = STATUS_CONFIG[effectiveStatus] ?? {
    label: effectiveStatus,
    variant: 'default' as const,
  }

  const wizardData: GradingWizardData = {
    submission,
    student,
    cls,
    aiEval,
    existingTeacherEval,
    riskFlag,
    rubricItems: officialRubric.items,
    officialRubric,
    question,
    questionExtras,
    dialogueTurns,
    isDialogueMission,
    isAlreadyFinalized,
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/teacher/submissions"
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          ← 제출 목록
        </Link>
      </div>

      <PageHeader
        title={`채점: ${student.name}`}
        description={`${cls.name} · ${student.nativeLanguage} · ${student.anonymousId}`}
        action={<Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>}
      />

      <GradingWizard data={wizardData} />
    </div>
  )
}
