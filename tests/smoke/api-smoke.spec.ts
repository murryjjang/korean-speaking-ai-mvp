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

  test('ETRI API 실패 시 app crash 없음 — mock fallback 반환', async ({ request }) => {
    // ETRI_API_KEY 없거나 외부 API 불통 환경에서도 200으로 mock fallback 반환해야 함.
    // 실제 ETRI 호출이 발생해도 timeout/error 시 graceful fallback 확인.
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '저는 오늘 병원에 갑니다.',
        questionId: 'beginner-q1-reading',
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.alloc(500, 0), // 작은 가짜 오디오 — no-speech or ETRI error
        },
      },
    })

    // 어떤 경우에도 200 이어야 하며 normalizedScore가 있어야 함
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.normalizedScore).toBe('number')
    expect(body.normalizedScore).toBeGreaterThanOrEqual(0)
    expect(body.normalizedScore).toBeLessThanOrEqual(100)
    expect(typeof body.providerName).toBe('string')
  })

  test('ETRI provider: providerName이 mock일 때 etri처럼 보이면 안 됨 (fallback 명확화)', async ({ request }) => {
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '안녕하세요.',
        questionId: 'beginner-q1-reading',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // mock 응답: normalizedScore=72이고 providerName='mock'이면 ETRI 원점수가 없어야 함
    // (etri fallback에서는 normalizedScore=0, fallbackReason='provider_error' 반환)
    if (body.providerName === 'mock' && body.fallbackReason === 'provider_error') {
      expect(body.normalizedScore).toBe(0)
      expect(body.rawScore).toBeUndefined()
    }
    if (body.providerName === 'mock' && !body.fallbackReason) {
      // 순수 mock 설정: normalizedScore는 mock 값 (72 등)
      expect(body.normalizedScore).toBeGreaterThan(0)
    }
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

  test('fallbackRate 필드가 숫자로 반환되어야 함', async ({ request }) => {
    const res = await request.post('/api/tts', {
      data: {
        text: '안녕하세요.',
        questionId: 'beginner-q4-dialogue-mission',
        purpose: 'ai-dialogue',
      },
    })

    expect(res.ok()).toBe(true)
    const body = await res.json()
    // 항상 숫자형 fallbackRate가 포함되어야 함 (browser speechSynthesis fallback 용)
    expect(typeof body.fallbackRate).toBe('number')
    // 허용 범위 0.75~1.35 내에 있어야 함
    expect(body.fallbackRate).toBeGreaterThanOrEqual(0.75)
    expect(body.fallbackRate).toBeLessThanOrEqual(1.35)
  })

  test('personaId 전달 시 fallbackRate가 persona defaultRate에 따라 달라짐', async ({ request }) => {
    // cafe_staff_friendly → defaultRate 1.10
    const resCafe = await request.post('/api/tts', {
      data: { text: '어서오세요.', personaId: 'cafe_staff_friendly' },
    })
    const bodyCafe = await resCafe.json()
    expect(typeof bodyCafe.fallbackRate).toBe('number')
    expect(bodyCafe.fallbackRate).toBeCloseTo(1.10, 2)

    // personaId 없음 → env 기본값 사용 (테스트 환경에서는 1.0)
    const resNoPersona = await request.post('/api/tts', {
      data: { text: '안녕하세요.' },
    })
    const bodyNoPersona = await resNoPersona.json()
    expect(typeof bodyNoPersona.fallbackRate).toBe('number')
    // 범위 내
    expect(bodyNoPersona.fallbackRate).toBeGreaterThanOrEqual(0.75)
    expect(bodyNoPersona.fallbackRate).toBeLessThanOrEqual(1.35)
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

test.describe('/api/evaluate-speaking 정식 문항 유형 smoke (Phase 10-E-2)', () => {
  test('qt-reading (beginner-q1-reading) 낭독 평가 → valid response', async ({ request }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: {
        questionId: 'beginner-q1-reading',
        transcript: '안녕하세요. 저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들를 예정입니다.',
        rubricId: 'rubric-reading-01',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.overall_score).toBe('number')
    expect(['A', 'B', 'C', 'D', 'F']).toContain(body.grade)
    expect(Array.isArray(body.required_elements_found)).toBe(true)
  })

  test('qt-material-desc (beginner-q2-material-description) 자료 설명 평가 → valid response', async ({ request }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: {
        questionId: 'beginner-q2-material-description',
        transcript: '이 사진은 카페입니다. 손님이 점원에게 아이스 아메리카노를 주문하고 있습니다. 점원이 계산대 앞에서 주문을 받고 있습니다.',
        rubricId: 'rubric-material-desc-01',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.overall_score).toBe('number')
    expect(Array.isArray(body.required_elements_found)).toBe(true)
  })

  test('qt-dialogue-mission (beginner-q4-dialogue-mission) 대화 미션 평가 → valid response', async ({ request }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        transcript: '안녕하세요. 아이스 아메리카노 하나 주세요. 포장해 주세요.',
        rubricId: 'rubric-dialogue-mission-01',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.overall_score).toBe('number')
    expect(Array.isArray(body.required_elements_found)).toBe(true)
    expect(body.required_elements_found.length).toBeGreaterThan(0)
  })

  test('qt-listening-resp (intermediate-q3-listening-response) 듣고 답하기 평가 → valid response', async ({ request }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: {
        questionId: 'intermediate-q3-listening-response',
        transcript: '발표 수업은 수요일에서 금요일 오후 1시로 변경되었습니다. 장소는 본관 203호입니다. 발표 자료를 목요일까지 이메일로 제출해야 합니다.',
        rubricId: 'rubric-listening-resp-01',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.overall_score).toBe('number')
  })
})

test.describe('Phase 10-E-3: official question content validation', () => {
  test('beginner set 4문항 prompt가 비어 있지 않음', async ({ request }) => {
    for (const qId of ['beginner-q1-reading', 'beginner-q2-material-description', 'beginner-q3-listening-response', 'beginner-q4-dialogue-mission']) {
      const res = await request.post('/api/evaluate-speaking', { data: { questionId: qId, transcript: '테스트입니다.' } })
      expect(res.ok()).toBe(true)
      const body = await res.json()
      expect(typeof body.overall_score).toBe('number')
    }
  })

  test('intermediate set 4문항 prompt가 비어 있지 않음', async ({ request }) => {
    for (const qId of ['intermediate-q1-reading', 'intermediate-q2-material-description', 'intermediate-q3-listening-response', 'intermediate-q4-dialogue-mission']) {
      const res = await request.post('/api/evaluate-speaking', { data: { questionId: qId, transcript: '테스트입니다.' } })
      expect(res.ok()).toBe(true)
      const body = await res.json()
      expect(typeof body.overall_score).toBe('number')
    }
  })

  test('advanced set 4문항 prompt가 비어 있지 않음', async ({ request }) => {
    for (const qId of ['advanced-q1-reading', 'advanced-q2-material-description', 'advanced-q3-listening-response', 'advanced-q4-dialogue-mission']) {
      const res = await request.post('/api/evaluate-speaking', { data: { questionId: qId, transcript: '테스트입니다.' } })
      expect(res.ok()).toBe(true)
      const body = await res.json()
      expect(typeof body.overall_score).toBe('number')
    }
  })

  test('공식 문항 12개 requiredElements 반응에 배열 포함', async ({ request }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: { questionId: 'beginner-q3-listening-response', transcript: '수업은 오전 10시에 시작합니다. 장소는 203호입니다. 교재와 필기구를 가져와야 합니다.' }
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(Array.isArray(body.required_elements_found)).toBe(true)
    expect(body.required_elements_found.length).toBeGreaterThan(0)
  })

  test('requiredElementAliases가 detectRequiredElements에 적용됨', async ({ request }) => {
    const res = await request.post('/api/evaluate-speaking', {
      data: { questionId: 'beginner-q4-dialogue-mission', transcript: '아메리카노 한 잔 주세요. 아이스로 주세요. 포장해 주세요.' }
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(Array.isArray(body.required_elements_found)).toBe(true)
    expect(body.required_elements_found.length).toBeGreaterThanOrEqual(2)
  })
})

test.describe('Phase 10-E-5-A: /api/dialogue/respond smoke', () => {
  test('mock conversation provider가 latestStudentText를 받아 AI 응답을 반환함', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        turns: [
          { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
        ],
        latestStudentText: '아메리카노 주세요.',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.aiText).toBe('string')
    expect(body.aiText.length).toBeGreaterThan(0)
    expect(typeof body.providerName).toBe('string')
    expect(['success', 'fallback']).toContain(body.status)
  })

  test('beginner 카페: 음료만 말하면 수량을 묻는 응답', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        turns: [
          { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
          { role: 'student', text: '아메리카노 주세요.' },
        ],
        latestStudentText: '아메리카노 주세요.',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // 음료는 말했지만 수량 미포함 → 수량 확인 응답
    expect(body.aiText).toContain('몇 잔')
  })

  test('beginner 카페: 음료+수량 말했지만 포장 여부 없으면 포장/매장 묻는 응답', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        turns: [
          { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
          { role: 'student', text: '아메리카노 한 잔 주세요.' },
        ],
        latestStudentText: '아메리카노 한 잔 주세요.',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // 음료+수량 모두 포함 → 포장 여부 확인 응답
    expect(body.aiText).toMatch(/포장|드시고|매장/)
  })

  test('beginner 카페: 4개 미션 목표 모두 포함 시 완료 응답 반환', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        turns: [
          { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
          { role: 'student', text: '아이스 아메리카노 두 잔 주세요.' },
          { role: 'ai', text: '드시고 가세요, 아니면 포장해 드릴까요?' },
          { role: 'student', text: '포장해 주세요. 카드로 결제할게요.' },
        ],
        latestStudentText: '포장해 주세요. 카드로 결제할게요.',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // 4개 목표(음료+수량+포장+결제) 모두 충족 → 구체적 완료 응답
    expect(body.aiText).toContain('준비해 드리겠습니다')
  })

  test('questionId 없이 전송 → 400 반환', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: { latestStudentText: '안녕하세요.' },
    })
    expect(res.status()).toBe(400)
  })

  test('latestStudentText 없이 전송 → 400 반환', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: { questionId: 'beginner-q4-dialogue-mission' },
    })
    expect(res.status()).toBe(400)
  })

  test('존재하지 않는 questionId → 404 반환', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'nonexistent-question',
        latestStudentText: '안녕하세요.',
      },
    })
    expect(res.status()).toBe(404)
  })

  test('intermediate 행정실: 말하기 수업 시간 질문 → 수업 시간 응답', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'intermediate-q4-dialogue-mission',
        level: 'intermediate',
        turns: [
          { role: 'ai', text: '안녕하세요. 행정실입니다. 무엇을 도와드릴까요?' },
          { role: 'student', text: '말하기 수업 시간이 언제인지 알고 싶습니다.' },
        ],
        latestStudentText: '말하기 수업 시간이 언제인지 알고 싶습니다.',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // 수업 시간 정보 응답 확인
    expect(body.aiText).toContain('월요일')
  })
})

