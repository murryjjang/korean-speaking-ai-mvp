// v1.1 25-4: 학습자 대시보드 차트 — 인라인 SVG로 구현(npm 의존 0).
//
// 도넛(모드별 분포) / 일별 막대(최근 7일 세션 수) / 점수 추이 라인.
// 데이터가 적으면 가볍게 비어 보이지 않도록 안내 문구 폴백.
//
// v1.1 단계 19 [L2]: SVG width="100%" + viewBox 좁음으로 컨테이너가 넓어지면
// 텍스트가 비례 확대돼 너무 커 보임. 학술 톤(OPIc/TOPIK 점수 리포트)에 맞춰
// 차트 컨테이너 max-w-sm/md로 제한 + viewBox 텍스트 fontSize 작게 유지.

import React from 'react'

const COLORS = ['#5B7EE3', '#7C5BE3', '#37B385', '#E3925B', '#E35B7E', '#5BBED1', '#A05BE3'] as const

function colorFor(i: number): string {
  return COLORS[i % COLORS.length]
}

export function ModeDonut({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <p className="text-xs text-text-muted">아직 데이터가 부족합니다.</p>
  }
  const size = 160
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 8
  const innerR = r * 0.6

  // 누적 각도를 분리 — 렌더 함수에서 변수 재할당을 피하기 위해 reduce 사용.
  const filtered = data.filter((d) => d.value > 0)
  const angles: number[] = filtered.reduce<number[]>((acc, d) => {
    const prev = acc[acc.length - 1] ?? -Math.PI / 2
    acc.push(prev + (d.value / total) * Math.PI * 2)
    return acc
  }, [-Math.PI / 2])
  const arcs = filtered.map((d, i) => {
    const aStart = angles[i]
    const aEnd = angles[i + 1]
    const frac = d.value / total
    const x0 = cx + r * Math.cos(aStart)
    const y0 = cy + r * Math.sin(aStart)
    const x1 = cx + r * Math.cos(aEnd)
    const y1 = cy + r * Math.sin(aEnd)
    const ix0 = cx + innerR * Math.cos(aEnd)
    const iy0 = cy + innerR * Math.sin(aEnd)
    const ix1 = cx + innerR * Math.cos(aStart)
    const iy1 = cy + innerR * Math.sin(aStart)
    const largeArc = aEnd - aStart > Math.PI ? 1 : 0
    const path = [
      `M ${x0} ${y0}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`,
      `L ${ix0} ${iy0}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ')
    return { path, color: colorFor(i), label: d.label, value: d.value, frac }
  })

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="모드별 사용 분포"
        data-testid="mode-donut-svg"
      >
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color}>
            <title>{`${a.label}: ${a.value} (${Math.round(a.frac * 100)}%)`}</title>
          </path>
        ))}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fontWeight="600" fill="#1F2D3D">
          {total}
        </text>
      </svg>
      <ul className="text-xs space-y-1">
        {arcs.map((a, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: a.color }} />
            <span className="text-text-secondary">{a.label}</span>
            <span className="text-text-muted tabular-nums">{a.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DailyBars({
  data,
}: {
  data: { date: string; value: number }[]
}) {
  if (data.length === 0) {
    return <p className="text-xs text-text-muted">최근 활동이 없습니다.</p>
  }
  const max = Math.max(1, ...data.map((d) => d.value))
  const width = Math.max(220, data.length * 32)
  const height = 80
  const barWidth = width / data.length - 4

  return (
    <div className="max-w-sm">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height + 24}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="일별 학습 활동"
        data-testid="daily-bars-svg"
      >
        {data.map((d, i) => {
          const h = (d.value / max) * height
          const x = i * (width / data.length) + 2
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - h}
                width={barWidth}
                height={h}
                fill="#5B7EE3"
                rx={2}
              >
                <title>{`${d.date}: ${d.value} 세션`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={height + 14}
                textAnchor="middle"
                fontSize="9"
                fill="#7B8190"
              >
                {d.date.slice(5)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function ScoreLine({
  points,
}: {
  points: { at: number; score: number }[]
}) {
  if (points.length === 0) {
    return <p className="text-xs text-text-muted">아직 점수 데이터가 없습니다.</p>
  }
  const sorted = [...points].sort((a, b) => a.at - b.at)
  const width = 320
  const height = 90
  const pad = 8
  const minScore = 0
  const maxScore = Math.max(100, ...sorted.map((p) => p.score))
  const xStep = sorted.length > 1 ? (width - pad * 2) / (sorted.length - 1) : 0
  const toY = (s: number) =>
    height - pad - ((s - minScore) / (maxScore - minScore)) * (height - pad * 2)
  const points2d = sorted.map((p, i) => ({ x: pad + i * xStep, y: toY(p.score), s: p.score }))
  const path = points2d.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  return (
    <div className="max-w-sm">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="점수 추이"
        data-testid="score-line-svg"
      >
        {/* gridline 50/100 */}
        <line x1={pad} y1={toY(50)} x2={width - pad} y2={toY(50)} stroke="#E5E7EB" strokeDasharray="2 3" />
        <line x1={pad} y1={toY(100)} x2={width - pad} y2={toY(100)} stroke="#E5E7EB" strokeDasharray="2 3" />
        <path d={path} stroke="#7C5BE3" strokeWidth={2} fill="none" />
        {points2d.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#7C5BE3">
            <title>{`${p.s}점`}</title>
          </circle>
        ))}
        <text x={pad} y={toY(100) + 9} fontSize="9" fill="#7B8190">100</text>
        <text x={pad} y={toY(50) + 9} fontSize="9" fill="#7B8190">50</text>
      </svg>
    </div>
  )
}
