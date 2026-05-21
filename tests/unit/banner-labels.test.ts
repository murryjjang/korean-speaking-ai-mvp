// Task 1.6 — 배너 다국어 라벨 완전성 + 디스미스 키/치환 결정론 가드
import { describe, expect, it } from 'vitest'
import {
  BANNER_LABELS,
  BANNER_LANGS,
  BANNER_TYPES,
  bannerBody,
  dismissKey,
  isBannerLang,
} from '@/src/lib/i18n/banner-labels'

describe('배너 라벨 완전성 (7언어 × 3종)', () => {
  it('7언어 모두 3종 배너에 title·body 보유', () => {
    expect(BANNER_LANGS).toHaveLength(7)
    expect(BANNER_TYPES).toHaveLength(3)
    for (const lang of BANNER_LANGS) {
      for (const type of BANNER_TYPES) {
        const l = BANNER_LABELS[lang][type]
        expect(l?.title, `${lang}.${type}.title`).toBeTruthy()
        expect(l?.body, `${lang}.${type}.body`).toBeTruthy()
      }
    }
  })

  it('vocab body 는 모든 언어에 {n} placeholder 보유', () => {
    for (const lang of BANNER_LANGS) {
      expect(BANNER_LABELS[lang].vocab.body, `${lang}.vocab`).toContain('{n}')
    }
  })
})

describe('bannerBody {n} 치환', () => {
  it('ko vocab {n} → 수치', () => {
    expect(bannerBody(BANNER_LABELS.ko.vocab, 5)).toBe('복습할 단어가 5개 있어요.')
  })
  it('n 미지정 → 0', () => {
    expect(bannerBody(BANNER_LABELS.en.vocab)).toContain('0')
  })
})

describe('dismissKey 일자별', () => {
  it('banner:<type>:<YYYY-MM-DD> 형식', () => {
    expect(dismissKey('vocab', new Date('2026-05-21T09:00:00Z'))).toBe('banner:vocab:2026-05-21')
  })
  it('isBannerLang 가드', () => {
    expect(isBannerLang('ko')).toBe(true)
    expect(isBannerLang('zz')).toBe(false)
  })
})
