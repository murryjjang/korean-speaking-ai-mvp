"use client";

import {
  DataTable,
  Badge,
  ScoreBar,
  EmptyState,
  type Column,
} from "@/src/components/ui";

export type ClassRow = Record<string, unknown> & {
  id: string;
  name: string;
  semester: string;
  studentCount: number;
  submissionCount: number;
  avgScore: number | null;
};

export type LanguageRow = Record<string, unknown> & {
  group: string;
  groupLabel: string;
  count: number;
  avgScore: number | null;
};

const classColumns: Column<ClassRow>[] = [
  { key: "name", label: "반 이름", sortable: true },
  { key: "semester", label: "학기" },
  { key: "studentCount", label: "학생 수", sortable: true },
  { key: "submissionCount", label: "제출 건수", sortable: true },
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
];

const langColumns: Column<LanguageRow>[] = [
  { key: "groupLabel", label: "어권", sortable: true },
  {
    key: "count",
    label: "학생 수",
    sortable: true,
    render: (v) => <Badge variant="outline">{String(v)}명</Badge>,
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
        <span className="text-text-muted text-xs">—</span>
      ),
  },
];

export function ClassDataTable({ rows }: { rows: ClassRow[] }) {
  return (
    <DataTable
      columns={classColumns}
      data={rows}
      rowKey="id"
      emptyState={<EmptyState title="등록된 반이 없습니다." />}
    />
  );
}

export function LangDataTable({ rows }: { rows: LanguageRow[] }) {
  return (
    <DataTable
      columns={langColumns}
      data={rows}
      rowKey="group"
      emptyState={<EmptyState title="데이터가 없습니다." />}
    />
  );
}
