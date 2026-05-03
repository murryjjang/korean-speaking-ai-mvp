import { Card, CardHeader, CardBody, Badge, Button } from "@/src/components/ui";

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
              <Button
                variant={task.isAvailable ? "primary" : "ghost"}
                size="sm"
                disabled={!task.isAvailable}
              >
                {task.isAvailable ? "시작하기" : "준비 중"}
              </Button>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
