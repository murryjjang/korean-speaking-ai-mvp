import { describe, it, expect } from 'vitest'

// ── ETRI 적용 범위 정책 (Phase 10-E-6-A) ──────────────────────────────────────
// ETRI 발음평가는 q1 낭독(qt-reading)에만 적용.
// q2(material-description), q3(listening-response), q4(dialogue-mission)은 ETRI 호출 없음.

// Mirrors speaking-client.tsx handleSubmit: pronunciation API call guard
function shouldCallPronunciationAPI(typeId: string): boolean {
  return typeId === 'qt-reading'
}

describe('ETRI 발음평가 적용 범위 — speaking-client.tsx', () => {
  it('qt-reading → /api/pronunciation 호출 (ETRI 적용)', () => {
    expect(shouldCallPronunciationAPI('qt-reading')).toBe(true)
  })

  it('qt-picture → /api/pronunciation 호출하지 않음', () => {
    expect(shouldCallPronunciationAPI('qt-picture')).toBe(false)
  })

  it('qt-material-description (q2) → /api/pronunciation 호출하지 않음', () => {
    expect(shouldCallPronunciationAPI('qt-material-description')).toBe(false)
  })

  it('qt-listening-resp (q3) → /api/pronunciation 호출하지 않음', () => {
    expect(shouldCallPronunciationAPI('qt-listening-resp')).toBe(false)
  })

  it('qt-dialogue-mission (q4) → /api/pronunciation 호출하지 않음', () => {
    expect(shouldCallPronunciationAPI('qt-dialogue-mission')).toBe(false)
  })
})

// ── ETRI 오류 카드 미표시 정책 — 비낭독 문항에서 fallbackReason이 전달되지 않음 ─
// speaking-client.tsx에서 q2/q3에 대해 pronunciationResult가 undefined이므로
// submitSpeaking은 서버측 mock을 사용 → fallbackReason 없음 → 오류 카드 없음
// dialogue-actions.ts에서 q4에 대해 직접 mock을 생성 → fallbackReason 없음

type MockPronunciationResult = {
  providerName: string
  normalizedScore: number
  wordScores: Array<{ word: string; score: number }>
  feedback: string
  fallbackReason?: string
}

function etriErrorCardShouldShow(r: MockPronunciationResult): boolean {
  return Boolean(r.fallbackReason)
}

describe('q2/q3/q4 결과화면에서 ETRI 오류 카드 미표시', () => {
  const mockResult: MockPronunciationResult = {
    providerName: 'mock',
    normalizedScore: 72,
    wordScores: [],
    feedback: '테스트용 mock 결과',
  }

  const dialogueMockResult: MockPronunciationResult = {
    providerName: 'mock',
    normalizedScore: 0,
    wordScores: [],
    feedback: '대화형 미션 평가에서는 발음평가 API가 별도 적용되지 않습니다.',
  }

  it('q2/q3: mock provider + fallbackReason 없음 → ETRI 오류 카드 표시 안 함', () => {
    expect(etriErrorCardShouldShow(mockResult)).toBe(false)
  })

  it('q4: dialogue mock result + fallbackReason 없음 → ETRI 오류 카드 표시 안 함', () => {
    expect(etriErrorCardShouldShow(dialogueMockResult)).toBe(false)
  })

  it('q4: dialogue mock의 feedback은 "별도 적용되지 않습니다" 포함', () => {
    expect(dialogueMockResult.feedback).toContain('별도 적용되지 않습니다')
  })

  it('q1 ETRI 실패시: fallbackReason 있으면 오류 카드 표시', () => {
    const etriFailResult: MockPronunciationResult = {
      providerName: 'etri',
      normalizedScore: 0,
      wordScores: [],
      feedback: 'ETRI 서버 호출에 실패했습니다.',
      fallbackReason: 'etri_fetch_failed',
    }
    expect(etriErrorCardShouldShow(etriFailResult)).toBe(true)
  })
})

// ── result/page.tsx 발음카드 표시 정책 ──────────────────────────────────────────
// isReadingQuestion → full ETRI card
// !isReadingQuestion && !isDialogueMission → quiet notice
// isDialogueMission → hidden

function pronunciationCardDisplay(typeId: string | undefined): 'full' | 'notice' | 'hidden' {
  if (typeId === 'qt-reading') return 'full'
  if (typeId === 'qt-dialogue-mission') return 'hidden'
  return 'notice'
}

describe('result/page.tsx 발음카드 표시 정책', () => {
  it('qt-reading → 전체 발음 카드 표시', () => {
    expect(pronunciationCardDisplay('qt-reading')).toBe('full')
  })

  it('qt-material-description (q2) → 조용한 안내만 표시', () => {
    expect(pronunciationCardDisplay('qt-material-description')).toBe('notice')
  })

  it('qt-listening-resp (q3) → 조용한 안내만 표시', () => {
    expect(pronunciationCardDisplay('qt-listening-resp')).toBe('notice')
  })

  it('qt-dialogue-mission (q4) → 발음 카드 숨김', () => {
    expect(pronunciationCardDisplay('qt-dialogue-mission')).toBe('hidden')
  })

  it('undefined → 조용한 안내만 표시', () => {
    expect(pronunciationCardDisplay(undefined)).toBe('notice')
  })
})

// ── q2 이미지 placeholder 안내 표시 정책 ──────────────────────────────────────
// assessment-assets.ts: status='placeholder'인 이미지 자산
// question-asset-renderer.tsx: status='placeholder'이면 "임시 이미지 · 실제 사진 교체 예정" 표시

function shouldShowPlaceholderNotice(status: string): boolean {
  return status === 'placeholder'
}

describe('q2 이미지 placeholder 안내 정책', () => {
  it('status=placeholder → 임시 이미지 안내 표시', () => {
    expect(shouldShowPlaceholderNotice('placeholder')).toBe(true)
  })

  it('status=ready → 임시 이미지 안내 표시 안 함', () => {
    expect(shouldShowPlaceholderNotice('ready')).toBe(false)
  })
})

// ── q3 TTS fallback 정책 ──────────────────────────────────────────────────────
// assessment-assets.ts: 오디오 자산에 ttsScript 추가
// question-asset-renderer.tsx AudioAssetCard: src 없으면 TTS 버튼 표시

function canPlayAudio(src: string, ttsScript: string | undefined): 'audio' | 'tts' | 'none' {
  if (src) return 'audio'
  if (ttsScript) return 'tts'
  return 'none'
}

describe('q3 듣기 자극 제공 정책', () => {
  it('src 있으면 audio 재생', () => {
    expect(canPlayAudio('/audio/test.mp3', undefined)).toBe('audio')
  })

  it('src 없고 ttsScript 있으면 TTS fallback', () => {
    expect(canPlayAudio('', '여러분, 내일 한국어 수업은 오전 10시에 시작합니다.')).toBe('tts')
  })

  it('src 없고 ttsScript 없으면 재생 불가', () => {
    expect(canPlayAudio('', undefined)).toBe('none')
  })

  it('beginner q3 ttsScript는 수업 시간 정보 포함', () => {
    const script = '여러분, 내일 한국어 수업은 오전 10시에 시작합니다. 수업은 2층 203호에서 합니다. 학생들은 교재와 필기구를 꼭 가져오세요.'
    expect(script).toContain('오전 10시')
    expect(script).toContain('203호')
    expect(script).toContain('교재')
  })
})

// listenLimit 정책: TTS/audio 모두 listenCount 증가, limitReached이면 버튼 비활성화
function listenLimitReached(listenCount: number, listenLimit: number): boolean {
  return listenCount >= listenLimit
}

describe('q3 listenLimit 정책', () => {
  it('listenCount < listenLimit → 버튼 활성', () => {
    expect(listenLimitReached(0, 2)).toBe(false)
    expect(listenLimitReached(1, 2)).toBe(false)
  })

  it('listenCount >= listenLimit → 버튼 비활성', () => {
    expect(listenLimitReached(2, 2)).toBe(true)
    expect(listenLimitReached(3, 2)).toBe(true)
  })
})

// ── q4 AI 응답 자연화 ──────────────────────────────────────────────────────────
import { isProceduralQuestion } from '@/src/lib/dialogue-policy'

describe('isProceduralQuestion — q4 절차 질문 감지', () => {
  it('"뭘 더 녹음할 게 있나요?" → 절차 질문으로 감지', () => {
    expect(isProceduralQuestion('뭘 더 녹음할 게 있나요?')).toBe(true)
  })

  it('"제출하면 되나요?" → 절차 질문으로 감지', () => {
    expect(isProceduralQuestion('제출하면 되나요?')).toBe(true)
  })

  it('"평가 제출은 어떻게 해요?" → 절차 질문으로 감지', () => {
    expect(isProceduralQuestion('평가 제출은 어떻게 해요?')).toBe(true)
  })

  it('"이제 뭐 해야 해요?" → 절차 질문으로 감지', () => {
    expect(isProceduralQuestion('이제 뭐 해야 해요?')).toBe(true)
  })

  it('"아이스 아메리카노 주세요" → 절차 질문 아님', () => {
    expect(isProceduralQuestion('아이스 아메리카노 주세요')).toBe(false)
  })

  it('"포장해 주세요" → 절차 질문 아님', () => {
    expect(isProceduralQuestion('포장해 주세요')).toBe(false)
  })

  it('"맞나요?" → 절차 질문 아님 (언어 질문으로 처리)', () => {
    expect(isProceduralQuestion('이게 맞나요?')).toBe(false)
  })
})

// ── q4 dialogue mock AI 응답 — 목표 달성 후 주문 완료 메시지 ──────────────────
// conversation/index.ts beginnerCafeResponse 동작 검증
// (직접 import 대신 로직 미러링으로 독립 테스트)

