// v1.1 단계 19.7 [D6.7-5번째]: 동의서 mother_tongue 단독 적용.
//
// 단계 18·19·19.5·19.6에서 4연속 실패. 진단 결과 login → consent redirect의
// `?locale=${lang}` 강제 부착이 mother_tongue 추론을 압살한 게 근본 원인.
//
// 19.7 모델:
//  - URL `?locale=` 우선순위 완전 제거
//  - login redirect에서 URL 파라미터 미부착
//  - locale 토글 UI 제거 (사용자 변경 불가)
//  - mother_tongue 단독으로 본문 언어 결정 — 한국어 본문 패턴 없음

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { inferDisplayLanguageFromMotherTongue } from '@/src/lib/i18n/display-language'

const consentSrc = readFileSync(
  join(process.cwd(), 'app/research/consent/page.tsx'),
  'utf-8',
)

const loginSrc = readFileSync(
  join(process.cwd(), 'app/research/login/page.tsx'),
  'utf-8',
)

describe('[단계19.7-D6.7] 동의서 mother_tongue 단독 적용', () => {
  it('inferDisplayLanguageFromMotherTongue를 import', () => {
    expect(consentSrc).toMatch(/inferDisplayLanguageFromMotherTongue/)
  })

  it('mother_tongue 단독으로 locale 결정 — URL ?locale= 우선순위 제거', () => {
    // params.locale 우선순위 분기 패턴이 사라졌어야 함
    expect(consentSrc).not.toMatch(/isConsentLocale\(params\.locale\)\s*\?\s*params\.locale/)
    // participant.motherTongue → locale 추론이 직접 진행
    expect(consentSrc).toMatch(/inferDisplayLanguageFromMotherTongue\(participant\.motherTongue\)/)
  })

  it('locale 토글 UI 제거 — consent-locale-toggle data-testid가 페이지에 없음', () => {
    expect(consentSrc).not.toMatch(/data-testid=["']consent-locale-toggle["']/)
    expect(consentSrc).not.toMatch(/link-toggle-consent-locale/)
  })

  it('login redirect에 ?locale= 강제 부착 코드 제거', () => {
    expect(loginSrc).not.toMatch(/research\/consent\?locale=\$\{lang\}/)
    expect(loginSrc).toMatch(/redirect\(\s*ok\.consentRequired\s*\?\s*['"]\/research\/consent['"]/)
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
