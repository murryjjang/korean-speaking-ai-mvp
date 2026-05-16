// v1.1 단계 18 [G]: PDF 생성 oklch 폴백 — 색 파싱 회귀 보호.
//
// html2canvas v1.4.1은 Tailwind v4의 oklch() 기본 팔레트를 못 읽어 캡처 전체가 실패한다.
// inlineUnsupportedColors가 클론 문서를 순회하며 oklch/lab/color-mix를 rgb 인라인
// 스타일로 덮어쓰는지 stub document로 검증한다. 통합 캡처 테스트는 vitest 환경에 DOM이
// 없어 어려우므로 핵심 폴백 로직만 보호한다.

import { describe, expect, it } from 'vitest'

import {
  UNSUPPORTED_COLOR_FN,
  inlineUnsupportedColors,
  toBrowserRgb,
} from '@/src/lib/pdf/dom-to-pdf'

describe('UNSUPPORTED_COLOR_FN', () => {
  const SHOULD_MATCH = [
    'oklch(0.5 0.1 100)',
    'oklab(0.5 0.1 0.2)',
    'lab(50% 40 59.5)',
    'lch(52.2% 72.2 50)',
    'color-mix(in oklch, red, blue)',
    'color(display-p3 1 0 0)',
    'rgb(255, 0, 0) oklch(0.5 0 0)', // 한 토큰이라도 포함되면 매치
  ]
  for (const v of SHOULD_MATCH) {
    it(`매치: ${v}`, () => {
      expect(UNSUPPORTED_COLOR_FN.test(v)).toBe(true)
    })
  }

  const SHOULD_NOT_MATCH = [
    'rgb(255, 0, 0)',
    'rgba(0, 0, 0, 0.5)',
    '#FBF8F3',
    'hsl(120 50% 50%)',
    'transparent',
    '',
  ]
  for (const v of SHOULD_NOT_MATCH) {
    it(`비매치: ${v || '(빈 문자열)'}`, () => {
      expect(UNSUPPORTED_COLOR_FN.test(v)).toBe(false)
    })
  }
})

describe('toBrowserRgb', () => {
  // 캔버스 컨텍스트 stub — 브라우저가 fillStyle에 값을 대입한 뒤 정규화된 rgb를 반환하는 동작 모방.
  function makeProbe(): { ctx: CanvasRenderingContext2D; lastSet: string | null } {
    const state = { fillStyle: '#000000' as string }
    const ctx = {
      get fillStyle() {
        return state.fillStyle
      },
      set fillStyle(v: string) {
        if (v === '__throw__') throw new Error('parse error')
        // 실제 브라우저처럼 oklch는 '#hex'로, hex는 그대로, 알 수 없는 값은 변경 안 함.
        if (/^oklch/i.test(v)) state.fillStyle = '#abcdef'
        else if (/^#[0-9a-f]{6}$/i.test(v)) state.fillStyle = v.toLowerCase()
      },
    } as unknown as CanvasRenderingContext2D
    return { ctx, lastSet: state.fillStyle }
  }

  it('정상 변환 → rgb/hex 반환', () => {
    const { ctx } = makeProbe()
    expect(toBrowserRgb('oklch(0.5 0.1 100)', ctx)).toBe('#abcdef')
  })

  it('파서 throw → null 반환', () => {
    const { ctx } = makeProbe()
    expect(toBrowserRgb('__throw__', ctx)).toBeNull()
  })
})

describe('inlineUnsupportedColors', () => {
  it('oklch 사용 요소에 인라인 rgb 스타일이 적용된다', () => {
    // 최소 Document/Window stub — querySelectorAll, getComputedStyle, createElement만.
    const styleStore = new WeakMap<object, Record<string, string>>()
    const elements: HTMLElement[] = []

    const makeEl = (computed: Record<string, string>): HTMLElement => {
      const inline: Record<string, string> = {}
      styleStore.set(inline, {})
      const el = {
        style: inline,
        _computed: computed,
      } as unknown as HTMLElement
      elements.push(el)
      return el
    }

    const elA = makeEl({ color: 'oklch(0.5 0.1 100)', backgroundColor: 'rgb(255, 255, 255)' })
    const elB = makeEl({ color: 'rgb(0, 0, 0)', borderColor: 'color-mix(in oklch, red, blue)' })

    const probeCtx = {
      fillStyle: '#000000',
    } as unknown as CanvasRenderingContext2D
    // 단순 stub — 값 그대로 fillStyle에 두지 않고 항상 'rgb(1, 2, 3)' 반환.
    Object.defineProperty(probeCtx, 'fillStyle', {
      set() {},
      get() {
        return 'rgb(1, 2, 3)'
      },
    })

    const docStub = {
      defaultView: {
        getComputedStyle: (el: HTMLElement) => {
          const e = el as unknown as { _computed: Record<string, string> }
          return e._computed as unknown as CSSStyleDeclaration
        },
      },
      querySelectorAll: () => elements,
      createElement: () => ({
        getContext: () => probeCtx,
      }),
    } as unknown as Document

    inlineUnsupportedColors(docStub)

    expect((elA.style as unknown as Record<string, string>).color).toBe('rgb(1, 2, 3)')
    // backgroundColor는 oklch 아님 → 미변경
    expect((elA.style as unknown as Record<string, string>).backgroundColor).toBeUndefined()
    // borderColor는 color-mix 포함 → 변경
    expect((elB.style as unknown as Record<string, string>).borderColor).toBe('rgb(1, 2, 3)')
    // color는 일반 rgb → 미변경
    expect((elB.style as unknown as Record<string, string>).color).toBeUndefined()
  })
})
