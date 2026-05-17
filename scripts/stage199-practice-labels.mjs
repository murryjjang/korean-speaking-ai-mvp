#!/usr/bin/env node
// 단계 19.9 페이즈 4: 4개 학습 모드 페이지 본문 라벨 — th/ms/km LLM 번역.
import OpenAI from 'openai'
import fs from 'node:fs/promises'

const env = await fs.readFile('/home/murry/projects/korean-speaking-ai-mvp/.env.local', 'utf-8')
const apiKey = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim()
const client = new OpenAI({ apiKey })

const sources = {
  diff_beginner: '초급',
  diff_intermediate: '중급',
  diff_advanced: '고급',
  purpose_official: '정식 평가',
  purpose_diagnostic: '진단평가',
  purpose_practice: '연습평가',
  action_startInOrder: '1번부터 순서대로 응시하기',
  action_start: '시작하기',
  action_recordPresentation: '발표 녹음 시작',
  action_endConversation: '대화 종료',
  action_tryNow: '체험하기',
  field_topic: '주제',
  field_elapsed: '경과',
  field_presentationTopic: '발표 주제',
  field_presentationLevel: '발표 수준',
  field_targetTime: '목표 발표 시간',
  field_presentationScript: '발표 원고',
  setting_learningSetup: '학습 설정',
  setting_presentationSetup: '발표 설정',
  state_inProgress: '진행 중',
  state_completed: '완료',
  state_ready: '체험 가능',
  state_preparing: '준비 중',
  meta_pronunciationAzure: '발음 평가 (Azure)',
  meta_npcAutoPlay: 'NPC 음성 자동 재생',
  meta_prepTime: '준비',
  meta_answerTime: '답변',
}

const targets = ['en', 'vi', 'ar', 'th', 'ms', 'km']
const names = { en: 'English', vi: 'Vietnamese', ar: 'Arabic', th: 'Thai', ms: 'Malay', km: 'Khmer' }
const out = {}
for (const lang of targets) {
  out[lang] = {}
  for (const [k, ko] of Object.entries(sources)) {
    const r = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Translate Korean to ${names[lang]} for an educational app UI. Output JSON {"text": "..."}. Keep concise.` },
        { role: 'user', content: ko },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    })
    out[lang][k] = JSON.parse(r.choices[0].message.content ?? '{}').text
    process.stdout.write('.')
  }
  console.log(' ' + lang)
}
await fs.writeFile('/tmp/단계19.9/practice-labels.json', JSON.stringify({ ko: sources, ...out }, null, 2))
console.log('saved')
