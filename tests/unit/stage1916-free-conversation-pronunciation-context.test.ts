// v1.1 단계 19.16 [페이즈 2]: 자유 대화 NPC 시스템 프롬프트에 발음·발화 흐름
// 컨텍스트가 정확히 주입되고 환각 차단 가이드가 포함되는지 검증.

import { describe, it, expect } from 'vitest'
import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { PERSONAS } from '@/src/lib/personas'
import type { PronunciationContext, SpeechFlowContext } from '@/src/types/providers'

const PERSONA = PERSONAS[0]

function build(args: Partial<Parameters<typeof buildPersonaSystemPrompt>[0]> = {}): string {
  return buildPersonaSystemPrompt({
    persona: PERSONA,
    topic: '한국 음식 추천',
    availableToolNames: [],
    ...args,
  })
}

describe('단계 19.16 — buildPersonaSystemPrompt pronunciation/speechFlow 블록', () => {
  describe('pronunciationContext 미전달 시', () => {
    it('발음 점수 블록이 시스템 프롬프트에 포함되지 않는다', () => {
      const prompt = build({})
      expect(prompt).not.toContain('[직전 학습자 발화 — 발음 평가 결과]')
      // 발음 기반 응답 규칙 헤더는 본 단계 신규. anti-hallucination(허위 정보 생성 금지)과 구분.
      expect(prompt).not.toContain('[발음 기반 응답 규칙')
    })

    it('null 또는 undefined 모두 동일하게 미포함', () => {
      expect(build({ pronunciationContext: null })).not.toContain('[직전 학습자 발화 — 발음 평가 결과]')
      expect(build({ pronunciationContext: undefined })).not.toContain('[직전 학습자 발화 — 발음 평가 결과]')
    })
  })

  describe('pronunciationContext 정상 전달', () => {
    it('정확도/유창성/완전성 점수가 프롬프트에 명시된다', () => {
      const ctx: PronunciationContext = {
        overallAccuracy: 45,
        fluencyScore: 60,
        completenessScore: 80,
      }
      const prompt = build({ pronunciationContext: ctx })
      expect(prompt).toContain('[직전 학습자 발화 — 발음 평가 결과]')
      expect(prompt).toContain('발음 정확도: 45/100')
      expect(prompt).toContain('발음 유창성: 60/100')
      expect(prompt).toContain('발음 완전성: 80/100')
    })

    it('weakWords가 단어·점수·errorType과 함께 노출된다', () => {
      const ctx: PronunciationContext = {
        overallAccuracy: 55,
        weakWords: [
          { word: '발음', score: 30, errorType: 'Mispronunciation' },
          { word: '한국어', score: 45, errorType: 'None' },
        ],
      }
      const prompt = build({ pronunciationContext: ctx })
      expect(prompt).toContain('발음 약한 단어')
      expect(prompt).toContain('"발음"(30/100, Mispronunciation)')
      expect(prompt).toContain('"한국어"(45/100)')
    })

    it('환각 차단 가이드(50점 미만 칭찬 금지)가 항상 포함된다', () => {
      const ctx: PronunciationContext = { overallAccuracy: 30 }
      const prompt = build({ pronunciationContext: ctx })
      expect(prompt).toMatch(/50점 미만.*환각 칭찬.*절대 하지 마/)
      expect(prompt).toMatch(/페르소나.*친구 톤.*점수 언급 금지/)
    })

    it('한 턴에 한 단어만 짚도록 가이드', () => {
      const ctx: PronunciationContext = {
        weakWords: [
          { word: 'A', score: 30, errorType: 'Mispronunciation' },
          { word: 'B', score: 35, errorType: 'Mispronunciation' },
        ],
      }
      const prompt = build({ pronunciationContext: ctx })
      expect(prompt).toMatch(/한 턴에 한 단어/)
    })
  })

  describe('speechFlowContext 미전달 시', () => {
    it('발화 흐름 블록이 시스템 프롬프트에 포함되지 않는다', () => {
      const prompt = build({})
      expect(prompt).not.toContain('[직전 학습자 발화 — 발화 흐름]')
    })

    it('long/short pause가 모두 0이면 블록 미포함', () => {
      const ctx: SpeechFlowContext = { longPauseCount: 0, shortPauseCount: 0 }
      const prompt = build({ speechFlowContext: ctx })
      expect(prompt).not.toContain('[직전 학습자 발화 — 발화 흐름]')
    })
  })

  describe('speechFlowContext 정상 전달', () => {
    it('긴 멈춤이 단어·시간과 함께 노출된다', () => {
      const ctx: SpeechFlowContext = {
        longPauses: [{ afterWord: '저는', gapMs: 1800 }],
        longPauseCount: 1,
      }
      const prompt = build({ speechFlowContext: ctx })
      expect(prompt).toContain('[직전 학습자 발화 — 발화 흐름]')
      expect(prompt).toContain('긴 멈춤(≥1500ms) 1회')
      expect(prompt).toContain('"저는" 뒤(1800ms)')
    })

    it('짧은 멈춤은 별도 임계로 표시', () => {
      const ctx: SpeechFlowContext = {
        shortPauses: [{ afterWord: '음', gapMs: 900 }, { afterWord: '그', gapMs: 1200 }],
        shortPauseCount: 2,
      }
      const prompt = build({ speechFlowContext: ctx })
      expect(prompt).toContain('짧은 멈춤(800~1499ms) 2회')
      expect(prompt).toContain('"음" 뒤(900ms)')
      expect(prompt).toContain('"그" 뒤(1200ms)')
    })

    it('멈춤이 1회 이하면 별도 언급 없이 자연 호응만 하라는 가이드', () => {
      const ctx: SpeechFlowContext = {
        shortPauses: [{ afterWord: '음', gapMs: 900 }],
        shortPauseCount: 1,
      }
      const prompt = build({ speechFlowContext: ctx })
      expect(prompt).toMatch(/짧은 멈춤이 1회 이하면 별도 언급 없이/)
    })

    it('NPC는 친구이지 코치가 아니라는 톤 가이드', () => {
      const ctx: SpeechFlowContext = {
        longPauses: [{ afterWord: 'A', gapMs: 2000 }],
        longPauseCount: 1,
      }
      const prompt = build({ speechFlowContext: ctx })
      expect(prompt).toMatch(/친구이지 코치가 아닙니다/)
    })
  })

  describe('두 컨텍스트 함께 전달', () => {
    it('두 블록 모두 시스템 프롬프트에 포함된다', () => {
      const prompt = build({
        pronunciationContext: { overallAccuracy: 50 },
        speechFlowContext: {
          longPauses: [{ afterWord: '저는', gapMs: 1800 }],
          longPauseCount: 1,
        },
      })
      expect(prompt).toContain('[직전 학습자 발화 — 발음 평가 결과]')
      expect(prompt).toContain('[직전 학습자 발화 — 발화 흐름]')
    })
  })

  describe('forSummary 모드에서는 발음 블록 미포함', () => {
    // 요약 라우트는 코치 시점 — 별도 처리(stage19.13 llm-eval). NPC 페르소나 블록과
    // 충돌하지 않게 forSummary=true에서는 본 단계 발음 가이드가 빠져야 한다.
    it('forSummary=true이면 pronunciationContext가 있어도 블록 미포함', () => {
      const prompt = build({
        forSummary: true,
        pronunciationContext: { overallAccuracy: 30 },
      })
      expect(prompt).not.toContain('[직전 학습자 발화 — 발음 평가 결과]')
    })
  })
})
