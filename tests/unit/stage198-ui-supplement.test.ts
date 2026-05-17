// v1.1 단계 19.8 [UI보조]: 사이드바·모드 카드·페이지 제목 mother_tongue 보조 표기.
//
// 정적 라벨(SIDEBAR_LABELS·MODE_CARD_LABELS·PAGE_LABELS·CHART_LABELS·KPI_LABELS)이
// 4언어(ko/en/vi/ar) 모두 정의되어 있고, Localized 컴포넌트가 motherTongueHint를
// 받아 한국어 본문 + 보조 마크([data-bilingual-supplement])를 렌더한다.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SIDEBAR_LABELS,
  MODE_CARD_LABELS,
  PAGE_LABELS,
} from '@/src/lib/i18n/dashboard-labels'

// PAGE_LABELS는 evaluationResult 키 신규 추가 검증에 사용.

const root = process.cwd()
const localizedSrc = readFileSync(
  join(root, 'src/components/ui/localized.tsx'),
  'utf-8',
)
const sidebarSrc = readFileSync(
  join(root, 'src/components/layout/sidebar.tsx'),
  'utf-8',
)
const studentLayout = readFileSync(
  join(root, 'app/student/layout.tsx'),
  'utf-8',
)

describe('[단계19.8-UI보조] SIDEBAR_LABELS 4언어 정의', () => {
  const keys: (keyof typeof SIDEBAR_LABELS)[] = [
    'studentProgress',
    'studentSpeaking',
    'studentReading',
    'studentPresentation',
    'studentConversation',
  ]
  for (const k of keys) {
    it(`${k} 4언어 채워짐`, () => {
      const label = SIDEBAR_LABELS[k]
      expect(label.ko.length).toBeGreaterThan(0)
      expect(label.en.length).toBeGreaterThan(0)
      expect(label.vi.length).toBeGreaterThan(0)
      expect(label.ar.length).toBeGreaterThan(0)
    })
  }
})

describe('[단계19.8-UI보조] PAGE_LABELS 신규 키 4언어 정의', () => {
  const keys: (keyof typeof PAGE_LABELS)[] = [
    'evaluationResult',
    'freeConversationPractice',
    'chooseConversationPartner',
  ]
  for (const k of keys) {
    it(`${k} 4언어 채워짐`, () => {
      const label = PAGE_LABELS[k]
      expect(label.ko.length).toBeGreaterThan(0)
      expect(label.en.length).toBeGreaterThan(0)
      expect(label.vi.length).toBeGreaterThan(0)
      expect(label.ar.length).toBeGreaterThan(0)
    })
  }
})

describe('[단계19.8-UI보조] 모드 카드 4건 4언어 정의', () => {
  const keys: (keyof typeof MODE_CARD_LABELS)[] = [
    'freeConvTitle',
    'speakingTitle',
    'presentationTitle',
    'readingTitle',
  ]
  for (const k of keys) {
    it(`${k} 4언어 채워짐`, () => {
      const label = MODE_CARD_LABELS[k]
      expect(label.ko.length).toBeGreaterThan(0)
      expect(label.en.length).toBeGreaterThan(0)
      expect(label.vi.length).toBeGreaterThan(0)
      expect(label.ar.length).toBeGreaterThan(0)
    })
  }
})

describe('[단계19.8-UI보조] Localized 컴포넌트가 mother_tongue 보조 표기 렌더', () => {
  it('motherTongueHint prop을 받아 inferDisplayLanguageFromMotherTongue 호출', () => {
    expect(localizedSrc).toMatch(/motherTongueHint/)
    expect(localizedSrc).toMatch(/inferDisplayLanguageFromMotherTongue/)
  })

  it('보조 영역은 data-bilingual-supplement 속성으로 식별', () => {
    expect(localizedSrc).toMatch(/data-bilingual-supplement/)
  })

  it('RTL(ar)에 대해 unicodeBidi/plaintext 처리', () => {
    expect(localizedSrc).toMatch(/unicodeBidi:\s*'plaintext'/)
  })

  it('lang="ko" 본문 + 보조 영역 lang 속성 명시', () => {
    expect(localizedSrc).toMatch(/lang="ko"/)
  })
})

describe('[단계19.8-UI보조] Sidebar 컴포넌트가 motherTongueHint를 받아 보조 표기', () => {
  it('Sidebar prop에 motherTongueHint 포함', () => {
    expect(sidebarSrc).toMatch(/motherTongueHint\??\s*:\s*string\s*\|\s*null/)
  })

  it('SIDEBAR_LABELS를 본문 한국어 + 보조 텍스트로 렌더', () => {
    expect(sidebarSrc).toMatch(/SIDEBAR_LABELS\[/)
    expect(sidebarSrc).toMatch(/data-bilingual-supplement/)
  })
})

describe('[단계19.8-UI보조] StudentLayout이 motherTongue을 AppShell에 전달', () => {
  it('getCurrentParticipant로 motherTongue 획득', () => {
    expect(studentLayout).toMatch(/getCurrentParticipant/)
    expect(studentLayout).toMatch(/motherTongueHint=\{motherTongueHint\}/)
  })

  it('navItems가 labelKey를 포함해 보조 표기 매핑', () => {
    expect(studentLayout).toMatch(/labelKey:\s*"studentProgress"/)
    expect(studentLayout).toMatch(/labelKey:\s*"studentSpeaking"/)
    expect(studentLayout).toMatch(/labelKey:\s*"studentReading"/)
    expect(studentLayout).toMatch(/labelKey:\s*"studentPresentation"/)
    expect(studentLayout).toMatch(/labelKey:\s*"studentConversation"/)
  })
})
