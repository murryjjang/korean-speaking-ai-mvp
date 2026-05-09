import { Card, CardHeader, CardBody, Button } from '@/src/components/ui'
import type { GradingWizardData, TeacherEvalDraft, RubricItemScore } from '@/src/types/grading'

const ADJUSTMENT_REASONS = [
  { id: 'pronunciation', label: '발음' },
  { id: 'fluency', label: '유창성' },
  { id: 'vocabulary', label: '어휘' },
  { id: 'grammar', label: '문법' },
  { id: 'task', label: '과제 수행' },
  { id: 'context', label: '문맥 판단' },
  { id: 'mission', label: '미션 달성' },
  { id: 'interaction', label: '상호작용' },
]

interface StepRubricAdjustProps {
  data: GradingWizardData
  draft: TeacherEvalDraft
  onDraftChange: (draft: TeacherEvalDraft) => void
  onBack: () => void
  onNext: () => void
  isFinalized?: boolean
}

export function StepRubricAdjust({
  data,
  draft,
  onDraftChange,
  onBack,
  onNext,
  isFinalized = false,
}: StepRubricAdjustProps) {
  const { aiEval, riskFlag, rubricItems, officialRubric, questionExtras, isDialogueMission } = data

  const rubricScores: RubricItemScore[] = rubricItems.map((item) => ({
    rubricItemId: item.id,
    label: item.label,
    maxScore: item.maxScore,
    aiScore: aiEval?.scores[item.id] ?? 0,
    teacherScore: draft.scores[item.id] ?? 0,
    delta: (draft.scores[item.id] ?? 0) - (aiEval?.scores[item.id] ?? 0),
  }))

  const teacherTotal = rubricScores.reduce((sum, r) => sum + r.teacherScore, 0)
  const aiTotal = aiEval?.totalScore ?? 0   // official raw score (e.g. 10/15)
  const aiNormalized = aiEval?.normalizedScore ?? 0  // 0-100 normalized
  const maxScore = officialRubric.totalMaxScore
  const totalDelta = teacherTotal - aiTotal

  function handleScoreChange(rubricItemId: string, raw: string, itemMax: number) {
    const parsed = parseInt(raw, 10)
    const clamped = isNaN(parsed) ? 0 : Math.max(0, Math.min(itemMax, parsed))
    onDraftChange({ ...draft, scores: { ...draft.scores, [rubricItemId]: clamped } })
  }

  function handleReasonToggle(reasonId: string) {
    const next = draft.adjustmentReasons.includes(reasonId)
      ? draft.adjustmentReasons.filter((r) => r !== reasonId)
      : [...draft.adjustmentReasons, reasonId]
    onDraftChange({ ...draft, adjustmentReasons: next })
  }

  return (
    <div className="space-y-4">
      {riskFlag?.riskLevel === 'high' && (
        <div className="p-3 bg-danger-50 border border-danger-100 rounded-lg flex items-start gap-2">
          <span className="text-danger-500 font-bold shrink-0">⚠</span>
          <div>
            <p className="text-sm font-semibold text-danger-700">주의 학생 — 집중 검토 필요</p>
            <p className="text-xs text-danger-500 mt-0.5">{riskFlag.reasons.join(' · ')}</p>
          </div>
        </div>
      )}
      {riskFlag?.riskLevel === 'medium' && (
        <div className="p-3 bg-warning-50 border border-warning-100 rounded-lg flex items-start gap-2">
          <span className="text-warning-700 font-bold shrink-0">!</span>
          <div>
            <p className="text-sm font-semibold text-warning-700">관찰 필요 학생</p>
            <p className="text-xs text-warning-700 mt-0.5">{riskFlag.reasons.join(' · ')}</p>
          </div>
        </div>
      )}

      {/* AI 1차 평가 안내 */}
      <div className="p-3 bg-info-50 border border-info-100 rounded-lg text-xs text-info-700 space-y-0.5">
        <p className="font-semibold">AI 1차 평가 참고 정보</p>
        <p>
          루브릭: <span className="font-medium">{officialRubric.name}</span>
          &nbsp;·&nbsp;문항 배점: <span className="font-medium">{maxScore}점</span>
          &nbsp;·&nbsp;AI 환산 점수: <span className="font-medium">{aiNormalized}/100</span>
          &nbsp;·&nbsp;AI 원점수: <span className="font-medium">{aiTotal}/{maxScore}</span>
        </p>
        <p>AI 점수를 초기값으로 참고하세요. 교수자 판단에 따라 조정 후 최종 확정합니다.</p>
        <p className="mt-1 text-info-600">
          <span className="font-medium">발음 원점수</span>는 학습자 결과 화면에서 확인할 수 있습니다.
          파일럿 기간에는 발음 점수를 보정 전 참고값으로 취급하며, 교수자 검토 후 반영 여부를 결정합니다.
        </p>
      </div>

      {/* 대화 미션 — 미션 목표 달성 현황 */}
      {isDialogueMission && questionExtras?.missionGoals && questionExtras.missionGoals.length > 0 && (
        <Card>
          <CardHeader
            title="미션 목표 달성 현황 (AI 판정)"
            description="AI 미션 달성 판정은 1차 참고용입니다. 최종 확정은 교수자가 수행합니다."
          />
          <CardBody>
            <ul className="space-y-2">
              {questionExtras.missionGoals.map((goal, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-success-700 font-bold shrink-0">✓</span>
                  <span className="text-text-primary">{goal}</span>
                  <span className="ml-auto text-xs text-success-700 font-medium">달성</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-text-muted mt-3">
              * AI 판정 기준으로 표시됩니다. 대화 로그를 직접 확인하여 교수자가 최종 판단하세요.
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="루브릭별 점수 조정"
          description={`AI 점수를 초기값으로 참고하세요. 배점 기준: ${maxScore}점`}
        />
        <CardBody noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    항목
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    AI 점수
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    교수자 점수
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    변동
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rubricScores.map((row) => (
                  <tr key={row.rubricItemId} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{row.label}</td>
                    <td className="px-4 py-3 text-center text-text-secondary tabular-nums">
                      {row.aiScore} / {row.maxScore}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={row.maxScore}
                          value={row.teacherScore}
                          onChange={(e) =>
                            !isFinalized &&
                            handleScoreChange(row.rubricItemId, e.target.value, row.maxScore)
                          }
                          disabled={isFinalized}
                          className="w-16 text-center text-sm border border-border rounded-md px-2 py-1 bg-surface-raised text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 tabular-nums disabled:bg-surface disabled:cursor-default disabled:text-text-secondary"
                        />
                        <span className="text-text-muted text-xs">/ {row.maxScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DeltaLabel delta={row.delta} />
                    </td>
                  </tr>
                ))}
                <tr className="bg-surface border-t-2 border-border-strong">
                  <td className="px-4 py-3 font-bold text-text-primary">합계</td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    <span className="font-semibold text-text-secondary">{aiTotal} / {maxScore}</span>
                    <span className="block text-xs text-text-muted">환산 {aiNormalized}/100</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-text-primary tabular-nums">
                    {teacherTotal} / {maxScore}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DeltaLabel delta={totalDelta} bold />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="조정 이유" description="해당 항목을 모두 선택하세요." />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {ADJUSTMENT_REASONS.map((reason) => {
                const selected = draft.adjustmentReasons.includes(reason.id)
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => !isFinalized && handleReasonToggle(reason.id)}
                    disabled={isFinalized}
                    className={[
                      'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                      isFinalized
                        ? 'cursor-default opacity-60'
                        : 'cursor-pointer',
                      selected
                        ? 'bg-primary-700 text-white border-primary-700'
                        : 'bg-surface text-text-secondary border-border hover:border-primary-500 hover:text-primary-700',
                    ].join(' ')}
                  >
                    {selected ? '✓ ' : ''}
                    {reason.label}
                  </button>
                )
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="교수자 내부 메모" description="학습자에게는 공개되지 않습니다." />
          <CardBody>
            <textarea
              value={draft.privateNote}
              onChange={(e) => !isFinalized && onDraftChange({ ...draft, privateNote: e.target.value })}
              placeholder="채점 근거, 특이사항 등을 기록하세요..."
              rows={4}
              readOnly={isFinalized}
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-surface-raised text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none read-only:bg-surface read-only:cursor-default"
            />
          </CardBody>
        </Card>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="secondary" onClick={onBack}>
          ← 이전
        </Button>
        <Button onClick={onNext}>최종 피드백 →</Button>
      </div>
    </div>
  )
}

function DeltaLabel({ delta, bold = false }: { delta: number; bold?: boolean }) {
  if (delta === 0) {
    return (
      <span className={`text-xs text-text-muted tabular-nums ${bold ? 'font-bold' : ''}`}>
        ±0
      </span>
    )
  }
  return (
    <span
      className={[
        'text-xs tabular-nums',
        bold ? 'font-bold' : '',
        delta > 0 ? 'text-success-700' : 'text-danger-500',
      ].join(' ')}
    >
      {delta > 0 ? `+${delta}` : delta}
    </span>
  )
}
