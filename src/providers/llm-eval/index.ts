import type {
  LLMEvalProvider,
  LLMEvalResult,
  ProviderName,
  SpeakingEvalInput,
  SpeakingEvalDetail,
} from '@/src/types/providers'

// ── Score helpers ─────────────────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function toRubricScore(score: number): number {
  return Math.round(clamp(score) * 20 / 100)
}

function rubricRationale(score: number, high: string, mid: string, low: string): string {
  if (score >= 75) return high
  if (score >= 50) return mid
  return low
}

/** Convert SpeakingEvalDetail → LLMEvalResult for backward compat with result page. */
export function detailToLLMEvalResult(
  detail: SpeakingEvalDetail,
  providerName: string,
  latencyMs: number,
): LLMEvalResult {
  return {
    scores: [
      {
        rubricItemId: 'ri-pronunciation',
        score: toRubricScore(detail.pronunciation_reference_score ?? detail.fluency_score),
        rationale: rubricRationale(
          detail.pronunciation_reference_score ?? detail.fluency_score,
          '발음이 정확하고 명확합니다.',
          '발음이 전반적으로 양호합니다.',
          '발음 정확도 향상이 필요합니다.',
        ),
      },
      {
        rubricItemId: 'ri-fluency',
        score: toRubricScore(detail.fluency_score),
        rationale: rubricRationale(
          detail.fluency_score,
          '자연스럽고 유창하게 말했습니다.',
          '전반적으로 유창하나 일부 멈춤이 있습니다.',
          '유창성 향상을 위해 더 많은 연습이 필요합니다.',
        ),
      },
      {
        rubricItemId: 'ri-vocabulary',
        score: toRubricScore(detail.vocabulary_score),
        rationale: rubricRationale(
          detail.vocabulary_score,
          '다양하고 적절한 어휘를 잘 사용했습니다.',
          '기본 어휘를 적절히 사용했습니다.',
          '어휘 다양성을 높이면 좋겠습니다.',
        ),
      },
      {
        rubricItemId: 'ri-grammar',
        score: toRubricScore(detail.grammar_score),
        rationale: rubricRationale(
          detail.grammar_score,
          '문법적으로 정확하게 말했습니다.',
          '문법이 대체로 정확하나 일부 오류가 있습니다.',
          '조사, 어미, 시제 사용에 주의가 필요합니다.',
        ),
      },
      {
        rubricItemId: 'ri-task',
        score: toRubricScore(detail.task_completion_score),
        rationale: rubricRationale(
          detail.task_completion_score,
          '과제 지시를 잘 이해하고 핵심 내용을 충실히 포함했습니다.',
          '과제 지시를 대체로 이해하고 주요 내용을 포함했습니다.',
          '과제 내용을 더 충실히 반영하면 좋겠습니다.',
        ),
      },
    ],
    totalScore: detail.overall_score,
    normalizedScore: detail.overall_score,
    errorTags: detail.improvements.slice(0, 3).map((imp) => ({
      type: 'grammar',
      count: 1,
      examples: [imp],
    })),
    feedback: detail.learner_feedback_ko,
    providerName: providerName as ProviderName,
    providerVersion: '1.0.0',
    latencyMs,
  }
}

// ── Mock detail ───────────────────────────────────────────────────────────────

