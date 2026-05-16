// v1.1 단계 19.8 [로고]: KDLI 사각형 로고 헤더 회귀 보호.
//
// 단계 19.5 → 19.7 사이 학습자/리서치 헤더 KDLI 로고 노출이 사라진 회귀를
// 19.8에서 복원했다. 회귀 재발 차단 의도로:
//  1) 공용 KdliBrand 컴포넌트가 kdli-logo-256.png를 명시 참조
//  2) 리서치 진척·동의·관리자 페이지가 KdliBrand 마운트
//  3) Topbar(/student, /admin, /teacher)도 kdli-logo-256.png 그대로 유지

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readFile(rel: string): string {
  const p = join(root, rel)
  return readFileSync(p, 'utf-8')
}

describe('[단계19.8-로고] KDLI 사각형 로고 헤더', () => {
  it('public/logos/kdli-logo-256.png 자산 존재', () => {
    expect(existsSync(join(root, 'public/logos/kdli-logo-256.png'))).toBe(true)
  })

  it('공용 KdliBrand 컴포넌트가 kdli-logo-256.png 참조', () => {
    const brand = readFile('src/components/layout/kdli-brand.tsx')
    expect(brand).toMatch(/kdli-logo-256\.png/)
    // alt 텍스트도 KDLI 식별자 포함 — a11y + 회귀 보호
    expect(brand).toMatch(/alt="KDLI"/)
    expect(brand).toMatch(/data-testid="kdli-brand"/)
  })

  it('Topbar(학습자/관리자/교수자 공통)가 kdli-logo-256.png 참조', () => {
    const topbar = readFile('src/components/layout/topbar.tsx')
    expect(topbar).toMatch(/kdli-logo-256\.png/)
  })

  const researchPages = [
    'app/research/student/progress/page.tsx',
    'app/research/consent/page.tsx',
    'app/research/consent/declined/page.tsx',
    'app/research/admin/page.tsx',
  ]

  for (const rel of researchPages) {
    it(`${rel} — KdliBrand 컴포넌트 마운트`, () => {
      const src = readFile(rel)
      expect(src).toMatch(/KdliBrand/)
      expect(src).toMatch(/from '@\/src\/components\/layout\/kdli-brand'/)
    })
  }
})
