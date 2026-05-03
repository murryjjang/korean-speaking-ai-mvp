import { notFound } from 'next/navigation'
import Link from 'next/link'
import questionsJson from '@/src/content/questions.json'
import questionSetsJson from '@/src/content/question-sets.json'
import questionTypesJson from '@/src/content/question-types.json'
import { PageHeader } from '@/src/components/ui'
import { SpeakingClient } from './speaking-client'

export default async function SpeakingQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionId: string }>
  searchParams: Promise<{ setId?: string }>
}) {
  const { questionId } = await params
  const { setId } = await searchParams

  const question = questionsJson.find((q) => q.id === questionId && q.isActive)
  if (!question) notFound()

  const qType = questionTypesJson.find((t) => t.id === question.typeId)

  // setId가 없으면 이 문항을 포함하는 첫 번째 활성 세트를 사용
  const resolvedSet =
    questionSetsJson.find(
      (qs) =>
        qs.isActive &&
        (setId
          ? qs.id === setId
          : qs.questions.some((qi) => qi.questionId === questionId)),
    ) ?? questionSetsJson[0]

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/student/speaking"
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          ← 문항 목록
        </Link>
      </div>

      <PageHeader
        title="말하기 평가"
        description={`${resolvedSet.name} · ${qType?.name ?? question.typeId}`}
      />

      <SpeakingClient
        question={{
          id: question.id,
          title: question.title,
          prompt: question.prompt,
          prepTimeSec: question.prepTimeSec,
          responseTimeSec: question.responseTimeSec,
          difficulty: question.difficulty,
          typeLabel: qType?.name ?? question.typeId,
        }}
        questionSetId={resolvedSet.id}
        setName={resolvedSet.name}
      />
    </div>
  )
}
