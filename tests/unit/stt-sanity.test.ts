import { describe, expect, it } from 'vitest'
import {
  isLikelySttHallucination,
  isGenericYouTubeOutro,
  normalizeTranscript,
} from '@/src/lib/stt-sanity'

describe('stt-sanity', () => {
  describe('normalizeTranscript', () => {
    it('연속 공백을 하나로 줄이고 trim', () => {
      expect(normalizeTranscript('  안녕   하세요  ')).toBe('안녕 하세요')
    })
  })

  describe('isGenericYouTubeOutro', () => {
    it('"시청해주셔서" 포함 → true', () => {
      expect(isGenericYouTubeOutro('시청해주셔서 감사합니다')).toBe(true)
    })

    it('"구독" + "좋아요" 동시 포함 → true', () => {
      expect(isGenericYouTubeOutro('구독과 좋아요 부탁드려요')).toBe(true)
    })

    it('일반 발화는 false', () => {
      expect(isGenericYouTubeOutro('안녕하세요. 카페에 왔어요.')).toBe(false)
    })
  })

  describe('isLikelySttHallucination — 기존 KNOWN phrases', () => {
    it('"시청해주셔서 감사합니다." → 환각', () => {
      expect(isLikelySttHallucination('시청해주셔서 감사합니다.')).toBe(true)
    })

    it('"구독 좋아요 눌러주세요" → 환각', () => {
      expect(isLikelySttHallucination('구독 좋아요 눌러주세요')).toBe(true)
    })
  })

  describe('isLikelySttHallucination — 신규 정규식 패턴', () => {
    it('"MBC 뉴스" 매칭', () => {
      expect(isLikelySttHallucination('MBC 뉴스 입니다')).toBe(true)
    })

    it('"KBS 뉴스" 매칭', () => {
      expect(isLikelySttHallucination('KBS 뉴스 9시 입니다')).toBe(true)
    })

    it('"채널A 뉴스" 매칭', () => {
      expect(isLikelySttHallucination('채널A 뉴스 입니다')).toBe(true)
    })

    it('"MBC 뉴스 이덕용입니다" 형태 매칭', () => {
      expect(isLikelySttHallucination('MBC 뉴스 이덕용입니다')).toBe(true)
    })

    it('"앵커" 단어 포함 매칭', () => {
      expect(isLikelySttHallucination('이상 9시 뉴스 앵커 김민지였습니다')).toBe(true)
    })

    it('"기자" 단어 포함 매칭', () => {
      expect(isLikelySttHallucination('현장에서 박지훈 기자였습니다')).toBe(true)
    })

    it('"보도" 단어 포함 매칭', () => {
      expect(isLikelySttHallucination('정부 발표를 보도해 드렸습니다')).toBe(true)
    })

    it('"리포트" 단어 포함 매칭', () => {
      expect(isLikelySttHallucination('지금까지 현장 리포트였습니다')).toBe(true)
    })

    it('"이덕영" 가짜 이름 매칭', () => {
      expect(isLikelySttHallucination('이덕영 앵커입니다')).toBe(true)
    })

    it('"이덕용" 가짜 이름 매칭', () => {
      expect(isLikelySttHallucination('이덕용입니다 안녕히')).toBe(true)
    })

    it('"○○ 앵커입니다." 형태', () => {
      expect(isLikelySttHallucination('김민지 앵커입니다.')).toBe(true)
    })

    it('"채널을 구독" CTA 매칭', () => {
      expect(isLikelySttHallucination('이 채널을 구독해주세요')).toBe(true)
    })

    it('"오늘은 여기까지" outro 매칭', () => {
      expect(isLikelySttHallucination('오늘은 여기까지 입니다')).toBe(true)
    })
  })

  describe('isLikelySttHallucination — 정상 한국어 발화 통과', () => {
    it('"안녕하세요. 저는 학생입니다" → 통과', () => {
      expect(isLikelySttHallucination('안녕하세요. 저는 학생입니다')).toBe(false)
    })

    it('카페 주문 발화 → 통과', () => {
      expect(isLikelySttHallucination('아이스 아메리카노 한 잔 주세요')).toBe(false)
    })

    it('자기소개 → 통과', () => {
      expect(isLikelySttHallucination('저는 한국어를 배우고 있는 학생이에요')).toBe(false)
    })

    it('일정 협의 → 통과', () => {
      expect(isLikelySttHallucination('일정 조정이 가능한지 확인하고 싶습니다')).toBe(false)
    })

    it('빈 문자열 → 통과', () => {
      expect(isLikelySttHallucination('')).toBe(false)
    })

    it('단순 인사 → 통과', () => {
      expect(isLikelySttHallucination('안녕히 계세요')).toBe(false)
    })
  })
})
