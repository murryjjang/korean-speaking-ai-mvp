// v1.1 단계 18 [D6, D10]: 표시 언어 자동 적용 + 다국어 텍스트 픽 회귀 보호.

import { describe, expect, it } from 'vitest'

import {
  inferDisplayLanguageFromMotherTongue,
  isDisplayLanguage,
  isRTLDisplay,
  pickList,
  pickText,
} from '@/src/lib/i18n/display-language'

describe('inferDisplayLanguageFromMotherTongue [D6]', () => {
  it('null/undefined/공백 → null', () => {
    expect(inferDisplayLanguageFromMotherTongue(null)).toBeNull()
    expect(inferDisplayLanguageFromMotherTongue(undefined)).toBeNull()
    expect(inferDisplayLanguageFromMotherTongue('')).toBeNull()
    expect(inferDisplayLanguageFromMotherTongue('   ')).toBeNull()
  })

  it('KO 매칭: ko/kor/korean/한국어/한국', () => {
    for (const v of ['ko', 'KO', 'kor', 'korean', 'Korean', '한국어', '한국']) {
      expect(inferDisplayLanguageFromMotherTongue(v)).toBe('ko')
    }
  })

  it('EN 매칭', () => {
    for (const v of ['en', 'eng', 'english', '영어']) {
      expect(inferDisplayLanguageFromMotherTongue(v)).toBe('en')
    }
  })

  it('VI 매칭', () => {
    for (const v of ['vi', 'vie', 'vietnamese', 'Tiếng Việt', '베트남어', '베트남']) {
      expect(inferDisplayLanguageFromMotherTongue(v)).toBe('vi')
    }
  })

  it('AR 매칭', () => {
    for (const v of ['ar', 'ara', 'arabic', '아랍어', '아랍', 'العربية']) {
      expect(inferDisplayLanguageFromMotherTongue(v)).toBe('ar')
    }
  })

  it('알 수 없는 값 → null', () => {
    expect(inferDisplayLanguageFromMotherTongue('Spanish')).toBeNull()
    expect(inferDisplayLanguageFromMotherTongue('français')).toBeNull()
  })
})

describe('isDisplayLanguage / isRTLDisplay', () => {
  it('isDisplayLanguage', () => {
    expect(isDisplayLanguage('ko')).toBe(true)
    expect(isDisplayLanguage('en')).toBe(true)
    expect(isDisplayLanguage('vi')).toBe(true)
    expect(isDisplayLanguage('ar')).toBe(true)
    expect(isDisplayLanguage('es')).toBe(false)
    expect(isDisplayLanguage(undefined)).toBe(false)
  })

  it('isRTLDisplay: ar만 true', () => {
    expect(isRTLDisplay('ko')).toBe(false)
    expect(isRTLDisplay('en')).toBe(false)
    expect(isRTLDisplay('vi')).toBe(false)
    expect(isRTLDisplay('ar')).toBe(true)
  })
})

describe('pickText / pickList [D10 토대]', () => {
  it('pickText: 객체에서 lang 선택, 누락은 ko 폴백', () => {
    const t = { ko: '한국어', en: 'English', vi: 'Tiếng Việt' }
    expect(pickText(t, 'ko')).toBe('한국어')
    expect(pickText(t, 'en')).toBe('English')
    expect(pickText(t, 'vi')).toBe('Tiếng Việt')
    expect(pickText(t, 'ar')).toBe('한국어') // 아랍어 누락 → ko 폴백
  })

  it('pickText: 빈 문자열 lang은 ko 폴백', () => {
    const t = { ko: '한국어', en: '', vi: '   ' }
    expect(pickText(t, 'en')).toBe('한국어')
    expect(pickText(t, 'vi')).toBe('한국어')
  })

  it('pickText: 문자열 입력은 그대로 반환', () => {
    expect(pickText('plain string', 'en')).toBe('plain string')
  })

  it('pickText: null/undefined → 빈 문자열', () => {
    expect(pickText(null, 'ko')).toBe('')
    expect(pickText(undefined, 'ko')).toBe('')
  })

  it('pickList: 객체에서 lang 선택, 빈 배열은 ko 폴백', () => {
    const l = { ko: ['a', 'b'], en: ['x'] }
    expect(pickList(l, 'en')).toEqual(['x'])
    expect(pickList(l, 'vi')).toEqual(['a', 'b']) // 누락 → ko 폴백
  })

  it('pickList: 문자열 배열 입력은 그대로 반환', () => {
    expect(pickList(['a', 'b'], 'en')).toEqual(['a', 'b'])
  })
})
