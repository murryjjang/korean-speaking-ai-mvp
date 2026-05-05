import { test, expect } from '@playwright/test'

/**
 * API smoke tests — API key 없이도 mock fallback 응답이 반환되는지 확인.
 * 실제 OpenAI/ETRI 외부 API 호출을 강제하지 않음.
 * Supabase 미설정 환경에서도 logProviderEvent가 조용히 skip되므로 정상 동작함.
 */

test.describe('/api/pronunciation smoke', () => {
  test('빈 오디오 + referenceText → mock fallback normalizedScore 반환', async ({
    request,
  }) => {
    const formData = new FormData()
    formData.append('referenceText', '안녕하세요')
    formData.append('questionId', 'q-001')
    // audio 없이 전송 — route에서 빈 Blob으로 처리

    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '안녕하세요',
        questionId: 'q-001',
      },
    })

    expect(res.ok()).toBe(true)

    const body = await res.json()

    // normalizedScore 필드가 숫자로 반환되어야 함
    expect(typeof body.normalizedScore).toBe('number')
    expect(body.normalizedScore).toBeGreaterThanOrEqual(0)
    expect(body.normalizedScore).toBeLessThanOrEqual(100)

    // providerName 필드 존재 확인
    expect(typeof body.providerName).toBe('string')
  })

  test('잘못된 form data → 400 또는 mock fallback 반환', async ({ request }) => {
    // Content-Type을 JSON으로 잘못 전송
    const res = await request.post('/api/pronunciation', {
      data: '{"bad":"data"}',
      headers: { 'Content-Type': 'application/json' },
    })

    // 400이거나, route가 gracefully fallback해서 200으로 normalizedScore 반환
    expect([200, 400]).toContain(res.status())
  })
})

test.describe('/api/evaluate-speaking smoke', () => {
  test('transcript + pronunciationResult → mock fallback detail 반환', async ({
    request,
  }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: {
        questionId: 'q-001',
        transcript: '안녕하세요. 저는 홍길동입니다.',
        pronunciationResult: {
          normalizedScore: 72,
          feedback: '발음이 전반적으로 양호합니다.',
        },
        referenceText: '자신을 소개해 보세요.',
        rubricId: 'rubric-speaking-01',
      },
    })

    expect(res.ok()).toBe(true)

    const body = await res.json()

    // LLM eval detail 필드 확인
    expect(typeof body.overall_score).toBe('number')
    expect(body.overall_score).toBeGreaterThanOrEqual(0)
    expect(body.overall_score).toBeLessThanOrEqual(100)

    // providerName 필드 존재 확인
    expect(typeof body.providerName).toBe('string')

    // status 필드: 'success' 또는 'fallback'
    expect(['success', 'fallback']).toContain(body.status)
  })

  test('빈 body → mock fallback 반환 (오류 없음)', async ({ request }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: {},
    })

    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(typeof body.overall_score).toBe('number')
  })

  test('파싱 불가 바디 → 400 반환', async ({ request }) => {
    // Buffer로 명시적 invalid JSON 바이트 전송
    const res = await request.post('/api/evaluate-speaking', {
      data: Buffer.from('{bad json !!!'),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_json')
  })
})

test.describe('/api/health smoke', () => {
  test('GET /api/health → 200', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBe(true)
  })
})

test.describe('/api/tts smoke', () => {
  test('API key 없이도 fallback JSON 반환', async ({ request }) => {
    const res = await request.post('/api/tts', {
      data: {
        text: '자신을 소개해 보세요.',
        questionId: 'q-001',
        purpose: 'question',
      },
    })

    expect(res.ok()).toBe(true)

    const body = await res.json()

    // 응답 구조 확인
    expect(typeof body.ok).toBe('boolean')
    expect(typeof body.providerName).toBe('string')
    expect(['success', 'fallback', 'error']).toContain(body.status)

    // API key 없는 환경에서는 fallbackText가 반환되어야 함
    if (body.status === 'fallback') {
      expect(typeof body.fallbackText).toBe('string')
      expect(body.fallbackText.length).toBeGreaterThan(0)
    }

    // audioBase64가 있으면 문자열이어야 함
    if (body.audioBase64 !== undefined) {
      expect(typeof body.audioBase64).toBe('string')
    }
  })

  test('text 없이 전송 → 400 반환', async ({ request }) => {
    const res = await request.post('/api/tts', { data: {} })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('text_required')
  })

  test('파싱 불가 바디 → 400 반환', async ({ request }) => {
    const res = await request.post('/api/tts', {
      data: Buffer.from('{bad json'),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_json')
  })
})
