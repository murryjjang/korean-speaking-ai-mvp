// v1.1 단계 19 [D7]: 채팅 버블 grammar_note가 BilingualText emphasize 모드로 렌더.
// v1.1 단계 19 [D10] 부분: BilingualText 적용 범위 회귀 보호 (Q4 dialogue panel + 자유 대화).
//
// 단계 18은 BilingualText 컴포넌트만 만들고 적용을 점진 작업으로 미뤘다. 단계 19에서
// 채팅 버블 안 grammar/correction.reason 영역에 우선 적용.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('[단계19-D7] Q4 dialogue panel — grammar_note BilingualText 적용', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/components/dialogue-mission-panel.tsx'),
    'utf-8',
  )

  it('BilingualText import + 사용', () => {
    expect(src).toMatch(/import\s*\{\s*BilingualText\s*\}\s*from\s*['"]@\/src\/components\/ui\/bilingual-text['"]/)
    // grammarNote 렌더 블록 안에서 BilingualText 호출
    const idx = src.indexOf('turn.grammarNote')
    expect(idx).toBeGreaterThan(0)
    const block = src.slice(idx, idx + 1500)
    expect(block).toMatch(/<BilingualText/)
    expect(block).toMatch(/mode=['"]emphasize['"]/)
  })
})

describe('[단계19-D7] 자유 대화 — correction.reason BilingualText 적용', () => {
  const src = readFileSync(
    join(process.cwd(), 'app/student/conversation-practice/free-conversation-client.tsx'),
    'utf-8',
  )

  it('CorrectionReason 타입이 string | 객체 둘 다 허용', () => {
    expect(src).toMatch(/type\s+CorrectionReason\s*=\s*string\s*\|\s*\{[\s\S]{0,200}ko:\s*string/)
  })

  it('reason이 객체일 때 BilingualText 렌더', () => {
    expect(src).toMatch(/import\s*\{\s*BilingualText\s*\}/)
    // typeof r === 'string' 분기 후 BilingualText
    const idx = src.indexOf("typeof r === 'string'")
    expect(idx).toBeGreaterThan(0)
    const block = src.slice(idx, idx + 800)
    expect(block).toMatch(/<BilingualText/)
    expect(block).toMatch(/mode=['"]emphasize['"]/)
  })
})

describe('[단계19-D10] BilingualText emphasize 모드 회귀 보호', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/components/ui/bilingual-text.tsx'),
    'utf-8',
  )

  it('emphasize 모드에서 한·외 동시 표시 + opacity-70 처리', () => {
    expect(src).toMatch(/opacity-70/)
    expect(src).toMatch(/data-bilingual-mode=['"]emphasize['"]/)
    expect(src).toMatch(/data-emphasis/)
  })

  it('switch 모드 단일 표시 분기 보존', () => {
    expect(src).toMatch(/data-bilingual-mode=['"]switch['"]/)
  })

  it('ar lang일 때 dir="rtl" 적용', () => {
    expect(src).toMatch(/isRTLDisplay/)
    expect(src).toMatch(/dir=\{rtl/)
  })
})