// Model answers by question ID — used in mock fallback, never derived from transcript
const MOCK_MODEL_ANSWERS: Record<string, string> = {
  // Official questions (Phase 10-E-3)
  'beginner-q1-reading': '이 문항은 정해진 지문을 자연스럽게 낭독하는 문항입니다. 지문을 빠뜨리지 않고 또박또박 읽는 것이 중요합니다.',
  'beginner-q2-material-description': '이 사진은 카페에서 손님이 음료를 주문하는 장면입니다. 여자 손님이 점원에게 아이스 아메리카노를 주문하고 있습니다. 점원은 계산대 앞에서 주문을 받고 있습니다. 뒤에는 메뉴판과 시계가 보이고, 다른 손님들도 카페 안에 있습니다.',
  'beginner-q3-listening-response': '한국어 수업은 내일 오전 10시에 시작합니다. 장소는 2층 203호입니다. 학생들은 교재와 필기구를 가져와야 합니다.',
  'beginner-q4-dialogue-mission': '안녕하세요. 아이스 아메리카노 하나 주세요. 포장해 주세요.',
  'intermediate-q1-reading': '이 문항은 도서관 운영 시간 변경 안내문을 정확하고 자연스럽게 낭독하는 문항입니다.',
  'intermediate-q2-material-description': '이 조사에서는 대면 수업을 선호하는 학생이 50%로 가장 많습니다. 온라인 수업은 30%, 혼합형 수업은 20%입니다. 학생들이 선생님과 직접 이야기할 수 있기 때문에 대면 수업을 더 선호하는 것 같습니다.',
  'intermediate-q3-listening-response': '발표 수업은 수요일에서 금요일 오후 1시로 변경되었습니다. 장소는 본관 203호입니다. 학생들은 발표 자료를 목요일 오후 6시까지 이메일로 제출해야 합니다.',
  'intermediate-q4-dialogue-mission': '안녕하세요. 말하기 수업 시간이 언제인지 알고 싶습니다. 그리고 제가 결석한 날의 자료를 받을 수 있을까요? 교수님과 상담할 수 있는 시간도 알려 주세요.',
  'advanced-q1-reading': '이 문항은 외국어 교육과 의사소통 능력에 관한 설명문을 자연스럽고 논리적으로 낭독하는 문항입니다.',
  'advanced-q2-material-description': '그래프를 보면 한국어 프로그램 등록 인원은 2024년 120명에서 2025년 180명, 2026년 260명으로 계속 증가했습니다. 특히 2025년에서 2026년 사이 증가 폭이 큽니다. 이는 프로그램 확대와 온라인 병행 운영의 영향으로 볼 수 있습니다. 앞으로도 한국어 학습 수요가 계속 늘어날 가능성이 있습니다.',
  'advanced-q3-listening-response': '이 설명의 주제는 대면 수업과 온라인 수업을 함께 운영하는 혼합형 수업입니다. 장점은 시간과 장소의 제약이 줄어들고, 온라인 자료를 반복해서 복습할 수 있다는 점입니다. 단점은 자기 관리 능력이 부족하면 학습 효과가 떨어질 수 있다는 것입니다. 따라서 정기적인 피드백과 출석 관리가 필요합니다.',
  'advanced-q4-dialogue-mission': '안녕하세요. 공동 행사 일정을 조정할 수 있는지 확인하고 싶습니다. 발표 주제는 AI 활용 언어교육 사례로 진행하는 것이 어떨까요? 진행 방식에 대해서도 의견을 듣고 싶습니다. 가능하다면 수요일 오후나 목요일 오전에 실무 협의를 위한 회의를 따로 잡으면 좋겠습니다.',
  // Legacy questions
  'q-001': '안녕하세요. 저는 김민수입니다. 저는 베트남에서 왔습니다. 한국어를 배우는 이유는 한국 사람들과 더 잘 이야기하고 싶기 때문입니다.',
  'q-002': '안녕하세요. 저는 린입니다. 베트남에서 왔어요. 한국에 온 지 1년이 됐는데 한국 생활이 즐겁습니다. 특히 한국 음식이 맛있어서 자주 식당에 갑니다.',
  'q-003': '이 그림은 공원에서 사람들이 운동하는 모습입니다. 한 사람은 자전거를 타고 있고, 다른 사람들은 달리기하거나 스트레칭을 하고 있습니다. 날씨가 맑고 분위기가 밝습니다.',
  'q-004': '왼쪽 그림은 평일 거리이고 오른쪽은 주말 거리입니다. 평일에는 사람들이 바쁘게 다니고, 주말에는 여유롭게 걷거나 쇼핑을 합니다. 두 그림의 분위기가 많이 다릅니다.',
  'q-005': '지금 커피숍 앞에 계시죠? 거기서 오른쪽으로 가서 첫 번째 신호등에서 왼쪽으로 돌아주세요. 약국이 보이면 바로 옆이 약속 장소입니다.',
  'q-006': '안녕하세요. 저는 305호 투숙객인데요, 방 에어컨이 작동하지 않습니다. 오늘 많이 더워서 불편합니다. 수리해 주시거나 다른 방으로 옮길 수 있을까요?',
  'q-007': '저는 삼겹살을 추천합니다. 삼겹살은 돼지고기를 불에 직접 구워 먹는 음식인데, 상추에 싸서 마늘과 같이 먹으면 정말 맛있습니다. 한국의 대표적인 음식 중 하나예요.',
  'q-008': '저는 플라스틱 오염이 가장 심각한 환경 문제라고 생각합니다. 바다에 버려지는 플라스틱이 해양 생물에게 큰 피해를 줍니다. 해결을 위해 일회용품 사용을 줄이고 재활용을 생활화해야 합니다.',
}

// Default model answers by question type when specific question ID is not matched
const MOCK_MODEL_ANSWERS_BY_TYPE: Record<string, string> = {
  // Official types (PDF-based)
  'qt-reading': '(낭독) 자연스러운 억양과 적절한 속도로 지문 전체를 정확하게 읽어야 합니다.',
  'qt-material-desc': '이 자료에는 [핵심 내용]이 나타나 있습니다. 전체적으로 [추세/특징]을 확인할 수 있으며, 이는 [시사점/해석]을 보여 줍니다.',
  'qt-listening-resp': '들은 내용에 따르면, [핵심 정보1]이고 [핵심 정보2]입니다. 따라서 [결론]이라고 할 수 있습니다.',
  'qt-dialogue-mission': '안녕하세요. [목적]을 하고 싶습니다. [구체적인 요청 또는 제안]인데요, [확인 질문]이 가능할까요? 감사합니다.',
  // Legacy types
  'qt-self-intro': '안녕하세요. 저는 [이름]입니다. [나라]에서 왔습니다. 한국어를 배우는 이유는 한국 문화를 더 잘 이해하고 싶기 때문입니다.',
  'qt-picture': '이 그림에는 여러 사람들이 있습니다. 각자 다른 활동을 하고 있고 배경이 잘 묘사되어 있습니다. 분위기가 밝고 활기차 보입니다.',
  'qt-situation': '안녕하세요. 지금 말씀하신 상황에 대해 설명하겠습니다. 먼저 [행동1]을 하시고, 그 다음 [행동2]를 하시면 됩니다. 어렵지 않으니 천천히 해 보세요.',
  'qt-opinion': '저는 이 주제에 대해 [의견]을 가지고 있습니다. 왜냐하면 [이유1]이기 때문입니다. 그래서 [결론]이 필요하다고 생각합니다.',
}

