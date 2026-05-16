// v1.1 단계 18 [C4, C5]: 대시보드 라벨 4언어 i18n 회귀 보호.

import { describe, expect, it } from 'vitest'

import { DISPLAY_LANGUAGES } from '@/src/lib/i18n/display-language'
import {
  CHART_LABELS,
  KPI_LABELS,
  MODE_LABELS,
  PAGE_LABELS,
  TIME_UNITS,
  fmtDuration,
  getLabel,
} from '@/src/lib/i18n/dashboard-labels'

const ALL_LANGS = DISPLAY_LANGUAGES.map((l) => l.code)

const LABEL_GROUPS = [
  ['KPI', KPI_LABELS],
  ['CHART', CHART_LABELS],
  ['MODE', MODE_LABELS],
  ['PAGE', PAGE_LABELS],
  ['TIME', TIME_UNITS],
] as const

describe('대시보드 라벨 4언어 커버리지', () => {
  for (const [groupName, group] of LABEL_GROUPS) {
    for (const key of Object.keys(group)) {
      it(`${groupName}.${key}: 4언어(ko/en/vi/ar) 모두 비어 있지 않음`, () => {
        const m = (group as Record<string, Record<string, string>>)[key]
        for (const lang of ALL_LANGS) {
          expect(m[lang]?.trim(), `${groupName}.${key}.${lang}`).toBeTruthy()
        }
      })
    }
  }
})

describe('getLabel 분기', () => {
  it('kpi.totalSessions: 언어별로 다른 값을 반환', () => {
    expect(getLabel({ kind: 'kpi', key: 'totalSessions' }, 'ko')).toBe('총 세션')
    expect(getLabel({ kind: 'kpi', key: 'totalSessions' }, 'en')).toBe('Total sessions')
    expect(getLabel({ kind: 'kpi', key: 'totalSessions' }, 'vi')).toBe('Tổng phiên học')
    expect(getLabel({ kind: 'kpi', key: 'totalSessions' }, 'ar')).toBe('إجمالي الجلسات')
  })

  it('chart.modeDistribution: 4언어 일관성', () => {
    for (const lang of ALL_LANGS) {
      const v = getLabel({ kind: 'chart', key: 'modeDistribution' }, lang)
      expect(v).toBeTruthy()
    }
  })
})

describe('fmtDuration 언어별 단위', () => {
  it('초만: 30초 KO', () => {
    expect(fmtDuration(30, 'ko')).toBe('30초')
  })

  it('초만: 30초 EN', () => {
    expect(fmtDuration(30, 'en')).toBe('30s')
  })

  it('분 단위: 90초 KO/EN', () => {
    expect(fmtDuration(90, 'ko')).toBe('1분 30초')
    expect(fmtDuration(90, 'en')).toBe('1min 30s')
  })

  it('분 정수: 120초 = 2분 KO, 2min EN', () => {
    expect(fmtDuration(120, 'ko')).toBe('2분')
    expect(fmtDuration(120, 'en')).toBe('2min')
  })
})