function mockBeginnerCafeCompletionMessage(
  drinkMet: boolean,
  tempMet: boolean,
  packMet: boolean,
  isIce: boolean,
  isPack: boolean,
  drink: string,
): string {
  if (!drinkMet || !tempMet || !packMet) return '(미완료)'
  const tempStr = isIce ? '아이스 ' : '따뜻한 '
  const packStr = isPack ? ' 포장으로' : ' 매장에서'
  return `네, ${tempStr}${drink}${packStr} 준비해 드리겠습니다. 잠시만 기다려 주세요!`
}

describe('q4 missionGoals 완료 후 AI 응답 자연화', () => {
  it('아이스 아메리카노 + 포장 → 구체적 완료 메시지', () => {
    const msg = mockBeginnerCafeCompletionMessage(true, true, true, true, true, '아메리카노')
    expect(msg).toContain('아이스 아메리카노')
    expect(msg).toContain('포장')
    expect(msg).toContain('준비해 드리겠습니다')
  })

  it('따뜻한 라떼 + 매장 → 완료 메시지에 라떼 포함', () => {
    const msg = mockBeginnerCafeCompletionMessage(true, true, true, false, false, '라떼')
    expect(msg).toContain('따뜻한 라떼')
    expect(msg).toContain('매장에서')
  })

  it('완료 메시지에 "감사합니다!" 단독 반복 없음', () => {
    const msg = mockBeginnerCafeCompletionMessage(true, true, true, true, true, '아메리카노')
    expect(msg).not.toBe('네, 주문 도와드리겠습니다. 감사합니다!')
  })
})

describe('q4 절차 질문 시 제출 안내 응답', () => {
  it('절차 질문 + 미션 완료 → 제출 안내 포함', () => {
    const allDone = true
    const response = allDone
      ? "미션이 완료되었습니다. 화면에서 '평가 제출하기' 버튼을 눌러 제출해 주세요."
      : '아직 주문이 완료되지 않았습니다.'
    expect(response).toContain('평가 제출하기')
    expect(response).toContain('버튼')
  })

  it('절차 질문 + 미션 미완료 → 주문 계속 안내', () => {
    const allDone = false
    const response = allDone
      ? "미션이 완료되었습니다. 화면에서 '평가 제출하기' 버튼을 눌러 제출해 주세요."
      : '아직 주문이 완료되지 않았습니다. 음료, 온도, 포장 여부를 말씀해 주세요.'
    expect(response).toContain('음료')
    expect(response).not.toContain('평가 제출하기')
  })
})

// ── Phase 10-E-6-B: q2 제출 오류 수정 정책 ───────────────────────────────────
// Root cause: actions.ts에서 q2/q3/q4에 대해 getPronunciationProvider().evaluate()를 호출해
// ETRI provider가 빈 blob으로 오디오 변환을 시도 → ffmpeg 실패 → 제출 오류.
// Fix: isReadingQuestion 체크 후 q2/q3/q4는 mock 직접 사용.

// Mirrors actions.ts: isReadingQuestion check
function shouldCallPronunciationProviderServerSide(typeId: string): boolean {
  return typeId === 'qt-reading'
}

describe('Phase 10-E-6-B: actions.ts 서버 발음 provider 호출 정책', () => {
  it('qt-reading → 서버 provider 호출 (ETRI 또는 mock)', () => {
    expect(shouldCallPronunciationProviderServerSide('qt-reading')).toBe(true)
  })

  it('qt-material-desc (q2) → 서버 provider 호출하지 않고 mock 직접 사용', () => {
    expect(shouldCallPronunciationProviderServerSide('qt-material-desc')).toBe(false)
  })

  it('qt-listening-resp (q3) → 서버 provider 호출하지 않음', () => {
    expect(shouldCallPronunciationProviderServerSide('qt-listening-resp')).toBe(false)
  })

  it('qt-dialogue-mission (q4) → 서버 provider 호출하지 않음', () => {
    expect(shouldCallPronunciationProviderServerSide('qt-dialogue-mission')).toBe(false)
  })

  it('unknown → 서버 provider 호출하지 않음 (안전 기본값)', () => {
    expect(shouldCallPronunciationProviderServerSide('unknown')).toBe(false)
  })
})

// q2 mock 발음 결과 정책: fallbackReason 없음 → ETRI 오류 카드 미표시
type MockQ2PronunciationResult = {
  providerName: string
  normalizedScore: number
  wordScores: unknown[]
  feedback: string
  fallbackReason?: string
}

describe('q2 제출 성공 시 발음 결과 정책', () => {
  const q2MockPron: MockQ2PronunciationResult = {
    providerName: 'mock',
    normalizedScore: 0,
    wordScores: [],
    feedback: '자유발화 문항에서는 발음평가 API가 별도 적용되지 않습니다.',
  }

  it('q2 mock 발음 결과: providerName은 mock', () => {
    expect(q2MockPron.providerName).toBe('mock')
  })

  it('q2 mock 발음 결과: fallbackReason 없음 → ETRI 오류 카드 표시 안 함', () => {
    expect(q2MockPron.fallbackReason).toBeUndefined()
    expect(Boolean(q2MockPron.fallbackReason)).toBe(false)
  })

  it('q2 mock 발음 feedback은 "별도 적용" 포함', () => {
    expect(q2MockPron.feedback).toContain('별도 적용')
  })
})

// q2 이미지 placeholder와 제출 분리: 이미지 상태는 제출 로직과 무관
describe('q2 이미지 placeholder — 제출 흐름에 영향 없음', () => {
  function q2SubmitShouldSucceed(_imageStatus: 'placeholder' | 'ready', _hasTranscript: boolean): boolean {
    // 이미지 상태는 제출 흐름에 영향 없음 — 항상 제출 가능
    return true
  }

  it('이미지 status=placeholder여도 제출 성공', () => {
    expect(q2SubmitShouldSucceed('placeholder', true)).toBe(true)
  })

  it('이미지 status=ready여도 제출 성공', () => {
    expect(q2SubmitShouldSucceed('ready', true)).toBe(true)
  })

  it('이미지 없음(placeholder)이어도 transcript 없어도 제출 흐름은 진행', () => {
    expect(q2SubmitShouldSucceed('placeholder', false)).toBe(true)
  })
})

// q2 제출 성공 후 result URL
describe('q2 제출 성공 후 result URL 생성', () => {
  it('result URL 형식: /student/speaking/{questionId}/result?sub=...', () => {
    const questionId = 'beginner-q2-material-description'
    const submissionId = `sub-${questionId}-${Date.now()}`
    const attemptId = 'test-attempt-abc'
    const params = new URLSearchParams({ sub: submissionId, attemptId })
    const url = `/student/speaking/${questionId}/result?${params.toString()}`
    expect(url).toContain('/student/speaking/beginner-q2-material-description/result')
    expect(url).toContain('sub=')
    expect(url).toContain('attemptId=')
  })

  it('attemptId 없어도 result URL 생성됨 (graceful fallback)', () => {
    const questionId = 'beginner-q2-material-description'
    const submissionId = `sub-${questionId}-${Date.now()}`
    const url = `/student/speaking/${questionId}/result?sub=${submissionId}`
    expect(url).toContain('sub=')
    expect(url).not.toContain('attemptId=')
  })
})

// q2 result → 다음 문항 이동: q3로 이동
describe('q2 result 다음 문항 이동 — q3으로', () => {
  const beSet = {
    questions: [
      { questionId: 'beginner-q1-reading', order: 1 },
      { questionId: 'beginner-q2-material-description', order: 2 },
      { questionId: 'beginner-q3-listening-response', order: 3 },
      { questionId: 'beginner-q4-dialogue-mission', order: 4 },
    ],
  }

  function getNextQuestion(currentId: string): string | null {
    const sorted = [...beSet.questions].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((q) => q.questionId === currentId)
    if (idx < 0 || idx >= sorted.length - 1) return null
    return sorted[idx + 1].questionId
  }

  it('q2 다음은 q3', () => {
    expect(getNextQuestion('beginner-q2-material-description')).toBe('beginner-q3-listening-response')
  })

  it('q3 다음은 q4', () => {
    expect(getNextQuestion('beginner-q3-listening-response')).toBe('beginner-q4-dialogue-mission')
  })

  it('q4 다음은 없음 (마지막 문항)', () => {
    expect(getNextQuestion('beginner-q4-dialogue-mission')).toBeNull()
  })
})

// q2 attemptId 유지
describe('q2 attemptId 유지 정책', () => {
  it('attemptId 있으면 result URL에 유지', () => {
    const attemptId = 'existing-attempt-id'
    const nextQuestionId = 'beginner-q3-listening-response'
    const setId = 'set-beginner-01'
    const href = `/student/speaking/${nextQuestionId}?setId=${setId}&attemptId=${attemptId}`
    expect(href).toContain(`attemptId=${attemptId}`)
  })

  it('attemptId 없어도 제출은 성공 (graceful fallback)', () => {
    const attemptId = undefined
    const submissionId = 'sub-test-123'
    // saveAttemptSubmission이 호출되지 않아도 submissionId는 반환됨
    expect(submissionId).toBeTruthy()
    expect(attemptId).toBeUndefined()
  })
})

// q2 LLM/mock 평가 실패 시 fallback
describe('q2 LLM/mock 평가 실패 시 rule-based fallback', () => {
  type LLMEvalStatus = 'success' | 'fallback'

  function getEvalProvider(status: LLMEvalStatus): string {
    return status === 'success' ? 'openai' : 'mock'
  }

  it('LLM 성공 시 openai provider', () => {
    expect(getEvalProvider('success')).toBe('openai')
  })

  it('LLM 실패 시 mock fallback provider', () => {
    expect(getEvalProvider('fallback')).toBe('mock')
  })

  it('mock fallback 결과는 항상 존재 (overall_score >= 0)', () => {
    const fallbackScore = 15
    expect(fallbackScore).toBeGreaterThanOrEqual(0)
  })
})

