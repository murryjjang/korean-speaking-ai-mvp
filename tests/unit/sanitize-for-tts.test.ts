import { describe, expect, it } from 'vitest'
import { sanitizeForTTS } from '@/src/lib/text-utils/sanitize-for-tts'

describe('sanitizeForTTS', () => {
  it('빈 입력은 빈 문자열', () => {
    expect(sanitizeForTTS('')).toBe('')
    // @ts-expect-error 런타임 방어
    expect(sanitizeForTTS(undefined)).toBe('')
  })

  it('평문은 그대로 통과 (trim만)', () => {
    expect(sanitizeForTTS('  안녕하세요. 오늘 날씨가 좋네요.  ')).toBe('안녕하세요. 오늘 날씨가 좋네요.')
  })

  it('**굵게** → 굵게', () => {
    expect(sanitizeForTTS('**스타벅스 강남점**은 인기가 많아요.')).toBe('스타벅스 강남점은 인기가 많아요.')
  })

  it('__굵게__ → 굵게', () => {
    expect(sanitizeForTTS('이건 __중요__한 점이에요.')).toBe('이건 중요한 점이에요.')
  })

  it('*기울임* → 기울임', () => {
    expect(sanitizeForTTS('그곳은 *정말* 멋진 카페예요.')).toBe('그곳은 정말 멋진 카페예요.')
  })

  it('곱셈 기호처럼 보이는 별표는 건드리지 않는다', () => {
    expect(sanitizeForTTS('2 * 3 = 6')).toBe('2 * 3 = 6')
  })

  it('# 헤더 마커 제거', () => {
    expect(sanitizeForTTS('# 오늘의 추천\n맛집 목록입니다.')).toBe('오늘의 추천\n맛집 목록입니다.')
    expect(sanitizeForTTS('### 소제목')).toBe('소제목')
  })

  it('- / * / + 리스트 마커 제거', () => {
    expect(sanitizeForTTS('- 첫 번째\n- 두 번째\n+ 세 번째\n* 네 번째')).toBe(
      '첫 번째\n두 번째\n세 번째\n네 번째',
    )
  })

  it('1. 2. 순서 리스트 마커 제거', () => {
    expect(sanitizeForTTS('1. 강남역\n2. 홍대입구')).toBe('강남역\n홍대입구')
  })

  it('> 인용 마커 제거', () => {
    expect(sanitizeForTTS('> 참고하세요')).toBe('참고하세요')
  })

  it('`코드` → 코드', () => {
    expect(sanitizeForTTS('명령어는 `npm run dev` 입니다.')).toBe('명령어는 npm run dev 입니다.')
  })

  it('코드 블록 제거', () => {
    expect(sanitizeForTTS('이렇게요:\n```\nconst x = 1\n```\n끝.')).toBe('이렇게요:\n\n끝.')
  })

  it('[텍스트](링크) → 텍스트', () => {
    expect(sanitizeForTTS('자세한 내용은 [여기](https://example.com)를 보세요.')).toBe(
      '자세한 내용은 여기를 보세요.',
    )
  })

  it('~~취소선~~ → 취소선', () => {
    expect(sanitizeForTTS('가격은 ~~만원~~ 오천원입니다.')).toBe('가격은 만원 오천원입니다.')
  })

  it('표 문법 정리', () => {
    const md = '| 이름 | 평점 |\n| --- | --- |\n| 카페A | 4.5 |'
    const out = sanitizeForTTS(md)
    expect(out).not.toContain('|')
    expect(out).not.toContain('---')
    expect(out).toContain('이름')
    expect(out).toContain('카페A')
  })

  it('줄바꿈 3개 이상은 2개로 정리', () => {
    expect(sanitizeForTTS('첫 줄\n\n\n\n둘째 줄')).toBe('첫 줄\n\n둘째 줄')
  })

  it('복잡한 혼합 케이스 — 마크다운 문자가 남지 않는다', () => {
    const md = [
      '# 강남 카페 추천',
      '',
      '그 중에서도 **스타벅스 강남점**이 *가장* 인기가 많아요.',
      '',
      '- 평점: 4.5',
      '- 위치: [지도 보기](https://map.example.com)',
      '',
      '```',
      'note: 영업시간 확인',
      '```',
      '',
      '~~예전 정보~~ 지금은 24시간 영업해요.',
    ].join('\n')
    const out = sanitizeForTTS(md)
    expect(out).not.toMatch(/\*\*/)
    expect(out).not.toMatch(/```/)
    expect(out).not.toMatch(/^#/m)
    expect(out).not.toMatch(/^-\s/m)
    expect(out).not.toMatch(/~~/)
    expect(out).not.toMatch(/\]\(/)
    expect(out).toContain('스타벅스 강남점')
    expect(out).toContain('가장')
    expect(out).toContain('지도 보기')
    expect(out).toContain('24시간 영업')
  })
})
