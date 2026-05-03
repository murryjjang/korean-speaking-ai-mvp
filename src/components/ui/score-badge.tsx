interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  className?: string;
}

function getScoreStyles(pct: number): string {
  if (pct >= 80) return "bg-success-50 text-success-700 border-success-100";
  if (pct >= 60) return "bg-warning-50 text-warning-700 border-warning-100";
  return "bg-danger-50 text-danger-700 border-danger-100";
}

export function ScoreBadge({
  score,
  maxScore = 100,
  className = "",
}: ScoreBadgeProps) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const styleClass = getScoreStyles(pct);

  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 rounded-full border",
        "text-sm font-semibold tabular-nums",
        styleClass,
        className,
      ].join(" ")}
    >
      {score}
    </span>
  );
}
