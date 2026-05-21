// 모범답안 페이지 (Task 1.5) — CEFR 수준별 side-by-side.
import { PageHeader } from '@/src/components/ui'
import { ModelAnswerPanel } from './model-answer-panel'

export const dynamic = 'force-dynamic'

export default async function ModelAnswerPage({
  params,
}: {
  params: Promise<{ contentId: string }>
}) {
  const { contentId } = await params
  return (
    <div className="flex flex-col gap-6" data-testid="model-answer-page">
      <PageHeader title="모범답안" description="목표 수준과 도전 수준의 모범답안을 듣고 비교해 보세요." />
      <ModelAnswerPanel contentId={contentId} />
    </div>
  )
}
