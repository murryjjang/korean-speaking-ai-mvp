import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  icon?: ReactNode;
  className?: string;
}

const trendClasses = {
  up: "text-success-700",
  down: "text-danger-700",
  neutral: "text-text-muted",
};

const trendIcons = {
  up: "↑",
  down: "↓",
  neutral: "→",
};

export function StatCard({
  label,
  value,
  description,
  trend,
  icon,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`bg-surface-raised border border-border rounded-lg p-5 flex flex-col gap-2 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <span className="text-text-muted" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-text-primary tabular-nums leading-none">
        {value}
      </p>
      {(description || trend) && (
        <div className="flex items-center gap-2">
          {trend && (
            <span
              className={`text-xs font-medium ${trendClasses[trend.direction]}`}
            >
              {trendIcons[trend.direction]} {trend.value}
            </span>
          )}
          {description && (
            <span className="text-xs text-text-muted">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
