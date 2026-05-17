// v1.1 단계 19.9 [로고]: 공식 KDLI 로고 자산 (사용자 제공) 회귀 보호.
//
// 19.8 placeholder/seal 단계에서 발견된 V1-2 회귀(사각형 박스가 헤더에서
// 도드라짐) 해결을 위해, 19.9에서 사용자 제공 공식 로고로 교체.
//  - /kdli-logo.png       : 헤더용 가로형 워드마크 (1448×1086)
//  - /kdli-logo-circle.png: 로그인용 원형 로고     (1254×1254)

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readFile(rel: string): string {
  return readFileSync(join(root, rel), 'utf-8')
}

describe('[단계19.9-로고] KDLI 공식 로고 자산', () => {
  it('public/kdli-logo.png 워드마크 자산 존재', () => {
    expect(existsSync(join(root, 'public/kdli-logo.png'))).toBe(true)
  })

  it('public/kdli-logo-circle.png 원형 자산 존재', () => {
    expect(existsSync(join(root, 'public/kdli-logo-circle.png'))).toBe(true)
  })

  describe('헤더 워드마크 로고', () => {
    it('공용 KdliBrand 컴포넌트가 /kdli-logo.png 참조', () => {
      const brand = readFile('src/components/layout/kdli-brand.tsx')
      expect(brand).toMatch(/\/kdli-logo\.png/)
      expect(brand).toMatch(/alt="KDLI"/)
      expect(brand).toMatch(/data-testid="kdli-brand"/)
    })

    it('Topbar(학습자/관리자/교수자 공통)가 KdliBrand 사용 (워드마크 통일)', () => {
      const topbar = readFile('src/components/layout/topbar.tsx')
      expect(topbar).toMatch(/KdliBrand/)
      expect(topbar).toMatch(/from "\.\/kdli-brand"/)
    })

    it('placeholder/seal 참조가 헤더 컴포넌트에 남아 있지 않음 (회귀 차단)', () => {
      const brand = readFile('src/components/layout/kdli-brand.tsx')
      const topbar = readFile('src/components/layout/topbar.tsx')
      expect(brand).not.toMatch(/kdli-placeholder|kdli-seal/)
      expect(topbar).not.toMatch(/kdli-placeholder|kdli-seal/)
    })
  })

  describe('로그인 페이지 원형 로고', () => {
    it('/login 페이지가 /kdli-logo-circle.png 사용', () => {
      const login = readFile('app/login/page.tsx')
      expect(login).toMatch(/\/kdli-logo-circle\.png/)
      expect(login).not.toMatch(/kdli-placeholder|kdli-seal/)
    })

    it('/research/login 페이지가 /kdli-logo-circle.png 사용', () => {
      const researchLogin = readFile('app/research/login/page.tsx')
      expect(researchLogin).toMatch(/\/kdli-logo-circle\.png/)
      expect(researchLogin).not.toMatch(/kdli-placeholder|kdli-seal/)
    })

    it('두 로그인 페이지 모두 data-testid="kdli-logo" 유지 (smoke 호환)', () => {
      expect(readFile('app/login/page.tsx')).toMatch(/data-testid="kdli-logo"/)
      expect(readFile('app/research/login/page.tsx')).toMatch(/data-testid="kdli-logo"/)
    })
  })

  describe('리서치 페이지 헤더', () => {
    const researchPages = [
      'app/research/student/progress/page.tsx',
      'app/research/consent/page.tsx',
      'app/research/consent/declined/page.tsx',
      'app/research/admin/page.tsx',
    ]
    for (const rel of researchPages) {
      it(`${rel} — KdliBrand 컴포넌트 마운트 유지`, () => {
        const src = readFile(rel)
        expect(src).toMatch(/KdliBrand/)
        expect(src).toMatch(/from '@\/src\/components\/layout\/kdli-brand'/)
      })
    }
  })
})
