#!/usr/bin/env node
import OpenAI from 'openai'
import fs from 'node:fs/promises'

const env = await fs.readFile('/home/murry/projects/korean-speaking-ai-mvp/.env.local', 'utf-8')
const apiKey = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim()
const client = new OpenAI({ apiKey })

const sources = {
  title: '시험운영 참여 동의',
  subtitle: '계속하기 전에 본문을 자세히 읽어주세요.',
  pcLabel: '참여자 코드',
  agree: '동의하고 시작',
  decline: '동의하지 않음',
}

const targets = {
  th: 'Thai (ภาษาไทย)',
  ms: 'Malay (Bahasa Melayu)',
  km: 'Khmer (ភាសាខ្មែរ)',
}

const out = {}
for (const [lang, name] of Object.entries(targets)) {
  out[lang] = {}
  for (const [k, ko] of Object.entries(sources)) {
    const r = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Translate Korean to ${name}. Output JSON {"text": "<translation>"}. Keep short and natural.` },
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

console.log(JSON.stringify(out, null, 2))
await fs.writeFile('/tmp/단계19.9/consent-ui.json', JSON.stringify(out, null, 2))
