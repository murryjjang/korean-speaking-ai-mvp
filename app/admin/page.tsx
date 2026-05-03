import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  CardBody,
} from "@/src/components/ui";
import {
  mockClasses,
  mockStudents,
  mockSubmissions,
  mockAIEvaluations,
} from "@/src/lib/mock/data";
import {
  ClassDataTable,
  LangDataTable,
  type ClassRow,
  type LanguageRow,
} from "./data-tables";

const languageGroupLabels: Record<string, string> = {
  "east-asian": "동아시아",
  "southeast-asian": "동남아시아",
  arabic: "아랍어권",
  european: "유럽",
  korean: "한국어",
  other: "기타",
};

export default function AdminDashboardPage() {
  const evalMap = new Map(
    mockAIEvaluations.map((e) => [e.submissionId, e.normalizedScore])
  );

  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const weeklySubmissions = mockSubmissions.filter(
    (s) => new Date(s.submittedAt) >= thisWeekStart
  );

  const allScores = mockAIEvaluations.map((e) => e.normalizedScore);
  const globalAvg =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

  const classRows: ClassRow[] = mockClasses.map((c) => {
    const classStudents = mockStudents.filter((s) => s.classId === c.id);
    const classSubs = mockSubmissions.filter((s) =>
      classStudents.some((st) => st.id === s.studentId)
    );
    const classScores = classSubs
      .map((s) => evalMap.get(s.id))
      .filter((v): v is number => v !== undefined);
    const avg =
      classScores.length > 0
        ? Math.round(classScores.reduce((a, b) => a + b, 0) / classScores.length)
        : null;

    return {
      id: c.id,
      name: c.name,
      semester: c.semester,
      studentCount: classStudents.length,
      submissionCount: classSubs.length,
      avgScore: avg,
    };
  });

  const groupMap = new Map<string, { count: number; scores: number[] }>();
  for (const student of mockStudents) {
    const g = student.languageGroup;
    if (!groupMap.has(g)) groupMap.set(g, { count: 0, scores: [] });
    const entry = groupMap.get(g)!;
    entry.count += 1;
    const studentSubs = mockSubmissions.filter(
      (s) => s.studentId === student.id
    );
    for (const sub of studentSubs) {
      const score = evalMap.get(sub.id);
      if (score !== undefined) entry.scores.push(score);
    }
  }

  const langRows: LanguageRow[] = Array.from(groupMap.entries()).map(
    ([group, { count, scores }]) => ({
      group,
      groupLabel: languageGroupLabels[group] ?? group,
      count,
      avgScore:
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null,
    })
  );

  return (
    <div>
      <PageHeader
        title="시스템 현황"
        description="전체 학습자, 반, 제출 데이터를 한눈에 확인하세요."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="전체 학생"
          value={mockStudents.length}
          description="등록된 학습자 수"
        />
        <StatCard
          label="운영 중인 반"
          value={mockClasses.filter((c) => c.isActive).length}
          description="활성 반"
        />
        <StatCard
          label="이번 주 제출"
          value={weeklySubmissions.length}
          description="최근 7일 기준"
        />
        <StatCard
          label="전체 평균 점수"
          value={globalAvg > 0 ? globalAvg : "—"}
          description="AI 평가 기준"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="반별 현황" description="반 단위 학생 및 제출 통계" />
          <CardBody noPadding>
            <ClassDataTable rows={classRows} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="어권별 분포" description="모국어 어권 기준 학습 현황" />
          <CardBody noPadding>
            <LangDataTable rows={langRows} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
