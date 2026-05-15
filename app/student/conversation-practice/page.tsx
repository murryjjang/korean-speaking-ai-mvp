import { getCurrentParticipant } from '@/src/lib/research/session'
import { FreeConversationClient } from './free-conversation-client'

export default async function ConversationPracticePage() {
  // v1.1 16-10-7: 참여자 모국어를 클라이언트로 전달 — 다국어 LLM 응답 + 표시 토글 초기값.
  const participant = await getCurrentParticipant().catch(() => null)
  const motherTongue = participant?.motherTongue ?? null
  return <FreeConversationClient motherTongue={motherTongue} />
}
