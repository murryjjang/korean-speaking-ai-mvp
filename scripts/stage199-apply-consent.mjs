#!/usr/bin/env node
// 단계 19.9 페이즈 2: consent-text.ts에 th/ms/km 추가 + vi/ar/th/ms/km에
// 임시본 명시 문구 부착. ko/en은 정본이므로 미부착.

import fs from 'node:fs/promises'

const tx = JSON.parse(await fs.readFile('/tmp/단계19.9/translations.json', 'utf-8'))
const target = '/home/murry/projects/korean-speaking-ai-mvp/src/lib/research/consent-text.ts'

// 임시본 명시 문구도 각 언어로 번역되어 있음 (tx.<lang>.provisional_notice).
const provisional = {
  ko: '', // 정본
  en: '', // 정본
  vi: tx.th.provisional_notice && tx.ms.provisional_notice && tx.km.provisional_notice
    // vi 기존 본문에도 이미 비슷한 문구가 있음. 19.9 표준 문구로 교체.
    ? null  // vi/ar는 LLM 미요청 — 별도 처리
    : null,
}

// vi/ar provisional은 직접 LLM 호출.
// 이미 있는 vi/ar 번역으로 일관성 유지. 간단한 한국어 → vi/ar 번역을 생성하기 위해
// 같은 OpenAI 호출. tx에는 th/ms/km만 있으니, vi/ar는 여기서 추가.

import OpenAI from 'openai'
const env = await fs.readFile('/home/murry/projects/korean-speaking-ai-mvp/.env.local', 'utf-8')
const apiKey = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim()
const client = new OpenAI({ apiKey })

const noticeKo = '본 번역은 임시본이며 시스템 개선 후 정식 번역 적용 예정입니다. 동의 내용이 불분명하면 한국어 또는 영어 동의서를 참고하시거나 관리자에게 문의해 주세요.'

const langMeta = {
  vi: 'Vietnamese (Tiếng Việt)',
  ar: 'Arabic (العربية)',
}
const notices = {
  th: tx.th.provisional_notice,
  ms: tx.ms.provisional_notice,
  km: tx.km.provisional_notice,
}
for (const [code, name] of Object.entries(langMeta)) {
  const r = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `Translate Korean to ${name}. Output JSON {"text": "<translation>"}.` },
      { role: 'user', content: noticeKo },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  })
  notices[code] = JSON.parse(r.choices[0].message.content ?? '{}').text
  console.log(`notice.${code}: ${notices[code]?.slice(0, 60)}…`)
}

// 본문 + 임시본 notice 결합 (vi/ar/th/ms/km).
function build(body, notice) {
  return `${body}\n\n[임시본 안내 / Provisional Translation Notice]\n${notice}`
}

// 기존 vi/ar 본문은 그대로 두고, 끝에 19.9 표준 notice 추가.
let src = await fs.readFile(target, 'utf-8')

// vi 본문에는 이미 "(Bản tiếng Hàn và tiếng Anh là bản chính thức..." 라는 문구가 있음.
// 19.9 표준 임시본 명시로 일관 — 기존 한 줄을 지우고 표준 notice로 교체.
src = src.replace(/\n\n\(Bản tiếng Hàn[^`]+\)`/u, `\n\n[임시본 안내 / Provisional Translation Notice]\n${notices.vi}\``)
src = src.replace(/\n\n\(النسخة الكورية[^`]+\)`/u, `\n\n[임시본 안내 / Provisional Translation Notice]\n${notices.ar}\``)

// th/ms/km 본문 + notice. 기존 ar 블록 뒤에 추가.
const newBlocks = `

export const CONSENT_TEXT_TH = \`${tx.th.consent_full}\n\n[임시본 안내 / Provisional Translation Notice]\n${notices.th}\`

export const CONSENT_TEXT_MS = \`${tx.ms.consent_full}\n\n[임시본 안내 / Provisional Translation Notice]\n${notices.ms}\`

export const CONSENT_TEXT_KM = \`${tx.km.consent_full}\n\n[임시본 안내 / Provisional Translation Notice]\n${notices.km}\`
`

// "export type ConsentLocale" 직전에 삽입.
src = src.replace(
  /export type ConsentLocale = 'ko' \| 'en' \| 'vi' \| 'ar'/,
  `${newBlocks}\nexport type ConsentLocale = 'ko' | 'en' | 'vi' | 'ar' | 'th' | 'ms' | 'km'`,
)

// CONSENT_TEXTS Record 확장
src = src.replace(
  /export const CONSENT_TEXTS: Record<ConsentLocale, string> = \{\n  ko: CONSENT_TEXT_KO,\n  en: CONSENT_TEXT_EN,\n  vi: CONSENT_TEXT_VI,\n  ar: CONSENT_TEXT_AR,\n\}/,
  `export const CONSENT_TEXTS: Record<ConsentLocale, string> = {
  ko: CONSENT_TEXT_KO,
  en: CONSENT_TEXT_EN,
  vi: CONSENT_TEXT_VI,
  ar: CONSENT_TEXT_AR,
  th: CONSENT_TEXT_TH,
  ms: CONSENT_TEXT_MS,
  km: CONSENT_TEXT_KM,
}`,
)

await fs.writeFile(target, src, 'utf-8')
console.log('consent-text.ts updated')
