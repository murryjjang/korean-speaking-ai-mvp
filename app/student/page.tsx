import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  CardBody,
  Badge,
} from "@/src/components/ui";
import {
  mockSubmissions,
  mockAIEvaluations,
  mockStudents,
} from "@/src/lib/mock/data";
import rubricsJson from "@/src/content/rubrics.json";
import questionSetsJson from "@/src/content/question-sets.json";
import {
  StudentSubmissionsTable,
  type SubmissionRow,
} from "./submissions-table";
import { TodayTasks, type TodayTask } from "./today-tasks";
import { ScoreBreakdown } from "./score-breakdown";
import { RecommendedActivity } from "./recommended-activity";

const DEMO_STUDENT_ID = "student-001";

const moduleTypeLabels: Record<string, string> = {
  assessment: "말하기 평가",
  mission: "미션 대화",
  contest: "말하기 대회",
};

const languageGroupLabels: Record<string, string> = {
  "east-asian": "동아시아",
  "southeast-asian": "동남아시아",
  arabic: "아랍어권",
  european: "유럽",
  korean: "한국어",
  other: "기타",
};

export default function StudentDashboardPage() {
  const student = mockStudents.find((s) => s.id === DEMO_STUDENT_ID);
  const mySubmissions = mockSubmissions.filter(
    (s) => s.studentId === DEMO_STUDENT_ID
  );

  const evalMap = new Map(
    mockAIEvaluations.map((e) => [e.submissionId, e])
  );

  const finalizedCount = mySubmissions.filter(
    (s) => s.status === "finalized"
  ).length;
  const scores = mySubmissions
    .map((s) => evalMap.get(s.id)?.normalizedScore)
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
    score: evalMap.get(s.id)?.normalizedScore ?? null,
    status: s.status,
  }));

  // 오늘의 과제: pending 제출 또는 미완료 세트
  const submittedSetIds = new Set(
    mySubmissions.map((s) => s.questionSetId).filter(Boolean)
  );
  const todayTasks: TodayTask[] = questionSetsJson
    .filter((qs) => qs.isActive)
    .map((qs) => ({
      id: qs.id,
      setName: qs.name,
      purpose: qs.purpose as TodayTask["purpose"],
      questionCount: qs.questions.length,
      estimatedMinutes: qs.questions.length * 2,
      isAvailable: !submittedSetIds.has(qs.id),
    }))
    .slice(0, 3);

  // 최근 평가 결과 (가장 최근 AI 평가가 있는 제출)
  const recentEval = mySubmissions
    .slice()
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )
    .map((s) => ({ sub: s, eval: evalMap.get(s.id) }))
    .find((x) => x.eval !== undefined);

  const rubric = rubricsJson.find((r) => r.id === "rubric-speaking-01");
  const breakdownItems =
    recentEval && rubric
      ? rubric.items.map((item) => ({
          id: item.id,
          label: item.label,
          score: recentEval.eval!.scores[item.id] ?? 0,
          maxScore: item.maxScore,
        }))
      : [];

  const recentSetName = recentEval?.sub.questionSetId
    ? (questionSetsJson.find((qs) => qs.id === recentEval.sub.questionSetId)
        ?.name ?? "말하기 평가")
    : "말하기 평가";

  return (
    <div>
      <PageHeader
        title="내 학습 현황"
        description={
          student
            ? `${student.name} · ${student.classId === "class-01" ? "A반 (중급)" : "B반 (초급)"} · ${student.nativeLanguage}`
            : "제출한 평가 결과와 학습 진행 상황을 확인하세요."
        }
      />

      {student && (
        <div className="flex items-center gap-2 mb-6">
          <Badge variant="outline">
            {languageGroupLabels[student.languageGroup] ?? student.languageGroup}
          </Badge>
          <Badge variant="outline">{student.nativeLanguage}</Badge>
          <Badge variant="info">{student.anonymousId}</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TodayTasks tasks={todayTasks} />
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
          <StatCard
            label="전체 제출"
            value={mySubmissions.length}
            description="누적 제출 건수"
          />
          <StatCard
            label="평균 점수"
            value={avgScore > 0 ? avgScore : "—"}
            description="AI 평가 기준"
          />
          <StatCard
            label="결과 대기 중"
            value={pendingCount}
            description="채점 진행 중"
          />
        </div>
      </div>

      {recentEval && rubric && (
        <div className="mb-6">
          <ScoreBreakdown
            setName={recentSetName}
            submittedAt={new Date(
              recentEval.sub.submittedAt
            ).toLocaleDateString("ko-KR")}
            totalScore={recentEval.eval!.totalScore}
            maxTotal={100}
            items={breakdownItems}
            feedback={recentEval.eval!.feedback}
          />
        </div>
      )}

      <Card className="mb-6">
        <CardHeader
          title="제출 내역"
          description="말하기 평가 및 미션 대화 제출 목록"
        />
        <CardBody noPadding>
          <StudentSubmissionsTable rows={rows} />
        </CardBody>
      </Card>

      <RecommendedActivity
        items={[
          {
            id: "rec-1",
            label: "연습평가 세트 A",
            description: "3문항 · 최근 발음 오류 집중 연습",
            activityType: "assessment",
          },
          {
            id: "rec-2",
            label: "식당 미션 대화",
            description: "AI 페르소나와 주문 연습",
            activityType: "mission",
          },
        ]}
      />

      {finalizedCount > 0 && (
        <p className="mt-4 text-xs text-text-muted text-right">
          확정된 평가: {finalizedCount}건
        </p>
      )}
    </div>
  );
}
