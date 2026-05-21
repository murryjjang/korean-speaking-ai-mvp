// M3-b — prompt v3 콘텐츠 태깅 회귀 fixtures
//
// 태깅 대상 콘텐츠 유형: 낭독(qt-reading) · 발표/자료설명(qt-material-desc) ·
// 듣고답하기(qt-listening-resp). **자유대화는 제외**(DECISIONS D-004:
// persona+자유 topic이라 고정 content 행 없음 → 태깅 대상 아님).
//
// 각 fixture 는 questions 행을 모사한 태깅 입력 + 유효한 v3 출력 예시.
// mock 테스트는 입력→프롬프트, 출력→정량 7규칙 통과를 결정론적으로 검증.
// real 테스트는 입력으로 실제 LLM 태깅 후 정량 규칙 통과를 실측.

import type { ContentTagResult, TaggingInput } from '@/src/lib/tagging/schema'

export type TaggingFixture = {
  type: 'reading' | 'material-desc' | 'listening-resp'
  input: TaggingInput
  // 사람이 작성한 유효 v3 출력 예시 (정량 7규칙을 모두 통과해야 함)
  valid: ContentTagResult
}

export const CONTENT_TAGGING_FIXTURES: TaggingFixture[] = [
  // ── 낭독 (qt-reading) ──────────────────────────────────────
  {
    type: 'reading',
    input: {
      content_id: 'q-read-001',
      type_id: 'qt-reading',
      title: '카페에서',
      prompt: '다음 문장을 큰 소리로 읽으세요: "꽃이 피는 봄에 친구와 카페에 갔어요."',
      difficulty: 'beginner',
    },
    valid: {
      topic_tags: ['일상', '카페', '계절'],
      cefr_level: 'A2',
      register: 'polite-spoken',
      register_consistency: 'consistent',
      // 능력표현 일반형 회귀 가드: 고유어 동사 읽다 → "읽을 수 있다" (D-001 보완)
      learning_objective: '주어진 문장을 자연스럽게 읽을 수 있다.',
      vocabulary: { basic: ['친구', '봄'], core: ['카페'], challenging: [] },
      pronunciation_focus: ['꽃이(연음)', '갔어요(경음화)'],
    },
  },
  {
    type: 'reading',
    input: {
      content_id: 'q-read-002',
      type_id: 'qt-reading',
      title: '뉴스 한 문장',
      prompt: '다음을 정확한 발음으로 읽으세요: "정부는 새로운 정책을 발표했습니다."',
      difficulty: 'advanced',
    },
    valid: {
      topic_tags: ['시사', '정책'],
      cefr_level: 'B2',
      register: 'formal-written',
      register_consistency: 'consistent',
      learning_objective: '격식 있는 문어체 문장을 정확히 읽을 수 있다.',
      vocabulary: { basic: [], core: ['정부', '정책'], challenging: ['발표하다'] },
      pronunciation_focus: ['정책을(연음)', '발표했습니다(경음화)'],
    },
  },
  // ── 발표/자료설명 (qt-material-desc) ───────────────────────
  {
    type: 'material-desc',
    input: {
      content_id: 'q-mat-001',
      type_id: 'qt-material-desc',
      title: '그래프 설명',
      prompt: '제시된 그래프를 보고 변화 추세를 설명하세요.',
      difficulty: 'intermediate',
    },
    valid: {
      topic_tags: ['자료설명', '그래프', '추세'],
      cefr_level: 'B1',
      register: 'formal-spoken',
      register_consistency: 'consistent',
      learning_objective: '그래프의 변화 추세를 설명할 수 있다.',
      vocabulary: { basic: ['변화'], core: ['그래프', '추세'], challenging: ['증가하다'] },
      pronunciation_focus: ['변화를(연음)'],
    },
  },
  {
    type: 'material-desc',
    input: {
      content_id: 'q-mat-002',
      type_id: 'qt-material-desc',
      title: '제품 소개',
      prompt: '사진 속 제품의 특징을 청중에게 발표하세요.',
      difficulty: 'intermediate',
    },
    valid: {
      topic_tags: ['발표', '제품소개'],
      cefr_level: 'B1',
      register: 'formal-spoken',
      register_consistency: 'consistent',
      learning_objective: '제품의 특징을 청중에게 발표할 수 있다.',
      vocabulary: { basic: ['사진'], core: ['제품', '특징'], challenging: [] },
      pronunciation_focus: [],
    },
  },
  // ── 듣고답하기 (qt-listening-resp) ─────────────────────────
  {
    type: 'listening-resp',
    input: {
      content_id: 'q-listen-001',
      type_id: 'qt-listening-resp',
      title: '약속 정하기',
      prompt: '대화를 듣고 질문에 답하세요: "두 사람은 언제 만나기로 했나요?"',
      difficulty: 'beginner',
    },
    valid: {
      topic_tags: ['일상', '약속'],
      cefr_level: 'A2',
      register: 'polite-spoken',
      register_consistency: 'consistent',
      learning_objective: '들은 대화에서 약속 시간을 파악해 답할 수 있다.',
      vocabulary: { basic: ['약속', '만나다'], core: ['언제'], challenging: [] },
      pronunciation_focus: ['만나기로(경음화)'],
    },
  },
  // ── 야간 3-B 잔여 4건 (실제 questions 콘텐츠) — 정정 의도 반영 회귀 가드 ──
  //    핵심: 낭독 learning_objective 는 글 "주제"가 아니라 "소리 내어 읽는 능력".
  //    topic_tags 는 본문 전체를 대표. (DECISIONS D-009)
  {
    type: 'reading',
    input: {
      content_id: 'advanced-q1-reading',
      type_id: 'qt-reading',
      title: '설명문 낭독',
      prompt: '다음 글을 소리 내어 읽으세요.\n\n최근 외국어 교육에서는 단순히 문법 지식을 암기하는 것보다 실제 상황에서 의사소통할 수 있는 능력을 더 중요하게 평가하고 있습니다. 특히 학습자가 자신의 생각을 논리적으로 말하고, 상대방의 의견에 적절히 반응하는 능력은 언어 숙달도를 판단하는 중요한 기준이 됩니다.',
      difficulty: 'advanced',
    },
    valid: {
      topic_tags: ['외국어 교육', '의사소통 능력', '언어 평가'],
      cefr_level: 'C1',
      register: 'formal-written',
      register_consistency: 'consistent',
      // 하이브리드: 콘텐츠 주제 + 읽기 능력 (D-010)
      learning_objective: '외국어 교육과 의사소통 능력에 관한 설명문을 정확한 발음으로 소리 내어 읽을 수 있다.',
      vocabulary: { basic: ['문법'], core: ['의사소통', '평가'], challenging: ['숙달도'] },
      pronunciation_focus: ['숙달도(경음화)', '논리적으로(유음화)'],
    },
  },
  {
    type: 'reading',
    input: {
      content_id: 'beginner-q1-reading',
      type_id: 'qt-reading',
      title: '낭독',
      prompt: '다음 글을 소리 내어 읽으세요.\n\n안녕하세요. 저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들를 예정입니다. 진료가 끝난 후에는 집에서 쉬려고 합니다. 내일은 학교에서 한국어 수업이 있어서 일찍 자려고 합니다.',
      difficulty: 'beginner',
    },
    valid: {
      // 본문 전체 대표 (학교/수업만이 아니라 일정·병원 포함)
      topic_tags: ['일상 일정', '병원', '하루 계획'],
      cefr_level: 'A2',
      register: 'formal-spoken',
      register_consistency: 'consistent',
      learning_objective: '병원·약국 등 하루 일정을 소개하는 글을 정확한 발음으로 소리 내어 읽을 수 있다.',
      vocabulary: { basic: ['병원', '약국', '학교'], core: ['진료', '예정'], challenging: [] },
      pronunciation_focus: ['병원에(연음)', '학교에서(경음화)'],
    },
  },
  {
    type: 'reading',
    input: {
      content_id: 'intermediate-q1-reading',
      type_id: 'qt-reading',
      title: '안내문 낭독',
      prompt: '다음 글을 소리 내어 읽으세요.\n\n이번 주부터 도서관 운영 시간이 변경됩니다. 평일에는 오전 9시부터 오후 8시까지 이용할 수 있으며, 토요일에는 오전 10시부터 오후 5시까지 문을 엽니다. 일요일과 공휴일에는 운영하지 않습니다. 이용자는 변경된 시간을 확인한 후 방문해 주시기 바랍니다.',
      difficulty: 'intermediate',
    },
    valid: {
      topic_tags: ['도서관', '운영 시간', '안내문'],
      cefr_level: 'B1',
      register: 'formal-written',
      register_consistency: 'consistent',
      learning_objective: '도서관 운영 시간 안내문을 정확한 발음으로 소리 내어 읽을 수 있다.',
      vocabulary: { basic: ['시간', '도서관'], core: ['운영', '변경', '이용'], challenging: ['공휴일'] },
      pronunciation_focus: ['운영(연음)', '확인한(연음)'],
    },
  },
  {
    type: 'material-desc',
    input: {
      content_id: 'advanced-q2-material-description',
      type_id: 'qt-material-desc',
      title: '그래프 설명하기',
      prompt: '최근 3년간 한국어 프로그램 등록 인원 변화를 보고 설명해 보세요.',
      difficulty: 'advanced',
    },
    valid: {
      topic_tags: ['등록 인원', '변화 추세', '그래프 설명'],
      cefr_level: 'B2',
      register: 'formal-spoken',
      register_consistency: 'consistent',
      learning_objective: '등록 인원의 3년간 변화 추세를 그래프를 보고 설명할 수 있다.',
      vocabulary: { basic: ['변화'], core: ['등록', '인원', '추세'], challenging: ['증가하다'] },
      pronunciation_focus: [],
    },
  },
  {
    type: 'listening-resp',
    input: {
      content_id: 'q-listen-002',
      type_id: 'qt-listening-resp',
      title: '길 안내 듣기',
      prompt: '안내를 듣고 목적지까지 가는 방법을 설명하세요.',
      difficulty: 'intermediate',
    },
    valid: {
      topic_tags: ['길안내', '교통'],
      cefr_level: 'B1',
      register: 'instructional',
      register_consistency: 'consistent',
      learning_objective: '들은 안내를 바탕으로 길을 설명할 수 있다.',
      vocabulary: { basic: ['길', '가다'], core: ['목적지', '방법'], challenging: [] },
      pronunciation_focus: ['목적지(경음화)'],
    },
  },
]
