// 학생 단어장 — 오늘의 복습 요약 + 시작 (Task 1.4, D-012)
// 정식 학습자 모델(auth.users + vocab_cards) 기준. 미인증/미적용 시 안내 상태.
import Link from 'next/link'
import { PageHeader, Card, CardHeader, CardBody, Badge, EmptyState } from '@/src/components/ui'
import { createSupabaseServerClient } from '@/src/lib/supabase/server'
import { getDueCards, dailyLimit } from '@/src/lib/srs/due'

export const dynamic = 'force-dynamic'

export default async function VocabPage() {
  const supabase = await createSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null

  let cards: Awaited<ReturnType<typeof getDueCards>> = []
  let errored = false
  if (supabase && user) {
    try {
      cards = await getDueCards(supabase)
    } catch {
      errored = true
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="vocab-page">
      <PageHeader title="단어장" description="학습한 콘텐츠의 핵심·도전 어휘를 간격 반복(SRS)으로 복습합니다." />

      {!supabase || !user ? (
        <Card>
          <CardBody>
            <EmptyState
              title="로그인이 필요해요"
              description="단어장은 로그인한 학습자 계정에서 이용할 수 있습니다."
            />
          </CardBody>
        </Card>
      ) : errored ? (
        <Card>
          <CardBody>
            <EmptyState title="아직 준비 중이에요" description="단어장 기능 준비가 완료되면 복습 카드가 표시됩니다." />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="오늘의 복습"
            description={`복습 대기 ${cards.length}개 (하루 최대 ${dailyLimit()}개)`}
          />
          <CardBody>
            {cards.length === 0 ? (
              <EmptyState
                title="오늘 복습할 카드가 없어요"
                description="콘텐츠를 학습하면 핵심·도전 어휘가 자동으로 단어장에 추가됩니다."
              />
            ) : (
              <div className="flex flex-col gap-4">
                <ul className="flex flex-wrap gap-2">
                  {cards.slice(0, 12).map((c) => (
                    <li key={c.id}>
                      <Badge variant="info">
                        {c.term}
                        {c.cefr_level ? ` · ${c.cefr_level}` : ''}
                      </Badge>
                    </li>
                  ))}
                  {cards.length > 12 && (
                    <li>
                      <Badge>+{cards.length - 12}</Badge>
                    </li>
                  )}
                </ul>
                <div>
                  <Link
                    href="/student/vocab/quiz"
                    className="inline-flex items-center justify-center gap-2 font-medium transition-colors px-4 py-2 text-sm rounded bg-primary-700 text-white hover:bg-primary-800 border border-primary-700"
                  >
                    복습 시작하기
                  </Link>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
