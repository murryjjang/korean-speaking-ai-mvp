// v1.1 단계 18 [E] / 단계 19 [E]: DiceBear 페르소나 옵션 — 성별 표현 + 9.x 스키마 호환.
//
// 단계 18 테스트는 src 텍스트에서 longHair*/shortHair* prefix 매치만 확인했는데,
// 그 prefix는 DiceBear 9.x avataaars에서 모두 거부되어 4명 모두 이니셜 폴백으로
// 떨어지는 회귀가 운영에서 발생했다. 단계 19는 9.x 스키마(`top` enum)와 실제
// 매핑이 일치하는지 정적으로 검증한다. 추가로 buildAvatarUrl()이 만든 URL의
// `top` 값이 enum에 모두 들어 있는지도 확인.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const src = readFileSync(
  join(process.cwd(), 'src/components/ui/persona-avatar.tsx'),
  'utf-8',
)

// DiceBear 9.x avataaars `top` enum (schema.json에서 추출).
// 출처: https://api.dicebear.com/9.x/avataaars/schema.json — 2026-05 기준.
const DICEBEAR_9X_AVATAARS_TOP = new Set([
  'hat', 'hijab', 'turban', 'winterHat1', 'winterHat02', 'winterHat03', 'winterHat04',
  'bob', 'bun', 'curly', 'curvy', 'dreads', 'frida', 'fro', 'froBand',
  'longButNotTooLong', 'miaWallace', 'shavedSides',
  'straight02', 'straight01', 'straightAndStrand',
  'dreads01', 'dreads02', 'frizzle',
  'shaggy', 'shaggyMullet', 'shortCurly', 'shortFlat', 'shortRound', 'shortWaved',
  'sides', 'theCaesar', 'theCaesarAndSidePart', 'bigHair',
])

const DICEBEAR_9X_FACIAL_HAIR = new Set([
  'beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy', 'moustacheMagnum',
])

const DICEBEAR_9X_CLOTHING = new Set([
  'blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt',
  'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck',
])

describe('PersonaAvatar [E] DiceBear 9.x 스키마 호환', () => {
  it('PERSONA_OPTIONS의 모든 top 값이 9.x avataaars enum에 들어 있다', () => {
    const tops = extractAllListValues(src, 'top')
    expect(tops.length).toBeGreaterThan(0)
    for (const t of tops) {
      expect(DICEBEAR_9X_AVATAARS_TOP.has(t), `invalid top: ${t}`).toBe(true)
    }
  })

  it('facialHair 값이 9.x enum에 들어 있다', () => {
    const list = extractAllListValues(src, 'facialHair')
    for (const v of list) {
      expect(DICEBEAR_9X_FACIAL_HAIR.has(v), `invalid facialHair: ${v}`).toBe(true)
    }
  })

  it('clothing 값이 9.x enum에 들어 있다', () => {
    const list = extractAllListValues(src, 'clothing')
    expect(list.length).toBeGreaterThan(0)
    for (const v of list) {
      expect(DICEBEAR_9X_CLOTHING.has(v), `invalid clothing: ${v}`).toBe(true)
    }
  })

  it('8.x 잔재(longHair*/shortHair* prefix) 미포함', () => {
    const tops = extractAllListValues(src, 'top')
    for (const t of tops) {
      expect(/^(longHair|shortHair)/.test(t), `legacy prefix: ${t}`).toBe(false)
    }
  })
})

describe('PersonaAvatar [E] 성별 표현', () => {
  it('여성 페르소나(friend_casual)는 수염 0%', () => {
    const block = extractBlock(src, 'friend_casual:')
    expect(block).toMatch(/facialHairProbability:\s*0/)
  })

  it('여성 페르소나(korean_life_helper)는 수염 0%', () => {
    const block = extractBlock(src, 'korean_life_helper:')
    expect(block).toMatch(/facialHairProbability:\s*0/)
  })

  it('남성 페르소나(friend_casual_male)는 수염 옵션 + ≥50% 확률', () => {
    const block = extractBlock(src, 'friend_casual_male:')
    expect(block).toMatch(/facialHair:\s*\[/)
    expect(block).toMatch(/facialHairProbability:\s*(50|60|70|80|90|100)/)
  })

  it('남성 페르소나(korean_life_helper_male)는 수염 옵션 + ≥50% 확률', () => {
    const block = extractBlock(src, 'korean_life_helper_male:')
    expect(block).toMatch(/facialHair:\s*\[/)
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
