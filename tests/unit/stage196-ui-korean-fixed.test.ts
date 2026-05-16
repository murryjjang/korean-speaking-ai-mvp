// v1.1 단계 19.6 [UI고정, RTL, 토글]: UI 한국어 고정 + RTL 페이지 적용 중단 +
// 헤더 토글 "보조 언어" 의미 재정의 회귀 보호.
//
// 단계 18·19에서 헤더 토글이 KPI·차트·페이지 제목·페이지 dir까지 전부 바꿨다.
// 19.6 모델은 UI 한국어 고정, 보조 언어는 BilingualText 본문 옆에만 노출.
// 정적 검사로 컴포넌트가 lang을 'ko'로 고정해 반환하는지 확인.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
}

describe('[단계19.6-UI고정] Localized — getLabel(_, "ko") 고정', () => {
  const src = read('src/components/ui/localized.tsx')

  it('useDisplayLanguage 구독 없음 (한국어 고정)', () => {
    expect(src).not.toMatch(/useDisplayLanguage/)
  })

  it("getLabel(spec, 'ko') 형태로만 호출", () => {
    expect(src).toMatch(/getLabel\(\s*spec,\s*['"]ko['"]\s*\)/)
  })

  it("fmtDuration 두 번째 인자가 'ko' 리터럴", () => {
    expect(src).toMatch(/fmtDuration\w*\(\s*totalSeconds,\s*['"]ko['"]\s*\)/)
  })
})

describe('[단계19.6-UI고정] LocalizedModeLabel/LocalizedScore — ko 고정', () => {
  const src = read('src/components/ui/localized-extras.tsx')

  it('useDisplayLanguage 구독 없음', () => {
    expect(src).not.toMatch(/useDisplayLanguage/)
  })

  it("MODE_LABELS[mode].ko 직접 참조", () => {
    expect(src).toMatch(/MODE_LABELS\[mode\]\.ko/)
  })

  it("scoreUnit이 ko 라벨 사용", () => {
    expect(src).toMatch(/getLabel\(\s*\{\s*kind:\s*['"]scoreUnit['"][\s\S]{0,80}['"]ko['"]\s*\)/)
  })
})

describe('[단계19.6-UI고정] LocalizedModeDonut — ko 라벨 고정', () => {
  const src = read('src/components/research/localized-mode-donut.tsx')

  it('useDisplayLanguage 구독 없음', () => {
    expect(src).not.toMatch(/useDisplayLanguage/)
  })

  it('MODE_LABELS[mode].ko 직접 사용', () => {
    expect(src).toMatch(/MODE_LABELS\[mode\]\.ko/)
  })
})

describe('[단계19.6-토글] DisplayLanguageToggle — "보조 언어" 라벨', () => {
  const src = read('src/components/ui/display-language-toggle.tsx')

  it('"보조 언어" 텍스트 라벨', () => {
    expect(src).toMatch(/보조 언어/)
  })

  it('한국어 포함 4개 옵션 노출 (DISPLAY_LANGUAGES 매핑)', () => {
    expect(src).toMatch(/DISPLAY_LANGUAGES\.map/)
  })

  it('useDisplayLanguage 훅으로 상태 관리', () => {
    expect(src).toMatch(/useDisplayLanguage/)
  })
})
