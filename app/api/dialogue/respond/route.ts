import {
  getDialogueConversationProvider,
  MockDialogueConversationProvider,
} from '@/src/providers/conversation'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'
import questionsJson from '@/src/content/questions.json'
import type { DialogueTurnInput } from '@/src/providers/conversation'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const { questionId, turns, latestStudentText, level, mode, personaId } = b

  if (typeof questionId !== 'string' || !questionId) {
    return Response.json({ error: 'missing_question_id' }, { status: 400 })
  }
  if (typeof latestStudentText !== 'string' || !latestStudentText.trim()) {
    return Response.json({ error: 'missing_student_text' }, { status: 400 })
  }

  // Fetch question data server-side — aiInformation is never sent to client
  const question = questionsJson.find((q) => q.id === questionId)
  if (!question) {
    return Response.json({ error: 'question_not_found' }, { status: 404 })
  }

  const q = question as Record<string, unknown>
  const aiRole = typeof q.aiRole === 'string' ? q.aiRole : 'AI 어시스턴트'
  const aiInformation = typeof q.aiInformation === 'string' ? q.aiInformation : ''
  const missionGoals = Array.isArray(q.missionGoals)
    ? (q.missionGoals as string[]).filter((g) => typeof g === 'string')
    : []

  const safeTurns: DialogueTurnInput[] = Array.isArray(turns)
    ? (turns as unknown[]).flatMap((t): DialogueTurnInput[] => {
        if (!t || typeof t !== 'object') return []
        const turn = t as Record<string, unknown>
        if ((turn.role !== 'ai' && turn.role !== 'student') || typeof turn.text !== 'string') return []
        return [{ role: turn.role, text: turn.text }]
      })
    : []

  const provider = getDialogueConversationProvider()

  try {
    const safeMode =
      mode === 'practice' ? 'practice' : 'assessment'
    const safePersonaId = typeof personaId === 'string' ? personaId : undefined

    const result = await provider.getDialogueResponse({
      questionId,
      level: typeof level === 'string' ? level : (question.difficulty ?? 'beginner'),
      aiRole,
      aiInformation,
      missionGoals,
      turns: safeTurns,
      latestStudentText,
      mode: safeMode,
      personaId: safePersonaId,
    })

    try {
      await logProviderEvent({
        provider: result.providerName,
        feature: 'conversation',
        status: result.status === 'success' ? 'success' : 'fallback',
        latencyMs: result.latencyMs,
        questionId,
        metadata: { providerType: 'conversation' },
      })
    } catch {
      // Non-blocking
    }

    return Response.json({
      aiText: result.text,
      providerName: result.providerName,
      status: result.status,
      // v1.1 15-2: 학습자 발화 교정 안내(있을 때만) + 이탈 검지 플래그를 UI로 전달.
      learnerGrammarNote: result.learnerGrammarNote ?? '',
      offTopicDetected: result.offTopicDetected ?? false,
    })
  } catch (err) {
    console.error('[dialogue/respond] provider error, falling back to mock:', err)

    try {
      await logProviderEvent({
        provider: 'mock',
        feature: 'conversation',
        status: 'fallback',
        questionId,
        errorCode: 'provider_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    } catch {
      // Non-blocking
    }

    // 폴백: Mock provider 직접 호출 → 학습자 입장에서 응답 지연 외 차이 없음
    try {
      const safeMode = mode === 'practice' ? 'practice' : 'assessment'
      const safePersonaId = typeof personaId === 'string' ? personaId : undefined
      const fallbackProvider = new MockDialogueConversationProvider()
      const fallbackResult = await fallbackProvider.getDialogueResponse({
        questionId,
        level: typeof level === 'string' ? level : (question.difficulty ?? 'beginner'),
        aiRole,
        aiInformation,
        missionGoals,
        turns: safeTurns,
        latestStudentText,
        mode: safeMode,
        personaId: safePersonaId,
      })
      return Response.json({
        aiText: fallbackResult.text,
        providerName: fallbackResult.providerName,
        status: 'fallback',
      })
    } catch (fallbackErr) {
      console.error('[dialogue/respond] mock fallback also failed:', fallbackErr)
      return Response.json({
        aiText: '네, 알겠습니다.',
        providerName: 'fallback',
        status: 'fallback',
      })
    }
  }
}