// Negation markers — a keyword hit with one of these within ±NEG_WINDOW chars
// (excluding the hit itself) is treated as negated, e.g. "교재 안 가져가요",
// "필기구 못 챙겼어요", "교재가 없어요", "가지 않아요".
const NEGATION_MARKERS = ['안 ', '않', '못 ', '아니', '없']
const NEG_WINDOW = 7

/** True if a negation marker sits within ±NEG_WINDOW chars around [start, end). */
function isNegatedHit(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - NEG_WINDOW), start)
  const after = text.slice(end, end + NEG_WINDOW)
  return NEGATION_MARKERS.some((m) => before.includes(m) || after.includes(m))
}

/** True if `kw` occurs in `text` at least once without an adjacent negation marker. */
function hasCleanMatch(text: string, kw: string): boolean {
  if (!kw) return false
  for (let idx = text.indexOf(kw); idx !== -1; idx = text.indexOf(kw, idx + 1)) {
    if (!isNegatedHit(text, idx, idx + kw.length)) return true
  }
  return false
}

// Keyword-based element detection for mock fallback
// Returns { found: string[], missing: string[] }
function detectRequiredElements(
  transcript: string,
  requiredElements: string[],
  aliases?: Record<string, string[]>,
): { found: string[]; missing: string[] } {
  if (!requiredElements.length) return { found: [], missing: [] }
  const t = transcript.toLowerCase()

  const elementKeywords: Record<string, string[]> = {
    // ── Official question types ────────────────────────────────────────────────
    // qt-reading (공통)
    '지문 전체 소리 내어 읽기': ['운영합니다', '확인하세요', '변경됩니다', '예정입니다', '효과적이다', '빨라진다'],
    // qt-material-desc (공통)
    '장소 또는 공간 언급': ['식당', '카페', '공간', '장소', '건물', '내부'],
    '사람들의 활동 묘사': ['먹고', '앉아', '이야기', '주문', '대화', '하고 있', '하는 사람'],
    '분위기 또는 세부 묘사': ['밝', '따뜻', '조용', '분위기', '모습', '보입니다', '보여요'],
    '가장 선호하는 방법 언급': ['가장', '선호', '좋아', '많이', '%', '비율', '으뜸'],
    '전반적인 경향 설명': ['전반적', '경향', '추세', '대부분', '많은', '점점'],
    '비교 또는 분석 포함': ['비교', '반면', '그에 비해', '차이', '더 많', '더 적', '반해', '한편'],
    '전체적인 추세 설명': ['증가', '감소', '추세', '전반적', '지속', '꾸준히'],
    '특징적인 변화 언급': ['급격히', '크게', '특히', '눈에 띄', '두드러', '급증', '급감'],
    '원인 분석 또는 의견 제시': ['원인', '이유', '때문', '생각', '의견', '분석', '요인'],
    // qt-listening-resp
    '수업 시작 시간 언급': ['시', '월요일', '화요일', '오전', '오후', '다음 주', '시작'],
    '수업 장소 언급': ['호', '층', '강의실', '교실', '장소', '302', '303'],
    '수업 방식 변경 내용 언급': ['발표', '바뀐', '변경', '대신', '전환', '강의식', '중심'],
    '변경 이유 언급': ['이유', '때문', '위해서', '능력', '향상', '목적'],
    '혼합형 수업의 장점 언급': ['장점', '좋은', '유리', '효과', '접근성', '시간', '제약을 줄'],
    '혼합형 수업의 단점 언급': ['단점', '나쁜', '어려', '부족', '낮아', '문제', '상호작용'],
    '자신의 의견 제시': ['생각', '의견', '저는', '제 생각', '느끼', '저도'],
    // qt-dialogue-mission
    '음료 주문 (아메리카노)': ['아메리카노', '주문', '한 잔', '1잔', '주세요'],
    '가격 질문': ['얼마', '가격', '원', '비용', '얼마예요', '얼마입니까'],
    '감사 인사': ['감사', '고맙', '수고'],
    '서류 요청 (재학증명서)': ['재학증명서', '서류', '증명서', '발급', '받고 싶'],
    '발급 방법 또는 기간 질문': ['어떻게', '방법', '기간', '얼마나', '언제', '며칠'],
    '발급 목적 설명': ['목적', '사용', '때문', '위해서', '필요', '장학금', '비자'],
    '행사 목적 설명': ['목적', '행사', '기획', '위해서', '이유', '목표', '공동'],
    '날짜 또는 장소 제안': ['날짜', '장소', '어때', '어떨까요', '제안', '월', '일', '어디'],
    '역할 분담 논의 또는 합의': ['역할', '담당', '분담', '맡', '협의', '합의', '담당하'],
    // ── q-001 / q-002 ────────────────────────────────────────────────────────
    '이름 언급': ['저는', '제 이름은', '이름이', '이라고 합니다', '입니다'],
    '출신 나라 언급': ['에서 왔', '나라', '국적', '베트남', '중국', '일본', '미국', '영국', '태국', '인도네시아', '필리핀', '몽골', '우즈베키스탄', '카자흐스탄', '러시아'],
    '한국어 학습 이유 설명': ['배우는 이유', '공부하는 이유', '때문', '싶어서', '좋아서', '필요해서', '원해서', '이유는'],
    '한국 생활 또는 경험 한 가지 이상': ['한국에서', '한국 생활', '경험', '살면서', '지내면서', '왔는데', '왔어요'],
    // q-003
    '그림 속 장소 또는 배경 언급': ['공원', '그림', '사진', '밖에', '야외', '운동장', '장소', '배경', '거기'],
    '인물의 행동 묘사 (최소 1가지)': ['달리기', '자전거', '운동', '스트레칭', '걷고', '뛰고', '하고 있', '하는', '하고 있습니다', '사람들'],
    '세부 묘사 (사물·날씨·분위기 등)': ['날씨', '분위기', '밝', '맑', '따뜻', '나무', '하늘', '풀', '보입니다', '보여요'],
    // q-004
    '두 그림의 공통점 또는 차이 언급': ['비교', '다르', '같은', '반면', '하지만', '차이', '왼쪽', '오른쪽', '첫 번째', '두 번째'],
    '각 그림 상황 또는 분위기 묘사': ['평일', '주말', '거리', '사람들', '도시', '한가', '바쁘', '여유'],
    '비교 표현 사용': ['반면', '하지만', '그에 비해', '더', '덜', '반대로', '차이가'],
    // q-005
    '현재 위치 또는 출발점 언급': ['지금', '현재', '있는', '위치', '거기서', '여기서', '출발'],
    '방향 안내 (최소 2단계)': ['오른쪽', '왼쪽', '직진', '앞으로', '뒤로', '돌아', '건너', '걸어가'],
    '목적지 도착 안내': ['도착', '약속 장소', '거기', '찾을 수', '보입니다', '있어요', '됩니다'],
    // q-006
    '불편 사항 구체적 설명': ['불편', '문제', '작동하지', '고장', '안 돼', '않습니다', '이상'],
    '문제 상황 또는 원인 묘사': ['때문에', '그래서', '더워서', '추워서', '시끄러워서', '상황', '원인'],
    '해결 요청 또는 대안 제시': ['부탁', '요청', '고쳐', '수리', '바꿔', '교체', '옮겨', '해 주세요', '해 주실 수'],
    // q-007
    '음식 이름 언급': ['삼겹살', '김치', '불고기', '비빔밥', '떡볶이', '냉면', '갈비', '순두부', '한국 음식', '음식은', '먹어보'],
    '추천 이유 (최소 1가지)': ['맛있', '건강', '이유', '때문', '좋아서', '추천', '왜냐하면'],
    '음식 특징 또는 먹는 방법 설명': ['싸서', '구워', '먹는', '방법', '특징', '재료', '양념', '곁들'],
    // q-008
    '환경 문제 종류 명시': ['환경', '오염', '기후', '쓰레기', '플라스틱', '탄소', '미세먼지', '온난화', '생태계'],
    '문제의 심각성 또는 원인 설명': ['심각', '피해', '때문', '원인', '영향', '위험', '줍니다', '있습니다'],
    '구체적 해결 방법 또는 의견 제시': ['해결', '줄이', '재활용', '바꿔야', '해야', '생각합니다', '필요', '방법'],
  }

  const found: string[] = []
  const missing: string[] = []

  for (const el of requiredElements) {
    // Prefer aliases when provided, fall back to elementKeywords table
    const keywords = (aliases && aliases[el]) ? aliases[el] : (elementKeywords[el] ?? [])
    const matched = keywords.length === 0
      ? false
      : keywords.some((kw) => hasCleanMatch(t, kw.toLowerCase()))
    if (matched) {
      found.push(el)
    } else {
      missing.push(el)
    }
  }

  return { found, missing }
}

