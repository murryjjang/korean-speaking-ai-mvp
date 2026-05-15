'use client'

// v1.1 25-1: 페르소나 아바타 — DiceBear HTTP API로 시드 고정 SVG를 생성한다.
// npm 패키지 없이 외부 API URL을 <img>로 사용해 번들 영향 0.
//
// 시드는 personaId로 고정 → 같은 페르소나는 항상 같은 그림.
// 스타일: avataaars (사람형). 행정·외부 협력은 약간 격식 있는 변종 사용.

import { useState } from 'react'

const SEED_MAP: Record<string, string> = {
  // 자유 대화 4명
  friend_casual: 'sua',
  friend_casual_male: 'jaehyun',
  korean_life_helper: 'seoyeon',
  korean_life_helper_male: 'youngseok',
  // Q4 3명
  cafe_staff_friendly: 'cafe-owner-50s',
  admin_staff_clear: 'admin-staff',
  event_partner_professional: 'business-partner',
}

// DiceBear avataaars 옵션 — 페르소나 톤에 맞춰 미세 조정. 시연 환경에서 매번 같은 그림.
function buildAvatarUrl(personaId: string, size: number): string {
  const seed = SEED_MAP[personaId] ?? personaId
  // size px 단위로 정확한 비트맵을 받기 위해 size 파라미터를 명시.
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&size=${size}&radius=50`
}

export function PersonaAvatar({
  personaId,
  size = 64,
  className,
  alt,
}: {
  personaId: string
  size?: number
  className?: string
  alt?: string
}) {
  const [errored, setErrored] = useState(false)
  if (errored) {
    // 오프라인·API 차단 시 폴백 — 첫 글자 이니셜 원형 배지.
    const seed = SEED_MAP[personaId] ?? personaId
    const initial = seed.slice(0, 1).toUpperCase()
    return (
      <div
        role="img"
        aria-label={alt ?? `${personaId} avatar`}
        className={`inline-flex items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold ${className ?? ''}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      >
        {initial}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={buildAvatarUrl(personaId, size)}
      width={size}
      height={size}
      alt={alt ?? `${personaId} avatar`}
      onError={() => setErrored(true)}
      className={`inline-block rounded-full bg-primary-50 ${className ?? ''}`}
      style={{ width: size, height: size }}
      loading="lazy"
      data-testid="persona-avatar"
    />
  )
}
