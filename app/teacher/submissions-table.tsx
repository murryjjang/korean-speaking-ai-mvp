"use client";

import Link from "next/link";
import {
  DataTable,
  ScoreBadge,
  RiskBadge,
  Badge,
  EmptyState,
  type Column,
} from "@/src/components/ui";
import type { RiskLevel } from "@/src/types/data";

export type TeacherSubmissionRow = Record<string, unknown> & {
  id: string;
  studentName: string;
  classId: string;
  className: string;
  nativeLanguage: string;
  langGroup: string;
  languageGroupRaw: string;
  submittedAt: string;
  moduleType: string;
  aiScore: number | null;
  status: string;
  risk: RiskLevel;
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

const columns: Column<TeacherSubmissionRow>[] = [
  {
    key: "studentName",
    label: "학생",
    sortable: true,
    className: "whitespace-nowrap",
    render: (v, row) => (
      <Link
        href={`/teacher/submissions/${row.id}`}
        className="font-medium text-primary-700 hover:underline"
      >
        {v as string}
      </Link>
    ),
  },
  { key: "className", label: "반", className: "whitespace-nowrap" },
  { key: "langGroup", label: "어권", className: "whitespace-nowrap" },
  { key: "submittedAt", label: "제출일", sortable: true, className: "whitespace-nowrap" },
  { key: "moduleType", label: "유형", className: "whitespace-nowrap" },
  {
    key: "aiScore",
    label: "AI 점수",
    sortable: true,
    className: "whitespace-nowrap",
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
    className: "whitespace-nowrap",
    render: (v) => {
      const cfg = statusConfig[v as string] ?? {
        label: String(v),
        variant: "default" as const,
      };
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    },
  },
  {
    key: "risk",
    label: "위험도",
    className: "whitespace-nowrap",
    render: (v) => <RiskBadge level={v as RiskLevel} />,
  },
];

export function TeacherSubmissionsTable({
  rows,
}: {
  rows: TeacherSubmissionRow[];
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey="id"
      emptyState={
        <EmptyState
          title="제출된 내역이 없습니다."
          description="학생들의 평가 제출을 기다리는 중입니다."
        />
      }
    />
  );
}
