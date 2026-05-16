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

describe('[단계19.7-아키텍처] 헤더 보조 언어 토글 — 완전 제거', () => {
  it('display-language-toggle.tsx 파일이 더 이상 존재하지 않음', () => {
    const filePath = join(process.cwd(), 'src/components/ui/display-language-toggle.tsx')
    expect(() => readFileSync(filePath)).toThrow()
  })

  it('language-helper-toggle.tsx 파일이 더 이상 존재하지 않음', () => {
    const filePath = join(process.cwd(), 'src/components/ui/language-helper-toggle.tsx')
    expect(() => readFileSync(filePath)).toThrow()
  })

  it('Topbar에서 DisplayLanguageToggle import 제거', () => {
    const topbar = read('src/components/layout/topbar.tsx')
    expect(topbar).not.toMatch(/DisplayLanguageToggle/)
  })

  it('research/student/progress 페이지에서 DisplayLanguageToggle import 제거', () => {
    const progress = read('app/research/student/progress/page.tsx')
    expect(progress).not.toMatch(/import\s*\{[^}]*DisplayLanguageToggle/)
  })
})
