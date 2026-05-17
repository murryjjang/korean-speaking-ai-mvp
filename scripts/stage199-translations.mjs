#!/usr/bin/env node
// 단계 19.9 페이즈 2: th/ms/km 번역 일괄 생성.
// gpt-4o-mini로 한국어 → 태국어/말레이어/크메르어 번역. 결과는
// /tmp/단계19.9/translations.json에 저장하고, 소스 파일은 별도 단계에서 수동 패치.

import OpenAI from 'openai'
import fs from 'node:fs/promises'

const env = await fs.readFile('/home/murry/projects/korean-speaking-ai-mvp/.env.local', 'utf-8')
const apiKey = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim()
const client = new OpenAI({ apiKey })

// 번역 대상 — 단계 19.9 다언어 확장 핵심 라벨/문장 (한국어 원본 단일 진실원).
const sources = {
  // ─── 대시보드 라벨 (dashboard-labels.ts) ───
  kpi_totalSessions: '총 세션',
  kpi_cumulativeTime: '누적 학습 시간',
  kpi_thisWeek: '이번 주',
  kpi_assessmentCount: '평가 횟수',
  chart_modeDistribution: '모드별 사용 분포',
  chart_last7Days: '최근 7일 학습 활동',
  chart_scoreTrend: '점수 추이',
  chart_recentSessions: '최근 세션',
  chart_startLearning: '학습 시작',
  mode_free_conversation: '자유 대화',
  mode_q1_repeat: 'q1 낭독',
  mode_q2_describe: 'q2 설명',
  mode_q3_picture: 'q3 그림',
  mode_q4_dialogue: 'q4 대화',
  mode_presentation: '발표',
  mode_reading: '읽기',
  modeCard_freeConvTitle: '생성형 자유 대화',
  modeCard_freeConvSubtitle: '페르소나 4명 중 선택해 일상 대화 연습',
  modeCard_speakingTitle: '말하기 평가 (q1~q4)',
  modeCard_speakingSubtitle: '따라 읽기·묘사·그림 설명·대화',
  modeCard_presentationTitle: '발표 연습',
  modeCard_presentationSubtitle: '주제 발표 연습 + 즉시 피드백',
  modeCard_readingTitle: '읽기 연습',
  modeCard_readingSubtitle: '한국어 본문 읽기 + 발음 점수',
  dataDownload_sectionTitle: '내 데이터 다운로드',
  dataDownload_sectionDescription: '참여자 본인의 누적 세션·발화·평가 기록을 CSV로 다운로드합니다 (개인정보 보호 차원).',
  scoreUnit_scorePoints: '점',
  overallScore_title: '종합 점수',
  overallScore_level: '수준',
  overallScore_basedOn: '평가 누적',
  overallScore_assessmentsUnit: '건',
  overallScore_insufficient: '평가 데이터 5건 이상 누적 시 표시됩니다.',
  scoreLevel_advanced: '상급 (Advanced)',
  scoreLevel_intermediateHigh: '중상급 (Intermediate High)',
  scoreLevel_intermediate: '중급 (Intermediate)',
  scoreLevel_noviceHigh: '초상급 (Novice High)',
  scoreLevel_novice: '초급 (Novice)',
  sidebar_studentProgress: '내 학습 현황',
  sidebar_studentSpeaking: '말하기 평가',
  sidebar_studentReading: '읽기연습',
  sidebar_studentPresentation: '발표연습',
  sidebar_studentConversation: '생성형 대화',
  page_progressTitle: '학습 진척 상황',
  page_evaluationResult: '평가 결과',
  page_freeConversationPractice: '생성형 대화 연습',
  page_chooseConversationPartner: '대화 상대 선택',
  page_participantCode: '참여자 코드',
  page_noSessionsMsg: '아직 세션이 없습니다. 아래 학습 모드 중 하나를 선택해 시작하세요.',
  page_inProgress: '진행 중',
  page_completed: '완료',
  page_logout: '로그아웃',
  page_downloadOwnData: '내 데이터 CSV 다운로드',
  time_seconds: '초',
  time_minutes: '분',

  // ─── 동의서 본문 ───
  consent_full: `한국어 말하기 학습 시험운영 참여 동의서

본 시험운영은 한국어 말하기 학습 시스템(KDLI Korean MVP)의 효용성을 확인하기 위한 목적으로 진행됩니다. 학술 연구 및 KDLI 보고에 활용됩니다.

[수집 데이터]
- 학습 활동 기록: 학습 모드·세션 시작·종료 시간
- 발화 데이터: 말하기 음성·음성 인식 텍스트·NPC 응답 텍스트
- 평가 점수: 발음·유창성·문법·어휘 등 항목별 점수와 피드백
- 도구 호출 기록: 검색·날씨·주소 등 시스템 도구 사용 내역
- 기술 정보: 동의 시점의 IP 주소(앞 24비트만 익명화 저장)와 사용자 에이전트

[데이터 활용 범위]
- 학술 연구(논문·학회 발표)
- KDLI 보고
- 시스템 개선

[보관 기간]
연구 종료 후 2년 보관. 보관 기간 종료 시 모든 식별 가능 정보는 삭제됩니다.

[익명화 처리]
보고서·논문에 인용되는 모든 데이터는 참여자 식별이 불가능한 형태로 가공됩니다. 참여자 코드(예: P001)로만 표기하며, 이름·국적·연락처 등은 공개되지 않습니다.

[참여자 권리]
- 언제든 참여를 철회할 수 있습니다 (운영자에게 연락).
- 본인 데이터 열람·삭제 요청이 가능합니다.

[연구자 연락처]
운영자에게 직접 문의해 주세요.

위 내용을 충분히 이해했으며, 시험운영에 참여하는 것에 동의합니다.`,

  // ─── "임시본 명시" 문구 (vi/ar/th/ms/km 동의서 하단에 추가) ───
  provisional_notice: '본 번역은 임시본이며 시스템 개선 후 정식 번역 적용 예정입니다. 동의 내용이 불분명하면 한국어 또는 영어 동의서를 참고하시거나 관리자에게 문의해 주세요.',
}

const targets = ['th', 'ms', 'km']
const langNames = { th: 'Thai (ภาษาไทย)', ms: 'Malay (Bahasa Melayu)', km: 'Khmer (ភាសាខ្មែរ)' }
const out = {}

console.log(`Translating ${Object.keys(sources).length} entries × ${targets.length} languages = ${Object.keys(sources).length * targets.length} calls...`)

for (const lang of targets) {
  out[lang] = {}
  for (const [key, ko] of Object.entries(sources)) {
    const isLong = ko.length > 100
    const r = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert Korean→${langNames[lang]} translator for an educational platform. Preserve newlines, brackets [..], and dash bullets exactly. Output ONLY a JSON object: {"text": "<translation>"}. Keep proper nouns like "KDLI", "P001", "TOPIK" in their original form. No prose, no code fences.`,
        },
        { role: 'user', content: ko },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    })
    const text = JSON.parse(r.choices[0].message.content ?? '{}').text ?? ''
    out[lang][key] = text
    process.stdout.write(isLong ? `[${lang}:${key}=${text.length}c]` : `.`)
  }
  console.log(` ${lang} done`)
}

await fs.writeFile('/tmp/단계19.9/translations.json', JSON.stringify({ sources, ...out }, null, 2), 'utf-8')
console.log('\nSaved → /tmp/단계19.9/translations.json')
