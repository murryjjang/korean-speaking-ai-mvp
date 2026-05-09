'use server'

import { evaluateSpeakingDetail, detailToLLMEvalResult } from '@/src/providers/llm-eval'
import { saveSpeakingEval } from '@/src/lib/mock/speaking-store'
import { saveAttemptSubmission } from '@/src/lib/attempt/attempt-store'
import { getEvaluationRepository } from '@/src/lib/repositories'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'
import questionsJson from '@/src/content/questions.json'
import type { ProviderName, PronunciationResult } from '@/src/types/providers'
import type { DialogueTurn, MissionGoalResult } from '@/src/types/dialogue'
import { generateAggregatedTranscript } from '@/src/lib/dialogue-mission'
import { evaluateDialogueMissionHybrid } from '@/src/lib/dialogue-mission-llm'

export interface DialogueSubmitMeta {
  turns: DialogueTurn[]
  goalResults: MissionGoalResult[]
  /** Attempt UUID — when present, records this submission in the attempt store. */
  attemptId?: string
}

export async function submitDialogue(
  questionId: string,
  questionSetId: string,
  meta: DialogueSubmitMeta,
): Promise<{ submissionId: string }> {
  const { turns, goalResults: clientGoalResults, attemptId } = meta

  // Guard: must have at least one valid student turn
  const studentTurns = turns.filter((t) => t.role === 'student' && t.status === 'completed')
  if (studentTurns.length === 0) {
    throw new Error('no_valid_student_turns')
  }

  // Derive conversation provider from AI turns. 'script' = scripted greeting, ignored.
  // 'openai' = LLM 응답 성공 한 번이라도 있으면 LLM 대화. 그 외는 mock/fallback.
  const aiTurnsFromProvider = turns.filter(
    (t) => t.role === 'ai' && t.providerName && t.providerName !== 'script',
  )
  const dialogueConversationProvider: 'openai' | 'mock' | 'fallback' =
    aiTurnsFromProvider.some((t) => t.providerName === 'openai')
      ? 'openai'
      : aiTurnsFromProvider.length === 0
        ? 'fallback'
        : (aiTurnsFromProvider[0].providerName as 'mock' | 'fallback')

  const aggregatedTranscript = generateAggregatedTranscript(turns)

  // Guard: aggregated transcript must have content
  if (!aggregatedTranscript.trim()) {
    throw new Error('empty_dialogue')
  }

  // Build STT result from aggregated transcript
  const sttResult = {
    transcript: aggregatedTranscript,
    confidence: 0.8,
    providerName: 'mock' as ProviderName,
    providerVersion: '1.0.0',
    latencyMs: 0,
  }

  // q4 하이브리드 평가 — CONVERSATION_PROVIDER=openai일 때 LLM이 자연 발화 변형까지 판정.
  // 실패하거나 mock 모드면 client에서 보낸 규칙 기반 결과를 그대로 사용.
  const missionGoals = clientGoalResults.map((g) => g.labelKo)
  const hybridResult = await evaluateDialogueMissionHybrid(questionId, missionGoals, turns)
  const goalResults: MissionGoalResult[] =
    hybridResult.source === 'llm' ? hybridResult.results : clientGoalResults

  // Compute mission achievement for LLM context (cap at totalGoals for safety)
  const totalGoals = goalResults.length
  const achievedCount = Math.min(goalResults.filter((g) => g.achieved).length, totalGoals)
  const achievementRate = totalGoals > 0 ? Math.round((achievedCount / totalGoals) * 100) : 0
  const missionSummary = goalResults
    .map((g) => `- ${g.labelKo}: ${g.achieved ? '달성' : '미달성'}`)
    .join('\n')

  // LLM evaluation — pass aggregated transcript + mission context
  const question = questionsJson.find((q) => q.id === questionId)
  const configuredProvider = process.env.LLM_EVAL_PROVIDER ?? 'mock'

  const llmEvalPromise = evaluateSpeakingDetail({
    transcript: aggregatedTranscript,
    rubricId: question?.rubricId ?? 'rubric-dialogue-mission-01',
    questionPrompt: question?.prompt,
    questionId,
    questionType: 'qt-dialogue-mission',
    requiredElements: (question as { requiredElements?: string[] })?.requiredElements ?? [],
    requiredElementAliases: (question as { requiredElementAliases?: Record<string, string[]> })?.requiredElementAliases,
  })

  // Dialogue missions do not run ETRI pronunciation evaluation — no real WAV audio available.
  // A mock result is used so the result page shows a quiet notice rather than an error card.
  const pronunciationResult: PronunciationResult = {
    normalizedScore: 0,
    wordScores: [],
    feedback: '대화형 미션 평가에서는 발음평가 API가 별도 적용되지 않습니다.',
    providerName: 'mock',
    providerVersion: '1.0.0',
    latencyMs: 0,
  }

  const llmEvalRaw = await llmEvalPromise

  // Log provider event for LLM eval
  try {
    if (llmEvalRaw.status === 'success') {
      await logProviderEvent({
        provider: llmEvalRaw.providerName,
        feature: 'llm-eval',
        status: 'success',
        latencyMs: llmEvalRaw.latencyMs,
        questionId,
        model: process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini',
        metadata: { dialogueMode: true, achievementRate, achievedCount, totalGoals },
      })
    } else {
      const reason =
        configuredProvider === 'openai' && !process.env.OPENAI_API_KEY
          ? 'no_api_key'
          : 'mock_configured'
      await logProviderEvent({
        provider: 'mock',
        feature: 'llm-eval',
        status: 'fallback',
        latencyMs: llmEvalRaw.latencyMs,
        questionId,
        metadata: { reason, configuredProvider, dialogueMode: true },
      })
    }
  } catch (logErr) {
    console.warn('[provider_events] dialogue llm-eval log failed:', logErr)
  }

  // Adjust task_completion_score and overall_score based on mission achievement
  const llmDetail = { ...llmEvalRaw.detail }
  if (totalGoals > 0) {
    const goalRatio = achievedCount / totalGoals

    // Task score: mission bonus first
    llmDetail.task_completion_score = Math.max(
      llmDetail.task_completion_score,
      Math.round(achievementRate * 0.9),
    )

    // q4 minimum overall floors based on goal achievement ratio
    if (goalRatio >= 1.0) {
      llmDetail.task_completion_score = Math.max(llmDetail.task_completion_score, 88)
      llmDetail.overall_score = Math.max(llmDetail.overall_score, 85)
    } else if (goalRatio >= 0.75) {
      llmDetail.task_completion_score = Math.max(llmDetail.task_completion_score, 80)
      llmDetail.overall_score = Math.max(llmDetail.overall_score, 75)
    } else if (goalRatio >= 0.5) {
      llmDetail.task_completion_score = Math.max(llmDetail.task_completion_score, 65)
      llmDetail.overall_score = Math.max(llmDetail.overall_score, 60)
    } else if (goalRatio >= 0.25) {
      llmDetail.task_completion_score = Math.max(llmDetail.task_completion_score, 50)
      llmDetail.overall_score = Math.max(llmDetail.overall_score, 45)
    }

    // Re-derive grade from floored overall
    const s = llmDetail.overall_score
    llmDetail.grade = s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F'

    // Goal-aware strengths and improvements
    const achievedGoals = goalResults.filter((g) => g.achieved)
    const unachievedGoals = goalResults.filter((g) => !g.achieved)

    if (achievedGoals.length > 0) {
      llmDetail.strengths = achievedGoals.map((g) => `"${g.labelKo}" 달성`)
    }

    if (achievedCount >= totalGoals) {
      llmDetail.improvements = ['주문 표현을 더 또렷하게 정리해 말하면 더욱 자연스럽습니다.']
      llmDetail.learner_feedback_ko = '모든 미션 목표를 달성했습니다! 대화를 자연스럽게 이어나갔습니다.'
      llmDetail.learner_feedback_simple = '훌륭해요! 모든 목표 달성!'
    } else if (unachievedGoals.length > 0) {
      llmDetail.improvements = unachievedGoals.map((g) => `"${g.labelKo}"을(를) 말하지 않았습니다. 다음에는 꼭 포함해 보세요.`)
      llmDetail.learner_feedback_ko = achievedCount >= Math.ceil(totalGoals * 0.75)
        ? '미션 목표를 대부분 달성했습니다! 나머지 목표도 함께 연습해 보세요.'
        : achievedCount >= Math.ceil(totalGoals * 0.5)
          ? '절반 이상의 미션 목표를 달성했습니다. 빠진 부분을 보충하면 더 좋아질 거예요.'
          : '미션 목표를 더 포함해 말하는 연습을 해 보세요. 천천히 순서대로 말하면 도움이 됩니다.'
      llmDetail.learner_feedback_simple = achievedCount > 0 ? '잘 했어요! 더 연습해요.' : '다시 해 봐요. 순서대로 말해 보세요.'
    }

    // Append mission summary to teacher_note
    llmDetail.teacher_note = `[대화형 미션 평가]\n미션 달성률: ${achievementRate}% (${achievedCount}/${totalGoals})\n${missionSummary}\n\n${llmDetail.teacher_note ?? ''}`
    if (!llmDetail.corrected_answer) {
      llmDetail.corrected_answer = (question as { modelAnswer?: string })?.modelAnswer ?? ''
    }
  }

  // 하이브리드 점수가 있으면 전체 점수를 LLM 정량 60 + 정성 40으로 덮어쓴다 (rule-based floor보다 우선).
  if (hybridResult.hybridScore && hybridResult.qualitative) {
    const h = hybridResult.hybridScore
    llmDetail.overall_score = h.total
    // task_completion_score는 미션 달성도(정량) 비율을 100점 스케일로 표시
    llmDetail.task_completion_score =
      h.quantitativeMax > 0 ? Math.round((h.quantitativeRaw / h.quantitativeMax) * 100) : 0
    llmDetail.fluency_score = hybridResult.qualitative.naturalness
    llmDetail.grammar_score = hybridResult.qualitative.koreanAccuracy
    // grade 재산출
    const s = llmDetail.overall_score
    llmDetail.grade = s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F'
    if (hybridResult.qualitative.feedback) {
      llmDetail.learner_feedback_ko = hybridResult.qualitative.feedback
    }
    llmDetail.teacher_note = `${llmDetail.teacher_note ?? ''}\n[하이브리드 점수] 정량 ${h.quantitativeScore}/60 + 정성 ${h.qualitativeScore}/40 = ${h.total}/100\n자연스러움 ${h.qualitativeBreakdown.naturalness} · 정확성 ${h.qualitativeBreakdown.koreanAccuracy} · 응답성 ${h.qualitativeBreakdown.responsiveness}`
  }

  const llmEvalResult = detailToLLMEvalResult(
    llmDetail,
    llmEvalRaw.providerName,
    llmEvalRaw.latencyMs,
  )

  const submissionId = `mock-${questionId}-${Date.now()}`

  const record = {
    submissionId,
    questionId,
    questionSetId,
    submittedAt: new Date().toISOString(),
    sttResult,
    llmEvalResult,
    pronunciationResult,
    speakingEvalDetail: llmDetail,
    audioUrl: null,
    meta: {
      hasRecording: true,
      recordingDurationSec: studentTurns.reduce((s, t) => s + (t.audioDurationSec ?? 0), 0),
      dialogueTurns: turns.length,
      achievedMissionGoals: achievedCount,
      totalMissionGoals: totalGoals,
      goalResults: goalResults.map((g) => ({
        goalIndex: g.goalIndex,
        labelKo: g.labelKo,
        achieved: g.achieved,
      })),
      dialogueHybridScore: hybridResult.hybridScore ?? undefined,
      dialogueEvalSource: hybridResult.source,
      dialogueConversationProvider,
    },
  }

  saveSpeakingEval(record)

  if (attemptId) {
    saveAttemptSubmission(attemptId, questionSetId, questionId, submissionId)
  }

  if (process.env.REPOSITORY_PROVIDER === 'supabase') {
    try {
      const evalRepo = getEvaluationRepository()
      await evalRepo.saveSpeakingEvalRecord(record)
    } catch (err) {
      console.error('[submitDialogue] Supabase persistence failed:', err)
    }
  }

  return { submissionId }
}
