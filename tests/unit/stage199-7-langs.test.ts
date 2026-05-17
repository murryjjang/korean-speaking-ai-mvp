// v1.1 단계 19.9: 7개 언어 (ko/en/vi/ar/th/ms/km) 확장 회귀 보호.

import { describe, expect, it } from 'vitest'

import {
  DISPLAY_LANGUAGES,
  DISPLAY_LANGUAGE_CODES,
  inferDisplayLanguageFromMotherTongue,
  isDisplayLanguage,
  isRTLDisplay,
} from '@/src/lib/i18n/display-language'
import {
  CONSENT_TEXTS,
  CONSENT_TEXT_TH,
  CONSENT_TEXT_MS,
  CONSENT_TEXT_KM,
} from '@/src/lib/research/consent-text'
import {
  SIDEBAR_LABELS,
  MODE_LABELS,
  PAGE_LABELS,
} from '@/src/lib/i18n/dashboard-labels'

describe('[단계19.9] 7개 mother_tongue 언어 지원', () => {
  it('DISPLAY_LANGUAGES에 th/ms/km 포함 — 총 7개', () => {
    expect(DISPLAY_LANGUAGE_CODES).toEqual(['ko', 'en', 'vi', 'ar', 'th', 'ms', 'km'])
    expect(DISPLAY_LANGUAGES.length).toBe(7)
  })

  it('isDisplayLanguage가 th/ms/km 인식', () => {
    expect(isDisplayLanguage('th')).toBe(true)
    expect(isDisplayLanguage('ms')).toBe(true)
    expect(isDisplayLanguage('km')).toBe(true)
  })

  it('isRTLDisplay — ar만 RTL, th/ms/km는 LTR', () => {
    expect(isRTLDisplay('ar')).toBe(true)
    expect(isRTLDisplay('th')).toBe(false)
    expect(isRTLDisplay('ms')).toBe(false)
    expect(isRTLDisplay('km')).toBe(false)
  })

  describe('inferDisplayLanguageFromMotherTongue — th/ms/km 추론', () => {
    it.each([
      ['th', 'th'], ['Thai', 'th'], ['ภาษาไทย', 'th'], ['태국어', 'th'],
      ['ms', 'ms'], ['Malay', 'ms'], ['Bahasa Melayu', 'ms'], ['말레이어', 'ms'],
      ['km', 'km'], ['Khmer', 'km'], ['ភាសាខ្មែរ', 'km'], ['크메르어', 'km'],
      ['Cambodian', 'km'], ['캄보디아어', 'km'],
    ])('"%s" → %s', (input, expected) => {
      expect(inferDisplayLanguageFromMotherTongue(input)).toBe(expected)
    })
  })

  describe('동의서 본문', () => {
    it('CONSENT_TEXTS에 th/ms/km 키 존재', () => {
      expect(CONSENT_TEXTS.th).toBeTruthy()
      expect(CONSENT_TEXTS.ms).toBeTruthy()
      expect(CONSENT_TEXTS.km).toBeTruthy()
    })

    it('th/ms/km 본문에 임시본 명시 안내 포함', () => {
      expect(CONSENT_TEXT_TH).toMatch(/Provisional Translation Notice/)
      expect(CONSENT_TEXT_MS).toMatch(/Provisional Translation Notice/)
      expect(CONSENT_TEXT_KM).toMatch(/Provisional Translation Notice/)
    })

    it('vi/ar 본문에도 19.9 임시본 명시 안내 포함', () => {
      expect(CONSENT_TEXTS.vi).toMatch(/Provisional Translation Notice/)
      expect(CONSENT_TEXTS.ar).toMatch(/Provisional Translation Notice/)
    })

    it('ko/en 본문에는 임시본 안내 없음 (정본)', () => {
      expect(CONSENT_TEXTS.ko).not.toMatch(/Provisional/)
      expect(CONSENT_TEXTS.en).not.toMatch(/Provisional/)
    })
  })

  describe('대시보드 라벨 — th/ms/km 키 완전성', () => {
    const sampleKeys = ['studentProgress', 'studentSpeaking', 'studentConversation'] as const
    it.each(sampleKeys)('SIDEBAR_LABELS.%s에 th/ms/km 키 채워짐', (key) => {
      const label = SIDEBAR_LABELS[key]
      expect(label.th).toBeTruthy()
      expect(label.ms).toBeTruthy()
      expect(label.km).toBeTruthy()
    })

    it.each(['free_conversation', 'q1_repeat', 'reading'] as const)(
      'MODE_LABELS.%s에 th/ms/km 키 채워짐',
      (key) => {
        const label = MODE_LABELS[key]
        expect(label.th).toBeTruthy()
        expect(label.ms).toBeTruthy()
        expect(label.km).toBeTruthy()
      },
    )

    it('PAGE_LABELS.progressTitle에 th/ms/km 키 채워짐', () => {
      expect(PAGE_LABELS.progressTitle.th).toBeTruthy()
      expect(PAGE_LABELS.progressTitle.ms).toBeTruthy()
      expect(PAGE_LABELS.progressTitle.km).toBeTruthy()
    })
  })
})
