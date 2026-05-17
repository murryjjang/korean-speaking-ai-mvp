#!/usr/bin/env node
// 단계 19.9 페이즈 3 [PDF-검증]: 7개 mother_tongue 언어 × 핵심 콘텐츠로
// /api/pdf 엔드포인트 호출 → PDF 생성 → /tmp/단계19.9/pdfs/ 저장.
//
// 검증 의도: html2canvas 시절 4연속 실패한 아랍어 연결형(initial/medial/final
// shaping)이 Puppeteer 경로에서 정상 출력되는지 PDF 파일로 시각 확인 가능하게 한다.

import fs from 'node:fs/promises'

const API = 'http://localhost:3099/api/pdf'
const OUT_DIR = '/tmp/단계19.9/pdfs'
await fs.mkdir(OUT_DIR, { recursive: true })

// 각 언어에 동일 의미의 한 문장 + 단어 단위 연결 확인용 짧은 어구.
const samples = {
  ko: { title: '한국어 학습 보고서', body: '안녕하세요. 발음과 억양을 더 연습해 보세요. 잘 하셨어요!' },
  en: { title: 'Korean Learning Report', body: 'Hello. Please practice pronunciation and intonation more. Well done!' },
  vi: { title: 'Báo cáo Học Tiếng Hàn', body: 'Xin chào. Hãy luyện phát âm và ngữ điệu nhiều hơn. Bạn đã làm tốt!' },
  ar: { title: 'تقرير تعلم اللغة الكورية', body: 'مرحبا. يرجى التدرب على النطق والتنغيم أكثر. أحسنت! الموافقة على المشاركة.' },
  th: { title: 'รายงานการเรียนภาษาเกาหลี', body: 'สวัสดี กรุณาฝึกการออกเสียงและน้ำเสียงเพิ่มขึ้น คุณทำได้ดีมาก!' },
  ms: { title: 'Laporan Pembelajaran Bahasa Korea', body: 'Halo. Sila berlatih sebutan dan intonasi lebih banyak. Anda berjaya!' },
  km: { title: 'របាយការណ៍សិក្សាភាសាកូរ៉េ', body: 'សួស្តី សូមហាត់ការបញ្ចេញសំឡេងនិងសំនៀងបន្ថែម អ្នកធ្វើបានល្អ!' },
}

const fontsLink = `
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Khmer:wght@400;600;700&display=swap" rel="stylesheet" />
`

const css = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: "Pretendard", "Noto Sans KR", "Noto Sans Arabic", "Noto Sans Thai", "Noto Sans Khmer", sans-serif; padding: 24px; color: #1f2937; background: #FAF9F5; }
h1 { font-size: 28px; font-weight: 700; margin-bottom: 16px; }
h2 { font-size: 16px; font-weight: 600; margin-top: 12px; color: #374151; }
p { font-size: 18px; line-height: 1.7; margin: 10px 0; }
.box { padding: 16px; border: 1px solid #d1d5db; border-radius: 8px; margin: 12px 0; background: #ffffff; }
.supplement { font-size: 14px; color: #6b7280; }
[lang="ar"], [dir="rtl"] { font-family: "Noto Sans Arabic", "Pretendard", sans-serif; unicode-bidi: plaintext; text-align: start; }
[lang="th"] { font-family: "Noto Sans Thai", "Pretendard", sans-serif; }
[lang="km"] { font-family: "Noto Sans Khmer", "Pretendard", sans-serif; }
`

const results = []
for (const [lang, s] of Object.entries(samples)) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  // 한국어 본문 + mother_tongue 보조 표기 패턴
  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
${fontsLink}
<style>${css}</style>
</head>
<body>
<h1 lang="ko">[KDLI 단계 19.9 PDF 검증] ${samples.ko.title}</h1>
<h2 lang="${lang}" ${lang === 'ar' ? 'dir="rtl"' : ''}>${s.title}</h2>
<div class="box">
  <p lang="ko">${samples.ko.body}</p>
  ${lang !== 'ko' ? `<p class="supplement" lang="${lang}" ${lang === 'ar' ? 'dir="rtl"' : ''}>${s.body}</p>` : ''}
</div>
<div class="box">
  <h2>단어 단위 연결 (shaping 확인)</h2>
  <p lang="${lang}" ${lang === 'ar' ? 'dir="rtl"' : ''} style="font-size:24px">${s.body}</p>
</div>
</body>
</html>`

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, fileName: `pdf-smoke-${lang}.pdf` }),
  })
  const out = `${OUT_DIR}/pdf-smoke-${lang}.pdf`
  if (!res.ok) {
    const err = await res.text()
    console.error(`[${lang}] FAILED ${res.status}: ${err.slice(0, 200)}`)
    results.push({ lang, status: res.status, bytes: 0 })
    continue
  }
  const buf = await res.arrayBuffer()
  await fs.writeFile(out, Buffer.from(buf))
  results.push({ lang, status: 200, bytes: buf.byteLength, file: out })
  console.log(`[${lang}] ${buf.byteLength} bytes → ${out}`)
}

console.log('\nResults:')
console.table(results)
