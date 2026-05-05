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

  test('corrected_answer는 transcript를 복사하지 않음', async ({ request }) => {
    const transcript = '안녕하세요. 저는 홍길동입니다. 베트남에서 왔습니다.'
    const res = await request.post('/api/evaluate-speaking', {
      data: {
        questionId: 'q-001',
        transcript,
        referenceText: '자신을 소개해 보세요. 이름, 나라, 한국어를 배우는 이유를 포함해서 이야기해 주세요.',
        rubricId: 'rubric-speaking-01',
      },
    })

    expect(res.ok()).toBe(true)
    const body = await res.json()

    // corrected_answer는 transcript와 달라야 함
    expect(body.corrected_answer).not.toBe(transcript)
    // corrected_answer는 빈 문자열이거나 독립적인 모범 표현이어야 함
    if (body.corrected_answer !== '') {
      expect(body.corrected_answer).not.toContain('홍길동')
    }
  })

  test('required_elements_found / missing_elements 배열이 응답에 포함됨', async ({ request }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: {
        questionId: 'q-001',
        transcript: '안녕하세요. 저는 김민수입니다. 베트남에서 왔습니다. 한국어를 배우는 이유는 한국 사람들과 이야기하고 싶기 때문입니다.',
        referenceText: '자신을 소개해 보세요.',
        rubricId: 'rubric-speaking-01',
      },
    })

    expect(res.ok()).toBe(true)
    const body = await res.json()

    expect(Array.isArray(body.required_elements_found)).toBe(true)
    expect(Array.isArray(body.missing_elements)).toBe(true)
    expect(Array.isArray(body.evidence)).toBe(true)
    // grade 필드 확인
    expect(['A', 'B', 'C', 'D', 'F']).toContain(body.grade)
  })

  test('과제 무관 transcript (뉴스 앵커) → task_completion_score 낮음 + needs_teacher_review', async ({
    request,
  }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: {
        questionId: 'q-003',
        transcript: 'MBC 뉴스 이덕영입니다. 오늘의 주요 뉴스를 전해드리겠습니다.',
        referenceText: '그림을 보고 어떤 상황인지 설명해 보세요.',
        rubricId: 'rubric-speaking-01',
      },
    })

    expect(res.ok()).toBe(true)
    const body = await res.json()

    // 과제 무관 발화: task_completion_score가 20 이하여야 함
    expect(body.task_completion_score).toBeLessThanOrEqual(20)
    // needs_teacher_review: true여야 함
    expect(body.needs_teacher_review).toBe(true)
    // corrected_answer는 transcript를 복사하면 안 됨
    expect(body.corrected_answer).not.toContain('이덕영')
    expect(body.corrected_answer).not.toContain('MBC')
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

test.describe('/api/stt smoke', () => {
  test('빈 오디오(0 bytes) → no-speech 응답, mock transcript 생성 안 함', async ({
    request,
  }) => {
    const res = await request.post('/api/stt', {
      multipart: {
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.alloc(0),
        },
        questionId: 'q-003',
      },
    })

    expect(res.ok()).toBe(true)

    const body = await res.json()

    // 빈 오디오에서 임의 transcript가 생성되면 안 됨
    expect(body.transcript).toBe('')
    expect(body.providerName).toBe('no-speech')
    expect(body.warning).toBe('audio_too_short')
    expect(body.confidence).toBe(0)
  })

  test('너무 작은 오디오(< 3000 bytes) → no-speech 응답', async ({ request }) => {
    // 1000 bytes of zeroes — too small to be real speech
    const res = await request.post('/api/stt', {
      multipart: {
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.alloc(1000, 0),
        },
        questionId: 'q-001',
      },
    })

    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.transcript).toBe('')
    expect(body.providerName).toBe('no-speech')
  })

  test('audio 없이 전송 → no-speech 응답 (0 bytes 처리와 동일)', async ({ request }) => {
    const res = await request.post('/api/stt', {
      multipart: {
        questionId: 'q-001',
        // audio 필드 없음
      },
    })

    expect(res.ok()).toBe(true)

    const body = await res.json()
    // audio 없이 전송하면 빈 blob으로 처리 → no-speech
    expect(body.transcript).toBe('')
    expect(body.providerName).toBe('no-speech')
  })
})

test.describe('/api/stt error-fallback smoke', () => {
  test('STT error-fallback은 빈 transcript 반환 (mock transcript 생성 금지)', async ({
    request,
  }) => {
    // The route's error path now returns transcript: '' — verify the shape is correct
    // by checking the no-speech path (always triggered for < 3000 bytes)
    const res = await request.post('/api/stt', {
      multipart: {
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.alloc(500, 0),
        },
        questionId: 'q-002',
      },
    })

    expect(res.ok()).toBe(true)

    const body = await res.json()
    // Must not return a fabricated transcript
    expect(body.transcript).toBe('')
    expect(body.confidence).toBe(0)
    // providerName must be 'no-speech' (not 'mock' with a fake sentence)
    expect(body.providerName).toBe('no-speech')
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
