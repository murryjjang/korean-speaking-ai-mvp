// v1.1 단계 19.5 [L.4]: KDLI 로고 임시 placeholder.
//
// 원본 벡터 자료 입수 전 PNG 에지 안티앨리어싱 아티팩트를 벡터 placeholder로 임시 차단.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('[단계19.5-L.4] KDLI placeholder SVG', () => {
  const placeholderPath = join(process.cwd(), 'public/logos/kdli-placeholder.svg')

  it('public/logos/kdli-placeholder.svg 파일 존재', () => {
    expect(existsSync(placeholderPath)).toBe(true)
  })

  it('placeholder는 유효 SVG (root <svg> + viewBox)', () => {
    const content = readFileSync(placeholderPath, 'utf-8')
    expect(content).toMatch(/<svg[\s\S]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
    expect(content).toMatch(/viewBox="\d+\s+\d+\s+\d+\s+\d+"/)
    expect(content).toMatch(/<\/svg>/)
  })

  it('placeholder는 KDLI 모노그램 텍스트 포함 (시각 식별)', () => {
    const content = readFileSync(placeholderPath, 'utf-8')
    expect(content).toContain('KDLI')
  })

  it('placeholder는 학술 톤 색상 (브랜드 네이비 + 골드)', () => {
    const content = readFileSync(placeholderPath, 'utf-8')
    // KDLI 메인 네이비 (#163A6B) + 골드 (#D4A056)
    expect(content).toContain('#163A6B')
    expect(content).toContain('#D4A056')
  })

  const login = readFileSync(join(process.cwd(), 'app/login/page.tsx'), 'utf-8')
  const researchLogin = readFileSync(
    join(process.cwd(), 'app/research/login/page.tsx'),
    'utf-8',
  )

  it('/login 페이지가 placeholder SVG를 사용', () => {
    expect(login).toMatch(/kdli-placeholder\.svg/)
    expect(login).not.toMatch(/kdli-seal-512\.png/)
  })

  it('/research/login 페이지가 placeholder SVG를 사용', () => {
    expect(researchLogin).toMatch(/kdli-placeholder\.svg/)
    expect(researchLogin).not.toMatch(/kdli-seal-512\.png/)
  })

  it('두 페이지 모두 data-testid="kdli-logo" 마커 포함 (회귀 보호)', () => {
    expect(login).toMatch(/data-testid="kdli-logo"/)
    expect(researchLogin).toMatch(/data-testid="kdli-logo"/)
  })
})
