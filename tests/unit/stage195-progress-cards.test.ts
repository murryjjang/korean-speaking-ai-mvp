// v1.1 단계 19.5 [L.1, L.5]: 학습 진척 페이지 카드화 + OPIc 식 종합 점수 박스.
//
// V5 검증 / 시연 피드백: "내용 칸 안에 들어서 더 정렬되고 전문화된 느낌 필요".
// 모든 콘텐츠 섹션을 카드 패턴(흰 배경 + 경계 + padding)으로 통일하고,
// 상단에 종합 점수 박스를 OPIc/TOPIK 스타일로 도입한다.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  OVERALL_SCORE_LABELS,
  SCORE_LEVEL_LABELS,
  getLabel,
  scoreLevelKey,
} from '@/src/lib/i18n/dashboard-labels'

const src = readFileSync(
  join(process.cwd(), 'app/research/student/progress/page.tsx'),
  'utf-8',
)

describe('[단계19.5-L.5] 카드화 — SectionCard 패턴', () => {
  it('SectionCard 컴포넌트 정의 존재', () => {
    expect(src).toMatch(/function SectionCard\(/)
  })

  it('카드 스타일: rounded-lg + border + bg-surface-raised + p-5', () => {
    expect(src).toMatch(/rounded-lg[\s\S]{0,80}border-border\/40[\s\S]{0,80}bg-surface-raised[\s\S]{0,80}p-5/)
  })

  it('이전 학술 톤(pt-6 border-t)이 더 이상 콘텐츠 섹션에 직접 사용되지 않음', () => {
    // SectionCard 도입 전에는 <section className="pt-6 border-t border-border/60"> 형태였음.
    // 모든 콘텐츠 섹션이 SectionCard로 마이그레이션 되어야 한다.
    expect(src).not.toMatch(/className="pt-6 border-t border-border\/60"/)
  })

  it('차트·최근 세션·시작 학습·데이터 다운로드 4개 모두 SectionCard 래핑', () => {
    // 최소 5개의 SectionCard 호출 (모드 분포 + 최근 7일 + 점수 추이 + 최근 세션 + 학습 시작 + 데이터 다운로드)
    const matches = src.match(/<SectionCard\b/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(5)
  })
})

describe('[단계19.5-L.1] 종합 점수 박스 (OPIc 식)', () => {
  it('OverallScoreBox 컴포넌트 정의 존재', () => {
    expect(src).toMatch(/function OverallScoreBox\(/)
  })

  it('5건 미만은 placeholder 분기', () => {
    expect(src).toMatch(/MIN_SAMPLES\s*=\s*5/)
    expect(src).toMatch(/insufficient/)
  })

  it('평균 점수 + 등급 배지 + 누적 횟수 노출', () => {
    expect(src).toMatch(/data-testid="overall-score-value"/)
    expect(src).toMatch(/data-testid="overall-score-level"/)
    expect(src).toMatch(/scoreLevelKey/)
  })

  it('상단 헤더 영역(<header>)과 PDF 캡처 컨테이너 사이에 마운트', () => {
    // PDF 캡처 대상 컨테이너 안에 OverallScoreBox가 등장하는지
    const captureBlock = src.match(
      /id="research-progress-pdf-target"[\s\S]+?\/research-progress-pdf-target/,
    )
    expect(captureBlock).toBeTruthy()
    expect(captureBlock![0]).toMatch(/<OverallScoreBox\b/)
  })
})

describe('[단계19.5-L.1] 다국어 라벨 4개 언어 완비', () => {
  for (const key of ['title', 'level', 'basedOn', 'assessmentsUnit', 'insufficient'] as const) {
    it(`OVERALL_SCORE_LABELS.${key} 가 4개 언어 모두 정의`, () => {
      const v = OVERALL_SCORE_LABELS[key]
      expect(typeof v.ko).toBe('string')
      expect(typeof v.en).toBe('string')
      expect(typeof v.vi).toBe('string')
      expect(typeof v.ar).toBe('string')
      expect(v.ko.length).toBeGreaterThan(0)
      expect(v.en.length).toBeGreaterThan(0)
      expect(v.vi.length).toBeGreaterThan(0)
      expect(v.ar.length).toBeGreaterThan(0)
    })
  }

  for (const key of ['advanced', 'intermediateHigh', 'intermediate', 'noviceHigh', 'novice'] as const) {
    it(`SCORE_LEVEL_LABELS.${key} 가 4개 언어 모두 정의`, () => {
      const v = SCORE_LEVEL_LABELS[key]
      expect(v.ko.length).toBeGreaterThan(0)
      expect(v.en.length).toBeGreaterThan(0)
      expect(v.vi.length).toBeGreaterThan(0)
      expect(v.ar.length).toBeGreaterThan(0)
    })
  }

  it('getLabel가 overallScore/scoreLevel kind를 지원', () => {
    expect(getLabel({ kind: 'overallScore', key: 'title' }, 'en')).toBe('Overall Score')
    expect(getLabel({ kind: 'overallScore', key: 'title' }, 'ar')).toBe('النتيجة الإجمالية')
    expect(getLabel({ kind: 'scoreLevel', key: 'advanced' }, 'en')).toBe('Advanced')
    expect(getLabel({ kind: 'scoreLevel', key: 'novice' }, 'vi')).toBe('Sơ cấp')
  })
})

describe('[단계19.5-L.1] scoreLevelKey 분류', () => {
  it('0.8 이상 → advanced', () => {
    expect(scoreLevelKey(0.8)).toBe('advanced')
    expect(scoreLevelKey(0.95)).toBe('advanced')
  })
  it('0.65~0.79 → intermediateHigh', () => {
    expect(scoreLevelKey(0.65)).toBe('intermediateHigh')
    expect(scoreLevelKey(0.79)).toBe('intermediateHigh')
  })
  it('0.5~0.64 → intermediate', () => {
    expect(scoreLevelKey(0.5)).toBe('intermediate')
    expect(scoreLevelKey(0.6)).toBe('intermediate')
  })
  it('0.35~0.49 → noviceHigh', () => {
    expect(scoreLevelKey(0.35)).toBe('noviceHigh')
    expect(scoreLevelKey(0.4)).toBe('noviceHigh')
  })
  it('0.34 이하 → novice', () => {
    expect(scoreLevelKey(0)).toBe('novice')
    expect(scoreLevelKey(0.34)).toBe('novice')
  })
})
