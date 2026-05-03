import type { RiskLevel } from "@/src/types/data";
import { Badge } from "./badge";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

const riskConfig: Record<
  RiskLevel,
  { label: string; variant: "success" | "warning" | "danger" }
> = {
  low: { label: "낮음", variant: "success" },
  medium: { label: "보통", variant: "warning" },
  high: { label: "높음", variant: "danger" },
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const { label, variant } = riskConfig[level];
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
