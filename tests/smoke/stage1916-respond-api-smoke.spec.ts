// v1.1 단계 19.16 [페이즈 3]: /api/conversation/free/respond API 흐름 검증.
// v1.1 단계 19.17: feedback_inputs_version 'stage19.16' → 'stage19.17'로 갱신.
//
// pronunciationContext / speechFlowContext를 함께 보냈을 때:
//  1) 응답에 feedback_inputs_version='stage19.17'
//  2) pronunciation_included / speech_flow_included가 정확히 채워짐
//
// 단계 19.15 흡수 검증의 핵심 — 자동화 가능한 API 계약 부분.
// 실제 LLM 응답 품질(친구 톤 유지·점수 언급 금지 등)은 사람 시연으로 검증.

import { test, expect } from '@playwright/test'

const URL = '/api/conversation/free/respond'

test.describe('/api/conversation/free/respond — 단계 19.16 메타', () => {
  test('pronunciationContext 미전달 → pronunciation_included=false', async ({ request }) => {
    const res = await request.post(URL, {
      data: {
        topic: '한국 음식 추천',
        personaId: 'friend_casual',
        turns: [],
        latestStudentText: '저는 한국 음식을 좋아해요',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.feedback_inputs_version).toBe('stage19.17')
    expect(body.pronunciation_included).toBe(false)
    expect(body.speech_flow_included).toBe(false)
    // npc_response 필드는 항상 존재
    expect(typeof body.npc_response).toBe('string')
    expect(body.npc_response.length).toBeGreaterThan(0)
  })

  test('pronunciationContext 정상 전달 → pronunciation_included=true', async ({ request }) => {
    const res = await request.post(URL, {
      data: {
        topic: '한국 음식 추천',
        personaId: 'friend_casual',
        turns: [],
        latestStudentText: '음식 좋아요',
        pronunciationContext: {
          overallAccuracy: 45,
          fluencyScore: 55,
          completenessScore: 70,
          weakWords: [{ word: '음식', score: 30, errorType: 'Mispronunciation' }],
        },
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.pronunciation_included).toBe(true)
    expect(body.feedback_inputs_version).toBe('stage19.17')
  })

  test('speechFlowContext 정상 전달 → speech_flow_included=true', async ({ request }) => {
    const res = await request.post(URL, {
      data: {
        topic: '한국 음식 추천',
        personaId: 'friend_casual',
        turns: [],
        latestStudentText: '음.. 그.. 한국 음식 좋아요',
        speechFlowContext: {
          longPauses: [{ afterWord: '음', gapMs: 1800 }],
          shortPauses: [{ afterWord: '그', gapMs: 1000 }],
          longPauseCount: 1,
          shortPauseCount: 1,
        },
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.speech_flow_included).toBe(true)
  })

  test('빈 weakWords/pauses → 둘 다 false (시스템 프롬프트 보호)', async ({ request }) => {
    const res = await request.post(URL, {
      data: {
        topic: '한국 음식 추천',
        personaId: 'friend_casual',
        turns: [],
        latestStudentText: '음식 좋아요',
        // 모든 필드 빈/누락 → 빈 객체 → parser가 undefined로 떨어뜨림
        pronunciationContext: {},
        speechFlowContext: { longPauses: [], shortPauses: [] },
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.pronunciation_included).toBe(false)
    expect(body.speech_flow_included).toBe(false)
  })

  test('잘못된 형태 입력 → 안전 폴백 (라우트 크래시 없음)', async ({ request }) => {
    const res = await request.post(URL, {
      data: {
        topic: '한국 음식 추천',
        personaId: 'friend_casual',
        turns: [],
        latestStudentText: '음식 좋아요',
        pronunciationContext: { weakWords: 'not-an-array', overallAccuracy: 'foo' },
        speechFlowContext: { longPauses: 'invalid' },
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // 잘못된 형태는 parser가 모두 거른다 → false
    expect(body.pronunciation_included).toBe(false)
    expect(body.speech_flow_included).toBe(false)
    expect(typeof body.npc_response).toBe('string')
  })

  test('missing_topic → 400 + 메타 없음', async ({ request }) => {
    const res = await request.post(URL, {
      data: {
        personaId: 'friend_casual',
        turns: [],
        latestStudentText: '음식 좋아요',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('missing_student_text → 400', async ({ request }) => {
    const res = await request.post(URL, {
      data: {
        topic: '한국 음식 추천',
        personaId: 'friend_casual',
        turns: [],
      },
    })
    expect(res.status()).toBe(400)
  })
})
