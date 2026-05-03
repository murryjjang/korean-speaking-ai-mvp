"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  FilterPanel,
  StatCard,
  type Filter,
} from "@/src/components/ui";
import {
  TeacherSubmissionsTable,
  type TeacherSubmissionRow,
} from "./submissions-table";
import {
  ClassSummaryCards,
  type ClassSummary,
} from "./class-summary-cards";

export type TeacherDashboardProps = {
  allRows: TeacherSubmissionRow[];
  classSummaries: ClassSummary[];
  classOptions: { value: string; label: string }[];
};

const languageGroupOptions = [
  { value: "all", label: "전체 어권" },
  { value: "east-asian", label: "동아시아" },
  { value: "southeast-asian", label: "동남아시아" },
  { value: "arabic", label: "아랍어권" },
  { value: "european", label: "유럽" },
  { value: "other", label: "기타" },
];

const contentTypeOptions = [
  { value: "all", label: "전체 유형" },
  { value: "말하기 평가", label: "말하기 평가" },
  { value: "미션 대화", label: "미션 대화" },
  { value: "말하기 대회", label: "말하기 대회" },
];

const statusOptions = [
  { value: "all", label: "전체 상태" },
  { value: "pending", label: "채점 대기" },
  { value: "ai_evaluated", label: "AI 평가 완료" },
  { value: "teacher_reviewed", label: "교수자 검토" },
  { value: "finalized", label: "확정" },
];

const riskOptions = [
  { value: "all", label: "전체 위험도" },
  { value: "high", label: "⚠ 주의" },
  { value: "medium", label: "보통" },
  { value: "low", label: "정상" },
];

export function TeacherDashboard({
  allRows,
  classSummaries,
  classOptions,
}: TeacherDashboardProps) {
  const [classId, setClassId] = useState("all");
  const [languageGroup, setLanguageGroup] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [evaluationStatus, setEvaluationStatus] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (classId !== "all" && row.classId !== classId) return false;
      if (
        languageGroup !== "all" &&
        row.languageGroupRaw !== languageGroup
      )
        return false;
      if (contentType !== "all" && row.moduleType !== contentType) return false;
      if (evaluationStatus !== "all" && row.status !== evaluationStatus)
        return false;
      if (riskLevel !== "all" && row.risk !== riskLevel) return false;
      return true;
    });
  }, [allRows, classId, languageGroup, contentType, evaluationStatus, riskLevel]);

  const filteredSummaries = useMemo(() => {
    if (classId === "all") return classSummaries;
    return classSummaries.filter((c) => c.id === classId);
  }, [classSummaries, classId]);

  const pendingCount = filteredRows.filter(
    (r) => r.status === "ai_evaluated"
  ).length;
  const highRiskCount = filteredRows.filter((r) => r.risk === "high").length;
  const scores = filteredRows
    .map((r) => r.aiScore)
    .filter((v): v is number => v !== null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const filters: Filter[] = [
    {
      key: "classId",
      label: "반",
      options: classOptions,
      value: classId,
      onChange: setClassId,
    },
    {
      key: "languageGroup",
      label: "어권",
      options: languageGroupOptions,
      value: languageGroup,
      onChange: setLanguageGroup,
    },
    {
      key: "contentType",
      label: "유형",
      options: contentTypeOptions,
      value: contentType,
      onChange: setContentType,
    },
    {
      key: "evaluationStatus",
      label: "상태",
      options: statusOptions,
      value: evaluationStatus,
      onChange: setEvaluationStatus,
    },
    {
      key: "riskLevel",
      label: "위험도",
      options: riskOptions,
      value: riskLevel,
      onChange: setRiskLevel,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="채점 대기"
          value={pendingCount}
          description="AI 평가 완료, 검토 필요"
        />
        <StatCard
          label="표시된 학생"
          value={new Set(filteredRows.map((r) => r.studentName)).size}
          description="현재 필터 기준"
        />
        <StatCard
          label="평균 AI 점수"
          value={avgScore > 0 ? avgScore : "—"}
          description="현재 필터 기준"
        />
        <StatCard
          label="주의 학생"
          value={highRiskCount}
          description="점수 60점 미만"
        />
      </div>

      <ClassSummaryCards classes={filteredSummaries} />

      <Card>
        <CardHeader
          title="제출 목록"
          description={`${filteredRows.length}건 표시 중`}
          action={
            <FilterPanel
              filters={filters}
              className="flex-wrap"
            />
          }
        />
        <CardBody noPadding>
          <TeacherSubmissionsTable rows={filteredRows} />
        </CardBody>
      </Card>

      <div className="mt-4 p-4 bg-surface-base border border-border rounded-lg">
        <p className="text-xs text-text-secondary">
          <strong>교수자 채점</strong> 기능 — 제출 항목을 클릭하면 AI 평가 결과를
          확인하고 최종 점수를 입력할 수 있습니다.
          <span className="ml-2 text-text-muted">
            (3단 채점 UI는 Phase 3에서 구현 예정)
          </span>
        </p>
      </div>
    </div>
  );
}
