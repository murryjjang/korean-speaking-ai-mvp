import Image from 'next/image'

interface KdliBrandProps {
  /** 보조 표기 (예: "말하기 훈련·평가 플랫폼" 또는 "시험운영 동의서"). 없으면 미표시. */
  subtitle?: string
  className?: string
}

// v1.1 단계 19.9 [로고]: KDLI 공식 워드마크 로고 (헤더 공통).
// 19.8까지의 placeholder/seal PNG가 헤더에서 사각 박스 줄로 도드라져 보이는
// 회귀(V1-2)가 보고됨. 19.9에서 사용자 제공 공식 워드마크(/kdli-logo.png)로 교체.
// 박스 테두리/배경 제거하고 자연스럽게 노출.
export function KdliBrand({ subtitle, className = '' }: KdliBrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="kdli-brand">
      <Image
        src="/kdli-logo.png"
        alt="KDLI"
        width={1448}
        height={1086}
        priority
        className="h-8 w-auto"
      />
      {subtitle && (
        <>
          <span className="text-border-strong text-sm" aria-hidden="true">
            |
          </span>
          <span className="text-xs text-text-secondary font-medium">{subtitle}</span>
        </>
      )}
    </div>
  )
}
