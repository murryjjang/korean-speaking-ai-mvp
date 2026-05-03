import { Card, CardBody, Badge, Button } from "@/src/components/ui";

export type RecommendedItem = {
  id: string;
  label: string;
  description: string;
  activityType: "assessment" | "mission" | "shadowing";
};

const typeLabels: Record<RecommendedItem["activityType"], string> = {
  assessment: "말하기 평가",
  mission: "미션 대화",
  shadowing: "TTS 섀도잉",
};

export function RecommendedActivity({
  items,
}: {
  items: RecommendedItem[];
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
          다음 추천 활동
        </p>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2">
                <Badge variant="outline">{typeLabels[item.activityType]}</Badge>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {item.label}
                  </p>
                  <p className="text-xs text-text-muted">{item.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled>
                준비 중
              </Button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-text-muted">
          * 추천 기능은 향후 업데이트될 예정입니다.
        </p>
      </CardBody>
    </Card>
  );
}
