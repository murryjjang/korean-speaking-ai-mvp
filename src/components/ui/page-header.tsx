import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  // v1.1 단계 19.10 [페이즈3]: description을 ReactNode로 확장 — BilingualText 직접 끼우기 위함.
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** v1.1 단계 19.8 [UI보조]: 제목 mother_tongue 보조 표기 — 작은 글씨로 본문 아래.
   *  ko 학습자에게는 호출부에서 undefined 전달해 미표시. */
  titleSupplement?: ReactNode;
}

export function PageHeader({
  title,
  description,
  action,
  className = "",
  titleSupplement,
}: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-6 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-text-primary leading-tight" lang="ko">
          {title}
        </h1>
        {titleSupplement && (
          <div className="mt-0.5">
            {titleSupplement}
          </div>
        )}
        {description && (
          <div className="mt-1 text-sm text-text-secondary">{description}</div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
