import { Badge } from "@/src/components/ui/badge";
import type { UserRole } from "./app-shell";

interface TopbarProps {
  role: UserRole;
}

const roleConfig: Record<
  UserRole,
  { label: string; variant: "info" | "default" | "outline" }
> = {
  student: { label: "학습자", variant: "info" },
  teacher: { label: "교수자", variant: "outline" },
  admin: { label: "관리자", variant: "default" },
};

export function Topbar({ role }: TopbarProps) {
  const { label, variant } = roleConfig[role];

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-surface-raised border-b border-border">
      <div className="flex items-center gap-3">
        <span className="text-primary-700 font-bold text-base tracking-tight leading-none">
          한국어 AI
        </span>
        <span className="text-border-strong text-sm" aria-hidden="true">
          |
        </span>
        <span className="text-xs text-text-secondary font-medium">
          말하기 훈련·평가 플랫폼
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={variant} size="sm">
          {label}
        </Badge>
      </div>
    </header>
  );
}