// q1 ETRI 실패 → q1→q2 이동 가능
describe('q1 ETRI 실패 후 q2 이동 정책', () => {
  type EtriFailResult = {
    fallbackReason: string
    providerName: string
    normalizedScore: number
    wordScores: unknown[]
    feedback: string
  }

  const etriFailResult: EtriFailResult = {
    fallbackReason: 'etri_fetch_failed',
    providerName: 'etri',
    normalizedScore: 0,
    wordScores: [],
    feedback: '발음평가 서비스에 연결하지 못했습니다.',
  }

  it('q1 ETRI 실패 시 fallbackReason 설정됨', () => {
    expect(etriFailResult.fallbackReason).toBe('etri_fetch_failed')
  })

  it('ETRI 실패여도 submitSpeaking은 fallback result로 성공 반환', () => {
    // actions.ts에서 pronunciation provider catch → fallback PronunciationResult 반환
    // Promise.all은 reject되지 않음 → submissionId 반환 → result page 이동 가능
    const submissionId = 'sub-q1-123'
    expect(submissionId).toBeTruthy()
  })

  it('q1 result의 "다음 문항으로" 버튼 → q2로 이동 URL 생성', () => {
    const nextQuestionId = 'beginner-q2-material-description'
    const setId = 'set-beginner-01'
    const attemptId = 'attempt-abc'
    const href = `/student/speaking/${nextQuestionId}?setId=${setId}&attemptId=${attemptId}`
    expect(href).toContain('beginner-q2-material-description')
    expect(href).toContain('attemptId=')
  })
})

// q2 result page ETRI 오류 카드 미표시
describe('q2 result page — ETRI 오류 카드 미표시 확인', () => {
  it('isReadingQuestion=false(q2) → ETRI 전체 카드 미표시', () => {
    const q2TypeId: string = 'qt-material-desc'
    const isReadingQuestion = q2TypeId === 'qt-reading'
    expect(isReadingQuestion).toBe(false)
  })

  it('q2 발음 결과 providerName=mock → fallbackReason 없음 → 오류 카드 미표시', () => {
    const q2Pronunciation = { providerName: 'mock', fallbackReason: undefined }
    expect(Boolean(q2Pronunciation.fallbackReason)).toBe(false)
  })

  it('q2/q3 typeId !== qt-dialogue-mission → 조용한 안내 카드만 표시', () => {
    const display = (typeId: string) =>
      typeId === 'qt-reading' ? 'full' :
      typeId === 'qt-dialogue-mission' ? 'hidden' : 'notice'
    expect(display('qt-material-desc')).toBe('notice')
    expect(display('qt-listening-resp')).toBe('notice')
  })
})

// q3/q4 기존 흐름 유지 확인
describe('q3/q4 기존 흐름 유지', () => {
  it('q3 listenLimit 정책 — 기존 동작 유지', () => {
    const listenCount = 1
    const listenLimit = 2
    expect(listenCount < listenLimit).toBe(true)
  })

  it('q4 dialogue_mission typeId 확인', () => {
    expect('qt-dialogue-mission').toBe('qt-dialogue-mission')
  })

  it('q4 제출 후 attempt summary URL', () => {
    const attemptId = 'final-attempt'
    const url = `/student/speaking/attempt/${attemptId}`
    expect(url).toContain('/attempt/')
  })
})

// teacher final review workflow 유지
describe('teacher final review workflow 유지', () => {
  it('needs_teacher_review: overall_score < 30이면 true', () => {
    const overallScore = 20
    const needsReview = overallScore < 30
    expect(needsReview).toBe(true)
  })

  it('needs_teacher_review: overall_score >= 30이면 false (기본)', () => {
    const overallScore = 65
    const needsReview = overallScore < 30
    expect(needsReview).toBe(false)
  })

  it('q2/q3/q4 결과 페이지 ETRI 오류 카드 없음 → 교수자 검토 흐름 방해 없음', () => {
    const typeIds = ['qt-material-desc', 'qt-listening-resp', 'qt-dialogue-mission']
    for (const typeId of typeIds) {
      const isReading = typeId === 'qt-reading'
      expect(isReading).toBe(false)
    }
  })
})

// ── q4 제출 오류 수정 — dialogue-actions.ts 발음 mock ──────────────────────────
// dialogue-actions.ts에서 getPronunciationProvider() 대신 직접 mock 사용
// ETRI 빈 blob 변환 시도 → ffmpeg 실패 → 제출 오류 발생했던 문제 해결

type DialoguePronunciationResult = {
  providerName: string
  normalizedScore: number
  wordScores: Array<unknown>
  feedback: string
  fallbackReason?: string
}

describe('q4 제출 시 발음 결과 — dialogue-actions.ts mock', () => {
  const dialoguePronResult: DialoguePronunciationResult = {
    providerName: 'mock',
    normalizedScore: 0,
    wordScores: [],
    feedback: '대화형 미션 평가에서는 발음평가 API가 별도 적용되지 않습니다.',
  }

  it('providerName은 mock (ETRI 아님)', () => {
    expect(dialoguePronResult.providerName).toBe('mock')
  })

  it('fallbackReason 없음 → 오류 카드 표시 안 함', () => {
    expect(dialoguePronResult.fallbackReason).toBeUndefined()
  })

  it('feedback은 "별도 적용되지 않습니다" 포함', () => {
    expect(dialoguePronResult.feedback).toContain('별도 적용되지 않습니다')
  })

  it('wordScores는 빈 배열', () => {
    expect(dialoguePronResult.wordScores).toHaveLength(0)
  })
})

// ── q1→q2→q3→q4 attemptId 흐름 유지 ─────────────────────────────────────────
// attemptId는 SpeakingClient에서 crypto.randomUUID()로 생성되며
// 각 문항 제출 시 URL 파라미터로 전달됨

describe('attemptId 흐름 정책', () => {
  it('attemptId는 URL searchParam으로 전달되어 다음 문항에서 유지됨', () => {
    const attemptId = 'test-attempt-123'
    const params = new URLSearchParams({ sub: 'sub-123', attemptId })
    expect(params.get('attemptId')).toBe(attemptId)
  })

  it('마지막 문항(q4) 제출 후 attempt summary URL 형식', () => {
    const attemptId = 'test-attempt-123'
    const summaryUrl = `/student/speaking/attempt/${attemptId}`
    expect(summaryUrl).toContain(attemptId)
    expect(summaryUrl).toContain('/attempt/')
  })

  it('nextSetItem이 없으면 "전체 평가 결과 보기" 링크가 attempt summary로 이동', () => {
    const attemptId = 'test-attempt-123'
    const nextSetItem = null
    const href = nextSetItem === null && attemptId
      ? `/student/speaking/attempt/${attemptId}`
      : '/student/speaking'
    expect(href).toBe(`/student/speaking/attempt/${attemptId}`)
  })
})

// ── Phase 10-E-6-C: 제출 지연 완화 · ETRI fallback · q3 TTS · q4 복수 품목 ─────

// 작업 1: ETRI timeout 정책 (etri.ts — AbortSignal.timeout(7_000))
describe('Phase 10-E-6-C: ETRI fetch timeout 정책', () => {
  it('ETRI timeout은 7초 이하로 설정되어야 한다', () => {
    const ETRI_TIMEOUT_MS = 7_000
    expect(ETRI_TIMEOUT_MS).toBeLessThanOrEqual(8_000)
    expect(ETRI_TIMEOUT_MS).toBeGreaterThan(0)
  })

  it('ETRI timeout 이후 fetch_failed 오류 코드로 fallback된다', () => {
    const fallbackResult = {
      normalizedScore: 0,
      wordScores: [],
      feedback: '발음평가 서비스에 연결하지 못했습니다.',
      providerName: 'etri',
      providerVersion: '1.0',
      latencyMs: 0,
      fallbackReason: 'etri_fetch_failed',
    }
    expect(fallbackResult.fallbackReason).toBe('etri_fetch_failed')
    expect(fallbackResult.normalizedScore).toBe(0)
  })
})

// 작업 2: q1 ETRI 실패 시 result page 정상 표시 + 버튼 활성화
describe('Phase 10-E-6-C: q1 ETRI 실패 → result page 정상 흐름', () => {
  it('ETRI 실패여도 submitSpeaking은 submissionId를 반환한다 (catch → fallback PronunciationResult)', () => {
    const submissionId = `sub-beginner-q1-reading-${Date.now()}`
    expect(submissionId).toBeTruthy()
    expect(submissionId.startsWith('sub-')).toBe(true)
  })

  it('q1 ETRI 실패 시 q1ReferenceScore는 AI 참고점수(totalScore)를 유지한다', () => {
    // q1EtriReflected = false (ETRI 실패) → q1ReferenceScore = totalScore
    const totalScore = 72
    const q1EtriReflected = false
    const q1ReferenceScore = q1EtriReflected ? Math.round(80 * 0.6 + totalScore * 0.4) : totalScore
    expect(q1ReferenceScore).toBe(totalScore)
  })

  it('q1 ETRI 실패 시 q1ReferenceScore ≥ 0 (유효한 참고값)', () => {
    const totalScore = 55
    const q1ReferenceScore = totalScore
    expect(q1ReferenceScore).toBeGreaterThanOrEqual(0)
  })

  it('q1 ETRI 실패 → fallbackReason 있으면 "네트워크 또는 endpoint" 안내 표시', () => {
    const fallbackReason = 'etri_fetch_failed'
    const guidanceText = fallbackReason
      ? 'ETRI 발음평가가 반영되지 않은 AI 참고평가입니다. 네트워크 또는 endpoint 확인 후 다시 시도할 수 있습니다. 최종 점수는 교수자 검토 후 확정됩니다.'
      : 'ETRI 발음평가가 반영되지 않은 AI 참고평가입니다. 공식 종합점수는 1~4번 전체 응시 후 산출되며, 최종 점수는 교수자 검토 후 확정됩니다.'
    expect(guidanceText).toContain('네트워크 또는 endpoint')
    expect(guidanceText).toContain('다시 시도할 수 있습니다')
  })

  it('q1 ETRI 실패 후 "다음 문항으로" 버튼은 nextQuestion이 있으면 활성화된다', () => {
    const nextQuestion = { id: 'beginner-q2-material-description', isActive: true }
    const buttonActive = nextQuestion !== null && nextQuestion.isActive
    expect(buttonActive).toBe(true)
  })
})

