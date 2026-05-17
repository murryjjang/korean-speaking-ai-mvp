import Link from 'next/link'
import questionSetsJson from '@/src/content/question-sets.json'
import questionsJson from '@/src/content/questions.json'
import questionTypesJson from '@/src/content/question-types.json'
import { PageHeader, Card, CardHeader, CardBody, Badge } from '@/src/components/ui'
import { Localized } from '@/src/components/ui/localized'
import { getCurrentParticipant } from '@/src/lib/research/session'
import type { DashboardLabelKey } from '@/src/lib/i18n/dashboard-labels'
import { StartSetButton } from './start-set-button'

// v1.1 단계 19.9 [페이즈4]: 난이도·목적 라벨도 한국어 본문 + mother_tongue 보조.
// Localized 컴포넌트가 mother_tongue 단독 결정으로 보조 텍스트를 렌더.
const difficultyKey: Record<string, DashboardLabelKey> = {
  beginner: { kind: 'practice', key: 'diff_beginner' },
  intermediate: { kind: 'practice', key: 'diff_intermediate' },
  advanced: { kind: 'practice', key: 'diff_advanced' },
}

const difficultyVariant: Record<string, 'success' | 'info' | 'warning'> = {
  beginner: 'success',
  intermediate: 'info',
  advanced: 'warning',
}

const purposeKey: Record<string, DashboardLabelKey | undefined> = {
  official: { kind: 'practice', key: 'purpose_official' },
  diagnostic: { kind: 'practice', key: 'purpose_diagnostic' },
  practice: { kind: 'practice', key: 'purpose_practice' },
  // post·dev는 학습자 노출 가능성 거의 없어 한국어 단독 유지.
}

const purposeFallback: Record<string, string> = {
  post: '사후평가',
  dev: '개발용',
}

const purposeVariant: Record<string, 'success' | 'info' | 'default' | 'warning'> = {
  official: 'success',
  diagnostic: 'info',
  practice: 'default',
  post: 'warning',
  dev: 'default',
}

export default async function SpeakingSelectionPage() {
  const participant = await getCurrentParticipant().catch(() => null)
  const motherTongueHint = participant?.motherTongue ?? null
  const activeSets = questionSetsJson.filter((qs) => qs.isActive)
  const questionMap = new Map(questionsJson.map((q) => [q.id, q]))
  const typeMap = new Map(questionTypesJson.map((t) => [t.id, t]))

  return (
    <div>
      <PageHeader
        title="말하기 평가"
        description="아래 평가 세트에서 문항을 선택하거나 세트 전체를 순서대로 응시하세요."
        titleSupplement={
          <Localized
            spec={{ kind: 'sidebar', key: 'studentSpeaking' }}
            motherTongueHint={motherTongueHint}
            supplementOnly
            className="text-xs text-text-muted"
          />
        }
      />

      <div className="flex flex-col gap-6">
        {activeSets.map((set) => {
          const sortedQuestions = [...set.questions].sort((a, b) => a.order - b.order)
          const firstActiveQuestion = sortedQuestions.find(
            (sq) => questionMap.get(sq.questionId)?.isActive,
          )
          return (
          <Card key={set.id}>
            <CardHeader
              title={set.name}
              description={set.description}
              action={
                <Badge variant={purposeVariant[set.purpose]}>
                  {purposeKey[set.purpose] ? (
                    <Localized spec={purposeKey[set.purpose]!} motherTongueHint={motherTongueHint} inline prominent />
                  ) : (
                    purposeFallback[set.purpose] ?? set.purpose
                  )}
                </Badge>
              }
            />
            {firstActiveQuestion && (
              <div className="px-4 pb-3 md:px-5">
                <StartSetButton
                  setId={set.id}
                  firstQuestionId={firstActiveQuestion.questionId}
                  className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[40px] rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700"
                >
                  <Localized
                    spec={{ kind: 'practice', key: 'action_startInOrder' }}
                    motherTongueHint={motherTongueHint}
                    inline
                  /> →
                </StartSetButton>
              </div>
            )}
            <CardBody noPadding>
              <ul className="divide-y divide-border">
                {set.questions.map(({ questionId, order }) => {
                  const q = questionMap.get(questionId)
                  if (!q || !q.isActive) return null
                  const qType = typeMap.get(q.typeId)

                  return (
                    <li key={questionId} className="px-4 py-3 md:px-5 md:py-4">
                      {/* 번호 + 제목 + 난이도 */}
                      <div className="flex items-start gap-3 md:gap-4 min-w-0">
                        <span className="text-xs text-text-muted font-mono w-5 shrink-0 pt-0.5">
                          {order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5 md:mb-1">
                            <span className="text-sm font-medium text-text-primary leading-snug">
                              {q.title}
                            </span>
                            <Badge
                              variant={
                                difficultyVariant[q.difficulty] ?? 'default'
                              }
                            >
                              {difficultyKey[q.difficulty] ? (
                                <Localized
                                  spec={difficultyKey[q.difficulty]}
                                  motherTongueHint={motherTongueHint}
                                  inline
                                  prominent
                                />
                              ) : (
                                q.difficulty
                              )}
                            </Badge>
                          </div>
                          {/* 메타: 데스크톱 전용 */}
                          <p className="hidden md:block text-xs text-text-muted truncate">
                            {qType?.name ?? q.typeId} · 준비{' '}
                            {q.prepTimeSec}초 · 답변 {q.responseTimeSec}초
                          </p>
                        </div>
                        {/* 시작하기: 데스크톱 전용 */}
                        <Link
                          href={`/student/speaking/${q.id}?setId=${set.id}`}
                          className="hidden md:inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 py-2 rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 shrink-0"
                        >
                          <Localized
                            spec={{ kind: 'practice', key: 'action_start' }}
                            motherTongueHint={motherTongueHint}
                            inline
                          />
                        </Link>
                      </div>

                      {/* 모바일 하단행: 메타 + 시작하기 */}
                      <div className="md:hidden flex items-center justify-between gap-3 pl-8 mt-2">
                        <p className="text-xs text-text-muted truncate flex-1">
                          {qType?.name ?? q.typeId} · 준비{' '}
                          {q.prepTimeSec}초 · 답변 {q.responseTimeSec}초
                        </p>
                        <Link
                          href={`/student/speaking/${q.id}?setId=${set.id}`}
                          className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 shrink-0"
                        >
                          <Localized
                            spec={{ kind: 'practice', key: 'action_start' }}
                            motherTongueHint={motherTongueHint}
                            inline
                          />
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardBody>
          </Card>
          )
        })}
      </div>
    </div>
  )
}
