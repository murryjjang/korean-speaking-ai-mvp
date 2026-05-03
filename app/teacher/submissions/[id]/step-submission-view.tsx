import { Card, CardHeader, CardBody, Badge, ScoreBar, RiskBadge, Button } from '@/src/components/ui'
import type { GradingWizardData } from '@/src/types/grading'

function formatDateTime(isoString: string): string {
  const d = new Date(isoString)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}년 ${mo}월 ${day}일 ${h}:${min}`
}

const MODULE_TYPE_LABEL: Record<string, string> = {
  assessment: '말하기 평가',
  mission: '미션 대화',
  contest: '말하기 대회',
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'info' | 'success' | 'warning' }
> = {
  pending: { label: '채점 대기', variant: 'default' },
  ai_evaluated: { label: 'AI 평가 완료', variant: 'info' },
  teacher_reviewed: { label: '교수자 검토', variant: 'warning' },
  finalized: { label: '확정', variant: 'success' },
}

const LANGUAGE_GROUP_LABEL: Record<string, string> = {
  'east-asian': '동아시아',
  'southeast-asian': '동남아시아',
  arabic: '아랍어권',
  european: '유럽',
  korean: '한국어',
  other: '기타',
}

interface StepSubmissionViewProps {
  data: GradingWizardData
  onNext: () => void
}

export function StepSubmissionView({ data, onNext }: StepSubmissionViewProps) {
  const { submission, student, cls, aiEval, riskFlag, question, rubricItems } = data
  const statusCfg = STATUS_CONFIG[submission.status] ?? {
    label: submission.status,
    variant: 'default' as const,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="학생 정보" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              <InfoRow label="이름" value={student.name} />
              <InfoRow label="학번" value={student.anonymousId} />
              <InfoRow label="반" value={cls.name} />
              <InfoRow label="모국어" value={student.nativeLanguage} />
              <InfoRow
                label="어권"
                value={LANGUAGE_GROUP_LABEL[student.languageGroup] ?? student.languageGroup}
              />
              {riskFlag && (
                <div className="flex justify-between items-center pt-1.5 border-t border-border">
                  <dt className="text-text-secondary">위험도</dt>
                  <dd>
                    <RiskBadge level={riskFlag.riskLevel as 'low' | 'medium' | 'high'} />
                  </dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="제출 정보" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              <InfoRow
                label="문항"
                value={question ? question.title : (submission.scenarioId ?? '—')}
                valueClassName="text-right max-w-44 truncate"
              />
              <InfoRow
                label="유형"
                value={MODULE_TYPE_LABEL[submission.moduleType] ?? submission.moduleType}
              />
              <InfoRow
                label="제출 시간"
                value={formatDateTime(submission.submittedAt)}
              />
              <InfoRow label="녹음 길이" value={`${submission.durationSec}초`} />
              <div className="flex justify-between items-center">
                <dt className="text-text-secondary">상태</dt>
                <dd>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>

      {question && (
        <Card>
          <CardHeader title="문항 내용" />
          <CardBody>
            <p className="text-sm text-text-primary leading-relaxed">{question.prompt}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="STT 전사문" />
        <CardBody>
          {aiEval ? (
            <p className="text-sm text-text-primary leading-relaxed bg-surface p-3 rounded-md border border-border">
              &ldquo;{aiEval.transcript}&rdquo;
            </p>
          ) : (
            <p className="text-sm text-text-muted italic">
              AI 평가가 없습니다. (pending 상태)
            </p>
          )}
        </CardBody>
      </Card>

      {aiEval && (
        <Card>
          <CardHeader title="AI 자동 평가 요약" description={`총점 ${aiEval.totalScore} / 100`} />
          <CardBody>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span className="font-medium">총점</span>
                  <span>{aiEval.totalScore} / 100</span>
                </div>
                <ScoreBar score={aiEval.totalScore} maxScore={100} />
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                {rubricItems.map((item) => {
                  const score = aiEval.scores[item.id] ?? 0
                  return (
                    <div key={item.id}>
                      <div className="flex justify-between text-xs text-text-secondary mb-0.5">
                        <span>{item.label}</span>
                        <span>{score} / {item.maxScore}</span>
                      </div>
                      <ScoreBar score={score} maxScore={item.maxScore} />
                    </div>
                  )
                })}
              </div>

              {aiEval.errorTags.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-text-secondary mb-2">오류 태그</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiEval.errorTags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs bg-warning-50 text-warning-700 border border-warning-100 px-2 py-0.5 rounded-full"
                      >
                        {tag.type} {tag.count}건
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-text-secondary mb-1">AI 피드백</p>
                <p className="text-sm text-text-primary leading-relaxed">{aiEval.feedback}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {riskFlag && (
        <div className="p-3 bg-danger-50 border border-danger-100 rounded-lg">
          <p className="text-xs font-semibold text-danger-700 mb-1">위험 학생 분류 사유</p>
          <ul className="list-disc list-inside space-y-0.5">
            {riskFlag.reasons.map((reason, i) => (
              <li key={i} className="text-xs text-danger-500">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {!aiEval && (
          <p className="text-xs text-text-muted">
            AI 평가가 완료된 제출물만 채점을 진행할 수 있습니다.
          </p>
        )}
        <Button onClick={onNext} disabled={!aiEval}>
          다음 단계 →
        </Button>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  valueClassName = '',
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <dt className="text-text-secondary shrink-0">{label}</dt>
      <dd className={`font-medium text-text-primary ${valueClassName}`}>{value}</dd>
    </div>
  )
}