// Extract brief evidence phrases from transcript (mock)
function extractMockEvidence(transcript: string, found: string[]): string[] {
  if (!transcript.trim() || found.length === 0) return []
  const sentences = transcript.split(/[.!?。]+/).map((s) => s.trim()).filter(Boolean)
  return sentences.slice(0, 2).map((s) => s.length > 40 ? s.slice(0, 40) + '…' : s)
}

// Off-task detection: returns true if transcript is unrelated to the expected question domain
function isLikelyOffTask(transcript: string, requiredElements: string[], found: string[]): boolean {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length
  if (wordCount < 5) return false // Too short to judge
  // Off-task patterns (news anchors, test speech, foreign-language content, etc.)
  const offTaskPatterns = [/뉴스|앵커|기자|보도|리포트|이덕영|이덕/]
  if (offTaskPatterns.some((p) => p.test(transcript))) return true
  // If required elements exist and NONE were found, likely off-task
  if (requiredElements.length >= 2 && found.length === 0) return true
  return false
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 65) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function getMockDetail(input: SpeakingEvalInput): SpeakingEvalDetail {
  const transcript = input.transcript
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length
  const requiredElements = input.requiredElements ?? []

  if (wordCount < 3) {
    return {
      overall_score: 15,
      task_completion_score: 10,
      fluency_score: 15,
      grammar_score: 15,
      vocabulary_score: 15,
      grade: 'F',
      strengths: [],
      improvements: [
        '더 많이 말해 보세요. 짧은 문장이라도 괜찮습니다.',
        '녹음 버튼을 눌러 다시 시도해 주세요.',
      ],
      corrected_answer: MOCK_MODEL_ANSWERS[input.questionId ?? ''] ?? MOCK_MODEL_ANSWERS_BY_TYPE[input.questionType ?? ''] ?? '',
      teacher_note: '응답이 없거나 매우 짧음. 재시도 권장.',
      learner_feedback_ko:
        '응답이 너무 짧습니다. 다시 시도해서 더 길게 말해 보세요. 짧은 문장이라도 괜찮습니다!',
      learner_feedback_simple: '다시 해 보세요. 더 많이 말해 주세요.',
      required_elements_found: [],
      missing_elements: requiredElements,
      evidence: [],
      needs_teacher_review: false,
    }
  }

  const { found, missing } = detectRequiredElements(transcript, requiredElements, input.requiredElementAliases)
  const offTask = isLikelyOffTask(transcript, requiredElements, found)
  const evidence = extractMockEvidence(transcript, found)

  if (offTask) {
    const offTaskStrengths = wordCount >= 5
      ? ['문장 형태로 발화하려고 시도했습니다.']
      : []
    const offTaskImprovements = input.questionType === 'qt-picture'
      ? [
          '주어진 그림과 관련 없는 내용입니다.',
          '그림 속 장소, 인물의 행동, 배경을 설명해 주세요.',
        ]
      : [
          '주어진 질문과 관련 없는 내용입니다.',
          '과제의 지시 사항을 다시 읽고 시도해 보세요.',
        ]
    return {
      overall_score: 15,
      task_completion_score: 8,
      fluency_score: Math.min(50, 20 + wordCount),
      grammar_score: Math.min(50, 20 + wordCount),
      vocabulary_score: Math.min(40, 15 + wordCount),
      grade: 'F',
      strengths: offTaskStrengths,
      improvements: offTaskImprovements,
      corrected_answer: MOCK_MODEL_ANSWERS[input.questionId ?? ''] ?? MOCK_MODEL_ANSWERS_BY_TYPE[input.questionType ?? ''] ?? '',
      teacher_note: '과제와 무관한 내용을 발화함. 교수자 확인 필요.',
      learner_feedback_ko: '질문에서 요청한 내용과 다른 이야기를 한 것 같습니다. 문제를 다시 읽고 다시 시도해 보세요.',
      learner_feedback_simple: '질문을 다시 읽어 보세요. 다시 해 봐요.',
      required_elements_found: found,
      missing_elements: missing,
      evidence: [],
      needs_teacher_review: true,
    }
  }

  const base = Math.min(75, 40 + wordCount * 2)
  // Adjust task_completion based on how many required elements were found
  const elementRatio = requiredElements.length > 0
    ? found.length / requiredElements.length
    : 1
  let taskScore = Math.round(Math.min(85, base + 5) * elementRatio)
  let overall = Math.round((taskScore + base) / 2)

  const qType = input.questionType ?? ''
  const isReading = qType === 'qt-reading'
  const isMaterialDesc = qType === 'qt-material-desc'
  const isListeningResp = qType === 'qt-listening-resp'
  const isDialogueMission = qType === 'qt-dialogue-mission'

  // q2: requiredElements 기반 최저점 — 전요소 충족 시 90+
  if (isMaterialDesc && requiredElements.length > 0) {
    if (elementRatio >= 1.0) {
      taskScore = Math.max(taskScore, 90); overall = Math.max(overall, 90)
    } else if (elementRatio >= 0.8) {
      taskScore = Math.max(taskScore, 85); overall = Math.max(overall, 85)
    } else if (elementRatio >= 0.5) {
      taskScore = Math.max(taskScore, 75); overall = Math.max(overall, 75)
    } else if (elementRatio >= 0.33) {
      taskScore = Math.max(taskScore, 65); overall = Math.max(overall, 65)
    }
  }

  // q3: requiredElements 기반 최저점 — 전요소 충족 시 90+ (핵심 정보 완전 포함)
  if (isListeningResp && requiredElements.length > 0) {
    if (elementRatio >= 1.0) {
      taskScore = Math.max(taskScore, 90); overall = Math.max(overall, 90)
    } else if (elementRatio >= 0.67) {
      taskScore = Math.max(taskScore, 80); overall = Math.max(overall, 80)
    } else if (elementRatio >= 0.33) {
      taskScore = Math.max(taskScore, 65); overall = Math.max(overall, 65)
    }
  }

  // q1: 전요소 포함 + 충분히 읽었으면 감점 방지
  if (isReading && elementRatio >= 1.0 && wordCount >= 15) {
    taskScore = Math.max(taskScore, 85)
    overall = Math.max(overall, 85)
  }

  // Type-aware improvements — reading must NEVER suggest vocabulary variety or content expansion
  const typeImprovements: string[] = isReading
    ? [
        '문장을 조금 더 또박또박 읽어 보세요.',
        '쉼표와 문장 끝에서 자연스럽게 끊어 읽어 보세요.',
        '너무 빠르거나 느리지 않게 일정한 속도로 읽어 보세요.',
        '받침과 조사 발음을 정확하게 읽어 보세요.',
        '문장의 의미가 드러나도록 억양을 살려 읽어 보세요.',
        '지문을 빠뜨리지 않고 끝까지 읽어 보세요.',
      ]
    : isMaterialDesc
    ? [
        '자료의 핵심 정보를 더 구체적으로 설명해 보세요.',
        '장소, 인물, 행동을 빠뜨리지 않고 말해 보세요.',
        '수치나 변화가 보이면 정확히 말해 보세요.',
        '처음에는 전체 상황을 말하고, 그다음 세부 내용을 설명해 보세요.',
      ]
    : isListeningResp
    ? [
        '들은 내용의 핵심 정보를 빠뜨리지 않도록 해 보세요.',
        '들은 내용을 너무 길게 말하기보다 핵심만 정리해 보세요.',
        '문장을 더 자연스럽게 연결해 말해 보세요.',
      ]
    : isDialogueMission
    ? [
        '필요한 정보를 질문으로 확인해 보세요.',
        '상대방의 대답을 듣고 다시 한 번 확인해 보세요.',
        '미션 목표를 빠뜨리지 않도록 순서대로 말해 보세요.',
        '부탁하거나 요청할 때 더 자연스러운 표현을 사용해 보세요.',
      ]
    : ['더 다양한 어휘를 사용해 보세요.', '문법적 정확도를 높이면 좋겠습니다.']

  const allElementsFound = missing.length === 0 && requiredElements.length > 0
  const improvements = missing.length > 0
    ? [`"${missing[0]}"을(를) 포함하면 더 좋겠습니다.`, typeImprovements[0] ?? typeImprovements[0]]
    : allElementsFound && isReading && overall >= 78
      ? ['전반적으로 잘 읽으셨습니다. 받침과 연음 발음을 더 또박또박 읽으면 더욱 좋아질 거예요.']
      : allElementsFound && isListeningResp && overall >= 80
        ? []
        : allElementsFound && isListeningResp && overall >= 70
          ? ['핵심 정보를 잘 포함했습니다. 문장을 더 또렷하게 말하면 더 좋습니다.']
          : allElementsFound && isMaterialDesc && overall >= 80
            ? []
            : allElementsFound && (isMaterialDesc || isListeningResp)
              ? ['핵심 정보를 잘 포함했습니다. 문장을 조금 더 자연스럽게 연결해 말하면 좋겠습니다.']
              : [typeImprovements[0] ?? '더 많이 말해 보세요.', typeImprovements[1] ?? '']

  const readingCorrectedAnswer = isReading
    ? (MOCK_MODEL_ANSWERS[input.questionId ?? ''] ?? '이 문항은 정해진 지문을 자연스럽게 낭독하는 문항입니다. 지문을 빠뜨리지 않고 또박또박 읽고, 문장 끝에서 자연스럽게 끊어 읽는 것이 중요합니다.')
    : (MOCK_MODEL_ANSWERS[input.questionId ?? ''] ?? MOCK_MODEL_ANSWERS_BY_TYPE[qType] ?? '')

  return {
    overall_score: overall,
    task_completion_score: taskScore,
    fluency_score: Math.min(80, base - 5),
    grammar_score: Math.min(75, base - 8),
    vocabulary_score: Math.min(75, base - 3),
    pronunciation_reference_score: 72,
    grade: scoreToGrade(overall),
    strengths: found.length > 0
      ? [`"${found[0]}"을(를) 잘 포함했습니다.`, '기본적인 문장 구조를 사용했습니다.']
      : ['기본적인 문장 구조를 사용했습니다.'],
    improvements: improvements.filter(Boolean),
    corrected_answer: readingCorrectedAnswer,
    teacher_note: `필수 요소 ${found.length}/${requiredElements.length} 확인됨. 문법과 어휘 연습 권장.`,
    learner_feedback_ko:
      overall >= 80
        ? '훌륭합니다! 핵심 내용을 잘 말했습니다. 이 수준을 유지하면서 계속 연습해 보세요.'
        : overall >= 60
          ? '잘 했습니다! 조금 더 연습하면 더욱 좋아질 거예요.'
          : '열심히 시도했습니다. 빠진 내용을 보충하여 다시 시도해 보세요.',
    learner_feedback_simple: overall >= 80 ? '훌륭해요! 잘 하고 있어요.' : overall >= 60 ? '잘 했어요! 계속 연습하세요.' : '다시 해 봐요. 조금 더 말해 주세요.',
    required_elements_found: found,
    missing_elements: missing,
    evidence,
    needs_teacher_review: overall < 30 || taskScore < 20,
  }
}

