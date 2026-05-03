// ── 콘텐츠 타입 (mission-goals.json 구조) ─────────────────────────

export type MissionDifficulty = 'beginner' | 'intermediate' | 'advanced'

export type MissionSuccessCriteria = {
  type: 'keyword' | 'intent' | 'all'
  values: string[]
}

export type MissionRubricDimension = {
  id: string
  label: string
  description: string
  maxScore: number
}

export type MissionRubric = {
  dimensions: MissionRubricDimension[]
}

export type MissionSampleResponse = {
  turn: number
  text: string
}

/** AI 페르소나 — personas.json의 Persona에 대응 */
export type MissionPersona = {
  id: string
  name: string             // 대화창 AI 이름 레이블 예: "김민지"
  role: string             // 역할 예: "식당 직원" — 인트로 Badge 표시용
  greetingMessage: string  // 세션 시작 시 AI 첫 발화
}

/** 단일 미션 목표 — JSON 콘텐츠 정의 */
export type MissionGoal = {
  id: string           // 예: "rg-01" — 시나리오 내 고유
  description: string  // 학습자에게 표시되는 목표 문장 예: "음식 2가지 주문하기"
  achievedAtTurn: number // mock 전용. 이 라운드 번호 이상이 되면 서버에서 달성 처리
  order: number        // 목록 표시 순서 (1-indexed)
}

/**
 * 미션 시나리오 전체 구조 — mission-goals.json의 단일 항목 타입.
 * self-contained: scenarios.json / personas.json 없이 미션 모듈이 독립 동작 가능.
 */
export type MissionScenario = {
  scenarioId: string
  title: string            // 화면 표시 제목 예: "식당에서 주문하기"
  situation: string        // 상황 배경 문장 예: "한국 식당에 처음 방문했습니다."
  location: string         // 장소 표시 예: "한국 음식점" — 카드 서브텍스트
  persona: MissionPersona
  goals: MissionGoal[]
  successCriteria: MissionSuccessCriteria
  expectedTurns: number    // 최대 허용 대화 라운드 수 (= scenarios.json maxTurns)
  difficulty: MissionDifficulty
  estimatedMinutes: number // 예상 소요 시간 — 목록 화면 표시용
  isActive: boolean
  rubric: MissionRubric
  sampleResponses: MissionSampleResponse[]
  mockEvaluation: {
    conversationNaturalness: number    // 0–100 고정값
    expressionAppropriateness: number  // 0–100 고정값
    strengths: string[]                // 2개 고정 문자열
    improvements: string[]            // 2개 고정 문자열
  }
}

// ── 런타임 세션 타입 ──────────────────────────────────────────────

/** 대화창에 표시되는 단일 발화 */
export type MissionTurn = {
  id: string         // `turn-${sessionId}-${index}` — Server Action에서만 생성
  role: 'ai' | 'user'
  text: string
  turnNumber: number // 라운드 번호 (1-indexed). AI greeting = 0
  timestamp: string  // ISO 8601 — Server Action에서 설정. Client에서 생성 금지
}

/** 런타임 목표 상태 — MissionGoal + 달성 여부 */
export type MissionGoalState = MissionGoal & {
  achieved: boolean
  achievedOnTurnNumber: number | null  // 달성된 라운드 번호. 미달성은 null
}

export type MissionSessionStatus = 'in_progress' | 'submitted'

/** 인메모리 세션 — mission-store에 저장. Phase 9+에서 Supabase로 교체 예정 */
export type MissionSession = {
  sessionId: string
  scenarioId: string
  turns: MissionTurn[]
  goals: MissionGoalState[]
  status: MissionSessionStatus
  currentTurnNumber: number  // 서버 권위 라운드 카운터. Client 카운터에 의존하지 않음
  startedAt: string          // ISO 8601
}

// ── 평가/제출 타입 ────────────────────────────────────────────────

/** submitMission() Server Action에서 산출되는 평가 결과 */
export type MissionEvaluation = {
  // 가변: 실제 목표 달성 결과 기반
  missionAchievementRate: number  // Math.round(achieved / total * 100)
  taskCompletion: number          // missionAchievementRate와 동일값. 별도 표시 항목
  overallScore: number            // 4항목 단순 평균 Math.round

  // 고정: mission-goals.json mockEvaluation에서 읽음
  conversationNaturalness: number
  expressionAppropriateness: number
  strengths: string[]
  improvements: string[]

  providerName: 'mock'  // Phase 9+에서 'claude' 등으로 교체
  evaluatedAt: string   // ISO 8601
}

/**
 * 제출 레코드 — mission-store에 저장.
 * moduleType / status / submittedAt / studentId / classId 필드는
 * src/types/data.ts의 Submission 타입과 의도적으로 일치 (Phase 9+ teacher 연결용).
 * Phase 9+에서 Supabase mission_submissions 테이블로 교체 예정.
 */
export type MissionSubmission = {
  submissionId: string   // `mission-sub-${scenarioId}-${Date.now()}`
  sessionId: string
  scenarioId: string
  studentId: string      // mock 고정: 'student-001'
  classId: string        // mock 고정: 'class-01'
  turns: MissionTurn[]
  goals: MissionGoalState[]
  evaluation: MissionEvaluation
  moduleType: 'mission'        // data.ts ModuleType과 동일
  status: 'ai_evaluated'       // data.ts SubmissionStatus와 동일
  submittedAt: string          // ISO 8601
}

/**
 * 결과 화면(Server Component) 전용 표시 타입 — DB 저장 안 함.
 * submittedAtDisplay는 Server Component에서만 포맷. Client에 전달하지 않음.
 */
export type MissionResult = {
  submission: MissionSubmission
  scenarioTitle: string
  scenarioLocation: string
  personaName: string
  submittedAtDisplay: string  // toLocaleDateString('ko-KR') — Server Component 전용
  totalGoals: number
  achievedGoals: number
  scoreItems: Array<{
    id: string
    label: string
    score: number
  }>
  nextActivities: Array<{
    id: string
    label: string
    activityType: string
    description: string
  }>
}
