import { notFound } from 'next/navigation'
import Link from 'next/link'
import questionsJson from '@/src/content/questions.json'
import questionSetsJson from '@/src/content/question-sets.json'
import questionTypesJson from '@/src/content/question-types.json'
import { PageHeader } from '@/src/components/ui'
import { Localized } from '@/src/components/ui/localized'
import { BilingualText } from '@/src/components/ui/bilingual-text'
import { getStudentVisibleAsset } from '@/src/content/assessment-assets'
import { getCurrentParticipant } from '@/src/lib/research/session'
import {
  QUESTION_SET_NAMES,
  QUESTION_TYPE_NAMES,
} from '@/src/lib/i18n/content-labels'
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
  searchParams: Promise<{ setId?: string; attemptId?: string }>
}) {
  const { questionId: rawQuestionId } = await params
  const { setId, attemptId } = await searchParams

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

  // v1.1 16-10-2: 학습자 모국어를 클라이언트로 전달해 다국어 LLM 응답 활성화.
  const participant = await getCurrentParticipant().catch(() => null)
  const motherTongue = participant?.motherTongue ?? null

  // v1.1 단계 19.10 [페이즈3]: 페이지 헤더·문항 목록 링크 mother_tongue 보조.
  const descMultilingual = qType
    ? {
        ko: `${QUESTION_SET_NAMES[resolvedSet.id]?.ko ?? resolvedSet.name} · ${QUESTION_TYPE_NAMES[qType.id]?.ko ?? qType.name}`,
        en: `${QUESTION_SET_NAMES[resolvedSet.id]?.en ?? resolvedSet.name} · ${QUESTION_TYPE_NAMES[qType.id]?.en ?? qType.name}`,
        vi: `${QUESTION_SET_NAMES[resolvedSet.id]?.vi ?? resolvedSet.name} · ${QUESTION_TYPE_NAMES[qType.id]?.vi ?? qType.name}`,
        ar: `${QUESTION_SET_NAMES[resolvedSet.id]?.ar ?? resolvedSet.name} · ${QUESTION_TYPE_NAMES[qType.id]?.ar ?? qType.name}`,
        th: `${QUESTION_SET_NAMES[resolvedSet.id]?.th ?? resolvedSet.name} · ${QUESTION_TYPE_NAMES[qType.id]?.th ?? qType.name}`,
        ms: `${QUESTION_SET_NAMES[resolvedSet.id]?.ms ?? resolvedSet.name} · ${QUESTION_TYPE_NAMES[qType.id]?.ms ?? qType.name}`,
        km: `${QUESTION_SET_NAMES[resolvedSet.id]?.km ?? resolvedSet.name} · ${QUESTION_TYPE_NAMES[qType.id]?.km ?? qType.name}`,
      }
    : undefined

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/student/speaking"
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <span lang="ko">← 문항 목록</span>
          <Localized
            spec={{ kind: 'practice', key: 'speaking_questionList' }}
            motherTongueHint={motherTongue}
            supplementOnly
            className="ml-1 text-[11px] text-text-muted"
          />
        </Link>
      </div>

      <PageHeader
        title="말하기 평가"
        titleSupplement={
          <Localized
            spec={{ kind: 'practice', key: 'speaking_pageTitle' }}
            motherTongueHint={motherTongue}
            supplementOnly
            className="text-xs text-text-muted"
          />
        }
        description={
          <BilingualText
            ko={`${resolvedSet.name} · ${qType?.name ?? question.typeId}`}
            multilingual={descMultilingual}
            motherTongueHint={motherTongue}
            className="text-sm text-text-secondary"
            supplementClassName="text-[11px]"
          />
        }
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
          aiFirstUtterance: (question as { aiFirstUtterance?: string }).aiFirstUtterance,
        }}
        questionSetId={resolvedSet.id}
        setName={resolvedSet.name}
        attemptId={attemptId}
        motherTongue={motherTongue}
      />
    </div>
  )
}
