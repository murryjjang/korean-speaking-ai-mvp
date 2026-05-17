import { type HTMLAttributes, type ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-surface-raised border border-border rounded-lg shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  // v1.1 단계 19.10 [페이즈3]: title·description을 ReactNode로 확장.
  // BilingualText·Localized 같은 다국어 컴포넌트를 헤더에 직접 끼울 수 있게 함.
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  description,
  action,
  className = "",
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between px-5 py-4 border-b border-border ${className}`}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-text-primary leading-5">
          {title}
        </h3>
        {description && (
          <div className="mt-0.5 text-xs text-text-muted">{description}</div>
        )}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  noPadding?: boolean;
}

export function CardBody({
  children,
  noPadding = false,
  className = "",
  ...props
}: CardBodyProps) {
  return (
    <div className={`${noPadding ? "" : "px-5 py-4"} ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({
  children,
  className = "",
  ...props
}: CardFooterProps) {
  return (
    <div
      className={`px-5 py-3 border-t border-border bg-surface rounded-b-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
