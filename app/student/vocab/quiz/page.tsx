// 단어장 퀴즈 페이지 (Task 1.4) — recall 클라이언트 래퍼.
import { PageHeader } from '@/src/components/ui'
import { VocabQuizClient } from './vocab-quiz-client'

export const dynamic = 'force-dynamic'

export default function VocabQuizPage() {
  return (
    <div className="flex flex-col gap-6" data-testid="vocab-quiz-page">
      <PageHeader title="단어 복습" description="간격 반복(SM-2) 기반 능동 회상 복습입니다." />
      <VocabQuizClient />
    </div>
  )
}
