// v1.1 단계 19.8 [평가결과]: V3 자유대화 ↔ V4 평가결과 mother_tongue 보조 갭 해결.
//
// 진단 결과:
//   - V3 (free-conversation-client): BilingualText에 motherTongueHint={motherTongue}
//     명시 전달 → mother_tongue 단독 결정으로 보조 표시 ✅
//   - V4 (speaking/[questionId]/result): MultilingualFeedback에 motherTongueHint
//     미전달 → useDisplayLanguage가 hint 없이 ko로 폴백 → 보조 카드가 if(displayLang==='ko')
//     return null로 숨겨짐 ❌
//
// 19.8 수정: 결과 페이지의 MultilingualFeedback 4건(q1/q2/q3/q4) 모두 motherTongueHint
// 전달. 상단 MultilingualFeedbackBlock(총평)은 기존부터 motherTongueHint를 받아왔고,
// q1~q4 하단 카드도 같은 패턴으로 일치시킴.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()
const resultPage = readFileSync(
  join(root, 'app/student/speaking/[questionId]/result/page.tsx'),
  'utf-8',
)

describe('[단계19.8-평가결과] q1~q4 모국어 보조 카드 motherTongueHint 전달', () => {
  it('q1 reading multilingual 카드가 motherTongueHint 전달', () => {
    // q1: testId="q1-multilingual-feedback" 블록 내부에 motherTongueHint 키워드 포함
    const q1 = resultPage.match(
      /testId="q1-multilingual-feedback"[\s\S]*?\/>/,
    )
    expect(q1).not.toBeNull()
    expect(q1![0]).toMatch(/motherTongueHint=\{participantMotherTongue\}/)
  })

  it('q2 material multilingual 카드가 motherTongueHint 전달', () => {
    const q2 = resultPage.match(
      /testId="q2-multilingual-feedback"[\s\S]*?\/>/,
    )
    expect(q2).not.toBeNull()
    expect(q2![0]).toMatch(/motherTongueHint=\{participantMotherTongue\}/)
  })

  it('q3 listening multilingual 카드가 motherTongueHint 전달', () => {
    const q3 = resultPage.match(
      /testId="q3-multilingual-feedback"[\s\S]*?\/>/,
    )
    expect(q3).not.toBeNull()
    expect(q3![0]).toMatch(/motherTongueHint=\{participantMotherTongue\}/)
  })

  it('q4 dialogue multilingual 카드가 motherTongueHint 전달', () => {
    const q4 = resultPage.match(
      /testId="q4-multilingual-feedback"[\s\S]*?\/>/,
    )
    expect(q4).not.toBeNull()
    expect(q4![0]).toMatch(/motherTongueHint=\{participantMotherTongue\}/)
  })

  it('총평(MultilingualFeedbackBlock)도 motherTongueHint를 받음 (기존 패턴 일치)', () => {
    const block = resultPage.match(/<MultilingualFeedbackBlock[\s\S]*?\/>/)
    expect(block).not.toBeNull()
    expect(block![0]).toMatch(/motherTongueHint=\{participantMotherTongue\}/)
  })
})

describe('[단계19.8-평가결과] participantMotherTongue 소스 검증', () => {
  it('SpeakingResultPage가 getCurrentParticipant로 motherTongue 획득', () => {
    expect(resultPage).toMatch(/getCurrentParticipant/)
    expect(resultPage).toMatch(/participantMotherTongue\s*=\s*participant\?\.motherTongue/)
  })
})
