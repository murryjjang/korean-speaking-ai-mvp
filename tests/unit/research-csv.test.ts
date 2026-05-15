// v1.1 단계 10-6: CSV 직렬화 단위 테스트.

import { describe, expect, it } from 'vitest'

import { toCsv } from '@/src/lib/research/csv'

describe('toCsv', () => {
  it('기본 헤더·행 직렬화 (UTF-8 BOM + CRLF)', () => {
    const csv = toCsv(['id', 'name'], [['1', '수아'], ['2', '재현']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('id,name')
    expect(csv).toContain('1,수아')
    expect(csv.split('\r\n').filter(Boolean).length).toBe(3) // header + 2 rows
  })

  it('쉼표·따옴표·개행은 큰따옴표로 escape', () => {
    const csv = toCsv(['text'], [['a, b'], ['he said "hi"'], ['line1\nline2']])
    expect(csv).toContain('"a, b"')
    expect(csv).toContain('"he said ""hi"""')
    expect(csv).toContain('"line1\nline2"')
  })

  it('null·undefined는 빈 셀, 객체는 JSON', () => {
    const csv = toCsv(['a', 'b'], [[null, undefined], [{ x: 1 }, 42]])
    const lines = csv.replace('﻿', '').split('\r\n')
    expect(lines[1]).toBe(',')
    expect(lines[2]).toContain('"{""x"":1}"')
    expect(lines[2]).toContain('42')
  })

  it('빈 rows에서도 헤더 라인은 출력', () => {
    const csv = toCsv(['a', 'b'], [])
    expect(csv.replace('﻿', '').trim()).toBe('a,b')
  })
})
