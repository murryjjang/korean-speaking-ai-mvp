// v1.1 단계 19.6 [성능]: 보조 언어 토글 지연 단축.
//
// 단계 19.5까지 토글 시 LLM 재호출이 트리거되어 5초+ 지연. 새 모델은 multilingual
// 응답을 한 번에 받아 BilingualText가 즉시 전환한다 (네트워크 호출 없음).
//
// 정적 검사로:
//  - free-conversation summary effect의 deps에서 helperLang 제거 (재호출 차단)
//  - BilingualText/BilingualListItem이 React.memo로 감싸짐 (불필요 re-render 차단)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
}

describe('[단계19.6-성능] 자유 대화 요약 — 토글에 재호출 없음', () => {
  const src = read('app/student/conversation-practice/free-conversation-client.tsx')

  it('summary fetch useEffect deps는 [stage]만 — helperLang 제거', () => {
    // 요약 fetch effect에 stage·turns 변화 처리만 남음. helperLang 의존 제거.
    expect(src).toMatch(/}, \[stage\]\)/)
    // 명시적으로 단계 19.6 마커 메모 존재
    expect(src).toMatch(/단계 19\.6 \[성능\]/)
  })
})

describe('[단계19.6-성능] BilingualText — React.memo 적용', () => {
  const src = read('src/components/ui/bilingual-text.tsx')

  it('memo import + BilingualText export = memo(...)', () => {
    expect(src).toMatch(/from\s*['"]react['"]/)
    expect(src).toMatch(/import\s*\{[\s\S]*memo[\s\S]*\}\s*from\s*['"]react['"]/)
    expect(src).toMatch(/export\s+const\s+BilingualText\s*=\s*memo\(/)
  })

  it('BilingualListItem도 memo로 감쌈', () => {
    expect(src).toMatch(/export\s+const\s+BilingualListItem\s*=\s*memo\(/)
  })
})
