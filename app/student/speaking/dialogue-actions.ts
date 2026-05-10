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

// 23-i 추가-1: 학습자 발화 자연스러움 교정 일괄 생성. q4 결과 화면 inline diff 표시용.
// OPENAI_API_KEY 없거나 실패 시 빈 Map 반환 — 결과 화면에서 교정 표시는 생략된다.
type CorrectionEntry = { correctedText: string; correctionReason: string }

function dialogueCorrectionWordMatchRatio(original: string, corrected: string): number {
  const tokenize = (s: string) =>
    s.replace(/[.,!?。、·"'""''\s]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  const a = tokenize(original)
  const b = tokenize(corrected)
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let matchedA = 0
  for (const w of b) if (setA.has(w)) matchedA++
  let matchedB = 0
  for (const w of a) if (setB.has(w)) matchedB++
  return Math.min(matchedA / b.length, matchedB / a.length)
}

async function generateDialogueCorrections(
  studentTurns: DialogueTurn[],
): Promise<Map<string, CorrectionEntry>> {
  const result = new Map<string, CorrectionEntry>()
  if (studentTurns.length === 0) return result
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return result

  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const model =
      process.env.OPENAI_DIALOGUE_CORRECTION_MODEL
      ?? process.env.OPENAI_FREE_CONVERSATION_MODEL
      ?? process.env.OPENAI_DIALOGUE_MODEL
      ?? process.env.OPENAI_EVAL_MODEL
      ?? 'gpt-4o-mini'

    const numbered = studentTurns.map((t, i) => `${i + 1}. ${t.text}`).join('\n')
    const systemPrompt = `당신은 한국어 학습자 발화의 자연스러움 교정 전문가입니다.

[규칙]
- 한국어 모어 화자에게 자연스러우면 절대 교정하지 마세요. corrected를 original과 100% 동일하게 두고 reason은 "자연스럽게 잘 말씀하셨어요." 같은 짧은 칭찬.
- 작은 차이(조사 1개, 어미 살짝 어색, 띄어쓰기)는 교정하지 않음.
- 명백한 비표준 표현, 명확한 문법 오류, 단어가 잘못된 경우에만 corrected 변경.
- 의심스러우면 교정하지 않음.

[출력 형식]
반드시 다음 JSON만 출력 (다른 텍스트, 코드 블록 금지):
{
  "corrections": [
    { "index": 1, "original": "...", "corrected": "...", "reason": "..." },
    ...
  ]
}
배열 길이는 입력 발화 수와 동일해야 합니다.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `[학습자 발화 ${studentTurns.length}개]\n${numbered}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1500,
      },
      { signal: controller.signal },
    )
    clearTimeout(timeout)

    const raw = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const arr = Array.isArray(parsed.corrections) ? parsed.corrections : []
    for (const entry of arr) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as Record<string, unknown>
      const idx = typeof e.index === 'number' ? e.index - 1 : -1
      const original = typeof e.original === 'string' ? e.original : ''
      const corrected = typeof e.corrected === 'string' ? e.corrected : ''
      const reason = typeof e.reason === 'string' ? e.reason : ''
      if (idx < 0 || idx >= studentTurns.length) continue
      if (!corrected) continue
      const turn = studentTurns[idx]
      // 단어 일치율 ≥ 0.85이고 변경 있으면 LLM 노이즈로 간주 — 교정 표시 누름.
      if (corrected.trim() !== original.trim()) {
        const ratio = dialogueCorrectionWordMatchRatio(original, corrected)
        if (ratio >= 0.85) {
          result.set(turn.id, {
            correctedText: original,
            correctionReason: '자연스럽게 잘 말씀하셨어요.',
          })
          continue
        }
      }
      result.set(turn.id, {
        correctedText: corrected,
        correctionReason: reason || '자연스러운 표현으로 교정했어요.',
      })
    }
  } catch (err) {
    console.warn('[submitDialogue] correction generation failed:', err)
  }
  return result
}

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

  // 23-i 추가-1: 학습자 발화 자연스러움 교정 (병렬, 비차단). 실패해도 제출 흐름 영향 X.
  const correctionsPromise = generateDialogueCorrections(studentTurns)

  // 23-h D-6: 학습자 발화별 Azure PA 점수가 있으면 평균을 종합 발음 점수로 사용.
  // 없으면 종전과 같이 안내성 mock 결과로 폴백.
  const studentPronScores = turns
    .filter((t) => t.role === 'student' && typeof t.pronScore === 'number')
    .map((t) => t.pronScore as number)
  const pronunciationResult: PronunciationResult =
    studentPronScores.length > 0
      ? {
          normalizedScore: Math.round(
            studentPronScores.reduce((a, b) => a + b, 0) / studentPronScores.length,
          ),
          wordScores: [],
          feedback: 'Azure Speech 기반 발음 평가 — 학습자 발화별 점수의 평균입니다.',
          providerName: 'azure',
          providerVersion: '1.0.0',
          latencyMs: 0,
        }
      : {
          normalizedScore: 0,
          wordScores: [],
          feedback: '대화형 미션 평가에서는 발음평가 API가 별도 적용되지 않습니다.',
          providerName: 'mock',
          providerVersion: '1.0.0',
          latencyMs: 0,
        }

  const llmEvalRaw = await llmEvalPromise
  const corrections = await correctionsPromise

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

    // 단일 진실 출처: 결과 화면의 "포함한 요소"/"빠진 요소" 표기를 상단 미션 breakdown과 동일하게
    // goalResults(하이브리드 미션 판정)로 통일. 두 LLM 호출 결과 불일치 방지.
    llmDetail.required_elements_found = achievedGoals.map((g) => g.labelKo)
    llmDetail.missing_elements = unachievedGoals.map((g) => g.labelKo)

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
      // 23-h D-5 + 23-i 추가-1: 결과 화면 화자별 말풍선 렌더링용 turn 기록
      // (학습자 turn에 LLM 자연스러움 교정 결과 부착)
      dialogueTurnRecords: turns.map((t) => {
        const corr = t.role === 'student' ? corrections.get(t.id) : undefined
        return {
          role: t.role,
          text: t.text,
          pronScore: typeof t.pronScore === 'number' ? t.pronScore : undefined,
          correctedText: corr?.correctedText,
          correctionReason: corr?.correctionReason,
        }
      }),
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
