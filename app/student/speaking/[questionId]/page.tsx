import { notFound } from 'next/navigation'
import Link from 'next/link'
import questionsJson from '@/src/content/questions.json'
import questionSetsJson from '@/src/content/question-sets.json'
import questionTypesJson from '@/src/content/question-types.json'
import { PageHeader } from '@/src/components/ui'
import { getStudentVisibleAsset } from '@/src/content/assessment-assets'
import { SpeakingClient } from './speaking-client'

// Canonical ID aliases — old short IDs redirect to canonical long IDs.
// Used for backwards compat when old short IDs appear in URLs.
const QUESTION_ID_ALIASES: Record<string, string> = {
  'beginner-q2-material-desc': 'beginner-q2-material-description',
  'beginner-q3-listening-resp': 'beginner-q3-listening-response',
  'intermediate-q2-material-desc': 'intermediate-q2-material-description',
  'intermediate-q3-listening-resp': 'intermediate-q3-listening-response',
  'advanced-q2-material-desc': 'advanced-q2-material-description',
  'advanced-q3-listening-resp': 'advanced-q3-listening-response',
}

function resolveQuestionId(id: string): string {
  return QUESTION_ID_ALIASES[id] ?? id
}

export default async function SpeakingQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionId: string }>
  searchParams: Promise<{ setId?: string }>
}) {
  const { questionId: rawQuestionId } = await params
  const { setId } = await searchParams

  const questionId = resolveQuestionId(rawQuestionId)

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

  // dialogue_mission은 renderer를 사용하지 않음 (대화 카드에서 처리)
  const assetMeta =
    question.typeId !== 'qt-dialogue-mission'
      ? getStudentVisibleAsset(question.id)
      : undefined

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
          typeId: question.typeId,
          title: question.title,
          prompt: question.prompt,
          prepTimeSec: question.prepTimeSec,
          responseTimeSec: question.responseTimeSec,
          difficulty: question.difficulty,
          typeLabel: qType?.name ?? question.typeId,
          imageUrl: question.imageUrl,
          imageAlt: question.imageAlt,
          imageCaption: question.imageCaption,
          imageLicenseNote: question.imageLicenseNote,
          assetType: question.assetType ?? undefined,
          // asset registry — student-safe only (teacherOnlyNote 미전달)
          assetMeta,
          // listening_response: listenLimit (listeningScriptForTeacherOnly 미전달)
          listenLimit: (question as { listenLimit?: number }).listenLimit,
          learnerVisibleElements: (question as { learnerVisibleElements?: string[] }).learnerVisibleElements,
          // dialogue_mission: learner-visible fields only (aiInformation 미전달)
          missionGoals: (question as { missionGoals?: string[] }).missionGoals,
          evaluationMode: (question as { evaluationMode?: string }).evaluationMode,
          maxDialogueDurationSec: (question as { maxDialogueDurationSec?: number }).maxDialogueDurationSec,
        }}
        questionSetId={resolvedSet.id}
        setName={resolvedSet.name}
      />
    </div>
  )
}
