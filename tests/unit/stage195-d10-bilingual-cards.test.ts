// v1.1 단계 19.5 [D10]: BilingualText emphasize 모드 — 자유 대화 요약·평가 결과
// 카드 전수 적용.
//
// 단계 18·19에서 부분 적용된 상태. 19.5에서:
//  - 자유 대화 요약 카드 + 학습 피드백 카드에 data-bilingual-mode="emphasize"
//    + data-emphasized 마커 부착 — 헤더 토글 1회로 모든 영역이 동시 강조 전환.
//  - MultilingualFeedback (평가 결과 보조 카드)에 같은 마커.
//  - MultilingualFeedbackBlock에 data-emphasized-lang 마커.
//
// 정적 검사로 마커가 존재하고 displayLang에 연동되는지 확인. 실제 토글 동작은
// useDisplayLanguage 단위 테스트(stage19-i18n-d6-d8)로 이미 보호.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
}

describe('[단계19.5-D10] 자유 대화 요약 카드 — emphasize 마커', () => {
  const src = read('app/student/conversation-practice/free-conversation-client.tsx')

  it('summary-ko 컨테이너에 data-bilingual-mode="emphasize" + data-emphasized', () => {
    expect(src).toMatch(/data-testid="summary-ko"[\s\S]{0,400}data-bilingual-mode="emphasize"/)
    expect(src).toMatch(/data-testid="summary-ko"[\s\S]{0,400}data-emphasized/)
  })

  it('summary-l1 컨테이너에 emphasize 마커', () => {
    expect(src).toMatch(/data-testid="summary-l1"[\s\S]{0,400}data-bilingual-mode="emphasize"/)
    expect(src).toMatch(/data-testid="summary-l1"[\s\S]{0,400}data-emphasized/)
  })

  it('feedback 행 (ko/l1) 모두 emphasize 마커', () => {
    expect(src).toMatch(/data-bilingual-mode="emphasize"[\s\S]{0,400}data-emphasized/)
    // useDisplay/koEmphasized/l1Emphasized 로직 존재
    expect(src).toMatch(/emphasized|useDisplay/)
  })

  it('비강조 행은 opacity-60 흐림', () => {
    expect(src).toMatch(/opacity-60 transition-opacity/)
  })
})

describe('[단계19.5-D10] 평가 결과 보조 카드 — emphasize 마커', () => {
  const mf = read('src/components/ui/multilingual-feedback.tsx')

  it('MultilingualFeedback Card에 data-bilingual-mode="emphasize" + data-emphasized', () => {
    expect(mf).toMatch(/data-bilingual-mode="emphasize"/)
    expect(mf).toMatch(/data-emphasized="true"/)
  })

  it('headers 토글 useDisplayLanguage 구독 (단일 토글)', () => {
    expect(mf).toMatch(/useDisplayLanguage/)
  })
})

describe('[단계19.5-D10] MultilingualFeedbackBlock — emphasize-lang 마커', () => {
  const mfb = read('src/components/multilingual-feedback-block.tsx')

  it('컨테이너에 data-bilingual-mode + data-emphasized-lang', () => {
    expect(mfb).toMatch(/data-bilingual-mode="emphasize"/)
    expect(mfb).toMatch(/data-emphasized-lang=/)
  })

  it('emphasizedLang은 hasMultilingual=true면 lang, 아니면 ko', () => {
    expect(mfb).toMatch(/hasMultilingual\s*\?\s*lang\s*:\s*['"]ko['"]/)
  })

  it('헤더 토글(useDisplayLanguage) 직접 구독', () => {
    expect(mfb).toMatch(/useDisplayLanguage/)
  })
})
