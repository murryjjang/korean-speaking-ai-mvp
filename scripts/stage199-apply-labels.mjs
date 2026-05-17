#!/usr/bin/env node
// 단계 19.9 페이즈 2: th/ms/km 번역을 dashboard-labels.ts에 일괄 주입.
// 패턴: `} satisfies LabelMap,` 직전에 th/ms/km 키를 삽입.

import fs from 'node:fs/promises'

const tx = JSON.parse(await fs.readFile('/tmp/단계19.9/translations.json', 'utf-8'))
const file = '/home/murry/projects/korean-speaking-ai-mvp/src/lib/i18n/dashboard-labels.ts'
let src = await fs.readFile(file, 'utf-8')

// 각 label 그룹 ↔ key prefix 매핑
const groups = [
  ['KPI_LABELS', 'kpi_'],
  ['CHART_LABELS', 'chart_'],
  ['MODE_LABELS', 'mode_'],
  ['MODE_CARD_LABELS', 'modeCard_'],
  ['DATA_DOWNLOAD_LABELS', 'dataDownload_'],
  ['SCORE_UNIT_LABELS', 'scoreUnit_'],
  ['OVERALL_SCORE_LABELS', 'overallScore_'],
  ['SCORE_LEVEL_LABELS', 'scoreLevel_'],
  ['SIDEBAR_LABELS', 'sidebar_'],
  ['PAGE_LABELS', 'page_'],
  ['TIME_UNITS', 'time_'],
]

// 단순 접근: 각 라벨 블록(`<key>: { ko: ..., en: ..., vi: ..., ar: ... } satisfies LabelMap,`)
// 안에 th/ms/km 키를 ar 다음에 삽입.
//
// 한국어 ko 값으로 매칭해 어떤 sub-key인지 식별.

const koToLabelKey = {}
for (const [groupName, prefix] of groups) {
  // 원본 grouping 추적 안 함 — 간단히 ko 텍스트 → labelKey 사전 작성.
  for (const k of Object.keys(tx.sources)) {
    if (k.startsWith(prefix)) {
      const sub = k.slice(prefix.length)
      koToLabelKey[tx.sources[k]] = { groupName, sub, key: k }
    }
  }
}

// 패턴: `<sub>: {\n    ko: '<ko>',\n    en: '<en>',\n    vi: '<vi>',\n    ar: '<ar>',\n  } satisfies LabelMap,`
// ar 뒤에 th/ms/km를 끼워넣는다.

let inserted = 0
const re = /(\n    ar: '[^']*',)(\n  } satisfies LabelMap,)/g
src = src.replace(re, (match, arLine, closing, offset) => {
  // 위쪽에서 ko: 값을 찾아 매칭
  const before = src.slice(Math.max(0, offset - 400), offset + 1)
  const koMatch = before.match(/ko: '([^']*)',\s*\n\s*en:/g)
  if (!koMatch) return match
  const lastKo = koMatch[koMatch.length - 1]
  const koText = lastKo.match(/ko: '([^']*)'/)?.[1]
  if (!koText || !koToLabelKey[koText]) return match
  const { key } = koToLabelKey[koText]
  const th = tx.th[key]?.replace(/'/g, "\\'") ?? ''
  const ms = tx.ms[key]?.replace(/'/g, "\\'") ?? ''
  const km = tx.km[key]?.replace(/'/g, "\\'") ?? ''
  if (!th || !ms || !km) {
    console.warn(`missing translation for ${key}`)
    return match
  }
  inserted++
  return `${arLine}\n    th: '${th}',\n    ms: '${ms}',\n    km: '${km}',${closing}`
})

await fs.writeFile(file, src, 'utf-8')
console.log(`Inserted ${inserted} blocks into dashboard-labels.ts`)
