'use client'

// v1.1 25-2: 도구 호출 결과 시각 카드.
//
// 자유 대화에서 LLM이 search_place / get_weather / search_address 도구를 호출한 결과를
// NPC 응답 옆/아래에 카드 형태로 시각화한다. 음성 응답(NPC 텍스트)은 그대로 유지되며,
// 카드는 보조 시각 정보로 같이 노출된다.

type ToolResult = {
  name: string
  args: Record<string, unknown>
  result: unknown
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object'
}

function PlaceCards({ result }: { result: Record<string, unknown> }) {
  const places = Array.isArray(result.places) ? result.places : []
  if (places.length === 0) return null
  const top = places.slice(0, 3) as Array<Record<string, unknown>>
  return (
    <div className="space-y-1.5" data-testid="tool-card-places">
      <p className="text-[10px] uppercase tracking-wide text-text-muted font-semibold">📍 장소 검색</p>
      {top.map((p, i) => (
        <div
          key={i}
          className="rounded-md border border-border bg-white px-3 py-2"
          data-testid="place-card"
        >
          <p className="text-sm font-semibold text-text-primary">{String(p.name ?? '')}</p>
          {typeof p.category === 'string' && p.category && (
            <p className="text-[11px] text-text-muted truncate">{p.category}</p>
          )}
          {typeof p.address === 'string' && p.address && (
            <p className="text-[11px] text-text-secondary truncate">{p.address}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function WeatherCard({ result }: { result: Record<string, unknown> }) {
  const city = typeof result.city === 'string' ? result.city : ''
  const forecast = isObj(result.forecast) ? result.forecast : null
  if (!forecast) return null
  const temp = typeof forecast.temperatureC === 'number' ? forecast.temperatureC : null
  const pop = typeof forecast.precipitationProbability === 'number' ? forecast.precipitationProbability : null
  const sky = typeof forecast.sky === 'string' ? forecast.sky : ''
  return (
    <div
      className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2"
      data-testid="tool-card-weather"
    >
      <p className="text-[10px] uppercase tracking-wide text-sky-700 font-semibold mb-0.5">
        ☁️ 날씨 · {city || '예보'}
      </p>
      <div className="flex items-baseline gap-3">
        {temp !== null && (
          <span className="text-2xl font-bold text-sky-900 tabular-nums">
            {temp}<span className="text-sm font-medium ml-0.5">°C</span>
          </span>
        )}
        {sky && <span className="text-sm text-sky-800">{sky}</span>}
        {pop !== null && (
          <span className="text-xs text-sky-700">강수 {pop}%</span>
        )}
      </div>
    </div>
  )
}

function AddressCards({ result }: { result: Record<string, unknown> }) {
  const addrs = Array.isArray(result.addresses) ? result.addresses : []
  if (addrs.length === 0) return null
  const top = addrs.slice(0, 2) as Array<Record<string, unknown>>
  return (
    <div className="space-y-1.5" data-testid="tool-card-addresses">
      <p className="text-[10px] uppercase tracking-wide text-text-muted font-semibold">🏠 주소 검색</p>
      {top.map((a, i) => (
        <div
          key={i}
          className="rounded-md border border-border bg-white px-3 py-2"
          data-testid="address-card"
        >
          <p className="text-sm font-semibold text-text-primary truncate">
            {String(a.roadAddress ?? a.jibunAddress ?? '')}
          </p>
          <details className="mt-1 text-[11px] text-text-muted">
            <summary className="cursor-pointer">자세히</summary>
            <p>지번: {String(a.jibunAddress ?? '-')}</p>
            <p>우편번호: {String(a.zipCode ?? '-')}</p>
          </details>
        </div>
      ))}
    </div>
  )
}

function FallbackError({ result }: { result: Record<string, unknown> }) {
  const message = typeof result.message === 'string' ? result.message : '도구 호출에 실패했습니다.'
  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
      data-testid="tool-card-error"
    >
      ⚠️ {message}
    </div>
  )
}

export function ToolResultCards({ toolResults }: { toolResults: ToolResult[] | undefined }) {
  if (!toolResults || toolResults.length === 0) return null
  return (
    <div className="mt-2 space-y-2" data-testid="tool-result-cards">
      {toolResults.map((tr, idx) => {
        const r = isObj(tr.result) ? tr.result : null
        if (!r) return null
        if (r.ok === false) return <FallbackError key={idx} result={r} />
        if (tr.name === 'search_place') return <PlaceCards key={idx} result={r} />
        if (tr.name === 'get_weather') return <WeatherCard key={idx} result={r} />
        if (tr.name === 'search_address') return <AddressCards key={idx} result={r} />
        return null
      })}
    </div>
  )
}
