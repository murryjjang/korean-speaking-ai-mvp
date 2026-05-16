// v1.1 단계 19.5 [E.1]: DiceBear 한국인성 외형 — skinColor 화이트리스트.
//
// V2 검증에서 4명 페르소나 외형이 흑인풍으로 표시되는 경우가 발견됨.
// 시드 + 옵션 조합 결과 dark_brown 톤이 우선될 수 있어 한국인 톤 3종으로
// 명시적 화이트리스트(skinColor) 적용. avataaars 9.x는 skinColor를 hex
// 패턴으로 받음.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const src = readFileSync(
  join(process.cwd(), 'src/components/ui/persona-avatar.tsx'),
  'utf-8',
)

// 한국인 피부 톤 3종 (avataaars 9.x: edb98a=light, f8d25c=yellow, ffdbb4=fair).
const KOREAN_SKIN = new Set(['edb98a', 'f8d25c', 'ffdbb4'])

function extractAllListValues(text: string, listKey: string): string[] {
  const optionsStart = text.indexOf('PERSONA_OPTIONS')
  if (optionsStart < 0) throw new Error('PERSONA_OPTIONS not found')
  const optionsEnd = text.indexOf('\n}', optionsStart)
  const block = text.slice(optionsStart, optionsEnd > 0 ? optionsEnd : text.length)
  const re = new RegExp(`${listKey}:\\s*\\[([^\\]]+)\\]`, 'g')
  const out: string[] = []
  for (;;) {
    const m = re.exec(block)
    if (!m) break
    const items = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    out.push(...items)
  }
  return out
}

describe('[단계19.5-E.1] DiceBear skinColor 한국인 톤 화이트리스트', () => {
  it('4명 페르소나 모두 skinColor 옵션 명시', () => {
    // PERSONA_OPTIONS 블록 안에 skinColor가 최소 4번 등장.
    const optionsStart = src.indexOf('PERSONA_OPTIONS')
    const optionsEnd = src.indexOf('\n}', optionsStart)
    const block = src.slice(optionsStart, optionsEnd)
    const matches = block.match(/skinColor:/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(4)
  })

  it('모든 skinColor 값이 한국인 피부 톤 화이트리스트 내', () => {
    const values = extractAllListValues(src, 'skinColor')
    expect(values.length).toBeGreaterThan(0)
    for (const v of values) {
      expect(KOREAN_SKIN.has(v), `non-Korean skin tone: ${v}`).toBe(true)
    }
  })

  it('optionsToParams가 skinColor를 URL 파라미터로 직렬화', () => {
    // 코드 표면에 addList 호출 시 skinColor 키가 포함되어 있어야 한다.
    expect(src).toMatch(/addList\(\s*['"]skinColor['"]\s*,\s*opts\.skinColor\s*\)/)
  })
})

describe('[단계19.5-E.1] 페르소나 옵션 4명 모두 정의', () => {
  it('friend_casual/friend_casual_male/korean_life_helper/korean_life_helper_male 모두 옵션 블록 존재', () => {
    for (const id of [
      'friend_casual',
      'friend_casual_male',
      'korean_life_helper',
      'korean_life_helper_male',
    ]) {
      const optionsStart = src.indexOf('PERSONA_OPTIONS')
      const idx = src.indexOf(`${id}:`, optionsStart)
      expect(idx, `${id} not found in PERSONA_OPTIONS`).toBeGreaterThan(0)
    }
  })
})
