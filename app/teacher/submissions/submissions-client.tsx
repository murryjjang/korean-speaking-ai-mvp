'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardBody, FilterPanel, StatCard, type Filter } from '@/src/components/ui'
import { TeacherSubmissionsTable, type TeacherSubmissionRow } from '../submissions-table'

const LANGUAGE_GROUP_OPTIONS = [
  { value: 'all', label: '전체 어권' },
  { value: 'east-asian', label: '동아시아' },
  { value: 'southeast-asian', label: '동남아시아' },
  { value: 'arabic', label: '아랍어권' },
  { value: 'european', label: '유럽' },
  { value: 'other', label: '기타' },
]

const CONTENT_TYPE_OPTIONS = [
  { value: 'all', label: '전체 유형' },
  { value: '말하기 평가', label: '말하기 평가' },
  { value: '미션 대화', label: '미션 대화' },
  { value: '말하기 대회', label: '말하기 대회' },
]

const RISK_OPTIONS = [
  { value: 'all', label: '전체 위험도' },
  { value: 'high', label: '⚠ 주의' },
  { value: 'medium', label: '보통' },
  { value: 'low', label: '정상' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'pending', label: '채점 대기' },
  { value: 'ai_evaluated', label: 'AI 평가 완료' },
  { value: 'teacher_reviewed', label: '교수자 검토' },
  { value: 'finalized', label: '확정' },
]

interface SubmissionsClientProps {
  allRows: TeacherSubmissionRow[]
  classOptions: { value: string; label: string }[]
  nativeLanguageOptions: { value: string; label: string }[]
}

export function SubmissionsClient({
  allRows,
  classOptions,
  nativeLanguageOptions,
}: SubmissionsClientProps) {
  const [classId, setClassId] = useState('all')
  const [nativeLanguage, setNativeLanguage] = useState('all')
  const [languageGroup, setLanguageGroup] = useState('all')
  const [contentType, setContentType] = useState('all')
  const [riskLevel, setRiskLevel] = useState('all')
  const [evaluationStatus, setEvaluationStatus] = useState('all')

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (classId !== 'all' && row.classId !== classId) return false
      if (nativeLanguage !== 'all' && row.nativeLanguage !== nativeLanguage) return false
      if (languageGroup !== 'all' && row.languageGroupRaw !== languageGroup) return false
      if (contentType !== 'all' && row.moduleType !== contentType) return false
      if (riskLevel !== 'all' && row.risk !== riskLevel) return false
      if (evaluationStatus !== 'all' && row.status !== evaluationStatus) return false
      return true
    })
  }, [allRows, classId, nativeLanguage, languageGroup, contentType, riskLevel, evaluationStatus])

  const pendingCount = filteredRows.filter((r) => r.status === 'ai_evaluated').length
  const finalizedCount = filteredRows.filter((r) => r.status === 'finalized').length
  const highRiskCount = filteredRows.filter((r) => r.risk === 'high').length
  const scores = filteredRows.map((r) => r.aiScore).filter((v): v is number => v !== null)
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

  const filters: Filter[] = [
    {
      key: 'classId',
      label: '반',
      options: classOptions,
      value: classId,
      onChange: setClassId,
    },
    {
      key: 'nativeLanguage',
      label: '모국어',
      options: nativeLanguageOptions,
      value: nativeLanguage,
      onChange: setNativeLanguage,
    },
    {
      key: 'languageGroup',
      label: '어권',
      options: LANGUAGE_GROUP_OPTIONS,
      value: languageGroup,
      onChange: setLanguageGroup,
    },
    {
      key: 'contentType',
      label: '유형',
      options: CONTENT_TYPE_OPTIONS,
      value: contentType,
      onChange: setContentType,
    },
    {
      key: 'riskLevel',
      label: '위험도',
      options: RISK_OPTIONS,
      value: riskLevel,
      onChange: setRiskLevel,
    },
    {
      key: 'evaluationStatus',
      label: '상태',
      options: STATUS_OPTIONS,
      value: evaluationStatus,
      onChange: setEvaluationStatus,
    },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="전체 제출" value={filteredRows.length} description="현재 필터 기준" />
        <StatCard label="채점 대기" value={pendingCount} description="AI 평가 완료, 미채점" />
        <StatCard label="확정 완료" value={finalizedCount} description="교수자 채점 확정" />
        <StatCard
          label="평균 AI 점수"
          value={avgScore > 0 ? avgScore : '—'}
          description="현재 필터 기준"
        />
      </div>

      {highRiskCount > 0 && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-lg flex items-center gap-2">
          <span className="text-danger-500 font-bold">⚠</span>
          <p className="text-sm text-danger-700">
            주의 학생{' '}
            <strong>{highRiskCount}명</strong>이 있습니다. 채점 시 집중 검토를 권장합니다.
          </p>
        </div>
      )}

      <Card>
        <CardHeader
          title="제출 목록"
          description={`${filteredRows.length}건 표시 중 (전체 ${allRows.length}건)`}
        />
        <div className="px-5 py-3 border-b border-border">
          <FilterPanel filters={filters} />
        </div>
        <CardBody noPadding>
          <TeacherSubmissionsTable rows={filteredRows} />
        </CardBody>
      </Card>
    </div>
  )
}
