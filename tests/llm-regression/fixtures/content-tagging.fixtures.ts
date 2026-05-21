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
      learning_objective: '일상적인 장소에서 있었던 일을 말할 수 있다.',
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
      learning_objective: '격식 있는 문어체 문장을 정확히 낭독할 수 있다.',
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
