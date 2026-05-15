// v1.1 단계 10-1: research 헬퍼 단위 테스트.

import { describe, expect, it } from 'vitest'

import {
  anonymizeIp,
  hashPin,
  isValidParticipantCode,
  nextParticipantCode,
  sha256Hex,
} from '@/src/lib/research/helpers'

describe('research helpers', () => {
  describe('nextParticipantCode', () => {
    it('빈 목록은 P001을 반환', () => {
      expect(nextParticipantCode([])).toBe('P001')
    })
    it('P001만 있으면 P002', () => {
      expect(nextParticipantCode(['P001'])).toBe('P002')
    })
    it('가장 큰 번호 + 1을 반환 (빈 자리 채우지 않음)', () => {
      expect(nextParticipantCode(['P001', 'P005', 'P003'])).toBe('P006')
    })
    it('잘못된 형식은 무시', () => {
      expect(nextParticipantCode(['junk', 'P002'])).toBe('P003')
    })
  })

  describe('isValidParticipantCode', () => {
    it('P001~P999 형식만 통과', () => {
      expect(isValidParticipantCode('P001')).toBe(true)
      expect(isValidParticipantCode('P012')).toBe(true)
      expect(isValidParticipantCode('P1234')).toBe(true) // 4자리 이상 허용
      expect(isValidParticipantCode('p001')).toBe(false)
      expect(isValidParticipantCode('P01')).toBe(false)
      expect(isValidParticipantCode('001')).toBe(false)
      expect(isValidParticipantCode('')).toBe(false)
    })
  })

  describe('anonymizeIp', () => {
    it('IPv4의 마지막 옥텟을 0으로', () => {
      expect(anonymizeIp('192.168.1.42')).toBe('192.168.1.0')
      expect(anonymizeIp('10.0.0.1')).toBe('10.0.0.0')
    })
    it('IPv6은 처음 3 그룹만 보존', () => {
      expect(anonymizeIp('2001:db8:1234:5678::1')).toBe('2001:db8:1234::/48')
    })
    it('null/공백/잘못된 형식은 null', () => {
      expect(anonymizeIp(null)).toBeNull()
      expect(anonymizeIp('')).toBeNull()
      expect(anonymizeIp('   ')).toBeNull()
      expect(anonymizeIp('not-an-ip')).toBeNull()
    })
  })

  describe('hashPin / sha256Hex', () => {
    it('동일 입력 → 동일 해시 (deterministic)', async () => {
      const a = await hashPin('1234')
      const b = await hashPin('1234')
      expect(a).toBe(b)
      expect(a).toHaveLength(64)
    })
    it('다른 입력 → 다른 해시', async () => {
      const a = await hashPin('1234')
      const b = await hashPin('5678')
      expect(a).not.toBe(b)
    })
    it('sha256Hex는 표준 SHA-256 출력 (빈 문자열은 정해진 해시)', async () => {
      const empty = await sha256Hex('')
      expect(empty).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })
  })
})
