import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  CardBody,
} from "@/src/components/ui";
import {
  mockSubmissions,
  mockStudents,
  mockAIEvaluations,
} from "@/src/lib/mock/data";
import type { RiskLevel } from "@/src/types/data";
import {
  TeacherSubmissionsTable,
  type TeacherSubmissionRow,
} from "./submissions-table";

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

export default function TeacherDashboardPage() {
  const evalMap = new Map(
    mockAIEvaluations.map((e) => [e.submissionId, e.normalizedScore])
  );
  const studentMap = new Map(mockStudents.map((s) => [s.id, s]));

  const pending = mockSubmissions.filter(
    (s) => s.status === "ai_evaluated"
  );
  const highRiskCount = mockSubmissions.filter((s) => {
    const score = evalMap.get(s.id);
    return calcRisk(score) === "high";
  }).length;

  const allScores = mockAIEvaluations.map((e) => e.normalizedScore);
  const avgScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

  const rows: TeacherSubmissionRow[] = mockSubmissions.map((s) => {
    const student = studentMap.get(s.studentId);
    const score = evalMap.get(s.id) ?? null;
    return {
      id: s.id,
      studentName: student?.name ?? s.studentId,
      langGroup: student
        ? (languageGroupLabels[student.languageGroup] ?? student.languageGroup)
        : "—",
      submittedAt: new Date(s.submittedAt).toLocaleDateString("ko-KR"),
      moduleType: s.moduleType === "assessment" ? "말하기 평가" : "미션 대화",
      aiScore: score,
      status: s.status,
      risk: calcRisk(score ?? undefined),
    };
  });

  return (
    <div>
      <PageHeader
        title="채점 관리"
        description="학생 제출 현황을 확인하고 AI 평가를 검토하세요."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="채점 대기"
          value={pending.length}
          description="AI 평가 완료, 검토 필요"
        />
        <StatCard
          label="전체 학생"
          value={mockStudents.length}
          description="등록된 학습자"
        />
        <StatCard
          label="평균 AI 점수"
          value={avgScore > 0 ? avgScore : "—"}
          description="전체 제출 기준"
        />
        <StatCard
          label="주의 학생"
          value={highRiskCount}
          description="점수 60점 미만"
        />
      </div>

      <Card>
        <CardHeader
          title="전체 제출 목록"
          description="학생별 제출 내역 및 평가 현황"
        />
        <CardBody noPadding>
          <TeacherSubmissionsTable rows={rows} />
        </CardBody>
      </Card>
    </div>
  );
}
