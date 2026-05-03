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
  const { aiEval } = data
  const aiTotal = aiEval?.totalScore ?? 0
  const teacherTotal = Object.values(draft.scores).reduce((a, b) => a + b, 0)
  const totalDelta = teacherTotal - aiTotal
  const readonly = isFinalized

  return (
    <div className="space-y-4">
      {isFinalized && (
        <div className="p-3 bg-success-50 border border-success-100 rounded-lg flex items-center gap-2">
          <span className="text-success-700 font-bold">✓</span>
          <p className="text-sm font-semibold text-success-700">채점이 확정되었습니다.</p>
        </div>
      )}

      <Card>
        <CardHeader title="최종 점수 비교" />
        <CardBody>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>AI 총점</span>
                <span className="tabular-nums">{aiTotal} / 100</span>
              </div>
              <ScoreBar score={aiTotal} maxScore={100} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary font-medium">교수자 확정 점수</span>
                <span className="font-bold tabular-nums text-text-primary">
                  {teacherTotal} / 100
                </span>
              </div>
              <ScoreBar score={teacherTotal} maxScore={100} />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <span className="text-xs text-text-secondary">AI 대비 조정 폭:</span>
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

      {!isFinalized && (
        <div className="bg-warning-50 border border-warning-100 rounded-lg p-3">
          <p className="text-xs text-warning-700">
            확정 후에는 수정이 불가합니다. 점수와 피드백을 최종 확인하세요.
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
          <div className="flex justify-end w-full">
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-success-500 text-white">
              ✓ 채점 확정 완료
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
