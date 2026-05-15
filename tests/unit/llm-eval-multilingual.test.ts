// v1.1 단계 27: LLM 평가 mock·OpenAI 응답 형식 다국어 검증.
//
// LLM_EVAL_PROVIDER가 'mock'일 때 motherTongue가 외국어이면
// learner_feedback_multilingual이 채워지는지 확인. 실제 OpenAI 호출은
// 다른 테스트에서 fetch/SDK 모킹으로 검증한다.

import { describe, expect, it, beforeEach, vi } from 'vitest'

import { evaluateSpeakingDetail } from '@/src/providers/llm-eval'

describe('evaluateSpeakingDetail — multilingual mock', () => {
  beforeEach(() => {
    vi.stubEnv('LLM_EVAL_PROVIDER', 'mock')
    vi.stubEnv('OPENAI_API_KEY', '')
  })

  it('motherTongue 미지정 → multilingual 없음 (회귀 보호)', async () => {
    const { detail, providerName } = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 한국어를 배우고 있는 학생입니다. 매일 한국어 공부를 합니다.',
      rubricId: 'rubric-speaking-01',
    })
    expect(providerName).toBe('mock')
    expect(detail.learner_feedback_ko).toBeTruthy()
    expect(detail.learner_feedback_multilingual).toBeUndefined()
  })

  it('motherTongue="ko" → multilingual 없음 (한국어 모어 화자)', async () => {
    const { detail } = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 한국어를 배우고 있는 학생입니다. 매일 한국어 공부를 합니다.',
      rubricId: 'rubric-speaking-01',
      motherTongue: 'ko',
    })
    expect(detail.learner_feedback_multilingual).toBeUndefined()
  })

  it('motherTongue="en" → multilingual 객체 4언어 모두 채움', async () => {
    const { detail } = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 한국어를 배우고 있는 학생입니다. 매일 한국어 공부를 합니다.',
      rubricId: 'rubric-speaking-01',
      motherTongue: 'en',
    })
    const m = detail.learner_feedback_multilingual
    expect(m).toBeDefined()
    expect(m?.ko).toBeTruthy()
    expect(m?.en).toBeTruthy()
    expect(m?.vi).toBeTruthy()
    expect(m?.ar).toBeTruthy()
  })

  it('motherTongue="vi" → multilingual 객체 ko는 mock 한국어 피드백을 우선 사용', async () => {
    const { detail } = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 한국어를 배우고 있는 학생입니다. 매일 한국어 공부를 합니다.',
      rubricId: 'rubric-speaking-01',
      motherTongue: 'vi',
    })
    expect(detail.learner_feedback_multilingual?.ko).toBe(detail.learner_feedback_ko)
  })

  it('motherTongue="ar" → multilingual 객체, ar에 아랍어 텍스트 포함', async () => {
    const { detail } = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 한국어를 배우고 있는 학생입니다. 매일 한국어 공부를 합니다.',
      rubricId: 'rubric-speaking-01',
      motherTongue: 'ar',
    })
    expect(detail.learner_feedback_multilingual?.ar).toMatch(/[؀-ۿ]/)
  })

  it('motherTongue="other" → multilingual 없음 (외국어 코드 아님)', async () => {
    const { detail } = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 저는 한국어를 배우고 있는 학생입니다. 매일 한국어 공부를 합니다.',
      rubricId: 'rubric-speaking-01',
      motherTongue: 'other',
    })
    expect(detail.learner_feedback_multilingual).toBeUndefined()
  })
})
