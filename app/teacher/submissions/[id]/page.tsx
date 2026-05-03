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
import type { GradingWizardData } from '@/src/types/grading'
import type { Question } from '@/src/types/content'
import { GradingWizard } from './grading-wizard'

const rubric = rubricsJson.find((r) => r.id === 'rubric-speaking-01')!

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'info' | 'success' | 'warning' }
> = {
  pending: { label: '채점 대기', variant: 'default' },
  ai_evaluated: { label: 'AI 평가 완료', variant: 'info' },
  teacher_reviewed: { label: '교수자 검토', variant: 'warning' },
  finalized: { label: '확정', variant: 'success' },
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
  const question = submission.questionId
    ? ((questionsJson.find((q) => q.id === submission.questionId) as Question | undefined) ?? null)
    : null

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
    rubricItems: rubric.items,
    question,
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
