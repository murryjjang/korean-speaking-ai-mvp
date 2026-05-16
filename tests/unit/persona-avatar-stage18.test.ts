// v1.1 단계 18 [E]: DiceBear 페르소나 옵션 — 성별 표현 회귀 보호.
//
// 컴포넌트 자체는 DOM이 없어 렌더 불가하지만 매핑 정의가 의도와 일치하는지
// 정적으로 검증한다. friend_casual/korean_life_helper(여성) → LongHair*,
// friend_casual_male/korean_life_helper_male(남성) → ShortHair*.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const src = readFileSync(
  join(process.cwd(), 'src/components/ui/persona-avatar.tsx'),
  'utf-8',
)

describe('PersonaAvatar [E] DiceBear 옵션', () => {
  it('여성 페르소나(friend_casual)는 longHair* top + 수염 0%', () => {
    const block = extractBlock(src, 'friend_casual:')
    expect(block).toMatch(/longHair/i)
    expect(block).toMatch(/facialHairProbability:\s*0/)
  })

  it('여성 페르소나(korean_life_helper)는 longHair* + 수염 0%', () => {
    const block = extractBlock(src, 'korean_life_helper:')
    expect(block).toMatch(/longHair/i)
    expect(block).toMatch(/facialHairProbability:\s*0/)
  })

  it('남성 페르소나(friend_casual_male)는 shortHair* + 수염 옵션', () => {
    const block = extractBlock(src, 'friend_casual_male:')
    expect(block).toMatch(/shortHair/i)
    expect(block).toMatch(/facialHair/)
  })

  it('남성 페르소나(korean_life_helper_male)는 shortHair* + 수염 ≥50%', () => {
    const block = extractBlock(src, 'korean_life_helper_male:')
    expect(block).toMatch(/shortHair/i)
    expect(block).toMatch(/facialHairProbability:\s*(50|60|70|80|90|100)/)
  })
})

function extractBlock(text: string, key: string): string {
  // PERSONA_OPTIONS 정의 블록 이후의 매치만 검색해 SEED_MAP과 혼동되지 않게.
  const optionsStart = text.indexOf('PERSONA_OPTIONS')
  if (optionsStart < 0) throw new Error('PERSONA_OPTIONS not found')
  const idx = text.indexOf(key, optionsStart)
  if (idx < 0) throw new Error(`key not found in PERSONA_OPTIONS: ${key}`)
  const slice = text.slice(idx, idx + 600)
  return slice
}
