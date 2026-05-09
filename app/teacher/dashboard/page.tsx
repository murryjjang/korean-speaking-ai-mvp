import Link from 'next/link'
import { Badge } from '@/src/components/ui'

// ── 샘플 학습자 데이터 ────────────────────────────────────────────────────────

// 점수 분포: 90/80/70/60/50 다섯 구간이 모두 보이도록 배치 (S001~S006).
// 변별력이 한눈에 드러나도록 구성된 샘플 데이터.
const LEARNERS = [
  {
    id: 'S001',
    langGroup: '일본어권',
    level: '고급',
    recentScore: 92,
    weakArea: '문장 끝 억양',
    recommend: '발표연습, q1 낭독 고급 지문',
    needsReview: false,
  },
  {
    id: 'S002',
    langGroup: '베트남어권',
    level: '중급',
    recentScore: 84,
    weakArea: '발표 구성, 조사 활용',
    recommend: '발표연습 원고 교정, 섀도잉',
    needsReview: false,
  },
  {
    id: 'S003',
    langGroup: '우즈베크어권',
    level: '중급',
    recentScore: 75,
    weakArea: '모음 구별, 발표 흐름',
    recommend: '음절 단위 낭독, 발표연습',
    needsReview: true,
  },
  {
    id: 'S004',
    langGroup: '태국어권',
    level: '초급',
    recentScore: 66,
    weakArea: '조사 사용, 높임 표현',
    recommend: 'q3 듣고 답하기, 기본 문형 반복',
    needsReview: true,
  },
  {
    id: 'S005',
    langGroup: '아랍어권',
    level: '초급',
    recentScore: 57,
    weakArea: '받침 발음, 유창성',
    recommend: '읽기연습 다회, 느린 속도 섀도잉',
    needsReview: true,
  },
  {
    id: 'S006',
    langGroup: '몽골어권',
    level: '중급',
    recentScore: 88,
    weakArea: '받침 발음, 핵심 정보 누락',
    recommend: 'q3 듣고 답하기, 받침 집중 낭독',
    needsReview: false,
  },
]

const TOP_WEAKNESSES = [
  { rank: 1, item: '종성/받침 발음', count: 48 },
  { rank: 2, item: '문장 끝 처리', count: 41 },
  { rank: 3, item: '조사 사용', count: 35 },
  { rank: 4, item: '핵심 정보 누락 (q3)', count: 28 },
  { rank: 5, item: '발표 구성/시간 관리', count: 22 },
]

const RECOMMENDED_ACTIVITIES = [
  { activity: '읽기연습', target: '받침 발음 취약 학습자 32명', priority: 'high' },
  { activity: 'q1 낭독 재도전', target: '점수 85 미만 학습자 18명', priority: 'high' },
  { activity: 'q3 듣고 답하기', target: '핵심 정보 누락 학습자 12명', priority: 'medium' },
  { activity: '발표연습 (타이머)', target: '시간 초과 학습자 8명', priority: 'medium' },
  { activity: '느린 속도 섀도잉', target: '유창성 취약 학습자 15명', priority: 'low' },
]

const PENDING_REVIEWS = [
  { id: 'R001', studentId: 'S002', question: 'q3 듣고 답하기', submittedAt: '2026-05-08 09:14', flag: '핵심 정보 누락 의심' },
  { id: 'R002', studentId: 'S006', question: 'q1 낭독', submittedAt: '2026-05-08 10:02', flag: '발음 fallback 상태' },
  { id: 'R003', studentId: 'S002', question: 'q2 사진 설명', submittedAt: '2026-05-07 15:30', flag: '배경 요소 누락' },
  { id: 'R004', studentId: 'S004', question: 'q4 대화 미션', submittedAt: '2026-05-07 14:50', flag: '미션 달성률 50% 미만' },
]

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

function ScoreChip({ score }: { score: number }) {
  const color = score >= 90 ? 'text-success-600 bg-success-50 border-success-200'
    : score >= 80 ? 'text-primary-600 bg-primary-50 border-primary-200'
    : 'text-warning-600 bg-warning-50 border-warning-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold border tabular-nums ${color}`}>
      {score}점
    </span>
  )
}

