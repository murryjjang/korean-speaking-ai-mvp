import { Card, CardHeader, CardBody, ScoreBar, Badge } from "@/src/components/ui";

export type RubricItemScore = {
  id: string;
  label: string;
  score: number;
  maxScore: number;
};

export type ScoreBreakdownProps = {
  setName: string;
  submittedAt: string;
  totalScore: number;
  maxTotal: number;
  items: RubricItemScore[];
  feedback?: string;
};

function getScoreVariant(
  pct: number
): "success" | "warning" | "danger" {
  if (pct >= 80) return "success";
  if (pct >= 60) return "warning";
  return "danger";
}

const variantMap: Record<"success" | "warning" | "danger", "success" | "warning" | "danger"> = {
  success: "success",
  warning: "warning",
  danger: "danger",
};

export function ScoreBreakdown({
  setName,
  submittedAt,
  totalScore,
  maxTotal,
  items,
  feedback,
}: ScoreBreakdownProps) {
  const pct = Math.round((totalScore / maxTotal) * 100);
  const variant = getScoreVariant(pct);

  return (
    <Card>
      <CardHeader
        title="최근 평가 결과"
        description={`${setName} · ${submittedAt}`}
      />
      <CardBody>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl font-bold text-text-primary tabular-nums">
            {totalScore}
          </span>
          <span className="text-sm text-text-muted">/ {maxTotal}</span>
          <Badge variant={variantMap[variant]}>{pct}점</Badge>
        </div>

        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <span className="text-xs text-text-secondary w-14 shrink-0">
                {item.label}
              </span>
              <div className="flex-1">
                <ScoreBar
                  score={item.score}
                  maxScore={item.maxScore}
                  showLabel={false}
                />
              </div>
              <span className="text-xs tabular-nums text-text-secondary w-10 text-right shrink-0">
                {item.score}/{item.maxScore}
              </span>
            </li>
          ))}
        </ul>

        {feedback && (
          <p className="mt-4 text-xs text-text-secondary bg-surface-base border border-border rounded-md p-3">
            {feedback}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
