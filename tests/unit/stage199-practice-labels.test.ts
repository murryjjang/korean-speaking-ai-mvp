// v1.1 단계 19.9 [페이즈4]: 학습 모드 페이지 본문 라벨 (난이도·primary 액션·필드명·상태).
// 19.8까지 사이드바·모드 카드·페이지 제목만 보조 표기됐고, 19.9에서 본문 영역 확장.

import { describe, expect, it } from 'vitest'

import { PRACTICE_LABELS, getLabel } from '@/src/lib/i18n/dashboard-labels'
import { DISPLAY_LANGUAGE_CODES } from '@/src/lib/i18n/display-language'

describe('[단계19.9-페이즈4] PRACTICE_LABELS — 본문 라벨 7개 언어 완전성', () => {
  it('PRACTICE_LABELS에 최소 25개 항목 존재 (난이도·목적·액션·필드·상태·메타)', () => {
    const keys = Object.keys(PRACTICE_LABELS)
    expect(keys.length).toBeGreaterThanOrEqual(25)
  })

  it.each(DISPLAY_LANGUAGE_CODES as readonly string[])(
    '모든 라벨에 %s 키 채워짐',
    (lang) => {
      for (const [k, v] of Object.entries(PRACTICE_LABELS)) {
        // @ts-expect-error — 런타임 키 동적 접근
        const text = v[lang]
        expect(text, `PRACTICE_LABELS.${k}.${lang}`).toBeTruthy()
        expect(typeof text).toBe('string')
      }
    },
  )

  it('getLabel("practice", ...)이 정상 동작', () => {
    expect(getLabel({ kind: 'practice', key: 'diff_beginner' }, 'ko')).toBe('초급')
    expect(getLabel({ kind: 'practice', key: 'diff_beginner' }, 'en')).toBe('Beginner')
    expect(getLabel({ kind: 'practice', key: 'diff_beginner' }, 'th')).toMatch(/ระดับ/)
    expect(getLabel({ kind: 'practice', key: 'action_start' }, 'km')).toMatch(/ចាប់ផ្តើម/)
  })
})

describe('[단계19.9-페이즈4] 말하기 평가 페이지 — Localized 적용', () => {
  it('app/student/speaking/page.tsx가 Localized 컴포넌트 사용', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/student/speaking/page.tsx'),
      'utf-8',
    )
    expect(src).toMatch(/from '@\/src\/components\/ui\/localized'/)
    expect(src).toMatch(/getCurrentParticipant/)
    expect(src).toMatch(/motherTongueHint/)
    // 핵심 라벨 — 난이도·목적·액션
    expect(src).toMatch(/diff_beginner|diff_intermediate|diff_advanced/)
    expect(src).toMatch(/purpose_official/)
    expect(src).toMatch(/action_start/)
  })
})
