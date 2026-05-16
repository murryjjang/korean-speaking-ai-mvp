// v1.1 단계 19.6 [D7, D10]: 새 모델 — 한국어 본문 + (보조 언어 != ko면) 작은 글씨 보조.
//
// 단계 19까지 BilingualText의 mode='emphasize'/'switch' 두 모드를 호환 검증했지만
// 19.6에서 mode 개념이 폐기되고 단일 모델(한국어 본문 + 선택적 보조)로 단순화됨.
// 회귀 보호는:
//  - data-bilingual-supplement 마커가 보조 언어 코드일 때만 부착
//  - 본문은 한국어 단독으로도 항상 렌더됨
//  - 보조 영역은 text-xs + opacity-80 + RTL 처리

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
}

describe('[단계19.6-D7] dialogue-mission-panel — grammar_note BilingualText 인라인', () => {
  const src = read('src/components/dialogue-mission-panel.tsx')

  it('BilingualText import + grammarNote 블록에서 사용', () => {
    expect(src).toMatch(/import\s*\{\s*BilingualText\s*\}\s*from\s*['"]@\/src\/components\/ui\/bilingual-text['"]/)
    const idx = src.indexOf('turn.grammarNote')
    expect(idx).toBeGreaterThan(0)
    const block = src.slice(idx, idx + 1500)
    expect(block).toMatch(/<BilingualText/)
    expect(block).toMatch(/inline/)
  })

  it('mode prop 폐기 — emphasize 키워드 없음', () => {
    // mode="emphasize" 호출이 모두 제거되어야 함.
    expect(src).not.toMatch(/mode=['"]emphasize['"]/)
  })
})

describe('[단계19.6-D7] 자유 대화 — correction.reason 새 모델', () => {
  const src = read('app/student/conversation-practice/free-conversation-client.tsx')

  it('CorrectionReason 타입이 string | 객체 둘 다 허용', () => {
    expect(src).toMatch(/type\s+CorrectionReason\s*=\s*string\s*\|\s*\{[\s\S]{0,200}ko:\s*string/)
  })

  it('reason이 객체일 때 BilingualText 렌더 (mode 없음)', () => {
    expect(src).toMatch(/import\s*\{\s*BilingualText/)
    const idx = src.indexOf("typeof r === 'string'")
    expect(idx).toBeGreaterThan(0)
    const block = src.slice(idx, idx + 800)
    expect(block).toMatch(/<BilingualText/)
    expect(block).not.toMatch(/mode=['"]emphasize['"]/)
  })
})

describe('[단계19.6-D10] BilingualText 새 모델 회귀 보호', () => {
  const src = read('src/components/ui/bilingual-text.tsx')

  it('mode prop 제거', () => {
    expect(src).not.toMatch(/mode\s*=\s*['"]emphasize['"]/)
    expect(src).not.toMatch(/mode\s*=\s*['"]switch['"]/)
  })

  it('보조 영역 텍스트 클래스: text-xs + opacity-80 + muted', () => {
    expect(src).toMatch(/text-xs/)
    expect(src).toMatch(/opacity-80/)
    expect(src).toMatch(/text-text-muted/)
  })

  it('보조 영역은 lang === "ko"이거나 multilingual 없으면 미존재 (DOM 차단)', () => {
    // lang === 'ko' 또는 !multilingual → supplement = '' → showSupplement=false
    expect(src).toMatch(/lang\s*===\s*['"]ko['"]\s*\|\|\s*!multilingual/)
    expect(src).toMatch(/showSupplement\s*=\s*supplement\.length\s*>\s*0/)
  })

  it('ar lang일 때 dir="rtl" 적용 (텍스트 컨테이너 내부)', () => {
    expect(src).toMatch(/isRTLDisplay/)
    expect(src).toMatch(/dir=\{rtl/)
  })

  it('data-bilingual-supplement 마커 — 보조 표시될 때만 lang 값', () => {
    expect(src).toMatch(/data-bilingual-supplement=\{\s*showSupplement\s*\?\s*lang\s*:\s*undefined\s*\}/)
  })

  it('BilingualListItem 컴포넌트 export — 리스트용 변형', () => {
    expect(src).toMatch(/export\s+function\s+BilingualListItem/)
  })
})
