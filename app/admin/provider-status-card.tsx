import { Card, CardHeader, CardBody, Badge } from "@/src/components/ui";
import type { ProviderStatus } from "@/src/types/data";

const typeLabels: Record<ProviderStatus["type"], string> = {
  stt: "STT (음성 인식)",
  tts: "TTS (음성 합성)",
  pronunciation: "발음 평가",
  "llm-eval": "LLM 채점",
};

export function ProviderStatusCard({
  providers,
}: {
  providers: ProviderStatus[];
}) {
  return (
    <Card>
      <CardHeader
        title="Provider 설정 상태"
        description="STT · TTS · 발음평가 · LLM 채점 연동 현황"
      />
      <CardBody>
        <ul className="flex flex-col divide-y divide-border">
          {providers.map((p) => (
            <li
              key={p.type}
              className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-primary w-32 shrink-0">
                  {typeLabels[p.type]}
                </span>
                <Badge variant={p.isMock ? "warning" : "success"}>
                  {p.name}
                </Badge>
              </div>
              <span className="text-xs text-text-muted text-right max-w-xs">
                {p.note}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-text-muted border-t border-border pt-3">
          실제 API 연동은 Phase 4에서 구성합니다. 현재는 mock 모드로 동작합니다.
        </p>
      </CardBody>
    </Card>
  );
}