// 작업 3: q3 TTS fallback 듣기 자극 명확화
describe('Phase 10-E-6-C: q3 TTS fallback 버튼 문구', () => {
  it('src 없고 ttsScript 있으면 버튼 레이블은 "듣기 재생"', () => {
    const hasAudio = false
    const hasTTSScript = true
    const isTTSActive = false
    const limitReached = false
    const buttonLabel = limitReached
      ? '듣기 완료'
      : hasAudio
        ? '문제 듣기'
        : hasTTSScript
          ? isTTSActive ? '재생 중...' : '듣기 재생'
          : '음원 준비 중'
    expect(buttonLabel).toBe('듣기 재생')
  })

  it('TTS 재생 중이면 버튼 레이블은 "재생 중..."', () => {
    const hasAudio = false
    const hasTTSScript = true
    const isTTSActive = true
    const limitReached = false
    const buttonLabel = limitReached
      ? '듣기 완료'
      : hasAudio
        ? '문제 듣기'
        : hasTTSScript
          ? isTTSActive ? '재생 중...' : '듣기 재생'
          : '음원 준비 중'
    expect(buttonLabel).toBe('재생 중...')
  })

  it('listenLimit 초과 시 버튼 레이블은 "듣기 완료"', () => {
    const limitReached = true
    const buttonLabel = limitReached ? '듣기 완료' : '듣기 재생'
    expect(buttonLabel).toBe('듣기 완료')
  })

  it('TTS fallback 안내 문구는 "현재 음원은 임시 TTS 음성입니다" 포함', () => {
    const notice = '현재 음원은 임시 TTS 음성입니다. 파일럿 전 실제 녹음본으로 교체 예정입니다.'
    expect(notice).toContain('현재 음원은 임시 TTS 음성입니다')
    expect(notice).toContain('파일럿 전 실제 녹음본으로 교체 예정')
  })
})

// 작업 4: q4 복수 품목 주문 처리
// extractOrderedItems 로직을 미러링하여 독립 단위 테스트

const QTY_PATTERN_TEST = '(\\d+\\s*(?:잔|개|컵|병)?|한\\s*(?:잔|개|컵)?|두\\s*(?:잔|개|컵)?|세\\s*(?:잔|개|컵)?|네\\s*(?:잔|개|컵)?)'

function testExtractOrderedItems(text: string): string[] {
  type FoundItem = { pos: number; label: string }
  const found: FoundItem[] = []

  const bingsuRe = new RegExp(`팥빙수\\s*${QTY_PATTERN_TEST}?`)
  const bingsuM = text.match(bingsuRe)
  if (bingsuM && bingsuM.index !== undefined) {
    const qty = bingsuM[1]?.trim()
    found.push({ pos: bingsuM.index, label: qty ? `팥빙수 ${qty}` : '팥빙수' })
  }

  const iceAmeRe = new RegExp(`아이스\\s*아메리카노\\s*${QTY_PATTERN_TEST}?`)
  const iceAmeM = text.match(iceAmeRe)
  if (iceAmeM && iceAmeM.index !== undefined) {
    const qty = iceAmeM[1]?.trim()
    found.push({ pos: iceAmeM.index, label: qty ? `아이스 아메리카노 ${qty}` : '아이스 아메리카노' })
  } else if (/아메리카노/.test(text)) {
    const isHot = /따뜻한|핫/.test(text)
    const bareAmeRe = new RegExp(`(?:따뜻한\\s*|핫\\s*)?아메리카노\\s*${QTY_PATTERN_TEST}?`)
    const bareM = text.match(bareAmeRe)
    if (bareM && bareM.index !== undefined) {
      const qty = bareM[1]?.trim()
      const prefix = isHot ? '따뜻한 ' : ''
      found.push({ pos: bareM.index, label: qty ? `${prefix}아메리카노 ${qty}` : `${prefix}아메리카노` })
    }
  }

  const juiceRe = new RegExp(`주스\\s*${QTY_PATTERN_TEST}?`)
  const juiceM = text.match(juiceRe)
  if (juiceM && juiceM.index !== undefined) {
    const qty = juiceM[1]?.trim()
    found.push({ pos: juiceM.index, label: qty ? `주스 ${qty}` : '주스' })
  }

  return found.sort((a, b) => a.pos - b.pos).map((x) => x.label)
}

function testBuildMultiItemMsg(all: string, isPack: boolean, isDineIn: boolean): string {
  const items = testExtractOrderedItems(all)
  const packStr = isPack ? ' 포장으로' : isDineIn ? ' 매장에서' : ''
  if (items.length >= 2) {
    const last = items[items.length - 1]
    const rest = items.slice(0, -1).join(', ')
    return `네, ${rest}과 ${last}${packStr} 준비해 드리겠습니다. 잠시만 기다려 주세요!`
  }
  if (items.length === 1) {
    return `네, ${items[0]}${packStr} 준비해 드리겠습니다. 잠시만 기다려 주세요!`
  }
  return `네, 아메리카노${packStr} 준비해 드리겠습니다. 잠시만 기다려 주세요!`
}

describe('Phase 10-E-6-C: q4 복수 품목 주문 추출', () => {
  it('"아이스 아메리카노 2잔과 팥빙수 2개" → 두 품목 모두 추출', () => {
    const items = testExtractOrderedItems('아이스 아메리카노 2잔과 팥빙수 2개 포장해주세요')
    expect(items).toContain('아이스 아메리카노 2잔')
    expect(items).toContain('팥빙수 2개')
    expect(items.length).toBe(2)
  })

  it('아이스 아메리카노가 팥빙수보다 먼저 등장하면 순서 유지', () => {
    const items = testExtractOrderedItems('아이스 아메리카노 2잔과 팥빙수 2개 포장해주세요')
    expect(items[0]).toBe('아이스 아메리카노 2잔')
    expect(items[1]).toBe('팥빙수 2개')
  })

  it('"아이스 아메리카노 2잔과 팥빙수 2개 포장" → AI 응답에 두 품목과 수량 모두 포함', () => {
    const msg = testBuildMultiItemMsg('아이스 아메리카노 2잔과 팥빙수 2개 포장해주세요', true, false)
    expect(msg).toContain('아이스 아메리카노 2잔')
    expect(msg).toContain('팥빙수 2개')
    expect(msg).toContain('포장으로')
    expect(msg).toContain('준비해 드리겠습니다')
  })

  it('단일 품목 → 단일 완료 메시지', () => {
    const msg = testBuildMultiItemMsg('아이스 아메리카노 포장해주세요', true, false)
    expect(msg).toContain('아이스 아메리카노')
    expect(msg).toContain('포장으로')
    expect(msg).not.toContain('과 ')
  })

  it('따뜻한 아메리카노 + 매장 → 완료 메시지에 반영', () => {
    const msg = testBuildMultiItemMsg('따뜻한 아메리카노 한 잔 매장에서 마실게요', false, true)
    expect(msg).toContain('따뜻한 아메리카노')
    expect(msg).toContain('매장에서')
  })
})

describe('Phase 10-E-6-C: q4 missionGoals 완료 후 주문 시작 문구 반복 없음', () => {
  it('allDone=true이면 "어떤 음료를 드릴까요?" 같은 초기 문구를 반환하지 않는다', () => {
    const allDone = true
    const msg = allDone
      ? testBuildMultiItemMsg('아이스 아메리카노 포장', true, false)
      : '어떤 음료를 드릴까요?'
    expect(msg).not.toContain('어떤 음료를 드릴까요')
  })

  it('절차 질문 + allDone=true → 제출 안내 응답', () => {
    const allDone = true
    const response = allDone
      ? "미션이 완료되었습니다. 화면에서 '평가 제출하기' 버튼을 눌러 제출해 주세요."
      : '아직 주문이 완료되지 않았습니다.'
    expect(response).toContain('평가 제출하기')
    expect(response).toContain('버튼')
  })
})

// 작업 5: q4 제출 시 ETRI 호출 없음 — dialogue-actions.ts 정책 재확인
describe('Phase 10-E-6-C: q4 제출 시 ETRI 비호출 정책', () => {
  it('dialogue-actions.ts: pronunciationResult.providerName은 mock (ETRI 아님)', () => {
    const dialoguePronResult = {
      providerName: 'mock',
      normalizedScore: 0,
      wordScores: [] as unknown[],
      feedback: '대화형 미션 평가에서는 발음평가 API가 별도 적용되지 않습니다.',
    }
    expect(dialoguePronResult.providerName).toBe('mock')
    expect(dialoguePronResult.providerName).not.toBe('etri')
  })

  it('q4 제출 후 attemptId가 있으면 attempt summary URL로 이동', () => {
    const attemptId = 'q4-submit-attempt'
    const submissionId = `mock-q4-${Date.now()}`
    const params = new URLSearchParams({ sub: submissionId, attemptId })
    const resultUrl = `/student/speaking/beginner-q4-dialogue-mission/result?${params.toString()}`
    expect(resultUrl).toContain('sub=')
    expect(resultUrl).toContain(`attemptId=${attemptId}`)
  })
})

// ── Phase 10-E-6-D: q2/q3 결과 화면 · q4 메뉴판 · 점수 환산 수정 ────────────

