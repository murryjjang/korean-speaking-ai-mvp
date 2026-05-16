import Image from 'next/image'

interface KdliBrandProps {
  /** 보조 표기 (예: "말하기 훈련·평가 플랫폼" 또는 "시험운영 동의서"). 없으면 미표시. */
  subtitle?: string
  className?: string
}

// v1.1 단계 19.8 [로고]: 헤더 모든 페이지에 공통 KDLI 사각형 로고.
//
// 학습자(/student/*)·관리자(/admin/*)·교수자(/teacher/*)는 AppShell→Topbar로
// 자동 노출되지만, 리서치 모드(/research/*)는 각 페이지가 자체 헤더를 가져 로고가
// 없었다. 단계 19.8에서 이 컴포넌트를 도입해 모든 리서치 페이지 헤더에 동일 로고
// 노출. 로그인 페이지는 별도 원형 placeholder를 유지 (영향 없음).
export function KdliBrand({ subtitle, className = '' }: KdliBrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="kdli-brand">
      <div className="inline-flex items-center justify-center bg-white rounded-lg px-2 py-1 border border-border/30">
        <Image
          src="/logos/kdli-logo-256.png"
          alt="KDLI"
          width={160}
          height={120}
          priority
          className="h-7 w-auto"
        />
      </div>
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