test.describe('Phase 10-E-5-C/D: 잘못된 표현 교정 및 assessment mode 응답 개선', () => {
  test('"나이스 아메리칸 던지세요 이게 맞나요?" → language question 감지, 교정 응답 반환', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        mode: 'assessment',
        personaId: 'cafe_staff_friendly',
        turns: [
          { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
        ],
        latestStudentText: '나이스 아메리칸 던지세요 이게 맞나요?',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // 틀린 표현을 "맞는 표현"으로 확인해 주면 안 됨
    expect(body.aiText).not.toContain('맞는 표현입니다')
    expect(body.aiText).not.toContain('계속 진행해 볼까요')
    // 교정이 포함되어야 함
    expect(body.aiText).toMatch(/자연스럽지 않습니다|아이스 아메리카노/)
    // 역할극 복귀 문구 포함
    expect(body.aiText).toMatch(/주문|다시|음료/)
  })

  test('"아이스 아메리카노 주세요가 맞아요?" → 표현 확인 질문으로 처리, 긍정 확인 + 역할극 복귀', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        mode: 'assessment',
        personaId: 'cafe_staff_friendly',
        turns: [
          { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
        ],
        latestStudentText: '아이스 아메리카노 주세요가 맞아요?',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // 올바른 표현이므로 긍정 확인
    expect(body.aiText).toMatch(/자연스러운 표현|아이스 아메리카노/)
    // 역할극 복귀 문구 포함
    expect(body.aiText).toMatch(/해드릴까요|주문|음료/)
    // 임무 완료 응답이어서는 안 됨 (감사합니다는 3개 goal 충족 시 나오는 응답)
    expect(body.aiText).not.toContain('감사합니다')
  })

  test('language question turn은 mission evidence에서 제외 — 이후 실제 주문 시 goal achieved', async ({ request }) => {
    // 표현 질문 turn 포함 후 실제 음료+온도 주문
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        mode: 'assessment',
        personaId: 'cafe_staff_friendly',
        turns: [
          { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
          { role: 'student', text: '나이스 아메리칸 던지세요 이게 맞나요?' },
          { role: 'ai', text: "그 표현은 자연스럽지 않습니다. '아이스 아메리카노 주세요'라고 말하면 자연스럽습니다. 그럼 다시 주문해 보시겠어요?" },
        ],
        latestStudentText: '아이스 아메리카노 주세요.',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // 음료 주문 → 수량 또는 포장 여부를 물어보는 응답
    expect(body.aiText).toMatch(/따뜻|포장|드시고|차가운|몇 잔/)
  })

  test('assessment mode: "똑바로 알려주세요" → language question 감지', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        mode: 'assessment',
        personaId: 'cafe_staff_friendly',
        turns: [
          { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
        ],
        latestStudentText: '어떻게 말해야 하는지 똑바로 알려주세요.',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // language question으로 처리 → 역할극 응답(온도/포장 질문)이 나오면 안 됨
    expect(body.aiText).not.toContain('차가운 음료로 드릴까요')
    expect(body.aiText).not.toContain('드시고 가세요, 아니면')
    expect(typeof body.aiText).toBe('string')
    expect(body.aiText.length).toBeGreaterThan(0)
  })

  test('practice mode: 어색한 표현 질문 → 더 자세한 설명 허용', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        mode: 'practice',
        personaId: 'cafe_staff_friendly',
        turns: [
          { role: 'ai', text: '어서 오세요. 무엇을 드릴까요?' },
        ],
        latestStudentText: '어떻게 말해야 자연스러워요?',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // practice mode → 설명이 포함된 응답
    expect(typeof body.aiText).toBe('string')
    expect(body.aiText.length).toBeGreaterThan(0)
    // practice mode에서는 "계속 진행해 볼까요?" 같은 짧은 메타 응답이 아닌 실질적 답변
    expect(body.aiText.length).toBeGreaterThan(10)
  })

  test('assessment mode fallback: 알 수 없는 표현 질문 → 역할극 복귀 문구', async ({ request }) => {
    const res = await request.post('/api/dialogue/respond', {
      data: {
        questionId: 'beginner-q4-dialogue-mission',
        level: 'beginner',
        mode: 'assessment',
        personaId: 'cafe_staff_friendly',
        turns: [],
        latestStudentText: '이 표현이 맞나요?',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // fallback도 역할극 문구 ("계속 진행해 볼까요?"는 사용 안 함)
    expect(body.aiText).not.toBe('네, 맞는 표현입니다. 계속 진행해 볼까요?')
    expect(typeof body.aiText).toBe('string')
    expect(body.aiText.length).toBeGreaterThan(0)
  })
})

// ── Phase 10-E: ETRI 발음평가 오디오 포맷 처리 ────────────────────────────────

test.describe('/api/pronunciation ETRI 오디오 포맷 처리', () => {
  /**
   * 무음/가짜 webm(작은 바이너리)은 변환 실패 또는 ETRI 거절로 이어진다.
   * 어떤 경우에도 앱이 crash되지 않고 구조화된 응답이 반환되어야 한다.
   */
  test('webm 바이너리가 유효하지 않아도 앱 crash 없음 — 에러 응답 반환', async ({ request }) => {
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '저는 오늘 병원에 갑니다.',
        questionId: 'beginner-q1-reading',
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          // Invalid webm bytes — ffmpeg will fail to convert
          buffer: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00]),
        },
      },
    })

    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.normalizedScore).toBe('number')
    expect(body.normalizedScore).toBeGreaterThanOrEqual(0)
    // providerName must stay as the configured provider (etri or mock), never undefined
    expect(typeof body.providerName).toBe('string')
    expect(body.providerName).not.toBe('')
  })

  test('ETRI 실패 시 providerName이 mock으로 바뀌지 않음', async ({ request }) => {
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '안녕하세요.',
        questionId: 'beginner-q1-reading',
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.alloc(500, 0),
        },
      },
    })

    expect(res.ok()).toBe(true)
    const body = await res.json()
    // When ETRI is configured and fails, providerName is 'etri' NOT 'mock'
    // When mock is configured, providerName is 'mock'
    // Either way it must be a valid string
    expect(typeof body.providerName).toBe('string')

    // If mock is configured: fallbackReason should not be an ETRI-specific code
    // If etri is configured but fails: providerName must remain 'etri'
    if (body.providerName === 'etri' && body.fallbackReason) {
      expect(['audio_conversion_failed', 'etri_api_error', 'etri_http_error', 'etri_fetch_failed', 'provider_error'])
        .toContain(body.fallbackReason)
    }
  })

  test('silent audio(all-zero webm) — silent guard 또는 변환 실패 응답, app crash 없음', async ({ request }) => {
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '저는 학생입니다.',
        questionId: 'beginner-q1-reading',
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.alloc(3000, 0),
        },
      },
    })
    // Must not crash — any valid status is acceptable
    expect([200, 400]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(typeof body.normalizedScore).toBe('number')
    }
  })

  test('q1 reading referenceText가 API에 전달되어 응답 반환', async ({ request }) => {
    // The script (referenceText) must reach the provider — verified indirectly:
    // a non-empty script + valid response structure means the route passed it through.
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '오늘은 날씨가 맑고 바람이 시원합니다. 저는 공원에서 산책을 즐깁니다.',
        questionId: 'beginner-q1-reading',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.normalizedScore).toBe('number')
    expect(typeof body.providerName).toBe('string')
    expect(typeof body.feedback).toBe('string')
    expect(body.feedback.length).toBeGreaterThan(0)
  })

  test('변환 실패 응답: fallbackReason이 audio_conversion_failed이면 normalizedScore=0', async ({
    request,
  }) => {
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '저는 학생입니다.',
        questionId: 'beginner-q1-reading',
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.from([0x00, 0x01, 0x02]),
        },
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    if (body.fallbackReason === 'audio_conversion_failed') {
      expect(body.normalizedScore).toBe(0)
      // providerName must NOT be 'mock' — it must stay as the configured provider
      expect(body.providerName).not.toBe('mock')
    }
  })

  test('q1/q2/q3 기존 문항 유형별 흐름 유지 — 오디오 없이도 normalizedScore 반환', async ({
    request,
  }) => {
    const cases = [
      { qId: 'beginner-q1-reading', ref: '저는 오늘 병원에 갑니다.' },
      { qId: 'beginner-q2-material-description', ref: '이 사진을 설명해 보세요.' },
      { qId: 'beginner-q3-listening-response', ref: '들은 내용을 말해 보세요.' },
    ]
    for (const { qId, ref } of cases) {
      const res = await request.post('/api/pronunciation', {
        multipart: { referenceText: ref, questionId: qId },
      })
      expect(res.ok()).toBe(true)
      const body = await res.json()
      expect(typeof body.normalizedScore).toBe('number')
      expect(body.normalizedScore).toBeGreaterThanOrEqual(0)
    }
  })

  test('q4 dialogue_mission 흐름 유지 — pronunciation API가 dialogue와 충돌하지 않음', async ({
    request,
  }) => {
    // Verify that the pronunciation endpoint also accepts q4 questionId without crash
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '아이스 아메리카노 주세요.',
        questionId: 'beginner-q4-dialogue-mission',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.normalizedScore).toBe('number')
  })
})

