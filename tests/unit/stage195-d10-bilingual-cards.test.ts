// v1.1 단계 19.6 [D10-피드백, 자유대화, 평가결과]: 새 모델 — 한국어 본문 +
// (보조 언어 != ko면) 작은 글씨 보조. 단계 19.5 emphasize/dim 모델은 폐기되고
// 단순 supplement 모델로 통합됨.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
}

describe('[단계19.6-D10-피드백] 자유 대화 요약 카드 — 새 모델', () => {
  const src = read('app/student/conversation-practice/free-conversation-client.tsx')

  it('summary-ko 컨테이너에 BilingualText (multilingual prop) 적용', () => {
    expect(src).toMatch(/testId="summary-ko"/)
    // BilingualText 호출에 summary.summary multilingual 전달
    const idx = src.indexOf('testId="summary-ko"')
    expect(idx).toBeGreaterThan(0)
    const block = src.slice(Math.max(0, idx - 500), idx + 400)
    expect(block).toMatch(/<BilingualText/)
    expect(block).toMatch(/multilingual=\{summary\.summary\s*\?\?\s*null\}/)
  })

  it('학습 피드백 — BilingualListItem 기반 리스트 (strengths + next_steps)', () => {
    expect(src).toMatch(/BilingualListItem/)
    // strengths/next_steps 양쪽에 적용되어야 함
    const c = src.match(/BilingualListItem/g)
    expect((c?.length ?? 0)).toBeGreaterThanOrEqual(2)
  })

  it('mode prop 호출 제거 (새 모델 — supplement-only)', () => {
    expect(src).not.toMatch(/mode=['"]emphasize['"]/)
  })
})

describe('[단계19.6-평가결과] MultilingualFeedback — 새 보조 카드 모델', () => {
  const mf = read('src/components/ui/multilingual-feedback.tsx')

  it('ko 선택 시 return null (보조 DOM 미존재)', () => {
    expect(mf).toMatch(/displayLang\s*===\s*['"]ko['"][\s\S]{0,200}return\s+null/)
  })

  it('data-bilingual-supplement 마커 부착', () => {
    expect(mf).toMatch(/data-bilingual-supplement/)
  })

  it('text-xs + opacity로 보조 스타일', () => {
    expect(mf).toMatch(/text-xs/)
    expect(mf).toMatch(/opacity-90|opacity-80/)
  })

  it('useDisplayLanguage 구독', () => {
    expect(mf).toMatch(/useDisplayLanguage/)
  })
})

describe('[단계19.6-평가결과] MultilingualFeedbackBlock — 새 모델', () => {
  const mfb = read('src/components/multilingual-feedback-block.tsx')

  it('BilingualText 위임', () => {
    expect(mfb).toMatch(/import\s*\{\s*BilingualText/)
    expect(mfb).toMatch(/<BilingualText/)
  })

  it('showToggle prop은 호환 위해 유지되되 인라인 토글 렌더 X', () => {
    // 인라인 DisplayLanguageToggle import 없음
    expect(mfb).not.toMatch(/import\s*\{\s*DisplayLanguageToggle/)
  })
})
