import Link from "next/link";
import { Card, CardHeader, CardBody, Badge } from "@/src/components/ui";

export type TodayTask = {
  id: string;
  setName: string;
  purpose: "diagnostic" | "practice" | "post";
  questionCount: number;
  estimatedMinutes: number;
  isAvailable: boolean;
};

const purposeLabels: Record<TodayTask["purpose"], string> = {
  diagnostic: "진단평가",
  practice: "연습평가",
  post: "사후평가",
};

const purposeVariants: Record<
  TodayTask["purpose"],
  "default" | "info" | "warning"
> = {
  diagnostic: "info",
  practice: "default",
  post: "warning",
};

export function TodayTasks({ tasks }: { tasks: TodayTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="오늘의 연습 과제"
        description="완료해야 할 말하기 평가 과제입니다."
      />
      <CardBody>
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-none"
            >
              <div className="flex items-center gap-3">
                <Badge variant={purposeVariants[task.purpose]}>
                  {purposeLabels[task.purpose]}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {task.setName}
                  </p>
                  <p className="text-xs text-text-muted">
                    {task.questionCount}문항 · 예상 {task.estimatedMinutes}분
                  </p>
                </div>
              </div>
              {task.isAvailable ? (
                <Link
                  href="/student/speaking"
                  className="inline-flex items-center justify-center gap-2 font-medium transition-colors px-3 py-1.5 text-xs rounded bg-primary-700 text-white hover:bg-primary-800 border border-primary-700"
                >
                  시작하기
                </Link>
              ) : (
                <Link
                  href="#recent-results"
                  className="inline-flex items-center justify-center gap-2 font-medium transition-colors px-3 py-1.5 text-xs rounded-md bg-surface text-text-primary hover:bg-surface-raised border border-border-strong"
                >
                  결과 보기
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