export default function TeacherDashboardPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">

      {/* 헤더 */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold text-text-primary">교수자 학습 현황</h1>
          <Badge variant="warning" size="sm" data-testid="demo-data-badge">샘플 데이터</Badge>
        </div>
        <p className="text-sm text-text-secondary">
          AI 분석 결과는 교수자 최종 판단을 돕기 위한 참고자료입니다.
        </p>
      </div>

      {/* 교수자 지원 목적 */}
      <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl" data-testid="purpose-statement">
        <p className="text-sm text-primary-700 leading-relaxed">
          본 분석 화면의 목적은 교수자 감원이나 비용절감이 아니라, 반복 평가와 기초 피드백 부담을 줄이고,
          학습자별·어권별·과정별 데이터를 바탕으로 맞춤형 교육을 제공하여 교육의 질을 높이는 것입니다.
        </p>
      </div>

      {/* 개별 학습자 목록 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">개별 학습자 목록</h2>
          <Link
            href="/teacher/submissions"
            className="text-xs text-primary-600 hover:text-primary-700 underline"
          >
            전체 제출 내역 보기 →
          </Link>
        </div>
        <div className="space-y-3" data-testid="learner-list">
          {LEARNERS.map((l) => (
            <div
              key={l.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-surface border border-border rounded-xl"
              data-testid={`learner-${l.id}`}
            >
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-sm font-bold text-text-primary">{l.id}</span>
                <div>
                  <p className="text-xs text-text-muted">{l.langGroup}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    l.level === '초급' ? 'bg-success-100 text-success-700' :
                    l.level === '중급' ? 'bg-primary-100 text-primary-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>{l.level}</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-text-muted mb-0.5">최근 평가 점수</p>
                  <ScoreChip score={l.recentScore} />
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-0.5">취약 영역</p>
                  <p className="text-xs text-text-secondary">{l.weakArea}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-0.5">추천 학습</p>
                  <p className="text-xs text-text-secondary">{l.recommend}</p>
                </div>
              </div>
              <div className="shrink-0">
                {l.needsReview ? (
                  <Badge variant="warning" size="sm" data-testid={`review-needed-${l.id}`}>교수자 검토 필요</Badge>
                ) : (
                  <Badge variant="success" size="sm">검토 불필요</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 취약점 Top 5 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4">취약점 Top 5</h2>
        <div className="space-y-2" data-testid="weakness-top5">
          {TOP_WEAKNESSES.map((w) => (
            <div key={w.rank} className="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg">
              <span className="w-7 h-7 rounded-full bg-warning-100 text-warning-700 text-sm font-bold flex items-center justify-center shrink-0">
                {w.rank}
              </span>
              <p className="flex-1 text-sm font-medium text-text-primary">{w.item}</p>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning-400 rounded-full"
                    style={{ width: `${Math.round(w.count / 48 * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted tabular-nums">{w.count}명</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 재학습 추천 활동 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4">재학습 추천 활동</h2>
        <div className="space-y-2" data-testid="recommended-activities">
          {RECOMMENDED_ACTIVITIES.map((a, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                a.priority === 'high' ? 'bg-danger-500' :
                a.priority === 'medium' ? 'bg-warning-500' : 'bg-success-500'
              }`} />
              <p className="text-sm font-semibold text-text-primary w-36 shrink-0">{a.activity}</p>
              <p className="flex-1 text-xs text-text-secondary">{a.target}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                a.priority === 'high' ? 'bg-danger-50 text-danger-700' :
                a.priority === 'medium' ? 'bg-warning-50 text-warning-700' :
                'bg-success-50 text-success-700'
              }`}>
                {a.priority === 'high' ? '우선' : a.priority === 'medium' ? '권장' : '선택'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 교수자 검토 대기 목록 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4">교수자 검토 대기 목록</h2>
        <div className="overflow-x-auto" data-testid="pending-reviews">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide">검토 ID</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide">학습자</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide">문항</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide">제출 시각</th>
                <th className="text-left py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">검토 사유</th>
              </tr>
            </thead>
            <tbody>
              {PENDING_REVIEWS.map((r, i) => (
                <tr key={r.id} className={`border-b border-border ${i % 2 === 0 ? 'bg-surface' : ''}`}>
                  <td className="py-2.5 pr-4 font-mono text-xs text-text-muted">{r.id}</td>
                  <td className="py-2.5 pr-4 font-bold text-text-primary">{r.studentId}</td>
                  <td className="py-2.5 pr-4 text-text-secondary">{r.question}</td>
                  <td className="py-2.5 pr-4 text-xs text-text-muted tabular-nums">{r.submittedAt}</td>
                  <td className="py-2.5">
                    <span className="text-xs bg-warning-50 text-warning-700 border border-warning-200 rounded-full px-2 py-0.5">
                      {r.flag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          * 실제 검토는{' '}
          <Link href="/teacher/submissions" className="text-primary-600 hover:text-primary-700 underline">
            제출 내역 페이지
          </Link>
          에서 진행합니다. 위 목록은 샘플 데이터입니다.
        </p>
      </section>

    </div>
  )
}