// ── OpenAI provider ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Korean language assessment specialist evaluating a learner's speaking response.

The learner is a beginner to intermediate Korean language learner. Be fair, accurate, and encouraging but not overly lenient.

Respond ONLY with a valid JSON object — no markdown, no explanation, no code blocks. Use exactly this schema:

{
  "overall_score": <integer 0-100>,
  "task_completion_score": <integer 0-100>,
  "fluency_score": <integer 0-100>,
  "grammar_score": <integer 0-100>,
  "vocabulary_score": <integer 0-100>,
  "pronunciation_reference_score": <integer 0-100 or null>,
  "grade": "<A|B|C|D|F>",
  "strengths": ["<Korean string>", ...],
  "improvements": ["<Korean string>", ...],
  "required_elements_found": ["<element from [필수 포함 요소] that appears in the response>", ...],
  "missing_elements": ["<element from [필수 포함 요소] that is absent from the response>", ...],
  "evidence": ["<direct short quote from transcript supporting evaluation, max 40 chars each>", ...],
  "corrected_answer": "<ideal model answer in Korean — write this INDEPENDENTLY, do NOT copy or paraphrase the learner's transcript>",
  "teacher_note": "<internal note for teacher in Korean>",
  "learner_feedback_ko": "<encouraging feedback for learner in Korean, 2-3 sentences>",
  "learner_feedback_simple": "<simple 1-2 sentence feedback in very basic Korean>",
  "needs_teacher_review": <boolean>
}

