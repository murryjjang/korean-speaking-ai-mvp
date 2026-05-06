'use server'

import { evaluateSpeakingDetail, detailToLLMEvalResult } from '@/src/providers/llm-eval'
import { getPronunciationProvider } from '@/src/providers/pronunciation'
import { saveSpeakingEval } from '@/src/lib/mock/speaking-store'
import { getEvaluationRepository } from '@/src/lib/repositories'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'
import questionsJson from '@/src/content/questions.json'
import type { ProviderName } from '@/src/types/providers'
import type { DialogueTurn, MissionGoalResult } from '@/src/types/dialogue'
import { generateAggregatedTranscript } from '@/src/lib/dialogue-mission'

export interface DialogueSubmitMeta {
  turns: DialogueTurn[]
  goalResults: MissionGoalResult[]
}

export async function submitDialogue(
  questionId: string,
  questionSetId: string,
  meta: DialogueSubmitMeta,
): Promise<{ submissionId: string }> {
  const { turns, goalResults } = meta

  // Guard: must have at least one valid student turn
  const studentTurns = turns.filter((t) => t.role === 'student' && t.status === 'completed')
  if (studentTurns.length === 0) {
    throw new Error('no_valid_student_turns')
  }

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

  // Compute mission achievement for LLM context
  const achievedCount = goalResults.filter((g) => g.achieved).length
  const totalGoals = goalResults.length
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

  const pronunciationPromise = getPronunciationProvider().evaluate(
    new Blob([], { type: 'audio/webm' }),
    aggregatedTranscript,
  )

  const [pronunciationResult, llmEvalRaw] = await Promise.all([pronunciationPromise, llmEvalPromise])

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

  // Adjust task_completion_score based on mission achievement
  const llmDetail = { ...llmEvalRaw.detail }
  if (totalGoals > 0) {
    const missionBonus = achievementRate
    llmDetail.task_completion_score = Math.max(
      llmDetail.task_completion_score,
      Math.round(missionBonus * 0.9),
    )
    llmDetail.overall_score = Math.round(
      (llmDetail.task_completion_score +
        llmDetail.fluency_score +
        llmDetail.grammar_score +
        llmDetail.vocabulary_score) /
        4,
    )
    // Append mission summary to teacher_note
    llmDetail.teacher_note = `[대화형 미션 평가]\n미션 달성률: ${achievementRate}% (${achievedCount}/${totalGoals})\n${missionSummary}\n\n${llmDetail.teacher_note ?? ''}`
    // Append mission goals to corrected_answer
    if (!llmDetail.corrected_answer) {
      llmDetail.corrected_answer = (question as { modelAnswer?: string })?.modelAnswer ?? ''
    }
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
    },
  }

  saveSpeakingEval(record)

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
