import { Card, CardHeader, CardBody, Button, ScoreBar } from '@/src/components/ui'
import type { GradingWizardData, TeacherEvalDraft } from '@/src/types/grading'

interface StepFinalFeedbackProps {
  data: GradingWizardData
  draft: TeacherEvalDraft
  onDraftChange: (draft: TeacherEvalDraft) => void
  onBack: () => void
  onFinalize: () => void
  isPending: boolean
  isFinalized: boolean
}

export function StepFinalFeedback({
  data,
  draft,
  onDraftChange,
  onBack,
  onFinalize,
  isPending,
  isFinalized,
}: StepFinalFeedbackProps) {
  const { aiEval, officialRubric } = data
  const maxScore = officialRubric.totalMaxScore
  const aiRawScore = aiEval?.totalScore ?? 0          // official raw (e.g. 10/15)
  const aiNormalized = aiEval?.normalizedScore ?? 0   // 0-100 normalized
  const teacherTotal = Object.values(draft.scores).reduce((a, b) => a + b, 0)
  const totalDelta = teacherTotal - aiRawScore
  const readonly = isFinalized

  return (
    <div className="space-y-4">
      {isFinalized && (
        <div className="p-3 bg-success-50 border border-success-100 rounded-lg flex items-center gap-2">
          <span className="text-success-700 font-bold">✓</span>
          <p className="text-sm font-semibold text-success-700">채점이 확정되었습니다.</p>
        </div>
      )}

      {/* 점수 비교 */}
      <Card>
        <CardHeader title="최종 점수 비교" description={`루브릭: ${officialRubric.name} · 배점 ${maxScore}점`} />
        <CardBody>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-0.5">
                <span>AI 1차 환산 점수</span>
                <span className="tabular-nums">{aiNormalized} / 100</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>AI 원점수 (배점 기준)</span>
                <span className="tabular-nums">{aiRawScore} / {maxScore}</span>
              </div>
              <ScoreBar score={aiNormalized} maxScore={100} />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-text-secondary font-medium">교수자 확정 점수 (배점 기준)</span>
                <span className="font-bold tabular-nums text-text-primary">
                  {teacherTotal} / {maxScore}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>환산 점수 (참고)</span>
                <span className="tabular-nums">
                  {maxScore > 0 ? Math.round((teacherTotal / maxScore) * 100) : 0} / 100
                </span>
              </div>
              <ScoreBar score={teacherTotal} maxScore={maxScore} />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border">
              <span className="text-xs text-text-secondary">AI 원점수 대비 조정 폭:</span>
              <span
                className={[
                  'text-sm font-bold tabular-nums',
                  totalDelta > 0
                    ? 'text-success-700'
                    : totalDelta < 0
                      ? 'text-danger-500'
                      : 'text-text-muted',
                ].join(' ')}
              >
                {totalDelta > 0 ? `+${totalDelta}` : totalDelta === 0 ? '±0' : totalDelta}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="학습자 공개 피드백"
          description="학습자에게 표시될 종합 피드백입니다."
        />
        <CardBody>
          <textarea
            value={draft.publicComment}
            onChange={(e) =>
              !readonly && onDraftChange({ ...draft, publicComment: e.target.value })
            }
            placeholder="전반적인 평가와 격려의 말을 작성하세요..."
            rows={4}
            readOnly={readonly}
            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-surface-raised text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none read-only:bg-surface read-only:cursor-default"
          />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="강점" />
          <CardBody>
            <textarea
              value={draft.strengths}
              onChange={(e) =>
                !readonly && onDraftChange({ ...draft, strengths: e.target.value })
              }
              placeholder="잘한 점, 향상된 부분..."
              rows={3}
              readOnly={readonly}
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-surface-raised text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none read-only:bg-surface read-only:cursor-default"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="보완점" />
          <CardBody>
            <textarea
              value={draft.improvements}
              onChange={(e) =>
                !readonly && onDraftChange({ ...draft, improvements: e.target.value })
              }
              placeholder="개선이 필요한 부분, 오류 패턴..."
              rows={3}
              readOnly={readonly}
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-surface-raised text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none read-only:bg-surface read-only:cursor-default"
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="다음 추천 활동" />
        <CardBody>
          <textarea
            value={draft.nextActivity}
            onChange={(e) =>
              !readonly && onDraftChange({ ...draft, nextActivity: e.target.value })
            }
            placeholder="다음 학습 활동, 권장 연습 방법..."
            rows={3}
            readOnly={readonly}
            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-surface-raised text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none read-only:bg-surface read-only:cursor-default"
          />
        </CardBody>
      </Card>

      {/* TODO: 학생 결과 화면에 교수자 확정 결과를 공개하는 기능은 후속 단계 구현 예정.
          파일럿에서는 교수자가 확정 후 수동으로 학생에게 안내. */}

      {!isFinalized && (
        <div className="bg-warning-50 border border-warning-100 rounded-lg p-3">
          <p className="text-xs text-warning-700">
            확정 후에는 재확정이 가능하지만 &ldquo;재확정&rdquo; 표시가 남습니다. 점수와 피드백을 최종 확인하세요.
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        {!isFinalized ? (
          <>
            <Button variant="secondary" onClick={onBack} disabled={isPending}>
              ← 이전
            </Button>
            <Button onClick={onFinalize} loading={isPending}>
              최종 확정 ✓
            </Button>
          </>
        ) : (
          <div className="flex justify-between w-full items-center">
            <Button variant="secondary" onClick={onBack}>
              ← 루브릭 재검토
            </Button>
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-success-500 text-white">
              ✓ 채점 확정 완료
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