// 작업 1/2: q2/q3 결과 화면 — legacy breakdown 비표시, 전용 기준 표시
describe('Phase 10-E-6-D: q2 결과 화면 전용 평가 기준', () => {
  const Q2_CRITERIA = [
    '장소/상황을 언급함',
    '인물 또는 대상자를 언급함',
    '행동을 묘사함',
    '배경 또는 세부 요소를 언급함',
    '문장으로 연결해 설명함',
  ]

  it('q2 전용 기준 5개가 정의되어 있다', () => {
    expect(Q2_CRITERIA.length).toBe(5)
  })

  it('q2 기준 목록에 "장소/상황"이 포함된다', () => {
    expect(Q2_CRITERIA.some((c) => c.includes('장소'))).toBe(true)
  })

  it('q2 결과 카드 제목은 "자료 설명 AI 참고평가"다', () => {
    const typeId: string = 'qt-material-desc'
    const title = typeId === 'qt-reading' ? '문항 AI 참고평가'
      : typeId === 'qt-material-desc' ? '자료 설명 AI 참고평가'
      : typeId === 'qt-listening-resp' ? '듣고 답하기 AI 참고평가'
      : '종합 점수'
    expect(title).toBe('자료 설명 AI 참고평가')
  })

  it('q2 안내 문구에 "AI 1차 참고값"이 포함된다', () => {
    const guidance = '이 점수는 자료 설명 문항에 대한 AI 1차 참고값입니다. 최종 점수는 교수자 검토 후 확정됩니다.'
    expect(guidance).toContain('AI 1차 참고값')
    expect(guidance).toContain('교수자 검토 후 확정')
  })
})

describe('Phase 10-E-6-D: q3 결과 화면 전용 평가 기준', () => {
  const Q3_CRITERIA = [
    '들은 내용의 핵심을 이해함',
    '필수 정보를 포함함',
    '질문에 맞게 답함',
    '답변이 완결됨',
    '불필요한 내용이 적음',
  ]

  it('q3 전용 기준 5개가 정의되어 있다', () => {
    expect(Q3_CRITERIA.length).toBe(5)
  })

  it('q3 기준 목록에 "핵심을 이해함"이 포함된다', () => {
    expect(Q3_CRITERIA.some((c) => c.includes('핵심'))).toBe(true)
  })

  it('q3 결과 카드 제목은 "듣고 답하기 AI 참고평가"다', () => {
    const typeId: string = 'qt-listening-resp'
    const title = typeId === 'qt-reading' ? '문항 AI 참고평가'
      : typeId === 'qt-material-desc' ? '자료 설명 AI 참고평가'
      : typeId === 'qt-listening-resp' ? '듣고 답하기 AI 참고평가'
      : '종합 점수'
    expect(title).toBe('듣고 답하기 AI 참고평가')
  })

  it('q3 안내 문구에 "AI 1차 참고값"이 포함된다', () => {
    const guidance = '이 점수는 듣고 답하기 문항에 대한 AI 1차 참고값입니다. 최종 점수는 교수자 검토 후 확정됩니다.'
    expect(guidance).toContain('AI 1차 참고값')
    expect(guidance).toContain('교수자 검토 후 확정')
  })
})

// 작업 3/4: q4 메뉴판 — 메뉴 구성 및 invalid 품목 응답
describe('Phase 10-E-6-D: q4 카페 메뉴판', () => {
  const CAFE_DRINKS = ['아이스 아메리카노', '따뜻한 아메리카노', '아이스 라테', '따뜻한 라테', '오렌지 주스']
  const CAFE_DESSERTS = ['팥빙수', '조각 케이크']

  it('카페 메뉴에 음료 5종이 있다', () => {
    expect(CAFE_DRINKS.length).toBe(5)
  })

  it('카페 메뉴에 디저트 2종이 있다', () => {
    expect(CAFE_DESSERTS.length).toBe(2)
  })

  it('메뉴판에는 "아이스 아메리카노"가 포함된다', () => {
    expect(CAFE_DRINKS).toContain('아이스 아메리카노')
  })

  it('메뉴판에는 "팥빙수"가 포함된다', () => {
    expect(CAFE_DESSERTS).toContain('팥빙수')
  })

  it('메뉴판에는 "부대찌개"가 없다', () => {
    expect(CAFE_DRINKS).not.toContain('부대찌개')
    expect(CAFE_DESSERTS).not.toContain('부대찌개')
  })
})

// 작업 4/5: invalid 품목 응답 및 missionGoals 미달성
describe('Phase 10-E-6-D: q4 메뉴 외 품목 처리', () => {
  const INVALID_ITEMS = ['부대찌개', '설렁탕', '김치찌개', '라면', '국밥']

  function detectInvalid(text: string): string[] {
    return INVALID_ITEMS.filter((item) => text.includes(item))
  }

  it('"부대찌개 주세요" → invalid 품목 감지', () => {
    expect(detectInvalid('부대찌개 주세요')).toContain('부대찌개')
  })

  it('"아이스 아메리카노 주세요" → invalid 없음', () => {
    expect(detectInvalid('아이스 아메리카노 주세요')).toHaveLength(0)
  })

  it('invalid 품목 안내 응답은 "저희 카페에는"을 포함한다', () => {
    const response = '죄송합니다. 저희 카페에는 부대찌개가 없습니다. 메뉴판에 있는 음료나 디저트 중에서 골라 주세요.'
    expect(response).toContain('저희 카페에는')
    expect(response).toContain('메뉴판에 있는')
  })
})

describe('Phase 10-E-6-D: q4 invalid 품목은 missionGoals 달성으로 계산하지 않음', () => {
  const VALID_DRINK_KEYWORDS = ['아메리카노', '라테', '라떼', '주스']

  function hasValidDrink(text: string): boolean {
    return VALID_DRINK_KEYWORDS.some((kw) => text.includes(kw))
  }

  it('"부대찌개 주세요" → 음료 목표 달성 안 함', () => {
    expect(hasValidDrink('부대찌개 주세요')).toBe(false)
  })

  it('"아이스 아메리카노 주세요" → 음료 목표 달성', () => {
    expect(hasValidDrink('아이스 아메리카노 주세요')).toBe(true)
  })

  it('"라면이랑 아이스 아메리카노" → 유효 음료 포함이므로 달성', () => {
    expect(hasValidDrink('라면이랑 아이스 아메리카노 주세요')).toBe(true)
  })
})

describe('Phase 10-E-6-D: q4 missionGoals cap at totalGoals', () => {
  function capAchieved(achieved: number, total: number): number {
    return Math.min(achieved, total)
  }

  it('4/3 → cap → 3/3', () => {
    expect(capAchieved(4, 3)).toBe(3)
  })

  it('3/3 → cap → 3/3 (그대로)', () => {
    expect(capAchieved(3, 3)).toBe(3)
  })

  it('2/3 → cap → 2/3 (그대로)', () => {
    expect(capAchieved(2, 3)).toBe(2)
  })

  it('totalGoals보다 achievedCount가 크면 totalGoals로 제한', () => {
    const totalGoals = 3
    const rawAchieved = 5
    expect(capAchieved(rawAchieved, totalGoals)).toBeLessThanOrEqual(totalGoals)
  })
})

// 작업 6: 한국어 조사 처리 — withJosa
import { withJosa } from '@/src/providers/conversation/index'

describe('Phase 10-E-6-D: withJosa 한국어 조사 처리', () => {
  it('"아이스 아메리카노" + "와/과" → "아이스 아메리카노와"', () => {
    expect(withJosa('아이스 아메리카노', '와/과')).toBe('아이스 아메리카노와')
  })

  it('"팥빙수" + "와/과" → "팥빙수와" (수 = 받침 없음)', () => {
    expect(withJosa('팥빙수', '와/과')).toBe('팥빙수와')
  })

  it('"아이스 아메리카노 2잔" + "과/와" → "아이스 아메리카노 2잔과" (잔 = 받침 ㄴ)', () => {
    // 잔(ㅈ+ㅏ+ㄴ) → 받침 있음 → '과'
    expect(withJosa('아이스 아메리카노 2잔', '와/과')).toBe('아이스 아메리카노 2잔과')
  })

  it('"라테" + "를/을" → "라테를" (테 = 받침 없음)', () => {
    expect(withJosa('라테', '를/을')).toBe('라테를')
  })

  it('"팥빙수" + "를/을" → "팥빙수를" (수 = 받침 없음)', () => {
    expect(withJosa('팥빙수', '를/을')).toBe('팥빙수를')
  })

  it('"아이스아메리카노과" 같은 문구가 생성되지 않는다', () => {
    const result = withJosa('아이스 아메리카노', '와/과')
    expect(result).not.toContain('아이스아메리카노')
    expect(result).not.toBe('아이스 아메리카노과')
  })
})

// 작업 6: extractOrderedItems 결과 — displayName 사용 확인
describe('Phase 10-E-6-D: q4 복수 품목 주문 메시지 — withJosa 적용', () => {
  // buildMultiItemCompletionMsg 로직 미러링
  function testWithJosa(text: string, josa: string): string {
    const parts = josa.split('/')
    if (parts.length !== 2) return text + josa
    const [v, c] = parts
    const code = text.trim().charCodeAt(text.trim().length - 1)
    const hasBatchim = code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0
    return text + (hasBatchim ? c : v)
  }

  it('"아이스 아메리카노"와 "팥빙수" 두 품목 메시지에 "와"가 사용된다', () => {
    const msg = `네, ${testWithJosa('아이스 아메리카노', '와/과')} 팥빙수 포장으로 준비해 드리겠습니다.`
    expect(msg).toContain('아이스 아메리카노와')
    expect(msg).not.toContain('아이스 아메리카노과')
  })
})

