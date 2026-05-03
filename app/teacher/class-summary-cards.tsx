import { Card, CardBody, Badge } from "@/src/components/ui";

export type ClassSummary = {
  id: string;
  name: string;
  studentCount: number;
  submissionCount: number;
  avgScore: number | null;
  pendingCount: number;
  highRiskCount: number;
};

export function ClassSummaryCards({ classes }: { classes: ClassSummary[] }) {
  if (classes.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {classes.map((cls) => (
        <Card key={cls.id}>
          <CardBody>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {cls.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  학생 {cls.studentCount}명 · 제출 {cls.submissionCount}건
                </p>
              </div>
              {cls.highRiskCount > 0 && (
                <Badge variant="danger">⚠ 주의 {cls.highRiskCount}명</Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-text-secondary mb-1">평균 점수</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums">
                  {cls.avgScore !== null ? cls.avgScore : "—"}
                </p>
              </div>
              <div className="flex-1 border-l border-border pl-3">
                <p className="text-xs text-text-secondary mb-1">채점 대기</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums">
                  {cls.pendingCount}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
