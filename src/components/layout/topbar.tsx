import Image from "next/image";
import { Badge } from "@/src/components/ui/badge";
import type { UserRole } from "./app-shell";

interface TopbarProps {
  role: UserRole;
  userName?: string;
}

const roleConfig: Record<
  UserRole,
  { label: string; variant: "info" | "default" | "outline" }
> = {
  student: { label: "학습자", variant: "info" },
  teacher: { label: "교수자", variant: "outline" },
  admin: { label: "관리자", variant: "default" },
};

// v1.1 단계 19.7 [아키텍처]: 헤더 보조 언어 토글 제거.
// 보조 언어는 mother_tongue 단독 결정 — 사용자가 변경하지 못한다. 헤더는
// 로고 + 페이지 식별 + 사용자명 + 역할 배지 + 로그아웃으로 단순화.
export function Topbar({ role, userName }: TopbarProps) {
  const { label, variant } = roleConfig[role];

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-surface-raised border-b border-border">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center bg-white rounded-lg px-2 py-1">
          <Image
            src="/logos/kdli-logo-256.png"
            alt="KDLI"
            width={160}
            height={120}
            priority
            className="h-7 w-auto"
          />
        </div>
        <span className="text-border-strong text-sm" aria-hidden="true">
          |
        </span>
        <span className="text-xs text-text-secondary font-medium">
          말하기 훈련·평가 플랫폼
        </span>
      </div>

      <div className="flex items-center gap-3">
        {userName && (
          <span className="hidden sm:inline text-xs text-text-secondary truncate max-w-[12rem]">
            {userName}
          </span>
        )}
        <Badge variant={variant} size="sm">
          {label}
        </Badge>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            로그아웃
          </button>
        </form>
      </div>
    </header>
  );
}
