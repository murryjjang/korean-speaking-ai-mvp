import { getCurrentParticipant } from '@/src/lib/research/session'
import { ReadingPracticeClient } from './reading-practice-client'

export const metadata = {
  title: '읽기연습 | Korean Speaking AI',
  description: '짧은 글을 듣고 따라 읽으며 발음, 속도, 끊어 읽기, 정확도를 연습하는 기능입니다.',
}

// v1.1 단계 19.7 [아키텍처]: 참여자 mother_tongue을 RSC에서 prop으로 주입.
export default async function ReadingPracticePage() {
  const participant = await getCurrentParticipant().catch(() => null)
  const motherTongue = participant?.motherTongue ?? null
  return <ReadingPracticeClient motherTongue={motherTongue} />
}