Scoring rubric:
- overall_score: weighted average of subscores
- task_completion_score: how well the response addresses the question (0=not addressed, 100=fully addressed)
- fluency_score: smoothness and naturalness (0=very broken, 100=very fluent)
- grammar_score: particles, endings, tense accuracy (0=many errors, 100=perfect)
- vocabulary_score: appropriateness and variety (0=very limited, 100=excellent)
- pronunciation_reference_score: use the provided pronunciation score or null if unavailable

grade: A(≥90), B(≥80), C(≥65), D(≥50), F(<50)

CRITICAL rules:
1. corrected_answer MUST be an ideal model answer written independently for this question. It must NEVER copy, quote, or paraphrase the learner's transcript. If no good model answer can be generated, return "".
2. If the learner's transcript is unrelated to the question (e.g., reads a news script, recites unrelated text, or speaks about a completely different topic), set task_completion_score ≤ 10, needs_teacher_review: true, and list all required elements in missing_elements.
3. required_elements_found / missing_elements must exactly use the element labels provided in [필수 포함 요소]. Do not invent new labels.
4. evidence: 1-3 short direct quotes (≤40 chars each) from the transcript that support key scores. Return [] if transcript is empty.
5. needs_teacher_review: true if overall_score < 30, task_completion_score < 20, or response is off-topic.
6. If task_completion_score ≤ 10 (off-task response): strengths must be [] or at most 1 item. If the learner produced ≥5 words, you MAY include "문장 형태로 발화하려고 시도했습니다." NEVER include phrases that imply the task was addressed, such as "기본적인 문장 구조를 사용했습니다", "문법적으로 안정적입니다", "자연스럽게 말했습니다", "어휘를 잘 사용했습니다", or any phrase suggesting the content was relevant.
7. If task_completion_score ≤ 10, improvements[0] MUST explicitly state the response was unrelated to the question (e.g., "주어진 그림과 관련 없는 내용입니다." for picture questions, or "주어진 질문과 관련 없는 내용입니다." for others). improvements[1] MUST provide specific guidance on what was required, referencing [필수 포함 요소] (e.g., for a picture description question: "그림 속 장소, 인물의 행동, 배경을 설명해 주세요.").
8. READING (낭독) question rules — applies when questionType is "qt-reading" OR the prompt starts with "다음 글을 소리 내어 읽으세요":
   - Focus improvements on: 발음 정확성, 억양·리듬, 끊어 읽기, 속도, 의미 전달력, 지문 누락 여부.
   - NEVER suggest in improvements: 다양한 어휘를 사용해 보세요 / 더 많은 내용을 추가해 보세요 / 이유를 설명해 보세요 / 예시를 들어 보세요 / 자신의 생각을 더 말해 보세요 / 자료의 핵심 정보를 설명해 보세요.
   - Improvements for reading MUST come only from: 또박또박 읽기, 끊어 읽기, 속도, 받침·조사 발음, 억양, 지문 누락 여부.
   - corrected_answer for reading MUST describe ideal reading criteria, NOT copy the passage. Example: "이 문항은 정해진 지문을 자연스럽게 낭독하는 문항입니다. 지문을 빠뜨리지 않고 또박또박 읽고, 문장 끝에서 자연스럽게 끊어 읽는 것이 중요합니다."

