"use client";

import {
  DataTable,
  ScoreBadge,
  Badge,
  EmptyState,
  type Column,
} from "@/src/components/ui";

export type SubmissionRow = Record<string, unknown> & {
  id: string;
  submittedAt: string;
  moduleType: string;
  score: number | null;
  status: string;
};

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "info" | "success" | "warning" }
> = {
  pending: { label: "채점 대기", variant: "default" },
  ai_evaluated: { label: "AI 평가 완료", variant: "info" },
  teacher_reviewed: { label: "교수자 검토", variant: "warning" },
  finalized: { label: "확정", variant: "success" },
};

const columns: Column<SubmissionRow>[] = [
  { key: "submittedAt", label: "제출일", sortable: true },
  { key: "moduleType", label: "유형" },
  {
    key: "score",
    label: "AI 점수",
    render: (v) =>
      v !== null ? (
        <ScoreBadge score={v as number} />
      ) : (
        <span className="text-text-muted text-xs">—</span>
      ),
  },
  {
    key: "status",
    label: "상태",
    render: (v) => {
      const cfg = statusConfig[v as string] ?? {
        label: String(v),
        variant: "default" as const,
      };
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    },
  },
];

export function StudentSubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey="id"
      emptyState={
        <EmptyState
          title="제출 내역이 없습니다."
          description="말하기 평가 또는 미션 대화에 참여해 보세요."
        />
      }
    />
  );
}
