// v1.1 단계 19.8 [검증]: 평가 결과 화면 mother_tongue 보조 검증용 dev seed.
//
// 실제 음성 녹음 없이 평가 결과 페이지를 mother_tongue별로 검증하기 위해 mock
// 평가 레코드를 in-memory store에 주입한다. NODE_ENV=production이면 404.
// Playwright smoke 테스트가 ?mt=en|vi|ar|ko로 호출 후 redirect URL을 따라간다.

import { NextResponse } from 'next/server'

import { saveSpeakingEval, type SpeakingEvalRecord } from '@/src/lib/mock/speaking-store'

export const dynamic = 'force-dynamic'

const MOTHER_TONGUES = ['ko', 'en', 'vi', 'ar'] as const
type MotherTongue = (typeof MOTHER_TONGUES)[number]

function buildMockRecord(mt: MotherTongue): SpeakingEvalRecord {
  const submissionId = `dev-seed-${mt}-${Date.now()}`
  return {
    submissionId,
    questionId: 'beginner-q1-reading',
    questionSetId: 'q1-beginner-set',
    submittedAt: new Date().toISOString(),
    sttResult: {
      transcript: '안녕하세요. 저는 한국어를 배우고 있는 학생입니다. 잘 부탁드립니다.',
      confidence: 0.92,
      providerName: 'mock',
      providerVersion: '1.0',
      latencyMs: 150,
    },
    llmEvalResult: {
      scores: [
        { rubricItemId: 'fluency', score: 75, rationale: '문장이 자연스럽게 이어집니다.' },
        { rubricItemId: 'grammar', score: 78, rationale: '기본 문법이 적절합니다.' },
      ],
      totalScore: 79,
      normalizedScore: 79,
      errorTags: [],
      feedback: '잘 했습니다! 발음과 억양이 자연스럽습니다.',
      providerName: 'mock',
      providerVersion: '1.0',
      latencyMs: 200,
    },
    pronunciationResult: {
      normalizedScore: 82,
      providerName: 'mock',
      providerVersion: '1.0',
      latencyMs: 120,
      wordScores: [],
      feedback: '발음이 명확합니다.',
    },
    speakingEvalDetail: {
      overall_score: 79,
      task_completion_score: 82,
      fluency_score: 75,
      grammar_score: 78,
      vocabulary_score: 80,
      pronunciation_reference_score: 82,
      grade: 'B',
      strengths: [
        '발음이 또렷하고 분명합니다.',
        '문장 구조가 자연스럽습니다.',
      ],
      improvements: [
        '문장 사이 끊어 읽기를 조금 더 명확히 하면 좋습니다.',
        '어휘를 더 다양하게 사용해 보세요.',
      ],
      required_elements_found: ['인사말', '자기소개'],
      missing_elements: [],
      evidence: ['"안녕하세요. 저는 한국어를 배우고 있는 학생입니다."'],
      corrected_answer:
        '안녕하세요. 저는 한국어를 배우고 있는 외국인 학생입니다. 만나서 반갑습니다.',
      teacher_note: 'B등급. 발음 양호. 어휘 확장 권장.',
      learner_feedback_ko:
        '훌륭합니다! 발음과 억양이 자연스럽습니다. 이 수준을 유지하면서 계속 연습해 보세요.',
      learner_feedback_simple: '잘 했어요! 계속 연습하세요.',
      // v1.1 단계 19.8: dev seed가 mother_tongue 외국어이면 multilingual 채움.
      learner_feedback_multilingual:
        mt === 'ko'
          ? undefined
          : {
              ko: '훌륭합니다! 발음과 억양이 자연스럽습니다. 이 수준을 유지하면서 계속 연습해 보세요.',
              en: 'Excellent! Your pronunciation and intonation sound natural. Keep practicing at this level.',
              vi: 'Tuyệt vời! Phát âm và ngữ điệu của bạn nghe rất tự nhiên. Hãy tiếp tục luyện tập ở mức này.',
              ar: 'ممتاز! نطقك ونبرة صوتك تبدوان طبيعيتين. استمر في التدرب على هذا المستوى.',
            },
    },
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 })
  }
  const url = new URL(request.url)
  const mt = (url.searchParams.get('mt') ?? 'ko') as MotherTongue
  if (!MOTHER_TONGUES.includes(mt)) {
    return NextResponse.json({ error: 'invalid_mt' }, { status: 400 })
  }
  const record = buildMockRecord(mt)
  saveSpeakingEval(record)
  // Redirect (303) to the result page so Playwright can directly follow.
  const target = new URL(
    `/student/speaking/${record.questionId}/result?sub=${record.submissionId}`,
    request.url,
  )
  return NextResponse.redirect(target, 303)
}
