// v1.1 단계 19.5 [D6.7]: 동의서 mother_tongue 자동 적용.
//
// V3 검증: P031(mother_tongue=en) 로그인 → 동의서가 한국어로 고정.
// 다른 영역은 mother_tongue 자동 적용되지만 동의서는 누락.
//
// 정적 검사:
//  - app/research/consent/page.tsx가 inferDisplayLanguageFromMotherTongue 사용
//  - URL ?locale= 쿼리가 우선, 없으면 mother_tongue 추론, 둘 다 없으면 ko fallback.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { inferDisplayLanguageFromMotherTongue } from '@/src/lib/i18n/display-language'

const src = readFileSync(
  join(process.cwd(), 'app/research/consent/page.tsx'),
  'utf-8',
)

describe('[단계19.5-D6.7] 동의서 mother_tongue 자동 적용', () => {
  it('inferDisplayLanguageFromMotherTongue를 import', () => {
    expect(src).toMatch(/inferDisplayLanguageFromMotherTongue/)
  })

  it('isConsentLocale(params.locale) 우선, 없으면 mother_tongue 추론', () => {
    // URL ?locale= 우선
    expect(src).toMatch(/isConsentLocale\(params\.locale\)\s*\?\s*params\.locale/)
    // fallback에 participant.motherTongue가 사용됨
    expect(src).toMatch(/inferDisplayLanguageFromMotherTongue\(participant\.motherTongue\)/)
  })

  it('inferDisplayLanguage helper 자체 동작 — en/vi/ar/ko 추론', () => {
    expect(inferDisplayLanguageFromMotherTongue('en')).toBe('en')
    expect(inferDisplayLanguageFromMotherTongue('English')).toBe('en')
    expect(inferDisplayLanguageFromMotherTongue('Vietnamese')).toBe('vi')
    expect(inferDisplayLanguageFromMotherTongue('아랍어')).toBe('ar')
    expect(inferDisplayLanguageFromMotherTongue('ar')).toBe('ar')
    expect(inferDisplayLanguageFromMotherTongue('ko')).toBe('ko')
    expect(inferDisplayLanguageFromMotherTongue(null)).toBeNull()
    expect(inferDisplayLanguageFromMotherTongue('  ')).toBeNull()
  })
})
