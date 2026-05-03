import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  CardBody,
} from "@/src/components/ui";
import { mockSubmissions, mockAIEvaluations } from "@/src/lib/mock/data";
import {
  StudentSubmissionsTable,
  type SubmissionRow,
} from "./submissions-table";

const DEMO_STUDENT_ID = "student-001";

const moduleTypeLabels: Record<string, string> = {
  assessment: "말하기 평가",
  mission: "미션 대화",
  contest: "말하기 대회",
};

export default function StudentDashboardPage() {
  const mySubmissions = mockSubmissions.filter(
    (s) => s.studentId === DEMO_STUDENT_ID
  );

  const evalMap = new Map(
    mockAIEvaluations.map((e) => [e.submissionId, e.normalizedScore])
  );

  const finalizedCount = mySubmissions.filter(
    (s) => s.status === "finalized"
  ).length;
  const scores = mySubmissions
    .map((s) => evalMap.get(s.id))
    .filter((v): v is number => v !== undefined);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  const pendingCount = mySubmissions.filter(
    (s) => s.status === "pending" || s.status === "ai_evaluated"
  ).length;

  const rows: SubmissionRow[] = mySubmissions.map((s) => ({
    id: s.id,
    submittedAt: new Date(s.submittedAt).toLocaleDateString("ko-KR"),
    moduleType: moduleTypeLabels[s.moduleType] ?? s.moduleType,
    score: evalMap.get(s.id) ?? null,
    status: s.status,
  }));

  return (
    <div>
      <PageHeader
        title="내 학습 현황"
        description="제출한 평가 결과와 학습 진행 상황을 확인하세요."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="전체 제출" value={mySubmissions.length} description="누적 제출 건수" />
        <StatCard
          label="평균 점수"
          value={avgScore > 0 ? avgScore : "—"}
          description="AI 평가 기준"
        />
        <StatCard label="결과 대기 중" value={pendingCount} description="채점 진행 중" />
      </div>

      <Card>
        <CardHeader
          title="제출 내역"
          description="말하기 평가 및 미션 대화 제출 목록"
        />
        <CardBody noPadding>
          <StudentSubmissionsTable rows={rows} />
        </CardBody>
      </Card>

      {finalizedCount > 0 && (
        <p className="mt-4 text-xs text-text-muted text-right">
          확정된 평가: {finalizedCount}건
        </p>
      )}
    </div>
  );
}
