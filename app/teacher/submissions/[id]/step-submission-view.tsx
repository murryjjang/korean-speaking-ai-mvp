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

const QUESTION_TYPE_LABELS: Record<string, string> = {
  'qt-reading': '낭독',
  'qt-material-desc': '자료 설명',
  'qt-listening-resp': '듣고 답하기',
  'qt-dialogue-mission': '생성형 AI 대화 미션',
  'qt-self-intro': '자기소개',
  'qt-picture': '그림 묘사',
  'qt-situation': '상황 말하기',
  'qt-opinion': '의견 말하기',
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
  const {
    submission,
    student,
    cls,
    aiEval,
    riskFlag,
    question,
    questionExtras,
    officialRubric,
    dialogueTurns,
    isDialogueMission,
    rubricItems,
  } = data
  const statusCfg = STATUS_CONFIG[submission.status] ?? {
    label: submission.status,
    variant: 'default' as const,
  }

  const questionTypeLabel = questionExtras?.typeId
    ? (QUESTION_TYPE_LABELS[questionExtras.typeId] ?? questionExtras.typeId)
    : '말하기 평가'

  return (
    <div className="space-y-4">
      {/* 학생/제출 기본 정보 */}
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
              <div className="flex justify-between items-center">
                <dt className="text-text-secondary">문항 유형</dt>
                <dd className="font-medium text-text-primary">
                  {isDialogueMission ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-primary-700">{questionTypeLabel}</span>
                      <Badge variant="info">대화형</Badge>
                    </span>
                  ) : (
                    questionTypeLabel
                  )}
                </dd>
              </div>
              <InfoRow
                label="문항 배점"
                value={`${questionExtras?.maxScore ?? officialRubric.totalMaxScore}점`}
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

      {/* 음성 파일 */}
      {submission.audioUrl && (
        <Card>
          <CardHeader title="제출 음성" description="학생 녹음 파일" />
          <CardBody>
            <audio
              controls
              src={submission.audioUrl}
              className="w-full"
              aria-label="학생 녹음 재생"
            />
          </CardBody>
        </Card>
      )}

      {/* 문항 내용 */}
      {question && (
        <Card>
          <CardHeader
            title="문항 내용"
            description={officialRubric.name + ` · 배점 ${officialRubric.totalMaxScore}점`}
          />
          <CardBody>
            <div className="space-y-3">
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
                {question.prompt}
              </p>
              {questionExtras?.guide && (
                <div className="p-2.5 bg-surface rounded-md border border-border">
                  <p className="text-xs font-semibold text-text-secondary mb-1">안내</p>
                  <p className="text-xs text-text-primary">{questionExtras.guide}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 교수자 전용 — 듣기 스크립트 */}
      {questionExtras?.listeningScriptForTeacherOnly && (
        <div className="p-3 bg-warning-50 border border-warning-100 rounded-lg">
          <p className="text-xs font-semibold text-warning-700 mb-1">
            교수자 전용 — 듣기 스크립트 (학생 비공개)
          </p>
          <p className="text-sm text-warning-700 leading-relaxed">
            {questionExtras.listeningScriptForTeacherOnly}
          </p>
        </div>
      )}

      {/* 교수자 전용 — AI 역할 정보 (대화 미션) */}
      {isDialogueMission && questionExtras?.aiInformation && (
        <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg">
          <p className="text-xs font-semibold text-primary-700 mb-1">
            교수자 전용 — AI 역할 정보 (학생 비공개)
          </p>
          <p className="text-sm text-primary-700 leading-relaxed">{questionExtras.aiInformation}</p>
        </div>
      )}

      {/* 필수 요소 */}
      {questionExtras?.requiredElements && questionExtras.requiredElements.length > 0 && (
        <Card>
          <CardHeader title="필수 포함 요소" description="루브릭 채점 기준" />
          <CardBody>
            <ul className="space-y-1">
              {questionExtras.requiredElements.map((el, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-text-muted shrink-0 mt-0.5">•</span>
                  <span className="text-text-primary">{el}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* 대화 로그 — 대화 미션 전용 */}
      {isDialogueMission && dialogueTurns.length > 0 && (
        <Card>
          <CardHeader
            title="대화 로그"
            description="AI 턴과 학생 턴이 교대로 표시됩니다. 단발 답변형이 아닌 생성형 AI 쌍방 대화 평가입니다."
          />
          <CardBody>
            <div className="space-y-2">
              {dialogueTurns.map((turn, i) => (
                <div
                  key={i}
                  className={[
                    'flex gap-2',
                    turn.role === 'student' ? 'justify-end' : 'justify-start',
                  ].join(' ')}
                >
                  {turn.role === 'ai' && (
                    <span className="text-xs font-semibold text-primary-700 shrink-0 mt-1.5">
                      AI
                    </span>
                  )}
                  <div
                    className={[
                      'max-w-xs sm:max-w-sm px-3 py-2 rounded-lg text-sm leading-relaxed',
                      turn.role === 'ai'
                        ? 'bg-primary-50 border border-primary-100 text-primary-900'
                        : 'bg-surface border border-border text-text-primary',
                    ].join(' ')}
                  >
                    {turn.text}
                  </div>
                  {turn.role === 'student' && (
                    <span className="text-xs font-semibold text-text-secondary shrink-0 mt-1.5">
                      학생
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* STT 전사문 */}
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

      {/* AI 1차 평가 요약 */}
      {aiEval && (
        <Card>
          <CardHeader
            title="AI 1차 평가 요약"
            description={`환산 ${aiEval.normalizedScore}/100 · 원점수 ${aiEval.totalScore}/${officialRubric.totalMaxScore}점`}
          />
          <CardBody>
            <div className="space-y-3">
              <div className="p-2 bg-info-50 border border-info-100 rounded-md text-xs text-info-700">
                AI 평가는 1차 참고 자료입니다. 교수자가 최종 점수를 확정합니다.
              </div>

              <div>
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span className="font-medium">AI 환산 점수</span>
                  <span>{aiEval.normalizedScore} / 100</span>
                </div>
                <ScoreBar score={aiEval.normalizedScore} maxScore={100} />
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-semibold text-text-secondary">루브릭 항목별 AI 점수</p>
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
                <div className="flex justify-between text-xs font-bold text-text-primary border-t border-border pt-1">
                  <span>합계</span>
                  <span>{aiEval.totalScore} / {officialRubric.totalMaxScore}점</span>
                </div>
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

      {/* 교수자 참고 — 모범 답안 */}
      {questionExtras?.modelAnswer && (
        <Card>
          <CardHeader title="모범 답안 (교수자 참고)" description="채점 기준 예시 답변입니다." />
          <CardBody>
            <p className="text-sm text-text-primary leading-relaxed bg-surface p-3 rounded-md border border-border italic">
              {questionExtras.modelAnswer}
            </p>
          </CardBody>
        </Card>
      )}

      {/* 교수자 전용 메모 */}
      {questionExtras?.teacherNotes && (
        <div className="p-3 bg-warning-50 border border-warning-100 rounded-lg">
          <p className="text-xs font-semibold text-warning-700 mb-1">교수자 채점 메모</p>
          <p className="text-sm text-warning-700 leading-relaxed">{questionExtras.teacherNotes}</p>
        </div>
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
          루브릭 채점 →
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