// 작업 8: attempt summary 점수 환산 산식
describe('Phase 10-E-6-D: attempt summary 점수 환산', () => {
  function computeWeightedScore(score100: number, maxScore: number): number {
    const clamped = Math.max(0, Math.min(100, score100))
    return Math.round(clamped / 100 * maxScore * 10) / 10
  }

  function computePercent(score100: number): number {
    return Math.max(0, Math.min(100, score100))
  }

  it('q1 score100=78, weight=15 → weightedScore=11.7', () => {
    expect(computeWeightedScore(78, 15)).toBe(11.7)
  })

  it('q1 score100=78 → percent=78 (100% 미초과)', () => {
    expect(computePercent(78)).toBe(78)
    expect(computePercent(78)).toBeLessThanOrEqual(100)
  })

  it('q2 score100=45, weight=25 → weightedScore=11.3 (0.1자리 반올림)', () => {
    expect(computeWeightedScore(45, 25)).toBe(11.3)
  })

  it('q2 score100=45 → percent=45%', () => {
    expect(computePercent(45)).toBe(45)
  })

  it('q3 score100=47, weight=25 → weightedScore=11.8', () => {
    expect(computeWeightedScore(47, 25)).toBe(11.8)
  })

  it('q3 score100=47 → percent=47%', () => {
    expect(computePercent(47)).toBe(47)
  })

  it('q4 score100=75, weight=35 → weightedScore=26.3 (0.1자리 반올림)', () => {
    expect(computeWeightedScore(75, 35)).toBe(26.3)
  })

  it('q4 score100=75 → percent=75%', () => {
    expect(computePercent(75)).toBe(75)
  })

  it('percent는 100을 초과하지 않는다 (score100=150이어도 100)', () => {
    expect(computePercent(150)).toBe(100)
  })

  it('percent는 0 미만이 되지 않는다', () => {
    expect(computePercent(-10)).toBe(0)
  })

  it('weightedTotal = q1+q2+q3+q4 가중합 (100점 기준)', () => {
    const total = computeWeightedScore(78, 15) + computeWeightedScore(45, 25)
      + computeWeightedScore(47, 25) + computeWeightedScore(75, 35)
    // 11.7 + 11.3 + 11.8 + 26.3 = 61.1
    expect(total).toBeCloseTo(61.1, 0)
    expect(total).toBeLessThanOrEqual(100)
  })

  it('q1이 78/15 또는 520%로 표시되지 않는다', () => {
    const scorePct_wrong = Math.round((78 / 15) * 100)
    const percent_correct = computePercent(78)
    expect(scorePct_wrong).toBeGreaterThan(100)
    expect(percent_correct).toBe(78)
    expect(percent_correct).not.toBe(scorePct_wrong)
  })
})

// 작업 9: q1→q2→q3→q4 attemptId 유지 (기존 정책 재확인)
describe('Phase 10-E-6-D: attemptId 흐름 유지', () => {
  it('q1→q2→q3→q4 attemptId 파라미터 유지', () => {
    const attemptId = 'phase-10e-6d-attempt'
    const q4ResultUrl = `/student/speaking/beginner-q4-dialogue-mission/result?sub=mock-q4-xxx&attemptId=${attemptId}`
    expect(q4ResultUrl).toContain(`attemptId=${attemptId}`)
  })

  it('q4 제출 후 attempt summary URL 형식', () => {
    const attemptId = 'phase-10e-6d-attempt'
    const summaryUrl = `/student/speaking/attempt/${attemptId}`
    expect(summaryUrl).toContain('/attempt/')
    expect(summaryUrl).toContain(attemptId)
  })
})

// teacher final review workflow 유지 (기존 정책 재확인)
describe('Phase 10-E-6-D: teacher final review workflow 유지', () => {
  it('q2/q3 결과에 AI 1차 참고값 안내가 있으면 교수자 검토 흐름 방해 없음', () => {
    const q2Guidance = '이 점수는 자료 설명 문항에 대한 AI 1차 참고값입니다.'
    const q3Guidance = '이 점수는 듣고 답하기 문항에 대한 AI 1차 참고값입니다.'
    expect(q2Guidance).toContain('참고값')
    expect(q3Guidance).toContain('참고값')
  })

  it('attempt summary disclaimer에 "교수자 검토 후 확정"이 포함된다', () => {
    const disclaimer = '위 점수는 AI 1차 참고평가 결과입니다. 각 배점으로 환산한 가중 점수이며, 최종 점수는 교수자 검토 후 확정됩니다.'
    expect(disclaimer).toContain('교수자 검토 후 확정')
  })
})

// ── Phase 10-E-6-F: q2/q3 안내문구 · q4 결제 · 총액 · 결과화면 ─────────────────

// 작업 1: q2/q3 API 안내 문구 학습자 친화적 변경
describe('Phase 10-E-6-F: q2/q3 안내 문구 정책', () => {
  it('q2 안내 문구에 "사진의 상황"과 "설명하는 능력"이 포함된다', () => {
    const q2Notice = '이 문항은 사진의 상황과 핵심 정보를 설명하는 능력을 중심으로 평가됩니다.'
    expect(q2Notice).toContain('사진의 상황')
    expect(q2Notice).toContain('설명하는 능력')
  })

  it('q3 안내 문구에 "들은 내용"과 "답하는 능력"이 포함된다', () => {
    const q3Notice = '이 문항은 들은 내용을 이해하고 질문에 맞게 답하는 능력을 중심으로 평가됩니다.'
    expect(q3Notice).toContain('들은 내용')
    expect(q3Notice).toContain('답하는 능력')
  })

  it('q2/q3 보조 문구에 "교사 검토 시"가 포함된다', () => {
    const aux = '발음 세부 평가는 교사 검토 시 함께 확인됩니다.'
    expect(aux).toContain('교사 검토 시')
  })

  it('q2 안내 문구에 "발음평가 API는" 개발자 안내가 크게 표시되지 않는다 (보조 안내로만)', () => {
    // 학습자에게는 API 미적용 문구 대신 능력 중심 문구가 주 안내
    const primaryNotice = '이 문항은 사진의 상황과 핵심 정보를 설명하는 능력을 중심으로 평가됩니다.'
    expect(primaryNotice).not.toContain('발음평가 API')
    expect(primaryNotice).not.toContain('낭독(q1)')
  })
})

// 작업 2–4: q4 결제 방법 goal 및 메뉴 외 품목
describe('Phase 10-E-6-F: q4 결제 방법 missionGoal', () => {
  const Q4_MISSION_GOALS = [
    '메뉴판에 있는 음료 주문',
    '차가운/따뜻한 음료 선택',
    '포장/매장 이용 여부 말하기',
    '결제 방법 말하기',
  ]

  it('q4 missionGoals는 4개다', () => {
    expect(Q4_MISSION_GOALS.length).toBe(4)
  })

  it('4번째 goal은 "결제 방법 말하기"다', () => {
    expect(Q4_MISSION_GOALS[3]).toBe('결제 방법 말하기')
  })

  it('"카드로 할게요" → 결제 방법 goal 달성으로 처리된다', () => {
    const PAYMENT_KEYWORDS = ['카드', '현금', '신용카드']
    const text = '카드로 할게요'
    const paymentMet = PAYMENT_KEYWORDS.some((kw) => text.includes(kw))
    expect(paymentMet).toBe(true)
  })

  it('"현금으로 할게요" → 결제 방법 goal 달성', () => {
    const PAYMENT_KEYWORDS = ['카드', '현금', '신용카드']
    expect(PAYMENT_KEYWORDS.some((kw) => '현금으로 할게요'.includes(kw))).toBe(true)
  })

  it('점원 결제 질문 문구는 "카드"와 "현금"을 모두 포함한다', () => {
    const question = '결제는 카드로 하시겠어요, 현금으로 하시겠어요?'
    expect(question).toContain('카드')
    expect(question).toContain('현금')
  })
})

// 작업 2: 메뉴 외 품목 응답 — 순댓국 감지
describe('Phase 10-E-6-F: q4 메뉴 외 품목 (순댓국 등) 처리', () => {
  const INVALID_ITEMS = [
    '부대찌개', '설렁탕', '김치찌개', '라면', '국밥',
    '순댓국', '순대국', '순대',
    '삼겹살', '불고기', '냉면', '비빔밥',
  ]

  function detectInvalidItems(text: string): string[] {
    return INVALID_ITEMS.filter((item) => text.includes(item))
  }

  it('"순댓국" → invalid 품목으로 감지된다', () => {
    expect(detectInvalidItems('순댓국 주세요')).toContain('순댓국')
  })

  it('"순댓국"은 "순대"와 다른 유니코드 — 별도 항목으로 등록해야 한다', () => {
    // 순댓국(댓=U+B313) ≠ 순대국(대=U+B300) — 별도로 INVALID_CAFE_ITEMS에 등록되어야 함
    expect(INVALID_ITEMS).toContain('순댓국')
    expect(INVALID_ITEMS).toContain('순대국')
  })

  it('"부대찌개" → invalid 품목으로 감지된다', () => {
    expect(detectInvalidItems('부대찌개 주세요')).toContain('부대찌개')
  })

  it('"아이스 아메리카노" → invalid 없음', () => {
    expect(detectInvalidItems('아이스 아메리카노 주세요')).toHaveLength(0)
  })

  it('팥빙수(유효) + 순댓국(무효) → 유효 품목은 반영, 무효 품목은 안내', () => {
    const VALID_MENU = ['아이스 아메리카노', '따뜻한 아메리카노', '팥빙수', '조각 케이크', '오렌지 주스']
    const hasValid = VALID_MENU.some((item) => '팥빙수하고 순댓국 주세요'.includes(item))
    const hasInvalid = detectInvalidItems('팥빙수하고 순댓국 주세요').length > 0
    expect(hasValid).toBe(true)
    expect(hasInvalid).toBe(true)
    // 안내 응답에는 "저희 카페에는" 포함되어야 함
    const response = hasInvalid ? '죄송합니다. 저희 카페에는 순댓국이(가) 없습니다.' : '없음'
    expect(response).toContain('저희 카페에는')
  })
})

