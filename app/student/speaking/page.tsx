import Link from 'next/link'
import questionSetsJson from '@/src/content/question-sets.json'
import questionsJson from '@/src/content/questions.json'
import questionTypesJson from '@/src/content/question-types.json'
import { PageHeader, Card, CardHeader, CardBody, Badge } from '@/src/components/ui'

const difficultyLabel: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

const difficultyVariant: Record<string, 'success' | 'info' | 'warning'> = {
  beginner: 'success',
  intermediate: 'info',
  advanced: 'warning',
}

const purposeLabel: Record<string, string> = {
  diagnostic: '진단평가',
  practice: '연습평가',
  post: '사후평가',
}

const purposeVariant: Record<string, 'info' | 'default' | 'warning'> = {
  diagnostic: 'info',
  practice: 'default',
  post: 'warning',
}

export default function SpeakingSelectionPage() {
  const activeSets = questionSetsJson.filter((qs) => qs.isActive)
  const questionMap = new Map(questionsJson.map((q) => [q.id, q]))
  const typeMap = new Map(questionTypesJson.map((t) => [t.id, t]))

  return (
    <div>
      <PageHeader
        title="말하기 평가"
        description="아래 평가 세트에서 문항을 선택하여 말하기 평가를 시작하세요."
      />

      <div className="flex flex-col gap-6">
        {activeSets.map((set) => (
          <Card key={set.id}>
            <CardHeader
              title={set.name}
              description={set.description}
              action={
                <Badge variant={purposeVariant[set.purpose]}>
                  {purposeLabel[set.purpose] ?? set.purpose}
                </Badge>
              }
            />
            <CardBody noPadding>
              <ul className="divide-y divide-border">
                {set.questions.map(({ questionId, order }) => {
                  const q = questionMap.get(questionId)
                  if (!q || !q.isActive) return null
                  const qType = typeMap.get(q.typeId)

                  return (
                    <li
                      key={questionId}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <span className="text-xs text-text-muted font-mono w-5 shrink-0 pt-0.5">
                          {order}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-text-primary">
                              {q.title}
                            </span>
                            <Badge
                              variant={
                                difficultyVariant[q.difficulty] ?? 'default'
                              }
                            >
                              {difficultyLabel[q.difficulty] ?? q.difficulty}
                            </Badge>
                          </div>
                          <p className="text-xs text-text-muted truncate">
                            {qType?.name ?? q.typeId} · 준비{' '}
                            {q.prepTimeSec}초 · 답변 {q.responseTimeSec}초
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/student/speaking/${q.id}?setId=${set.id}`}
                        className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 py-2 rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 shrink-0"
                      >
                        시작하기
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
