import Link from 'next/link'
import missionGoalsJson from '@/src/content/mission-goals.json'
import { PageHeader, Card, CardHeader, CardBody, Badge } from '@/src/components/ui'

// hydration mismatch 방지: Date, Math.random, 현재 시각 미사용.
// 모든 표시 문자열은 JSON에서 읽거나 고정 상수에서 가져온다.

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

const DIFFICULTY_VARIANT: Record<string, 'success' | 'info' | 'warning'> = {
  beginner: 'success',
  intermediate: 'info',
  advanced: 'warning',
}

export default function MissionListPage() {
  const activeScenarios = missionGoalsJson.filter((s) => s.isActive)

  return (
    <div>
      <PageHeader
        title="미션 대화"
        description="AI 페르소나와 상황별 대화를 통해 실전 한국어를 연습하세요."
      />

      <div className="flex flex-col gap-6">
        {activeScenarios.map((scenario) => {
          const diffVariant = DIFFICULTY_VARIANT[scenario.difficulty] ?? 'default'
          const diffLabel = DIFFICULTY_LABEL[scenario.difficulty] ?? scenario.difficulty

          return (
            <Card key={scenario.scenarioId}>
              <CardHeader
                title={scenario.title}
                description={scenario.location}
                action={
                  <Badge variant={diffVariant as 'success' | 'info' | 'warning'}>
                    {diffLabel}
                  </Badge>
                }
              />
              <CardBody>
                {/* 상황 설명 */}
                <p className="text-sm text-text-secondary mb-4">{scenario.situation}</p>

                {/* 미션 목표 */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    미션 목표
                  </p>
                  <ul className="space-y-1.5">
                    {scenario.goals.map((goal) => (
                      <li
                        key={goal.id}
                        className="flex items-center gap-2 text-sm text-text-secondary"
                      >
                        <span className="w-1 h-1 rounded-full bg-primary-700 shrink-0" />
                        {goal.description}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 평가 기준 요약 */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    평가 기준
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.rubric.dimensions.map((dim) => (
                      <span
                        key={dim.id}
                        title={dim.description}
                        className="inline-flex items-center text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5"
                      >
                        {dim.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 예상 시간 + 시작 버튼 */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>예상 {scenario.estimatedMinutes}분</span>
                    <span>최대 {scenario.expectedTurns}턴</span>
                    <span>
                      {scenario.persona.name} ({scenario.persona.role})
                    </span>
                  </div>
                  {/* 대화 화면은 Phase 4-B에서 구현. 현재는 링크만 연결. */}
                  <Link
                    href={`/student/mission/${scenario.scenarioId}`}
                    className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 py-2 rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 shrink-0"
                  >
                    대화 시작
                  </Link>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