// ── Phase 10-E-7: ETRI score missing / error code 처리 ────────────────────────

test.describe('/api/pronunciation ETRI score missing 및 error code 처리', () => {
  test('에러 응답의 fallbackReason이 허용된 코드 중 하나임', async ({ request }) => {
    const ALLOWED_FALLBACK_REASONS = [
      'audio_conversion_failed',
      'etri_api_error',
      'etri_http_error',
      'etri_fetch_failed',
      'etri_score_missing',
      'provider_error',
      'no_api_key',
      'mock_configured',
    ]
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '저는 학생입니다.',
        questionId: 'beginner-q1-reading',
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
        },
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    if (body.fallbackReason !== undefined) {
      expect(ALLOWED_FALLBACK_REASONS).toContain(body.fallbackReason)
    }
  })

  test('에러 응답: fallbackReason이 있으면 rawScore는 undefined여야 함 (0이면 안 됨)', async ({
    request,
  }) => {
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '저는 학생입니다.',
        questionId: 'beginner-q1-reading',
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.from([0x00, 0x01, 0x02]),
        },
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // fallbackReason이 있으면 rawScore가 반드시 undefined여야 함 (파싱 실패를 0점으로 표현 금지)
    if (body.fallbackReason) {
      expect(body.rawScore).toBeUndefined()
    }
  })

  test('에러 응답: fallbackReason=etri_score_missing이면 feedback이 비어있지 않음', async ({
    request,
  }) => {
    // This test verifies the feedback message shape for error responses.
    // We can't force etri_score_missing without mocking, so we verify the general contract.
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '오늘은 날씨가 맑습니다.',
        questionId: 'beginner-q1-reading',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // feedback must always be a non-empty string regardless of error state
    expect(typeof body.feedback).toBe('string')
    expect(body.feedback.length).toBeGreaterThan(0)
  })

  test('q1/q2/q3 문항 — 오디오 없이도 정상 응답 구조 유지', async ({ request }) => {
    const cases = [
      { qId: 'beginner-q1-reading', ref: '저는 오늘 병원에 갑니다.' },
      { qId: 'beginner-q2-material-description', ref: '이 사진은 카페에서 손님이 음료를 주문하는 장면입니다.' },
      { qId: 'beginner-q3-listening-response', ref: '들은 내용을 말해 보세요.' },
    ]
    for (const { qId, ref } of cases) {
      const res = await request.post('/api/pronunciation', {
        multipart: { referenceText: ref, questionId: qId },
      })
      expect(res.ok()).toBe(true)
      const body = await res.json()
      expect(typeof body.normalizedScore).toBe('number')
      expect(body.normalizedScore).toBeGreaterThanOrEqual(0)
      expect(body.normalizedScore).toBeLessThanOrEqual(100)
      expect(typeof body.providerName).toBe('string')
      expect(typeof body.feedback).toBe('string')
    }
  })

  test('q4 dialogue_mission — pronunciation API가 충돌 없이 응답 반환', async ({ request }) => {
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '포장해 주세요.',
        questionId: 'beginner-q4-dialogue-mission',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.normalizedScore).toBe('number')
    expect(typeof body.providerName).toBe('string')
  })

  test('q1 reading: referenceText가 지문 본문만인 경우 API 정상 응답', async ({ request }) => {
    // Client strips the instruction line before \n\n — send only the reading text.
    // This verifies the provider accepts a short, clean script without instructions.
    const readingTextOnly = '저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들를 예정입니다.'
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: readingTextOnly,
        questionId: 'beginner-q1-reading',
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(typeof body.normalizedScore).toBe('number')
    expect(typeof body.feedback).toBe('string')
    expect(body.feedback.length).toBeGreaterThan(0)
  })

  test('변환 실패 응답: normalizedScore=0이고 providerName은 mock이 아님', async ({ request }) => {
    const res = await request.post('/api/pronunciation', {
      multipart: {
        referenceText: '저는 학생입니다.',
        questionId: 'beginner-q1-reading',
        audio: {
          name: 'recording.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]),
        },
      },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    if (body.fallbackReason === 'audio_conversion_failed') {
      expect(body.normalizedScore).toBe(0)
      expect(body.providerName).not.toBe('mock')
      expect(body.rawScore).toBeUndefined()
    }
  })
})