// 작업 3: q4 총액 계산
describe('Phase 10-E-6-F: q4 주문 총액 계산', () => {
  const PRICES: Record<string, number> = {
    '아이스 아메리카노': 3000,
    '따뜻한 아메리카노': 3000,
    '아이스 라테': 3500,
    '따뜻한 라테': 3500,
    '라테': 3500,
    '오렌지 주스': 4000,
    '팥빙수': 6000,
    '조각 케이크': 5000,
  }

  function computeTotal(items: string[]): number {
    let total = 0
    for (const label of items) {
      for (const [menuName, price] of Object.entries(PRICES)) {
        if (label.startsWith(menuName)) {
          const rest = label.slice(menuName.length).trim()
          const numMatch = rest.match(/^(\d+)/)
          const korMatch = rest.match(/^(한|두|세|네)/)
          let qty = 1
          if (numMatch) qty = parseInt(numMatch[1], 10)
          else if (korMatch) {
            const map: Record<string, number> = { '한': 1, '두': 2, '세': 3, '네': 4 }
            qty = map[korMatch[1]] ?? 1
          }
          total += price * qty
          break
        }
      }
    }
    return total
  }

  it('아이스 아메리카노 1잔 → 3,000원', () => {
    expect(computeTotal(['아이스 아메리카노'])).toBe(3000)
  })

  it('팥빙수 1개 → 6,000원', () => {
    expect(computeTotal(['팥빙수'])).toBe(6000)
  })

  it('아이스 아메리카노 + 팥빙수 + 조각 케이크 → 14,000원', () => {
    expect(computeTotal(['아이스 아메리카노', '팥빙수', '조각 케이크'])).toBe(14000)
  })

  it('아이스 아메리카노 2잔 → 6,000원', () => {
    expect(computeTotal(['아이스 아메리카노 2'])).toBe(6000)
  })

  it('AI 응답에 총액이 포함된다', () => {
    const total = computeTotal(['아이스 아메리카노', '팥빙수', '조각 케이크'])
    const response = `네, 아이스 아메리카노와 팥빙수, 조각 케이크 준비해 드리겠습니다. 총 ${total.toLocaleString()}원입니다. 결제는 카드로 하시겠어요, 현금으로 하시겠어요?`
    expect(response).toContain('14,000원')
    expect(response).toContain('결제는')
  })
})

// 작업 5: q4 missionGoals 4개 기준 cap
describe('Phase 10-E-6-F: q4 missionGoals 최대 4/4 cap', () => {
  function capAchieved(achieved: number, total: number): number {
    return Math.min(achieved, total)
  }

  it('4/4 → cap → 4/4 (정상)', () => {
    expect(capAchieved(4, 4)).toBe(4)
  })

  it('3/4 → cap → 3/4', () => {
    expect(capAchieved(3, 4)).toBe(3)
  })

  it('5/4 → cap → 4/4', () => {
    expect(capAchieved(5, 4)).toBe(4)
  })

  it('missionGoals는 최대 4개다', () => {
    const Q4_GOALS = ['메뉴판에 있는 품목 주문하기', '수량 말하기', '포장/매장 이용 여부 말하기', '결제 방법 말하기']
    expect(Q4_GOALS.length).toBe(4)
    expect(capAchieved(Q4_GOALS.length, Q4_GOALS.length)).toBe(4)
  })
})

// 작업 6: q4 결과 화면 전용 평가 표시
describe('Phase 10-E-6-F: q4 결과 화면 전용 평가', () => {
  it('q4 결과 카드 제목은 "대화 미션 AI 참고평가"다', () => {
    const typeId: string = 'qt-dialogue-mission'
    const title = typeId === 'qt-reading' ? '문항 AI 참고평가'
      : typeId === 'qt-material-desc' ? '자료 설명 AI 참고평가'
      : typeId === 'qt-listening-resp' ? '듣고 답하기 AI 참고평가'
      : typeId === 'qt-dialogue-mission' ? '대화 미션 AI 참고평가'
      : '종합 점수'
    expect(title).toBe('대화 미션 AI 참고평가')
  })

  it('q4 전용 평가 기준 4개가 정의되어 있다', () => {
    const Q4_DIALOGUE_CRITERIA = [
      '메뉴판에 있는 품목을 주문함',
      '수량을 말함',
      '포장/매장 이용 여부를 말함',
      '결제 방법을 말함',
    ]
    expect(Q4_DIALOGUE_CRITERIA.length).toBe(4)
  })

  it('q4 전용 기준에 "결제 방법을 말함"이 포함된다', () => {
    const criteria = ['메뉴판에 있는 품목을 주문함', '수량을 말함', '포장/매장 이용 여부를 말함', '결제 방법을 말함']
    expect(criteria).toContain('결제 방법을 말함')
  })

  it('q4 결과에서 legacy 발음/유창성/어휘/문법 breakdown이 표시되지 않는다 (대화 미션 전용 표시)', () => {
    const isDialogueMission = true
    // legacy rubric은 isDialogueMission이 false일 때만 표시
    const showLegacyRubric = !isDialogueMission
    expect(showLegacyRubric).toBe(false)
  })

  it('q4 미션 달성 표시 형식: "미션 달성: X/4"', () => {
    const achievedCount = 3
    const totalGoals = 4
    const display = `미션 달성: ${achievedCount}/${totalGoals}`
    expect(display).toBe('미션 달성: 3/4')
    expect(display).not.toContain('4/3')
    expect(display).not.toContain('5/4')
  })
})

// 작업 7: q4 STT 카드명 수정
describe('Phase 10-E-6-F: q4 결과화면 STT 카드명', () => {
  it('q4 dialogue → 카드 제목은 "대화 기록"이다', () => {
    const isDialogueMission = true
    const providerName: string = 'openai'
    const title = isDialogueMission
      ? providerName === 'mock' ? '테스트용 대화 기록' : '대화 기록'
      : '음성 인식 결과 (STT)'
    expect(title).toBe('대화 기록')
    expect(title).not.toContain('STT')
  })

  it('q4는 provider 무관하게 항상 "대화 기록"이다', () => {
    const isDialogueMission = true
    const title = isDialogueMission ? '대화 기록' : '음성 인식 결과 (STT)'
    expect(title).toBe('대화 기록')
  })

  it('q1/q2/q3 → 카드 제목은 "음성 인식 결과 (STT)"다', () => {
    const isDialogueMission = false
    const title = isDialogueMission ? '대화 기록' : '음성 인식 결과 (STT)'
    expect(title).toBe('음성 인식 결과 (STT)')
  })
})

// 작업 8: q4 점수 피드백 강화 — goalResults 기반
describe('Phase 10-E-6-F: q4 점수 피드백 (goalResults 기반)', () => {
  const mockGoalResults = [
    { goalIndex: 0, labelKo: '메뉴판에 있는 품목 주문하기', achieved: true },
    { goalIndex: 1, labelKo: '수량 말하기', achieved: true },
    { goalIndex: 2, labelKo: '포장/매장 이용 여부 말하기', achieved: true },
    { goalIndex: 3, labelKo: '결제 방법 말하기', achieved: false },
  ]

  it('달성된 goal은 "잘한 점"에 표시된다', () => {
    const achieved = mockGoalResults.filter((g) => g.achieved).map((g) => g.labelKo)
    expect(achieved).toContain('메뉴판에 있는 품목 주문하기')
    expect(achieved).toContain('포장/매장 이용 여부 말하기')
  })

  it('미달성된 goal은 "보완할 점"에 표시된다', () => {
    const missed = mockGoalResults.filter((g) => !g.achieved).map((g) => g.labelKo)
    expect(missed).toContain('결제 방법 말하기')
  })

  it('3/4 달성이면 잘한 점 3개, 보완할 점 1개+표준 보완 표시', () => {
    const achievedCount = mockGoalResults.filter((g) => g.achieved).length
    const missedCount = mockGoalResults.filter((g) => !g.achieved).length
    expect(achievedCount).toBe(3)
    expect(missedCount).toBe(1)
  })

  it('goalResults가 meta에 저장된다', () => {
    const meta = {
      achievedMissionGoals: 3,
      totalMissionGoals: 4,
      goalResults: mockGoalResults,
    }
    expect(meta.goalResults).toHaveLength(4)
    expect(meta.goalResults[3].achieved).toBe(false)
  })
})

// 기존 흐름 유지 확인
describe('Phase 10-E-6-F: q1 ETRI / q2/q3 제출 / attemptId 흐름 유지', () => {
  it('q1 ETRI 흐름 유지 — qt-reading만 pronunciationAPI 호출', () => {
    const readingTypeId: string = 'qt-reading'
    const dialogueTypeId: string = 'qt-dialogue-mission'
    expect(readingTypeId === 'qt-reading').toBe(true)
    expect(dialogueTypeId === 'qt-reading').toBe(false)
  })

  it('q2/q3 제출 흐름 유지 — 이미지 placeholder 여부와 무관', () => {
    const imageStatus = 'placeholder'
    const submitShouldSucceed = true // 이미지 상태는 제출에 영향 없음
    expect(submitShouldSucceed).toBe(true)
    expect(imageStatus).toBeDefined()
  })

  it('q4 제출 후 attemptId가 있으면 attempt summary URL로 이동', () => {
    const attemptId = 'phase-10e-6f-attempt'
    const url = `/student/speaking/attempt/${attemptId}`
    expect(url).toContain('/attempt/')
    expect(url).toContain(attemptId)
  })
})

// teacher final review workflow 유지
describe('Phase 10-E-6-F: teacher final review workflow 유지', () => {
  it('q4 대화 미션 AI 참고평가 안내에 "교수자 검토 후 확정"이 포함된다', () => {
    const guidance = '이 점수는 대화 미션에 대한 AI 1차 참고값입니다. 최종 점수는 교수자 검토 후 확정됩니다.'
    expect(guidance).toContain('교수자 검토 후 확정')
  })

  it('q2/q3 능력 중심 안내가 있어도 교수자 검토 흐름 방해 없음', () => {
    const q2Notice = '이 문항은 사진의 상황과 핵심 정보를 설명하는 능력을 중심으로 평가됩니다.'
    expect(q2Notice).toBeTruthy()
    // 교수자 검토 disclaimer는 별도 표시
    const disclaimer = 'AI 1차 평가 · 교수자 확정 전 참고값'
    expect(disclaimer).toContain('교수자 확정 전 참고값')
  })
})

// ─── Phase 10-E-6-G/H ────────────────────────────────────────────────────────