If transcript is empty or fewer than 5 words: set all scores to 20 or below and ask learner to try again.
Strengths: 1-3 items in Korean. Improvements: 1-3 actionable suggestions in Korean.`

async function callOpenAI(
  input: SpeakingEvalInput,
  apiKey: string,
  model: string,
): Promise<SpeakingEvalDetail> {
  const { OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey })

  const parts: string[] = [
    `[질문 프롬프트]\n${input.questionPrompt ?? '(없음)'}`,
  ]
  if (input.requiredElements && input.requiredElements.length > 0) {
    parts.push(`[필수 포함 요소]\n${input.requiredElements.join('\n')}`)
  }
  parts.push(`[학생 답변 전사문]\n${input.transcript || '(응답 없음)'}`)
  if (input.pronunciationScore !== undefined) {
    parts.push(
      `[발음 평가 참고] 점수: ${input.pronunciationScore}/100` +
        (input.pronunciationFeedback ? ` / 피드백: ${input.pronunciationFeedback}` : ''),
    )
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: parts.join('\n\n') },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1024,
  })

  const raw = response.choices[0]?.message?.content ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = JSON.parse(raw) as Record<string, any>

  const overallScore = clamp(Number(parsed.overall_score) || 0)
  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((s): s is string => typeof s === 'string') : []

  return {
    overall_score: overallScore,
    task_completion_score: clamp(Number(parsed.task_completion_score) || 0),
    fluency_score: clamp(Number(parsed.fluency_score) || 0),
    grammar_score: clamp(Number(parsed.grammar_score) || 0),
    vocabulary_score: clamp(Number(parsed.vocabulary_score) || 0),
    pronunciation_reference_score:
      parsed.pronunciation_reference_score != null
        ? clamp(Number(parsed.pronunciation_reference_score))
        : undefined,
    grade: (['A', 'B', 'C', 'D', 'F'] as const).includes(parsed.grade)
      ? (parsed.grade as 'A' | 'B' | 'C' | 'D' | 'F')
      : scoreToGrade(overallScore),
    strengths: toStringArray(parsed.strengths),
    improvements: toStringArray(parsed.improvements),
    required_elements_found: toStringArray(parsed.required_elements_found),
    missing_elements: toStringArray(parsed.missing_elements),
    evidence: toStringArray(parsed.evidence),
    corrected_answer: typeof parsed.corrected_answer === 'string' ? parsed.corrected_answer : '',
    teacher_note: typeof parsed.teacher_note === 'string' ? parsed.teacher_note : '',
    learner_feedback_ko:
      typeof parsed.learner_feedback_ko === 'string' ? parsed.learner_feedback_ko : '',
    learner_feedback_simple:
      typeof parsed.learner_feedback_simple === 'string' ? parsed.learner_feedback_simple : '',
    needs_teacher_review: typeof parsed.needs_teacher_review === 'boolean'
      ? parsed.needs_teacher_review
      : overallScore < 30,
    raw_provider: { model, usage: response.usage },
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type EvaluateSpeakingResult = {
  detail: SpeakingEvalDetail
  providerName: string
  latencyMs: number
  status: 'success' | 'fallback'
  errorMessage?: string
}

/**
 * Evaluates a speaking transcript using OpenAI when configured; falls back to
 * mock otherwise. Never throws — errors produce a mock-fallback result.
 */
export async function evaluateSpeakingDetail(
  input: SpeakingEvalInput,
): Promise<EvaluateSpeakingResult> {
  const apiKey = process.env.OPENAI_API_KEY
  const provider = process.env.LLM_EVAL_PROVIDER ?? 'mock'
  const model = process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini'

  if (provider !== 'openai' || !apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return {
      detail: getMockDetail(input),
      providerName: 'mock',
      latencyMs: 600,
      status: 'fallback',
    }
  }

  const start = Date.now()
  try {
    const detail = await callOpenAI(input, apiKey, model)
    return { detail, providerName: 'openai', latencyMs: Date.now() - start, status: 'success' }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[llm-eval] OpenAI call failed, using mock fallback:', errorMessage)
    return {
      detail: getMockDetail(input),
      providerName: 'mock',
      latencyMs: Date.now() - start,
      status: 'fallback',
      errorMessage,
    }
  }
}

// ── Backward-compat getLLMEvalProvider ────────────────────────────────────────

class WrappedLLMEvalProvider implements LLMEvalProvider {
  async evaluate(transcript: string, rubricId: string): Promise<LLMEvalResult> {
    const { detail, providerName, latencyMs } = await evaluateSpeakingDetail({
      transcript,
      rubricId,
    })
    return detailToLLMEvalResult(detail, providerName, latencyMs)
  }
}

export function getLLMEvalProvider(): LLMEvalProvider {
  return new WrappedLLMEvalProvider()
}
