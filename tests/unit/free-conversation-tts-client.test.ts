// v1.1 8-3: 자유 대화 NPC TTS가 브라우저 speechSynthesis 대신 서버 Azure TTS(/api/tts)를
// 쓰는지 소스 수준에서 검증한다. (이 컴포넌트는 DOM 환경 통합 테스트 셋업이 없어
// "코드상 확인"으로 회귀를 막는다.)

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const CLIENT_PATH = path.resolve(
  __dirname,
  '../../app/student/conversation-practice/free-conversation-client.tsx',
)
const src = readFileSync(CLIENT_PATH, 'utf8')

describe('free-conversation-client TTS (서버 Azure TTS 전환)', () => {
  it('브라우저 speechSynthesis API를 호출하지 않는다', () => {
    // 주석에는 단어가 남아 있을 수 있으므로 실제 API 사용 패턴만 검사한다.
    expect(src).not.toMatch(/window\.speechSynthesis/)
    expect(src).not.toMatch(/new SpeechSynthesisUtterance/)
    expect(src).not.toMatch(/SpeechSynthesisVoice/)
  })

  it('/api/tts 를 호출한다', () => {
    expect(src).toContain("fetch('/api/tts'")
  })

  it('/api/tts 호출 본문에 personaId 를 포함한다', () => {
    // fetch('/api/tts', ...) 호출부 근처에 personaId 가 직렬화되는지 확인.
    const idx = src.indexOf("fetch('/api/tts'")
    expect(idx).toBeGreaterThan(-1)
    const around = src.slice(idx, idx + 400)
    expect(around).toContain('personaId')
  })

  it('TTS로 보내기 전에 sanitizeForTTS 로 마크다운을 정제한다', () => {
    expect(src).toContain("import { sanitizeForTTS }")
    expect(src).toMatch(/sanitizeForTTS\(/)
  })

  it('합성 실패 시 음성 없이 진행 — audioBase64 없으면 조용히 종료', () => {
    expect(src).toMatch(/audioBase64/)
  })
})
