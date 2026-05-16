'use client'

// v1.1 25-1: 페르소나 아바타 — DiceBear HTTP API로 시드 고정 SVG를 생성한다.
// npm 패키지 없이 외부 API URL을 <img>로 사용해 번들 영향 0.
//
// 시드는 personaId로 고정 → 같은 페르소나는 항상 같은 그림.
// 스타일: avataaars (사람형). 행정·외부 협력은 약간 격식 있는 변종 사용.
//
// 단계 18 [E]: 시드만으로는 성별이 모호하게 출력될 수 있어 페르소나별로 명시적
// top/facialHair/clothe 옵션을 고정. 여성은 LongHair* + Clear, 남성은 ShortHair*
// + 옵션 수염으로 시각 차이 강화.

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

// DiceBear avataaars 명시 옵션 — personaId별 성별·헤어·복장 잠금.
// 옵션 keys/values는 DiceBear 9.x avataaars 스키마에 맞춤.
type AvataaarOptions = {
  top?: string[]
  facialHair?: string[]
  facialHairProbability?: number
  clothing?: string[]
  hairColor?: string[]
  eyebrows?: string[]
}

const PERSONA_OPTIONS: Record<string, AvataaarOptions> = {
  // 여성 (sua, seoyeon) — 긴 머리 + 수염 0
  friend_casual: {
    top: ['longHairStraight', 'longHairStraight2', 'longHairBob'],
    facialHairProbability: 0,
    clothing: ['hoodie', 'shirtCrewNeck'],
    hairColor: ['2c1b18', '4a312c'],
  },
  korean_life_helper: {
    top: ['longHairBigHair', 'longHairBob', 'longHairCurly'],
    facialHairProbability: 0,
    clothing: ['blazerAndShirt', 'shirtVNeck'],
    hairColor: ['2c1b18', '4a312c'],
  },
  // 남성 (jaehyun, youngseok) — 짧은 머리, 옵션 수염
  friend_casual_male: {
    top: ['shortHairShortFlat', 'shortHairTheCaesar'],
    facialHair: ['beardLight'],
    facialHairProbability: 50,
    clothing: ['hoodie', 'shirtCrewNeck'],
    hairColor: ['2c1b18'],
  },
  korean_life_helper_male: {
    top: ['shortHairShortRound', 'shortHairFrizzle'],
    facialHair: ['moustacheFancy', 'beardLight'],
    facialHairProbability: 70,
    clothing: ['blazerAndShirt'],
    hairColor: ['2c1b18'],
  },
}

function optionsToParams(opts?: AvataaarOptions): string {
  if (!opts) return ''
  const parts: string[] = []
  const addList = (key: string, list?: string[]) => {
    if (list && list.length > 0) parts.push(`${key}=${list.map(encodeURIComponent).join(',')}`)
  }
  addList('top', opts.top)
  addList('facialHair', opts.facialHair)
  addList('clothing', opts.clothing)
  addList('hairColor', opts.hairColor)
  addList('eyebrows', opts.eyebrows)
  if (typeof opts.facialHairProbability === 'number') {
    parts.push(`facialHairProbability=${opts.facialHairProbability}`)
  }
  return parts.length > 0 ? `&${parts.join('&')}` : ''
}

// DiceBear avataaars 옵션 — 페르소나 톤에 맞춰 미세 조정. 시연 환경에서 매번 같은 그림.
function buildAvatarUrl(personaId: string, size: number): string {
  const seed = SEED_MAP[personaId] ?? personaId
  const optionParams = optionsToParams(PERSONA_OPTIONS[personaId])
  // size px 단위로 정확한 비트맵을 받기 위해 size 파라미터를 명시.
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&size=${size}&radius=50${optionParams}`
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
