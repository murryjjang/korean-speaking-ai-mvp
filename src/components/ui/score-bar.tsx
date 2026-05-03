interface ScoreBarProps {
  score: number;
  maxScore?: number;
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(pct: number): string {
  if (pct >= 80) return "bg-success-500";
  if (pct >= 60) return "bg-warning-500";
  return "bg-danger-500";
}

export function ScoreBar({
  score,
  maxScore = 100,
  showLabel = true,
  className = "",
}: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const colorClass = getScoreColor(pct);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={maxScore}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-text-secondary w-8 text-right shrink-0">
          {score}
        </span>
      )}
    </div>
  );
}
