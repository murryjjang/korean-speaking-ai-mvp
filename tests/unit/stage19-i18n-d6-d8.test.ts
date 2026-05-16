// v1.1 단계 19 [D6, D8.1, D6.2, D6.3]: 다국어 정밀 검증.
//
// - D6: mother_tongue 추론이 SSR/hydration 시점부터 즉시 반영되는지 (useDisplayLanguage
//   getServerSnapshot이 추론 결과를 반환).
// - D6.2/D6.3: 모드 카드·데이터 다운로드 라벨이 4언어 모두 정의되어 있는지.
// - D8.1: MultilingualFeedback이 헤더 단일 토글(useDisplayLanguage)을 직접 사용해
//   라벨·콘텐츠 불일치가 구조적으로 불가능한지.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DATA_DOWNLOAD_LABELS,
  MODE_CARD_LABELS,
  SCORE_UNIT_LABELS,
  getLabel,
} from '@/src/lib/i18n/dashboard-labels'

describe('[단계19-D6.2] 모드 카드 라벨 — 4언어 완비', () => {
  const keys = Object.keys(MODE_CARD_LABELS) as Array<keyof typeof MODE_CARD_LABELS>
  for (const key of keys) {
    it(`${key} — ko/en/vi/ar 모두 비어있지 않음`, () => {
      const m = MODE_CARD_LABELS[key]
      expect(m.ko.trim().length).toBeGreaterThan(0)
      expect(m.en.trim().length).toBeGreaterThan(0)
      expect(m.vi.trim().length).toBeGreaterThan(0)
      expect(m.ar.trim().length).toBeGreaterThan(0)
    })
  }

  it('주요 핵심 키 5종 존재', () => {
    expect(keys).toContain('freeConvTitle')
    expect(keys).toContain('speakingTitle')
    expect(keys).toContain('presentationTitle')
    expect(keys).toContain('readingTitle')
    expect(keys).toContain('freeConvSubtitle')
  })
})

describe('[단계19-D6.3] 데이터 다운로드 라벨 — 4언어 완비', () => {
  for (const key of Object.keys(DATA_DOWNLOAD_LABELS) as Array<keyof typeof DATA_DOWNLOAD_LABELS>) {
    it(`${key} — ko/en/vi/ar 모두 비어있지 않음`, () => {
      const m = DATA_DOWNLOAD_LABELS[key]
      expect(m.ko.trim().length).toBeGreaterThan(0)
      expect(m.en.trim().length).toBeGreaterThan(0)
      expect(m.vi.trim().length).toBeGreaterThan(0)
      expect(m.ar.trim().length).toBeGreaterThan(0)
    })
  }
})

describe('[단계19-D6.5] 점수 단위 — 4언어 완비', () => {
  for (const key of Object.keys(SCORE_UNIT_LABELS) as Array<keyof typeof SCORE_UNIT_LABELS>) {
    it(`${key}`, () => {
      const m = SCORE_UNIT_LABELS[key]
      expect(m.ko.trim().length).toBeGreaterThan(0)
      expect(m.en.trim().length).toBeGreaterThan(0)
      expect(m.vi.trim().length).toBeGreaterThan(0)
      expect(m.ar.trim().length).toBeGreaterThan(0)
    })
  }

  it('ko=점, en=pts (관용 약어)', () => {
    expect(getLabel({ kind: 'scoreUnit', key: 'scorePoints' }, 'ko')).toBe('점')
    expect(getLabel({ kind: 'scoreUnit', key: 'scorePoints' }, 'en')).toBe('pts')
  })
})

describe('[단계19.7-아키텍처] useDisplayLanguage — mother_tongue 단독 진실원', () => {
  it('hook 소스에 inferDisplayLanguageFromMotherTongue 사용 + localStorage 미참조', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/hooks/use-display-language.ts'),
      'utf-8',
    )
    expect(src).toMatch(/inferDisplayLanguageFromMotherTongue/)
    // 19.7: localStorage·EventTarget·useSyncExternalStore 일체 제거 — pure 함수.
    expect(src).not.toMatch(/localStorage/)
    expect(src).not.toMatch(/useSyncExternalStore/)
    expect(src).not.toMatch(/EventTarget/)
    expect(src).not.toMatch(/import\s*\{[^}]*useEffect[^}]*\}\s*from\s*['"]react['"]/)
  })
})

describe('[단계19-D8.1] MultilingualFeedback — 헤더 단일 토글 직접 사용', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/components/ui/multilingual-feedback.tsx'),
    'utf-8',
  )

  it('legacy useLanguageHelper 제거, useDisplayLanguage 사용', () => {
    expect(src).not.toMatch(/from\s+['"]@\/src\/hooks\/use-language-helper['"]/)
    expect(src).toMatch(/from\s+['"]@\/src\/hooks\/use-display-language['"]/)
  })

  it('lang === ko일 때 카드 숨김 (return null)', () => {
    expect(src).toMatch(/displayLang\s*===\s*['"]ko['"][\s\S]{0,200}return\s+null/)
  })
})

// v1.1 단계 19.6 [RTL]: 단계 19에서 DirHtmlSync가 documentElement.dir을 'rtl'로
// 토글했지만 19.6 모델은 페이지 레이아웃을 ko/ltr로 고정한다(보조 언어는 텍스트
// 내부에서만 RTL). D6.4의 의미가 반전되어 회귀 보호 방향도 반전.
describe('[단계19.6-RTL] DirHtmlSync — 페이지 RTL 적용 중단', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/components/i18n/dir-html-sync.tsx'),
    'utf-8',
  )

  it('useDisplayLanguage 구독 없음 (페이지 dir/lang은 ko/ltr 고정)', () => {
    expect(src).not.toMatch(/useDisplayLanguage/)
    expect(src).not.toMatch(/isRTLDisplay/)
  })

  it('documentElement.dir은 항상 ltr, lang은 항상 ko', () => {
    expect(src).toMatch(/\.dir\s*=\s*['"]ltr['"]/)
    expect(src).toMatch(/\.lang\s*=\s*['"]ko['"]/)
  })
})
