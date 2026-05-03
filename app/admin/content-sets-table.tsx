"use client";

import {
  DataTable,
  Badge,
  ScoreBar,
  EmptyState,
  type Column,
} from "@/src/components/ui";
import type { ContentSetSummary } from "@/src/types/data";

const purposeLabels: Record<ContentSetSummary["purpose"], string> = {
  diagnostic: "진단평가",
  practice: "연습평가",
  post: "사후평가",
};

const purposeVariants: Record<
  ContentSetSummary["purpose"],
  "info" | "default" | "warning"
> = {
  diagnostic: "info",
  practice: "default",
  post: "warning",
};

type ContentSetRow = ContentSetSummary & Record<string, unknown>;

const columns: Column<ContentSetRow>[] = [
  {
    key: "name",
    label: "세트 이름",
    sortable: true,
  },
  {
    key: "purpose",
    label: "유형",
    render: (v) => {
      const p = v as ContentSetSummary["purpose"];
      return <Badge variant={purposeVariants[p]}>{purposeLabels[p]}</Badge>;
    },
  },
  {
    key: "questionCount",
    label: "문항 수",
    sortable: true,
    render: (v) => (
      <span className="text-sm tabular-nums">{String(v)}문항</span>
    ),
  },
  {
    key: "submissionCount",
    label: "제출 건수",
    sortable: true,
    render: (v) => (
      <Badge variant="outline">{String(v)}건</Badge>
    ),
  },
  {
    key: "avgScore",
    label: "평균 점수",
    sortable: true,
    render: (v) =>
      v !== null ? (
        <div className="flex items-center gap-2 min-w-24">
          <ScoreBar score={v as number} showLabel />
        </div>
      ) : (
        <span className="text-text-muted text-xs">데이터 없음</span>
      ),
  },
  {
    key: "isActive",
    label: "상태",
    render: (v) => (
      <Badge variant={v ? "success" : "default"}>
        {v ? "활성" : "비활성"}
      </Badge>
    ),
  },
];

export function ContentSetsTable({ rows }: { rows: ContentSetSummary[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows as ContentSetRow[]}
      rowKey="id"
      emptyState={<EmptyState title="콘텐츠 세트가 없습니다." />}
    />
  );
}
