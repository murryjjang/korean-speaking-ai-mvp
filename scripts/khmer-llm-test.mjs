#!/usr/bin/env node
// 단계 19.9 페이즈 0: 크메르어 LLM 번역 안전망 테스트.
// gpt-4o-mini로 한국어 → 크메르어 번역 5개 샘플 + self-evaluation.

import OpenAI from 'openai'
import fs from 'node:fs/promises'
import path from 'node:path'

const dotenv = await fs.readFile('/home/murry/projects/korean-speaking-ai-mvp/.env.local', 'utf-8')
const apiKey = dotenv.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim()
if (!apiKey) {
  console.error('OPENAI_API_KEY missing')
  process.exit(1)
}

const client = new OpenAI({ apiKey })

const samples = [
  '잘 하셨어요!',
  '발음과 억양을 더 연습해 보세요.',
  '본 시스템은 KDLI 한국어 학습 효과 확인을 위한 시험운영입니다.',
  '내 학습 현황',
  '꾸준히 학습하시면 한국어 실력이 향상됩니다.',
]

const results = []
for (const [i, ko] of samples.entries()) {
  const r = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert Korean→Khmer (Cambodian) translator. Translate the user text to natural, fluent Khmer. Output ONLY a JSON object: {"km": "<translation>", "confidence": "<high|medium|low>", "note": "<any concerns or empty>"}. No prose, no code fences.',
      },
      { role: 'user', content: ko },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  })
  const raw = r.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(raw)
  results.push({ idx: i + 1, ko, ...parsed })
  console.log(`[${i + 1}] ${ko} → ${parsed.km} (${parsed.confidence})`)
}

const md = [
  '# 단계 19.9 페이즈 0 — 크메르어 LLM 번역 샘플 테스트',
  '',
  `생성 시각: ${new Date().toISOString()}`,
  '모델: gpt-4o-mini · temperature=0',
  '',
  '## 결과',
  '',
  '| # | 한국어 | 크메르어 | confidence | 비고 |',
  '|---|---|---|---|---|',
  ...results.map((r) => `| ${r.idx} | ${r.ko} | ${r.km} | ${r.confidence} | ${r.note || '-'} |`),
  '',
  '## 자체 평가',
  '',
  `- 5개 중 high: ${results.filter((r) => r.confidence === 'high').length}건`,
  `- 5개 중 medium: ${results.filter((r) => r.confidence === 'medium').length}건`,
  `- 5개 중 low: ${results.filter((r) => r.confidence === 'low').length}건`,
  '',
  '## 후속 결정',
  '',
  '- low/medium은 보고서 "임시본 명시" 영역에 추가 안내.',
  '- 동의서·UI 보조 표기는 동일 모델 + 동일 시스템 프롬프트로 일괄 번역 예정.',
  '',
].join('\n')

await fs.writeFile('/tmp/단계19.9/khmer-samples.md', md, 'utf-8')
console.log('\nSaved → /tmp/단계19.9/khmer-samples.md')
