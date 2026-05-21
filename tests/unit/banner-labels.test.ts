// Task 1.6 — 배너 다국어 라벨 완전성 + 디스미스 키/치환 결정론 가드
import { describe, expect, it } from 'vitest'
import {
  BANNER_LABELS,
  BANNER_LANGS,
  BANNER_TYPES,
  bannerBody,
  buildBannerItems,
  dismissKey,
  isBannerLang,
  resolveBannerLang,
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

// 야간5: research 흐름 wire-in — lang 폴백 + vocab 자동 숨김 + href 주입
describe('resolveBannerLang (research mother_tongue 폴백)', () => {
  it('지원 언어는 그대로', () => {
    expect(resolveBannerLang('vi')).toBe('vi')
    expect(resolveBannerLang('ar')).toBe('ar')
  })
  it('자연어 모국어도 추론 (진척 페이지 <Localized> 와 동일)', () => {
    expect(resolveBannerLang('Vietnamese')).toBe('vi')
    expect(resolveBannerLang('베트남어')).toBe('vi')
    expect(resolveBannerLang('العربية')).toBe('ar')
    expect(resolveBannerLang('Khmer')).toBe('km')
  })
  it('미지원/누락은 ko 폴백', () => {
    expect(resolveBannerLang('ja')).toBe('ko') // 7언어 밖
    expect(resolveBannerLang('zz')).toBe('ko')
    expect(resolveBannerLang(undefined)).toBe('ko')
    expect(resolveBannerLang(null)).toBe('ko')
  })
})

describe('buildBannerItems', () => {
  it('vocabDueCount=0 → vocab 배너 자동 숨김 (progress·model_answer 2종)', () => {
    const items = buildBannerItems(0)
    expect(items.map((i) => i.type)).toEqual(['progress', 'model_answer'])
  })
  it('vocabDueCount>0 → vocab 포함 + n 전달', () => {
    const items = buildBannerItems(3)
    expect(items.map((i) => i.type)).toEqual(['progress', 'vocab', 'model_answer'])
    expect(items.find((i) => i.type === 'vocab')?.n).toBe(3)
  })
  it('기본 href 는 정식 학생 흐름(/student)', () => {
    const items = buildBannerItems(0)
    expect(items.find((i) => i.type === 'progress')?.href).toBe('/student')
    expect(items.find((i) => i.type === 'model_answer')?.href).toBe('/student')
  })
  it('hrefs 주입 — 지정 키만 덮어쓰고 미지정 키는 기본값 (research 흐름, D-015)', () => {
    const items = buildBannerItems(0, { progress: '#start-learning', model_answer: '/student/speaking' })
    expect(items.find((i) => i.type === 'progress')?.href).toBe('#start-learning') // 같은 페이지 앵커
    expect(items.find((i) => i.type === 'model_answer')?.href).toBe('/student/speaking')
  })
  it('hrefs 명시적 null 은 그대로 (클릭 비활성 지원 유지)', () => {
    const items = buildBannerItems(0, { progress: null })
    expect(items.find((i) => i.type === 'progress')?.href).toBeNull()
  })
})
