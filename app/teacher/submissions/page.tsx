export const dynamic = 'force-dynamic'

import { PageHeader } from '@/src/components/ui'
import {
  mockSubmissions,
  mockStudents,
  mockAIEvaluations,
  mockClasses,
  mockRiskFlags,
} from '@/src/lib/mock/data'
import { getStatusOverride } from '@/src/lib/mock/teacher-grading-store'
import questionsJson from '@/src/content/questions.json'
import type { RiskLevel } from '@/src/types/data'
import type { TeacherSubmissionRow } from '../submissions-table'
import { SubmissionsClient } from './submissions-client'

const LANGUAGE_GROUP_LABELS: Record<string, string> = {
  'east-asian': '동아시아',
  'southeast-asian': '동남아시아',
  arabic: '아랍어권',
  european: '유럽',
  korean: '한국어',
  other: '기타',
}

const CLASS_NAME_MAP: Record<string, string> = {
  'class-01': 'A반 (중급)',
  'class-02': 'B반 (초급)',
}

function calcRisk(score: number | undefined): RiskLevel {
  if (score === undefined) return 'medium'
  if (score >= 80) return 'low'
  if (score >= 60) return 'medium'
  return 'high'
}

const questionTypeMap = new Map(
  (questionsJson as Array<Record<string, unknown>>).map((q) => [q.id as string, q.typeId as string]),
)

export default function TeacherSubmissionsListPage() {
  const evalMap = new Map(mockAIEvaluations.map((e) => [e.submissionId, e.normalizedScore]))
  const studentMap = new Map(mockStudents.map((s) => [s.id, s]))
  const riskFlagMap = new Map(mockRiskFlags.map((r) => [r.studentId, r.riskLevel]))

  const allRows: TeacherSubmissionRow[] = mockSubmissions.map((s) => {
    const student = studentMap.get(s.studentId)
    const aiScore = evalMap.get(s.id) ?? null
    const flaggedRisk = student ? riskFlagMap.get(student.id) : undefined
    const scoreRisk = calcRisk(aiScore ?? undefined)
    const risk: RiskLevel =
      flaggedRisk === 'high' || scoreRisk === 'high'
        ? 'high'
        : flaggedRisk === 'medium' || scoreRisk === 'medium'
          ? 'medium'
          : 'low'

    const effectiveStatus = getStatusOverride(s.id) ?? s.status

    // Determine display type — dialogue_mission gets special label
    const qTypeId = s.questionId ? questionTypeMap.get(s.questionId) : undefined
    const isDialogueMission = qTypeId === 'qt-dialogue-mission'
    const moduleTypeLabel = isDialogueMission
      ? '대화 미션'
      : s.moduleType === 'assessment'
        ? '말하기 평가'
        : s.moduleType === 'mission'
          ? '미션 대화'
          : '말하기 대회'

    return {
      id: s.id,
      studentName: student?.name ?? s.studentId,
      classId: s.classId,
      className: CLASS_NAME_MAP[s.classId] ?? s.classId,
      langGroup: student
        ? (LANGUAGE_GROUP_LABELS[student.languageGroup] ?? student.languageGroup)
        : '—',
      languageGroupRaw: student?.languageGroup ?? '',
      nativeLanguage: student?.nativeLanguage ?? '—',
      submittedAt: new Date(s.submittedAt).toLocaleDateString('ko-KR'),
      moduleType: moduleTypeLabel,
      isDialogueMission,
      aiScore,
      status: effectiveStatus,
      risk,
    }
  })

  const classOptions = [
    { value: 'all', label: '전체 반' },
    ...mockClasses.map((c) => ({ value: c.id, label: c.name })),
  ]

  const nativeLanguageValues = [
    ...new Set(mockStudents.map((s) => s.nativeLanguage)),
  ].sort()
  const nativeLanguageOptions = [
    { value: 'all', label: '전체 모국어' },
    ...nativeLanguageValues.map((lang) => ({ value: lang, label: lang })),
  ]

  return (
    <div>
      <PageHeader
        title="제출 내역"
        description="모든 학생 제출물을 확인하고 채점하세요."
      />
      <SubmissionsClient
        allRows={allRows}
        classOptions={classOptions}
        nativeLanguageOptions={nativeLanguageOptions}
      />
    </div>
  )
}
