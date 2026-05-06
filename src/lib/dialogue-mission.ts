import type { DialogueTurn, MissionGoalResult } from '@/src/types/dialogue'
import { shouldAnswerLanguageQuestion } from '@/src/lib/dialogue-policy'

// Only count turns where the student was actually performing the mission,
// not asking meta-questions about language/grammar/expression.
// A turn is excluded if it has intent='language_question' OR if the text triggers
// the language question detector (handles turns created before intent tagging).
function missionStudentText(turns: DialogueTurn[]): string {
  return turns
    .filter(
      (t) =>
        t.role === 'student' &&
        t.status === 'completed' &&
        t.intent !== 'language_question' &&
        !shouldAnswerLanguageQuestion(t.text),
    )
    .map((t) => t.text.toLowerCase())
    .join(' ')
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw))
}

function detectBeginnerCafe(missionGoals: string[], turns: DialogueTurn[]): MissionGoalResult[] {
  const all = missionStudentText(turns)
  return [
    {
      goalIndex: 0,
      labelKo: missionGoals[0] ?? '음료 주문',
      achieved: hasAny(all, ['아메리카노', '라떼', '주스', '음료', '커피', '주문']),
    },
    {
      goalIndex: 1,
      labelKo: missionGoals[1] ?? '차가운/따뜻한 음료 선택',
      achieved: hasAny(all, ['아이스', '차가운', '따뜻한', '뜨거운', '핫', 'hot', 'ice', '따뜻하게', '아이스로']),
    },
    {
      goalIndex: 2,
      labelKo: missionGoals[2] ?? '포장/매장 이용 여부 말하기',
      achieved: hasAny(all, ['포장', '테이크아웃', '매장', '여기서', '가져갈', '드시고', '먹고 갈']),
    },
  ]
}

function detectIntermediateAdmin(missionGoals: string[], turns: DialogueTurn[]): MissionGoalResult[] {
  const all = missionStudentText(turns)
  return [
    {
      goalIndex: 0,
      labelKo: missionGoals[0] ?? '말하기 수업 시간 확인',
      achieved: hasAny(all, ['말하기 수업', '수업 시간', '수업이 언제', '몇 시', '언제 있', '수업은 언제']),
    },
    {
      goalIndex: 1,
      labelKo: missionGoals[1] ?? '결석 자료 수령 가능 여부 확인',
      achieved: hasAny(all, ['결석', '자료', '받을 수', '어떻게', '빠진', '못 들어', '결석했']),
    },
    {
      goalIndex: 2,
      labelKo: missionGoals[2] ?? '교수자 상담 가능 시간 확인',
      achieved: hasAny(all, ['교수', '상담', '선생님', '만날 수', '상담 시간', '뵐 수', '상담이 언제']),
    },
  ]
}

function detectAdvancedEvent(missionGoals: string[], turns: DialogueTurn[]): MissionGoalResult[] {
  const all = missionStudentText(turns)
  return [
    {
      goalIndex: 0,
      labelKo: missionGoals[0] ?? '일정 조정 가능 여부 확인',
      achieved: hasAny(all, ['일정', '조정', '가능', '확인', '언제', '시간이']),
    },
    {
      goalIndex: 1,
      labelKo: missionGoals[1] ?? '발표 주제와 진행 방식 의견 묻기',
      achieved: hasAny(all, ['발표', '주제', '의견', '어떻게', 'ai', '언어교육', '진행 방식', '어떤 방식']),
    },
    {
      goalIndex: 2,
      labelKo: missionGoals[2] ?? '실무 협의 별도 회의 제안',
      achieved: hasAny(all, ['회의', '별도', '실무', '제안', '잡으면', '미팅', '따로', '다시 만']),
    },
  ]
}

export function detectMissionProgress(
  questionId: string,
  missionGoals: string[],
  turns: DialogueTurn[],
): MissionGoalResult[] {
  if (turns.length === 0) {
    return missionGoals.map((g, i) => ({ goalIndex: i, labelKo: g, achieved: false }))
  }

  if (questionId === 'beginner-q4-dialogue-mission') {
    return detectBeginnerCafe(missionGoals, turns)
  }
  if (questionId === 'intermediate-q4-dialogue-mission') {
    return detectIntermediateAdmin(missionGoals, turns)
  }
  if (questionId === 'advanced-q4-dialogue-mission') {
    return detectAdvancedEvent(missionGoals, turns)
  }

  // Generic fallback: all unachieved
  return missionGoals.map((g, i) => ({ goalIndex: i, labelKo: g, achieved: false }))
}

export function generateAggregatedTranscript(turns: DialogueTurn[]): string {
  return turns
    .filter((t) => t.role !== 'system')
    .map((t) => {
      const label = t.role === 'ai' ? 'AI' : '학생'
      return `${label}: ${t.text}`
    })
    .join('\n')
}