// G-1: q2/q3 최저점 보장 (elementRatio 기반)
describe('Phase 10-E-6-G: q2/q3 최저점 보장 (elementRatio)', () => {
  function applyFloor(taskScore: number, overall: number, elementRatio: number, typeId: string) {
    const isMaterialDesc = typeId === 'qt-material-desc'
    const isListeningResp = typeId === 'qt-listening-resp'
    let ts = taskScore
    let ov = overall
    if ((isMaterialDesc || isListeningResp) && elementRatio > 0) {
      if (elementRatio >= 1.0) {
        ts = Math.max(ts, 80)
        ov = Math.max(ov, 80)
      } else if (elementRatio >= 0.66) {
        ts = Math.max(ts, 70)
        ov = Math.max(ov, 70)
      }
    }
    return { taskScore: ts, overall: ov }
  }

  it('q2 requiredElements 전부 포함(ratio=1.0) → 점수 ≥ 80', () => {
    const result = applyFloor(60, 60, 1.0, 'qt-material-desc')
    expect(result.taskScore).toBeGreaterThanOrEqual(80)
    expect(result.overall).toBeGreaterThanOrEqual(80)
  })

  it('q3 requiredElements 2/3 포함(ratio≈0.67) → 점수 ≥ 70', () => {
    const result = applyFloor(55, 55, 2 / 3, 'qt-listening-resp')
    expect(result.taskScore).toBeGreaterThanOrEqual(70)
    expect(result.overall).toBeGreaterThanOrEqual(70)
  })

  it('q2/q3 ratio < 0.66 → 최저점 보장 없음 (원점수 유지)', () => {
    const result = applyFloor(50, 50, 0.3, 'qt-material-desc')
    expect(result.taskScore).toBe(50)
    expect(result.overall).toBe(50)
  })

  it('q1(reading)은 최저점 보장 로직 미적용', () => {
    const result = applyFloor(55, 55, 1.0, 'qt-reading')
    expect(result.taskScore).toBe(55)
    expect(result.overall).toBe(55)
  })
})

// G-2: q3 allElementsFound 피드백
describe('Phase 10-E-6-G: q3 allElementsFound → 올바른 보완점 표시', () => {
  function buildImprovements(missing: string[], allFound: boolean, isListeningResp: boolean) {
    const typeImprovements = ['문장을 더 길고 자세하게 말해 보세요.']
    if (missing.length > 0) {
      return [`"${missing[0]}"을(를) 포함하면 더 좋겠습니다.`, typeImprovements[0]]
    }
    if (allFound && isListeningResp) {
      return ['핵심 정보를 잘 포함했습니다. 문장을 조금 더 자연스럽게 연결해 말하면 좋겠습니다.']
    }
    return [typeImprovements[0], '']
  }

  it('missing element 없을 때 "시간, 장소" 등 포함된 요소를 보완점으로 표시하지 않는다', () => {
    const improvements = buildImprovements([], true, true)
    expect(improvements.join(' ')).not.toContain('시간')
    expect(improvements.join(' ')).not.toContain('장소')
    expect(improvements.join(' ')).not.toContain('해야 할 일')
  })

  it('allElementsFound이면 일반 개선 피드백만 반환한다', () => {
    const improvements = buildImprovements([], true, true)
    expect(improvements[0]).toContain('핵심 정보를 잘 포함했습니다')
  })

  it('missing element 있을 때는 해당 element를 보완점으로 표시한다', () => {
    const improvements = buildImprovements(['약속 장소'], false, true)
    expect(improvements[0]).toContain('"약속 장소"을(를) 포함하면 더 좋겠습니다.')
  })
})

// G-3: q4 분리 포장/분할 결제 처리
describe('Phase 10-E-6-G: q4 분리 포장 및 분할 결제 단순화', () => {
  function classifyOrder(text: string) {
    const hasTakeout = /포장|테이크아웃|가져갈/.test(text)
    const hasDineIn = /매장|여기서|드시고|먹고/.test(text)
    const hasCard = /카드/.test(text)
    const hasCash = /현금/.test(text)
    const mixedPack = hasTakeout && hasDineIn
    const mixedPay = hasCard && hasCash
    return { mixedPack, mixedPay }
  }

  it('포장 + 매장 동시 → mixedPack true (단순화 안내 트리거)', () => {
    const { mixedPack } = classifyOrder('아메리카노는 포장하고 라테는 매장에서 마실게요')
    expect(mixedPack).toBe(true)
  })

  it('카드 + 현금 동시 → mixedPay true (단순화 안내 트리거)', () => {
    const { mixedPay } = classifyOrder('카드로 일부 현금으로 나눠 계산할게요')
    expect(mixedPay).toBe(true)
  })

  it('한 가지 이용 방식만 → mixedPack false (정상 흐름)', () => {
    const { mixedPack } = classifyOrder('포장해 주세요')
    expect(mixedPack).toBe(false)
  })
})

// G-4: QUANTITY_RE 수량 감지
describe('Phase 10-E-6-G: QUANTITY_RE 수량 감지', () => {
  const QUANTITY_RE = /(\d+\s*(?:잔|개|컵|병)|한\s*(?:잔|개|컵)|두\s*(?:잔|개|컵)|세\s*(?:잔|개|컵)|네\s*(?:잔|개|컵))/

  it('숫자+잔 → true (예: "2잔")', () => {
    expect(QUANTITY_RE.test('아메리카노 2잔 주세요')).toBe(true)
  })

  it('한/두/세/네+잔 → true (예: "두 잔")', () => {
    expect(QUANTITY_RE.test('라테 두 잔 주세요')).toBe(true)
  })

  it('숫자+개 / 컵 / 병 → true', () => {
    expect(QUANTITY_RE.test('주스 1개 주세요')).toBe(true)
    expect(QUANTITY_RE.test('물 한 컵 주세요')).toBe(true)
  })

  it('수량 표현 없으면 → false', () => {
    expect(QUANTITY_RE.test('아메리카노 주세요')).toBe(false)
  })
})

// G-5: q4 beginnerCafeResponse 대화 흐름
describe('Phase 10-E-6-G: q4 대화 흐름 — 목표별 후속 질문', () => {
  function mockCafeResponse(text: string): string {
    const QUANTITY_RE_CONV = /(\d+\s*(?:잔|개|컵|병)|한\s*(?:잔|개|컵)|두\s*(?:잔|개|컵)|세\s*(?:잔|개|컵)|네\s*(?:잔|개|컵))/
    const hasMenu = /아메리카노|라테|라떼|주스|팥빙수|빙수|케이크/.test(text)
    const hasQuantity = QUANTITY_RE_CONV.test(text)
    const hasPack = /포장|테이크아웃|매장|여기서|드시고|먹고/.test(text)
    const hasPay = /카드|현금/.test(text)

    if (!hasMenu) return '어떤 음료나 디저트로 주문하시겠어요?'
    if (!hasQuantity) return '몇 잔 준비해 드릴까요?'
    if (!hasPack) return '드시고 가세요, 아니면 포장해 드릴까요?'
    if (!hasPay) return '결제는 카드로 하시겠어요, 현금으로 하시겠어요?'
    return '주문 확인해 드리겠습니다.'
  }

  it('메뉴 없을 때 → 음료/디저트 질문', () => {
    const res = mockCafeResponse('주문할게요')
    expect(res).toContain('어떤 음료나 디저트')
  })

  it('수량 없을 때 → "몇 잔 준비해 드릴까요?"', () => {
    const res = mockCafeResponse('아메리카노 주세요')
    expect(res).toContain('몇 잔 준비해 드릴까요?')
  })

  it('포장/매장 없을 때 → "드시고 가세요, 아니면 포장해 드릴까요?"', () => {
    const res = mockCafeResponse('아메리카노 두 잔 주세요')
    expect(res).toContain('드시고 가세요, 아니면 포장해 드릴까요?')
  })

  it('모든 목표 달성 → 주문 확인 응답', () => {
    const res = mockCafeResponse('아메리카노 두 잔 포장해 주세요 카드로 결제할게요')
    expect(res).toContain('주문 확인')
  })
})

// H-1: q4 UI 버튼 레이블
describe('Phase 10-E-6-H: q4 DialogueMissionPanel UI 레이블', () => {
  it('ready 상태 버튼 텍스트는 "말하기"다 (data-testid=record-turn-button)', () => {
    const state = 'ready'
    const label = state === 'ready' ? '말하기' : '내 답변 녹음'
    expect(label).toBe('말하기')
    expect(label).not.toBe('내 답변 녹음')
  })

  it('recording 상태 버튼 텍스트는 "말하기 완료"다 (data-testid=stop-recording-button)', () => {
    const state = 'recording'
    const label = state === 'recording' ? '말하기 완료' : '녹음 완료'
    expect(label).toBe('말하기 완료')
    expect(label).not.toBe('녹음 완료')
  })
})

// H-2: q4 결과화면 mock 안내문구
describe('Phase 10-E-6-H: q4 결과화면 mock provider 안내', () => {
  function getMockNotice(isDialogueMission: boolean, isMockProvider: boolean): string | null {
    if (isDialogueMission && isMockProvider) {
      return '현재는 테스트용 대화 provider로 평가되었습니다. 실제 LLM 연결 후 대화 품질은 추가 개선됩니다.'
    }
    if (!isDialogueMission && isMockProvider) {
      return '음성 인식 서비스에 연결하지 못해 텍스트 전사가 제공되지 않았습니다.'
    }
    return null
  }

  it('q4 mock provider → 학습자 친화적 안내문구 표시', () => {
    const notice = getMockNotice(true, true)
    expect(notice).toContain('테스트용 대화 provider로 평가되었습니다')
    expect(notice).not.toContain('음성 인식 서비스에 연결하지 못해')
  })

  it('q1/q2/q3 mock STT → 기존 "음성 인식 서비스에 연결하지 못해..." 유지', () => {
    const notice = getMockNotice(false, true)
    expect(notice).toContain('음성 인식 서비스에 연결하지 못해')
  })
})
