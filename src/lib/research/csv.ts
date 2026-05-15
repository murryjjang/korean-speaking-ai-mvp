// v1.1 단계 10-6: 단순 CSV 직렬화 — 분석용(Python/R/Excel) 다운로드.

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s: string
  if (typeof v === 'string') s = v
  else if (typeof v === 'number' || typeof v === 'boolean') s = String(v)
  else {
    try {
      s = JSON.stringify(v)
    } catch {
      s = String(v)
    }
  }
  // RFC 4180: 쉼표·따옴표·개행이 있으면 큰따옴표로 감싸고 내부 따옴표는 두 번.
  if (/[",\r\n]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines: string[] = []
  lines.push(headers.map(escapeCell).join(','))
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','))
  }
  // Excel/Numbers에서 한글이 깨지지 않도록 UTF-8 BOM을 prefix.
  return '﻿' + lines.join('\r\n') + '\r\n'
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
