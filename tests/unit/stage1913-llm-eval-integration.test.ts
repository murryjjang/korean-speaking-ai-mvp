// v1.1 단계 19.13 [페이즈 1·2]: mock 폴백에서도 발음/pause 컨텍스트가
// improvements와 raw_provider 메타에 반영되는지 검증.

import { describe, it, expect, beforeEach } from 'vitest'
import { evaluateSpeakingDetail, _resetEvalBootLogForTests, FEEDBACK_INPUTS_VERSION } from '@/src/providers/llm-eval'

describe('단계 19.13 — LLM eval 통합', () => {
  beforeEach(() => {
    _resetEvalBootLogForTests()
    delete process.env.LLM_EVAL_PROVIDER
    delete process.env.OPENAI_API_KEY
  })

  it('pronunciationContext.weakWords가 있으면 mock improvements 첫 항목이 단어를 언급한다', async () => {
    const r = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 학교에 갑니다. 한국어를 공부합니다.',
      rubricId: 'rubric-speaking-01',
      questionId: 'q-001',
      questionType: 'qt-self-intro',
      pronunciationContext: {
        overallAccuracy: 72,
        fluencyScore: 65,
        weakWords: [
          { word: '학교', score: 55, errorType: 'Mispronunciation' },
          { word: '공부합니다', score: 60, errorType: 'None' },
        ],
      },
    })
    expect(r.providerName).toBe('mock')
    expect(r.detail.improvements.length).toBeGreaterThan(0)
    expect(r.detail.improvements[0]).toContain('학교')
    expect(r.detail.improvements[0]).toMatch(/발음|또박/)
  })

  it('speechFlowContext.longPauseCount≥2면 mock improvements에 발화 흐름 안내가 포함된다', async () => {
    const r = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 한국 음식을 좋아합니다.',
      rubricId: 'rubric-speaking-01',
      questionId: 'q-001',
      questionType: 'qt-self-intro',
      speechFlowContext: {
        totalDurationMs: 8000,
        longPauseCount: 2,
        shortPauseCount: 1,
        longPauses: [
          { afterWord: '한국', gapMs: 2100 },
          { afterWord: '음식을', gapMs: 1700 },
        ],
        shortPauses: [{ afterWord: '저는', gapMs: 900 }],
      },
    })
    const improvementsText = r.detail.improvements.join(' ')
    expect(improvementsText).toMatch(/한국|멈춤|이어 말/)
  })

  it('컨텍스트가 있으면 raw_provider.feedback_inputs_version이 stage19.13으로 표시된다', async () => {
    const r = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 학생입니다.',
      rubricId: 'rubric-speaking-01',
      questionId: 'q-001',
      pronunciationContext: { overallAccuracy: 88 },
    })
    const raw = r.detail.raw_provider as Record<string, unknown>
    expect(raw.feedback_inputs_version).toBe(FEEDBACK_INPUTS_VERSION)
    expect(raw.pronunciation_context_attached).toBe(true)
    expect(raw.speech_flow_context_attached).toBe(false)
  })

  it('컨텍스트가 없으면 raw_provider.feedback_inputs_version은 첨부되지 않는다', async () => {
    const r = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 학생입니다.',
      rubricId: 'rubric-speaking-01',
      questionId: 'q-001',
    })
    const raw = (r.detail.raw_provider ?? {}) as Record<string, unknown>
    expect(raw.feedback_inputs_version).toBeUndefined()
  })
})
