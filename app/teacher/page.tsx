import { PageHeader } from "@/src/components/ui";
import {
  mockSubmissions,
  mockStudents,
  mockAIEvaluations,
  mockClasses,
  mockRiskFlags,
} from "@/src/lib/mock/data";
import type { RiskLevel } from "@/src/types/data";
import { TeacherDashboard } from "./dashboard-client";
import type { TeacherSubmissionRow } from "./submissions-table";
import type { ClassSummary } from "./class-summary-cards";

function calcRisk(score: number | undefined): RiskLevel {
  if (score === undefined) return "medium";
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  return "high";
}

const languageGroupLabels: Record<string, string> = {
  "east-asian": "동아시아",
  "southeast-asian": "동남아시아",
  arabic: "아랍어권",
  european: "유럽",
  korean: "한국어",
  other: "기타",
};

const classNameMap: Record<string, string> = {
  "class-01": "A반 (중급)",
  "class-02": "B반 (초급)",
};

export default function TeacherDashboardPage() {
  const evalMap = new Map(
    mockAIEvaluations.map((e) => [e.submissionId, e.normalizedScore])
  );
  const studentMap = new Map(mockStudents.map((s) => [s.id, s]));
  const riskFlagMap = new Map(
    mockRiskFlags.map((r) => [r.studentId, r.riskLevel])
  );

  const allRows: TeacherSubmissionRow[] = mockSubmissions.map((s) => {
    const student = studentMap.get(s.studentId);
    const aiScore = evalMap.get(s.id) ?? null;
    const flaggedRisk = student ? riskFlagMap.get(student.id) : undefined;
    const scoreRisk = calcRisk(aiScore ?? undefined);
    const risk: RiskLevel =
      flaggedRisk === "high" || scoreRisk === "high"
        ? "high"
        : flaggedRisk === "medium" || scoreRisk === "medium"
          ? "medium"
          : "low";

    return {
      id: s.id,
      studentName: student?.name ?? s.studentId,
      classId: s.classId,
      className: classNameMap[s.classId] ?? s.classId,
      nativeLanguage: student?.nativeLanguage ?? "—",
      langGroup: student
        ? (languageGroupLabels[student.languageGroup] ?? student.languageGroup)
        : "—",
      languageGroupRaw: student?.languageGroup ?? "",
      submittedAt: new Date(s.submittedAt).toLocaleDateString("ko-KR"),
      moduleType:
        s.moduleType === "assessment"
          ? "말하기 평가"
          : s.moduleType === "mission"
            ? "미션 대화"
            : "말하기 대회",
      aiScore,
      status: s.status,
      risk,
    };
  });

  // 반별 현황 집계
  const classSummaries: ClassSummary[] = mockClasses.map((cls) => {
    const classStudents = mockStudents.filter((s) => s.classId === cls.id);
    const classSubs = allRows.filter((r) => r.classId === cls.id);
    const classScores = classSubs
      .map((r) => r.aiScore)
      .filter((v): v is number => v !== null);
    const avg =
      classScores.length > 0
        ? Math.round(classScores.reduce((a, b) => a + b, 0) / classScores.length)
        : null;
    const pendingCount = classSubs.filter(
      (r) => r.status === "ai_evaluated"
    ).length;
    const highRiskCount = classSubs.filter((r) => r.risk === "high").length;

    return {
      id: cls.id,
      name: cls.name,
      studentCount: classStudents.length,
      submissionCount: classSubs.length,
      avgScore: avg,
      pendingCount,
      highRiskCount,
    };
  });

  const classOptions = [
    { value: "all", label: "전체 반" },
    ...mockClasses.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div>
      <PageHeader
        title="채점 관리"
        description="학생 제출 현황을 확인하고 AI 평가를 검토하세요."
      />
      <TeacherDashboard
        allRows={allRows}
        classSummaries={classSummaries}
        classOptions={classOptions}
      />
    </div>
  );
}
