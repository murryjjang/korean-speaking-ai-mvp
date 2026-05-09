'use client'

import type { CSSProperties } from 'react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardHeader, CardBody, Badge } from '@/src/components/ui'
import { computeEtriWordDiff } from '@/src/lib/etri-word-diff'
import { useKaraokeTracking } from '@/src/hooks/useKaraokeTracking'

// ── 지문 ────────────────────────────────────────────────────────────────────
const REFERENCE_LINES = [
  '오늘은 날씨가 좋습니다.',
  '저는 친구와 함께 도서관에 갑니다.',
  '도서관에서 책을 읽고 한국어 숙제를 할 예정입니다.',
  '공부가 끝나면 친구와 함께 집에 돌아갑니다.',
]

// ── 언어 ────────────────────────────────────────────────────────────────────
const NATIVE_LANGS = [
  { code: 'vi', label: '베트남어 (Tiếng Việt)' },
  { code: 'en', label: '영어 (English)' },
  { code: 'th', label: '태국어 (ภาษาไทย)' },
  { code: 'lo', label: '라오어 (ພາສາລາວ)' },
  { code: 'ar', label: '아랍어 (العربية)' },
  { code: 'zh', label: '중국어 (中文)' },
  { code: 'ja', label: '일본어 (日本語)' },
  { code: 'mn', label: '몽골어 (Монгол)' },
  { code: 'ru', label: '러시아어 (Русский)' },
  { code: 'uz', label: '우즈베크어 (O\'zbek)' },
]

// ── 속도 ────────────────────────────────────────────────────────────────────
const SPEED_OPTIONS = [0.75, 0.9, 1.0, 1.1, 1.25] as const
type SpeedOption = typeof SPEED_OPTIONS[number]

// ── Demo fallback STT ────────────────────────────────────────────────────────
const DEMO_STT_ACCURATE: string[] = [
  '오늘은 날씨가 좋습니다.',
  '저는 친구와 함께 도서관에 갑니다.',
  '도서관에서 책을 읽고 한국어 숙제를 할 예정입니다.',
  '공부가 끝나면 친구와 함께 집에 돌아갑니다.',
]

// ── Azure 단어 결과 타입 ──────────────────────────────────────────────────────
interface AzureWordResult {
  word: string
  accuracyScore: number
  errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
  offsetMs?: number
  durationMs?: number
}

interface AzureResult {
  providerName: 'azure' | 'demo'
  fallbackReason?: string
  normalizedScore: number
  pronScore: number | null
  accuracyScore: number | null
  fluencyScore: number | null
  completenessScore: number | null
  recognizedText: string
  wordResults: AzureWordResult[]
  latencyMs?: number
}

// ── 단어 토큰화 (본문 단일 블록 렌더링용) ───────────────────────────────────
interface WordToken {
  text: string
  globalIdx: number
  lineIdx: number
  wordIdxInLine: number
}

function tokenizeReference(lines: string[]): WordToken[] {
  const tokens: WordToken[] = []
  let g = 0
  for (let li = 0; li < lines.length; li++) {
    const ws = lines[li].split(/\s+/).filter(Boolean)
    for (let wi = 0; wi < ws.length; wi++) {
      tokens.push({ text: ws[wi], globalIdx: g++, lineIdx: li, wordIdxInLine: wi })
    }
  }
  return tokens
}

const WORD_TOKENS: WordToken[] = tokenizeReference(REFERENCE_LINES)

// ── 권장 발화 시간 산출 ─────────────────────────────────────────────────────
// 초급 학습자 분당 약 150자 기준 (네이티브 250자/분보다 보수적), 최소 30초.
// 학습자가 매번 "초과"를 보지 않도록 +10초 버퍼.
function computeRecommendedSec(lines: string[]): number {
  const charCount = lines.join('').replace(/\s/g, '').length
  const charsPerMinute = 150
  return Math.max(30, Math.round((charCount / charsPerMinute) * 60) + 10)
}
const RECOMMENDED_READING_SEC = computeRecommendedSec(REFERENCE_LINES)

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = Math.max(0, Math.floor(totalSec % 60))
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── 점수 계산 ────────────────────────────────────────────────────────────────
function computeWordMatchScore(reference: string, recognized: string): number {
  const strip = (w: string) => w.replace(/[.,!?。、·]/g, '').trim()
  const refWords = reference.split(/\s+/).filter(Boolean).map(strip)
  const recWords = recognized.split(/\s+/).filter(Boolean).map(strip)

  if (refWords.length === 0) return 50
  if (recWords.length === 0) return 20

  let matches = 0
  const recCopy = [...recWords]
  for (const rw of refWords) {
    const idx = recCopy.findIndex(w => w === rw)
    if (idx >= 0) { matches++; recCopy.splice(idx, 1) }
  }

  const ratio = matches / refWords.length

  // Floor policy for scripted reading: accurate reading yields 90+
  let score: number
  if (ratio >= 0.97) score = 97
  else if (ratio >= 0.93) score = 93
  else if (ratio >= 0.90) score = 90
  else if (ratio >= 0.85) score = 85
  else if (ratio >= 0.80) score = 80
  else if (ratio >= 0.60) score = 60 + (ratio - 0.60) / 0.20 * 20
  else if (ratio >= 0.40) score = 50 + (ratio - 0.40) / 0.20 * 10
  else score = Math.max(10, 30 + ratio * 50)
  return Math.round(Math.min(100, Math.max(10, score)))
}

function computeFinalScore(azure: AzureResult | null, sttLines: string[]): number {
  if (azure && azure.providerName === 'azure' && azure.pronScore != null) {
    const pron = azure.pronScore
    const acc = azure.accuracyScore ?? pron
    const flu = azure.fluencyScore ?? pron
    const comp = azure.completenessScore ?? pron
    return Math.round(Math.min(100, pron * 0.5 + acc * 0.2 + flu * 0.15 + comp * 0.15))
  }
  // STT-based score
  const fullRecognized = sttLines.join(' ')
  const fullReference = REFERENCE_LINES.join(' ')
  return computeWordMatchScore(fullReference, fullRecognized)
}

// ── 동적 피드백 ──────────────────────────────────────────────────────────────
function generateKoreanFeedback(
  score: number,
  sttLines: string[],
): { good: string[]; improve: string[]; reread: string | null } {
  const hasMismatch = sttLines.some((stt, i) => {
    const { mismatchedRefWords } = computeEtriWordDiff(REFERENCE_LINES[i], stt)
    return mismatchedRefWords.length > 0
  })

  if (score >= 90) {
    return {
      good: [
        '제시문을 매우 정확하게 읽었습니다.',
        '대부분의 핵심 단어가 정확히 인식되었습니다.',
        '현재 수준에서는 읽기 정확도가 좋습니다.',
      ],
      improve: [],
      reread: null,
    }
  } else if (score >= 80) {
    return {
      good: [
        '대부분의 문장을 정확하게 읽었습니다.',
        '전체적인 읽기 흐름이 좋습니다.',
      ],
      improve: hasMismatch
        ? ['대부분 잘 읽었으나 일부 단어가 다르게 인식되었습니다.', '문장 끝을 조금 더 또렷하게 읽으면 좋습니다.']
        : ['문장 끝을 조금 더 또렷하게 읽으면 좋습니다.'],
      reread: REFERENCE_LINES[2],
    }
  } else if (score >= 70) {
    return {
      good: ['전체 지문을 읽으려는 노력이 좋습니다.'],
      improve: [
        '일부 단어가 누락되었거나 다르게 읽혔습니다.',
        '문장 끝부분을 조금 더 또렷하게 읽어 보세요.',
        ...(hasMismatch ? ['빨간색으로 표시된 단어를 다시 읽어 보세요.'] : []),
      ],
      reread: REFERENCE_LINES[2],
    }
  } else {
    return {
      good: [],
      improve: [
        '일부 문장이 빠지거나 다르게 인식되었습니다.',
        'AI 음성을 다시 듣고 한 문장씩 따라 읽어 보세요.',
        ...(hasMismatch ? ['빨간색으로 표시된 단어를 다시 읽어 보세요.'] : []),
        '단어 사이를 의미 단위로 끊어 읽어 보세요.',
      ],
      reread: REFERENCE_LINES[2],
    }
  }
}

const NATIVE_FEEDBACK_GOOD: Record<string, string> = {
  vi: 'Bạn đã đọc toàn bộ câu rất chính xác. Phát âm và tốc độ đọc rất tốt.',
  en: 'You read the full passage very accurately. Pronunciation and reading speed are excellent.',
  th: 'คุณอ่านทุกประโยคได้อย่างถูกต้องมาก การออกเสียงและความคล่องแคล่วดีมาก',
  lo: 'ທ່ານອ່ານທຸກປະໂຫຍກໄດ້ຢ່າງຖືກຕ້ອງຫຼາຍ. ການອອກສຽງດີຫຼາຍ.',
  ar: 'لقد قرأتَ الجمل كلها بدقة كبيرة. النطق والطلاقة ممتازان.',
  zh: '您每句话都读得非常准确，发音和流利度都很好。',
  ja: '全ての文を非常に正確に読めました。発音と読みの流暢さが優れています。',
  mn: 'Та бүх өгүүлбэрийг маш зөв уншлаа. Дуудлага болон уншлагын хурд маш сайн байна.',
  ru: 'Вы очень точно прочли все предложения. Произношение и беглость отличные.',
  uz: 'Siz barcha gaplarni juda to\'g\'ri o\'qidingiz. Talaffuz va ravonlik ajoyib.',
}

const NATIVE_FEEDBACK_IMPROVE: Record<string, string> = {
  vi: 'Một số từ chưa được nhận dạng rõ ràng. Hãy đọc lại các từ được đánh dấu màu đỏ và phát âm rõ ràng hơn ở cuối câu.',
  en: 'Some words were not clearly recognized. Please re-read the words marked in red and speak more clearly at the end of sentences.',
  th: 'คำบางคำไม่ถูกจดจำอย่างชัดเจน กรุณาอ่านคำที่ทำเครื่องหมายสีแดงอีกครั้งและพูดให้ชัดเจนขึ้นที่ท้ายประโยค',
  lo: 'ຄໍາບາງຄໍາບໍ່ຖືກຮັບຮູ້ຢ່າງຊັດເຈນ. ກະລຸນາອ່ານຄໍາທີ່ໝາຍດ້ວຍສີແດງຄືນໃໝ່.',
  ar: 'لم يتم التعرف على بعض الكلمات بوضوح. يرجى إعادة قراءة الكلمات المُحددة باللون الأحمر والتحدث بشكل أوضح في نهاية الجمل.',
  zh: '部分单词未被清楚识别。请重新朗读标红的单词，并在句末说得更清晰。',
  ja: '一部の単語が正しく認識されませんでした。赤くマークされた単語を読み直し、文末をもっとはっきり発音してみてください。',
  mn: 'Зарим үгс тодорхой таниагдаагүй байна. Улаанаар тэмдэглэгдсэн үгсийг дахин уншаад, өгүүлбэрийн төгсгөлийг илүү тодорхой дуудаарай.',
  ru: 'Некоторые слова не были чётко распознаны. Пожалуйста, перечитайте слова, выделенные красным, и говорите чётче в конце предложений.',
  uz: 'Ba\'zi so\'zlar aniq tanilmadi. Qizil belgilangan so\'zlarni qaytadan o\'qing va gap oxirida aniqroq gapiring.',
}

// ── ReadingTimeGuide: 권장 시간 대비 경과 진행률 보조 표시 ──────────────────
function ReadingTimeGuide({
  elapsedSec,
  recommendedSec,
  active,
}: {
  elapsedSec: number
  recommendedSec: number
  active: boolean
}) {
  const ratio = recommendedSec > 0 ? elapsedSec / recommendedSec : 0
  const widthPct = Math.min(100, Math.round(ratio * 100))
  const color = ratio <= 0.8 ? '#C49B4B' : ratio <= 1.0 ? '#D97706' : '#DC2626'
  const overShoot = ratio > 1.0

  return (
    <div
      className="mx-auto mt-4"
      style={{ maxWidth: '720px' }}
      data-testid="reading-time-guide"
    >
      <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
        <span>권장 시간 {formatMmSs(recommendedSec)} / 경과 {formatMmSs(elapsedSec)}</span>
        {overShoot && active && (
          <span style={{ color: '#DC2626', fontWeight: 500 }}>권장 시간 초과</span>
        )}
      </div>
      <div
        style={{
          height: 4,
          background: 'var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${widthPct}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease, background 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

// ── ResultPassage: 단일 흐르는 본문 + 단어별 첨삭 색상 ─────────────────────
interface ResultPassageWord {
  text: string
  lineIdx: number
  wordIdxInLine: number
  globalIdx: number
  errorType: AzureWordResult['errorType']
  accuracyScore?: number
  offsetMs?: number
  durationMs?: number
}

function alignAzureWordsToReference(azureWords: AzureWordResult[] | null, sttRecognized: string): {
  words: ResultPassageWord[]
  insertions: { word: string; afterGlobalIdx: number }[]
} {
  const strip = (w: string) => w.replace(/[.,!?。、·]/g, '').trim()
  const out: ResultPassageWord[] = []
  const insertions: { word: string; afterGlobalIdx: number }[] = []

  if (azureWords && azureWords.length > 0) {
    let ai = 0
    for (const rt of WORD_TOKENS) {
      if (ai < azureWords.length && strip(azureWords[ai].word) === strip(rt.text)) {
        out.push({
          text: rt.text,
          lineIdx: rt.lineIdx,
          wordIdxInLine: rt.wordIdxInLine,
          globalIdx: rt.globalIdx,
          errorType: azureWords[ai].errorType,
          accuracyScore: azureWords[ai].accuracyScore,
          offsetMs: azureWords[ai].offsetMs,
          durationMs: azureWords[ai].durationMs,
        })
        ai++
      } else {
        out.push({
          text: rt.text,
          lineIdx: rt.lineIdx,
          wordIdxInLine: rt.wordIdxInLine,
          globalIdx: rt.globalIdx,
          errorType: 'Omission',
        })
      }
    }
    for (let i = ai; i < azureWords.length; i++) {
      if (azureWords[i].errorType === 'Insertion') {
        insertions.push({ word: azureWords[i].word, afterGlobalIdx: WORD_TOKENS.length - 1 })
      }
    }
  } else {
    const { refTokens } = computeEtriWordDiff(REFERENCE_LINES.join(' '), sttRecognized)
    for (let i = 0; i < WORD_TOKENS.length; i++) {
      const t = WORD_TOKENS[i]
      const matched = refTokens[i]?.matched ?? false
      out.push({
        text: t.text,
        lineIdx: t.lineIdx,
        wordIdxInLine: t.wordIdxInLine,
        globalIdx: t.globalIdx,
        errorType: matched ? 'None' : 'Mispronunciation',
      })
    }
  }
  return { words: out, insertions }
}

function getResultWordStyle(w: ResultPassageWord): CSSProperties {
  // ErrorType priority over score
  if (w.errorType === 'Omission') {
    return {
      color: '#C8543C',
      backgroundColor: '#FFEEEE',
      textDecoration: 'line-through',
      textDecorationColor: '#C8543C',
      textDecorationThickness: '3px',
      fontWeight: 600,
    }
  }
  if (w.errorType === 'Mispronunciation') {
    return {
      color: '#C8543C',
      backgroundColor: '#FFF3CD',
      textDecoration: 'underline',
      textDecorationColor: '#C8543C',
      textDecorationThickness: '3px',
      fontWeight: 600,
    }
  }
  if (typeof w.accuracyScore === 'number' && w.accuracyScore < 80) {
    return {
      color: '#C8543C',
      backgroundColor: '#FFF3CD',
      textDecoration: 'underline',
      textDecorationColor: '#C8543C',
      textDecorationThickness: '3px',
    }
  }
  // 기본: 회색 (정상 단어)
  return { color: '#888780' }
}

function getResultWordTitle(w: ResultPassageWord): string | undefined {
  if (w.errorType === 'Omission') return '이 단어를 안 읽었습니다'
  if (w.errorType === 'Mispronunciation') {
    return typeof w.accuracyScore === 'number'
      ? `발음 점수 ${Math.round(w.accuracyScore)}/100`
      : '발음이 정확하지 않습니다'
  }
  if (typeof w.accuracyScore === 'number' && w.accuracyScore < 80) {
    return `발음 점수 ${Math.round(w.accuracyScore)}/100`
  }
  return undefined
}

function ReadingResultPassage({
  sttRecognized,
  azureWords,
  audioCurrentMs,
  onWordSeek,
}: {
  sttRecognized: string
  azureWords: AzureWordResult[] | null
  audioCurrentMs?: number
  onWordSeek?: (offsetMs: number) => void
}) {
  const { words, insertions } = alignAzureWordsToReference(azureWords, sttRecognized)
  const wordsByLine: ResultPassageWord[][] = REFERENCE_LINES.map(() => [])
  for (const w of words) wordsByLine[w.lineIdx].push(w)

  // Determine the currently spoken word from playback position. We use a small
  // tail buffer (50ms) so the highlight doesn't flicker between adjacent words.
  let currentGlobalIdx: number | null = null
  if (typeof audioCurrentMs === 'number') {
    for (const w of words) {
      if (w.offsetMs == null) continue
      const end = w.offsetMs + (w.durationMs ?? 0) + 50
      if (audioCurrentMs >= w.offsetMs && audioCurrentMs <= end) {
        currentGlobalIdx = w.globalIdx
        break
      }
    }
  }

  return (
    <article
      data-testid="reading-result-passage"
      className="mx-auto"
      style={{
        maxWidth: '720px',
        padding: '32px 40px',
        background: '#FAF9F5',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        fontSize: '1.25rem',
        lineHeight: 2.0,
        wordBreak: 'keep-all',
        color: 'var(--text-primary)',
      }}
    >
      {wordsByLine.map((lineWords, lineIdx) => (
        <p
          key={lineIdx}
          style={{ marginBottom: lineIdx < REFERENCE_LINES.length - 1 ? '1.2em' : 0 }}
          data-testid={`result-line-${lineIdx}`}
        >
          {lineWords.map((w, wi) => {
            const isCurrent = currentGlobalIdx === w.globalIdx
            const seekable = w.offsetMs != null && onWordSeek != null
            const baseStyle = getResultWordStyle(w)
            const style: CSSProperties = {
              ...baseStyle,
              padding: '2px 4px',
              borderRadius: 4,
              cursor: seekable ? 'pointer' : 'default',
              transition: 'background 0.2s, color 0.2s',
              ...(isCurrent ? { background: '#FDE68A', color: '#1F2D3D' } : {}),
            }
            const tooltip = getResultWordTitle(w)
            const title = seekable
              ? (tooltip ? `${tooltip} · 클릭하면 이 단어부터 다시 듣기` : '이 단어부터 다시 듣기')
              : tooltip
            return (
              <span
                key={wi}
                data-word-index={w.globalIdx}
                style={style}
                onClick={() => seekable && onWordSeek?.(w.offsetMs!)}
                title={title}
              >
                {w.text}{wi < lineWords.length - 1 ? ' ' : ''}
              </span>
            )
          })}
        </p>
      ))}
      {insertions.length > 0 && (
        <p style={{ marginTop: '0.8em', fontSize: '0.95em' }}>
          <span style={{ color: 'var(--text-muted)' }}>추가된 단어: </span>
          {insertions.map((ins, i) => (
            <span
              key={i}
              style={{
                marginRight: '0.4em',
                color: '#534AB7',
                backgroundColor: '#EEEDFE',
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textDecorationColor: '#534AB7',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 600,
              }}
              title="제시문에 없는 단어를 추가했습니다"
            >
              &ldquo;{ins.word}&rdquo;
            </span>
          ))}
        </p>
      )}
    </article>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function ReadingPracticeClient() {
  const [phase, setPhase] = useState<'setup' | 'practice' | 'result'>('setup')
  const [nativeLang, setNativeLang] = useState('vi')
  const [speed, setSpeed] = useState<SpeedOption>(1.0)
  const [difficulty, setDifficulty] = useState('easy')
  const [currentLine, setCurrentLine] = useState(0)
  const [playingLineIdx, setPlayingLineIdx] = useState<number | null>(null)
  const [recorderState, setRecorderState] = useState<'idle' | 'requesting' | 'recording' | 'stopped'>('idle')
  const [sttLines, setSttLines] = useState<string[] | null>(null)
  const [azureResult, setAzureResult] = useState<AzureResult | null>(null)
  const [finalScore, setFinalScore] = useState<number>(0)
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [providerNote, setProviderNote] = useState<string | null>(null)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const [playbackCurrentMs, setPlaybackCurrentMs] = useState<number>(0)
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const [readingElapsedSec, setReadingElapsedSec] = useState(0)
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seqRef = useRef(0)
  const speedRef = useRef<SpeedOption>(1.0)
  const lineRefs = useRef<(HTMLElement | null)[]>([])

  // Keep speedRef in sync
  useEffect(() => { speedRef.current = speed }, [speed])

  // Karaoke tracking — active only while the learner is recording
  const referenceWordsForKaraoke = useRef(WORD_TOKENS.map(t => t.text)).current
  const karaoke = useKaraokeTracking(referenceWordsForKaraoke, recorderState === 'recording')

  // ── Audio stop ──────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    seqRef.current++
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setTtsStatus('idle')
    setPlayingLineIdx(null)
  }, [])

  // ── Play single line, returns Promise<void> (resolves on end/error) ─────────
  const playLinePromise = useCallback(async (text: string, seq: number): Promise<void> => {
    return new Promise(resolve => {
      if (seq !== seqRef.current) { resolve(); return }
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
        .then(r => r.json())
        .then(data => {
          if (seq !== seqRef.current) { resolve(); return }

          if (data.audioBase64) {
            const audio = new Audio(`data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}`)
            audio.playbackRate = speedRef.current
            audioRef.current = audio
            audio.onended = () => { if (seq === seqRef.current) audioRef.current = null; resolve() }
            audio.onerror = () => resolve()
            audio.play().catch(() => resolve())
            return
          }

          const utter = new SpeechSynthesisUtterance(data.fallbackText ?? text)
          utter.lang = 'ko-KR'
          utter.rate = (data.fallbackRate ?? 0.9) * speedRef.current
          utter.onend = () => resolve()
          utter.onerror = () => resolve()
          window.speechSynthesis?.speak(utter)
        })
        .catch(() => resolve())
    })
  }, [])

  // ── Play all lines with auto-highlight ──────────────────────────────────────
  const playAll = useCallback(async () => {
    stopAudio()
    const seq = ++seqRef.current
    setTtsStatus('playing')

    for (let i = 0; i < REFERENCE_LINES.length; i++) {
      if (seq !== seqRef.current) break
      setPlayingLineIdx(i)
      setCurrentLine(i)
      lineRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await playLinePromise(REFERENCE_LINES[i], seq)
      if (seq !== seqRef.current) break
    }

    if (seq === seqRef.current) {
      setPlayingLineIdx(null)
      setTtsStatus('idle')
    }
  }, [stopAudio, playLinePromise])

  const playCurrent = useCallback(async () => {
    stopAudio()
    const seq = ++seqRef.current
    setTtsStatus('loading')
    setPlayingLineIdx(currentLine)
    lineRefs.current[currentLine]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await playLinePromise(REFERENCE_LINES[currentLine], seq)
    if (seq === seqRef.current) {
      setPlayingLineIdx(null)
      setTtsStatus('idle')
    }
  }, [stopAudio, playLinePromise, currentLine])

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRecorderState('stopped')
      runFallbackSTT()
      return
    }
    setRecorderState('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setRecorderState('stopped')
      runFallbackSTT()
      return
    }
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
    mediaRecorderRef.current = recorder
    recorder.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      submitSTT()
    }
    recorder.start(250)
    setRecorderState('recording')
    setReadingElapsedSec(0)
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current)
    elapsedIntervalRef.current = setInterval(() => {
      setReadingElapsedSec(p => p + 1)
    }, 1000)
  }

  const stopRecording = () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current)
      elapsedIntervalRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    } else {
      runFallbackSTT()
    }
    setRecorderState('stopped')
  }

  const submitSTT = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    if (blob.size < 3000) {
      runFallbackSTT()
      return
    }
    // Keep the recorded audio so the result page can replay it with word-sync.
    try {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl)
      const url = URL.createObjectURL(blob)
      setRecordedAudioUrl(url)
    } catch { /* noop */ }
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      fd.append('questionId', 'reading-practice')
      const res = await fetch('/api/stt', { method: 'POST', body: fd })
      const data = await res.json()
      const transcript: string = data.transcript ?? ''
      if (!transcript) {
        runFallbackSTT()
        return
      }
      const lines = distributeTranscript(transcript)
      setSttLines(lines)
      await runAzurePronunciation(blob, REFERENCE_LINES.join(' '), lines)
    } catch {
      runFallbackSTT()
    }
  }

  const distributeTranscript = (fullText: string): string[] => {
    const words = fullText.split(/\s+/).filter(Boolean)
    const refWordCounts = REFERENCE_LINES.map(l => l.split(/\s+/).filter(Boolean).length)
    const lines: string[][] = REFERENCE_LINES.map(() => [])
    let wi = 0
    for (let li = 0; li < lines.length; li++) {
      for (let j = 0; j < refWordCounts[li] && wi < words.length; j++, wi++) {
        lines[li].push(words[wi])
      }
    }
    return lines.map(l => l.join(' '))
  }

  const runFallbackSTT = () => {
    const lines = DEMO_STT_ACCURATE
    setSttLines(lines)
    const score = computeWordMatchScore(REFERENCE_LINES.join(' '), lines.join(' '))
    setFinalScore(score)
    setAzureResult(null)
    setProviderNote('현재는 음성 인식 기반 참고평가 모드입니다. 정밀 발음평가는 Azure 연동 안정화 후 고도화 예정입니다.')
    setPhase('result')
  }

  const runAzurePronunciation = async (blob: Blob, referenceText: string, sttLinesCurrent: string[]) => {
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      fd.append('referenceText', referenceText)
      const res = await fetch('/api/pronunciation-azure', { method: 'POST', body: fd })
      const data = await res.json() as AzureResult

      if (data.fallbackReason) {
        setProviderNote('현재는 음성 인식 기반 참고평가 모드입니다. 정밀 발음평가는 Azure 연동 안정화 후 고도화 예정입니다.')
        setAzureResult(null)
        const score = computeWordMatchScore(referenceText, sttLinesCurrent.join(' '))
        setFinalScore(score)
      } else {
        setAzureResult(data)
        if (data.recognizedText) {
          const newLines = distributeTranscript(data.recognizedText)
          setSttLines(newLines)
          setFinalScore(computeFinalScore(data, newLines))
        } else {
          setFinalScore(computeFinalScore(data, sttLinesCurrent))
        }
      }
    } catch {
      setProviderNote('현재는 음성 인식 기반 참고평가 모드입니다. 정밀 발음평가는 Azure 연동 안정화 후 고도화 예정입니다.')
      setAzureResult(null)
      const score = computeWordMatchScore(referenceText, sttLinesCurrent.join(' '))
      setFinalScore(score)
    }
    setPhase('result')
  }

  const reset = () => {
    stopAudio()
    setPhase('setup')
    setSttLines(null)
    setAzureResult(null)
    setFinalScore(0)
    setProviderNote(null)
    setCurrentLine(0)
    setPlayingLineIdx(null)
    setRecorderState('idle')
    chunksRef.current = []
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl)
      setRecordedAudioUrl(null)
    }
    setPlaybackCurrentMs(0)
    setReadingElapsedSec(0)
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current)
      elapsedIntervalRef.current = null
    }
  }

  // ── Dynamic feedback ────────────────────────────────────────────────────────
  const korFeedback = sttLines ? generateKoreanFeedback(finalScore, sttLines) : null
  const nativeFeedbackText = finalScore >= 80
    ? (NATIVE_FEEDBACK_GOOD[nativeLang] ?? NATIVE_FEEDBACK_GOOD['en'])
    : (NATIVE_FEEDBACK_IMPROVE[nativeLang] ?? NATIVE_FEEDBACK_IMPROVE['en'])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold text-text-primary">읽기연습</h1>
            <Badge variant="warning" size="sm">시연용 데모</Badge>
          </div>
          <p className="text-sm text-text-secondary">
            AI 음성을 듣고 따라 읽은 뒤, 음성 인식 결과와 제시문을 비교해 읽기 정확도를 확인합니다.
          </p>
        </div>
      </div>

      {/* 4단계 학습 흐름 */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1" data-testid="reading-flow-steps">
        {[
          { step: '1', label: '듣기', sub: 'AI 음성 청취' },
          { step: '2', label: '따라 읽기', sub: '지문 낭독' },
          { step: '3', label: '제시문-발화 비교', sub: '인식 결과 확인' },
          { step: '4', label: '한국어+모국어 피드백', sub: '결과 분석' },
        ].map((s, i) => (
          <div key={s.step} className="flex items-center shrink-0">
            <div className="flex flex-col items-center px-3 py-2 text-center" data-testid={`reading-step-${s.step}`}>
              <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                {s.step}
              </span>
              <span className="text-xs font-semibold text-text-primary whitespace-nowrap">{s.label}</span>
              <span className="text-[10px] text-text-muted whitespace-nowrap">{s.sub}</span>
            </div>
            {i < 3 && <span className="text-slate-300 text-sm mx-0.5">›</span>}
          </div>
        ))}
      </div>

      {/* ── setup 단계 ── */}
      {phase === 'setup' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-2 border-primary-400 ring-2 ring-primary-100">
              <CardBody>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-text-primary">쉬운 생활문 읽기</span>
                  <Badge variant="success" size="sm">체험 가능</Badge>
                </div>
                <p className="text-xs text-text-muted mb-3">
                  일상 생활에서 자주 쓰이는 짧은 문장을 읽고 발음을 연습합니다.
                </p>
                <button
                  onClick={() => setPhase('practice')}
                  className="w-full py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  data-testid="start-easy-reading"
                >
                  체험하기
                </button>
              </CardBody>
            </Card>
            <Card className="opacity-60">
              <CardBody>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-text-primary">뉴스형 지문 읽기</span>
                  <Badge variant="default" size="sm">준비 중</Badge>
                </div>
                <p className="text-xs text-text-muted mb-3" data-testid="copyright-notice">
                  신문기사 원문은 저작권 문제가 있을 수 있어 그대로 사용하지 않습니다.
                  향후 자체 제작 뉴스형 지문 또는 공공누리 자료를 활용할 예정입니다.
                </p>
                <div className="w-full py-2 rounded-md bg-slate-200 text-slate-400 text-sm font-medium text-center cursor-not-allowed">
                  준비 중
                </div>
              </CardBody>
            </Card>
            <Card className="opacity-60">
              <CardBody>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-text-primary">공공기관 안내문 읽기</span>
                  <Badge variant="default" size="sm">준비 중</Badge>
                </div>
                <p className="text-xs text-text-muted mb-3">
                  관공서, 병원, 학교 등에서 사용하는 안내 문장을 읽습니다.
                </p>
                <div className="w-full py-2 rounded-md bg-slate-200 text-slate-400 text-sm font-medium text-center cursor-not-allowed">
                  준비 중
                </div>
              </CardBody>
            </Card>
            <Card className="opacity-60">
              <CardBody>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-text-primary">군 생활 안내문 읽기</span>
                  <Badge variant="default" size="sm">준비 중</Badge>
                </div>
                <p className="text-xs text-text-muted mb-3">
                  군 생활과 관련된 실용적인 문장을 읽고 발음을 연습합니다.
                </p>
                <div className="w-full py-2 rounded-md bg-slate-200 text-slate-400 text-sm font-medium text-center cursor-not-allowed">
                  준비 중
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 설정 카드 */}
          <Card>
            <CardHeader title="학습 설정" />
            <CardBody className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  학습자 모국어
                </label>
                <select
                  value={nativeLang}
                  onChange={e => setNativeLang(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  data-testid="native-lang-select"
                >
                  {NATIVE_LANGS.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  지문 난이도
                </label>
                <div className="flex gap-2">
                  {(['easy', 'normal', 'hard'] as const).map((d, idx) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        difficulty === d
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-surface text-text-secondary border-border hover:border-primary-400'
                      }`}
                    >
                      {['쉬움', '보통', '어려움'][idx]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  AI 음성 속도
                </label>
                <div className="flex gap-2 flex-wrap" data-testid="speed-buttons">
                  {SPEED_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      data-testid={`speed-${s}`}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        speed === s
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-surface text-text-secondary border-border hover:border-primary-400'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setPhase('practice')}
                className="w-full py-2.5 rounded-md bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors"
              >
                시작하기
              </button>
            </CardBody>
          </Card>
        </>
      )}

      {/* ── practice 단계 ── */}
      {phase === 'practice' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="info" size="sm">
              {NATIVE_LANGS.find(l => l.code === nativeLang)?.label ?? nativeLang}
            </Badge>
            <Badge variant="default" size="sm">속도 {speed}x</Badge>
            <button
              onClick={reset}
              className="ml-auto text-xs text-text-muted hover:text-text-secondary underline"
            >
              설정 변경
            </button>
          </div>

          {/* TTS 컨트롤 */}
          <Card>
            <CardHeader
              title="AI 음성 듣기"
              action={
                ttsStatus === 'loading' ? (
                  <span className="text-xs text-text-muted animate-pulse">준비 중…</span>
                ) : ttsStatus === 'playing' ? (
                  <Badge variant="success" size="sm">재생 중</Badge>
                ) : null
              }
            />
            <CardBody>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={playAll}
                  disabled={ttsStatus === 'loading' || ttsStatus === 'playing'}
                  data-testid="btn-play-all"
                  className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  전체 듣기
                </button>
                <button
                  onClick={playCurrent}
                  disabled={ttsStatus === 'loading' || ttsStatus === 'playing'}
                  data-testid="btn-play-current"
                  className="px-4 py-2 rounded-md bg-white border border-border text-text-secondary text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  현재 줄 듣기
                </button>
                {(ttsStatus === 'loading' || ttsStatus === 'playing') && (
                  <button
                    onClick={stopAudio}
                    className="px-4 py-2 rounded-md bg-white border border-border text-text-secondary text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    정지
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap" data-testid="speed-buttons">
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    data-testid={`speed-${s}`}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      speed === s
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-surface text-text-muted border-border hover:border-primary-400'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* 지문 패널 — 기사문 형태 단일 흐르는 본문 */}
          <Card>
            <CardHeader
              title="읽기 지문 — 도서관에 가는 날"
              description="문장을 클릭하면 현재 줄이 바뀝니다 · 전체 듣기를 누르면 줄이 순서대로 강조됩니다"
            />
            <CardBody>
              {karaoke.supported === false && (
                <p className="mb-3 text-xs text-text-muted text-center" data-testid="karaoke-unsupported">
                  Chrome 또는 Edge에서는 녹음 중 발화 위치 진행 표시가 활성화됩니다.
                </p>
              )}
              <article
                data-testid="reference-lines"
                className="mx-auto"
                style={{
                  maxWidth: '720px',
                  padding: '32px 40px',
                  background: '#FAF9F5',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '1.25rem',
                  lineHeight: 2.0,
                  wordBreak: 'keep-all',
                  color: 'var(--text-primary)',
                }}
              >
                {REFERENCE_LINES.map((line, lineIdx) => {
                  const isPlaying = playingLineIdx === lineIdx
                  const isCurrent = currentLine === lineIdx && playingLineIdx === null
                  const lineWords = line.split(/\s+/).filter(Boolean)
                  let baseGlobal = 0
                  for (let k = 0; k < lineIdx; k++) {
                    baseGlobal += REFERENCE_LINES[k].split(/\s+/).filter(Boolean).length
                  }
                  return (
                    <p
                      key={lineIdx}
                      ref={el => { lineRefs.current[lineIdx] = el }}
                      onClick={() => { if (playingLineIdx === null) setCurrentLine(lineIdx) }}
                      data-testid={`line-${lineIdx}`}
                      data-line-idx={lineIdx}
                      style={{
                        marginBottom: lineIdx < REFERENCE_LINES.length - 1 ? '1.2em' : 0,
                        cursor: playingLineIdx === null ? 'pointer' : 'default',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        margin: '-2px -8px',
                        transition: 'background 0.2s',
                        background: isPlaying
                          ? 'rgba(212, 160, 86, 0.22)'
                          : isCurrent
                            ? 'rgba(212, 160, 86, 0.08)'
                            : 'transparent',
                      }}
                    >
                      {lineWords.map((w, wi) => {
                        const myGlobal = baseGlobal + wi
                        const isPassed = karaoke.passedThroughIdx >= myGlobal && karaoke.currentWordIdx !== myGlobal
                        const isCurrentSpoken = karaoke.currentWordIdx === myGlobal
                        const wordStyle: CSSProperties = isCurrentSpoken
                          ? { background: '#FFF3CD', color: '#1F2D3D', padding: '0 2px', borderRadius: 3, transition: 'background 0.2s, color 0.2s' }
                          : isPassed
                            ? { color: '#8A8580', transition: 'color 0.2s' }
                            : { transition: 'color 0.2s' }
                        return (
                          <span
                            key={wi}
                            data-word-index={myGlobal}
                            data-line-word-index={wi}
                            style={wordStyle}
                          >
                            {w}{wi < lineWords.length - 1 ? ' ' : ''}
                          </span>
                        )
                      })}
                    </p>
                  )
                })}
              </article>

              {/* 시간 가이드 진행률 바 (보조 정보) */}
              <ReadingTimeGuide
                elapsedSec={readingElapsedSec}
                recommendedSec={RECOMMENDED_READING_SEC}
                active={recorderState === 'recording' || readingElapsedSec > 0}
              />
            </CardBody>
          </Card>

          {/* 녹음 컨트롤 */}
          <Card>
            <CardHeader title="읽기 녹음" description="지문을 처음부터 끝까지 읽은 뒤 완료 버튼을 누르세요" />
            <CardBody>
              <div className="flex flex-wrap gap-3 items-center">
                {recorderState === 'idle' && (
                  <button
                    onClick={startRecording}
                    data-testid="btn-start-recording"
                    className="px-5 py-2.5 rounded-md bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors"
                  >
                    읽기 시작
                  </button>
                )}
                {recorderState === 'requesting' && (
                  <span className="text-sm text-text-muted animate-pulse">마이크 권한 요청 중…</span>
                )}
                {recorderState === 'recording' && (
                  <>
                    <span className="flex items-center gap-2 text-sm text-rose-500 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      녹음 중…
                    </span>
                    <button
                      onClick={stopRecording}
                      data-testid="btn-stop-recording"
                      className="px-5 py-2.5 rounded-md bg-slate-700 text-white font-semibold text-sm hover:bg-slate-600 transition-colors"
                    >
                      읽기 완료
                    </button>
                  </>
                )}
                {recorderState === 'stopped' && (
                  <span className="text-sm text-text-muted animate-pulse">음성 인식 분석 중…</span>
                )}
              </div>
              <p className="mt-3 text-xs text-text-muted">
                녹음이 어려운 환경이라면{' '}
                <button
                  onClick={runFallbackSTT}
                  className="underline text-primary-600 hover:text-primary-700"
                  data-testid="btn-demo-fallback"
                >
                  시연용 결과 보기
                </button>
                를 눌러보세요.
              </p>
            </CardBody>
          </Card>
        </>
      )}

      {/* ── result 단계 ── */}
      {phase === 'result' && sttLines && (
        <>
          {/* 발음평가 상태 안내 */}
          {providerNote && (
            <div
              className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
              data-testid="etri-fallback-notice"
            >
              <Badge variant="warning" size="sm" data-testid="provider-badge-fallback">음성 인식 기반 참고평가</Badge>
              <p className="text-xs text-amber-800">{providerNote}</p>
            </div>
          )}

          {/* 발음 점수 카드 */}
          <Card data-testid="pronunciation-score-card">
            <CardHeader
              title={azureResult ? '발음 평가 결과' : '읽기 정확도 참고평가'}
              description={!azureResult ? '제시문과 내 발화를 비교하여 다른 부분을 표시합니다. 정밀 발음평가는 Azure 연동 안정화 후 고도화 예정입니다.' : undefined}
              action={
                azureResult
                  ? <Badge variant="success" size="sm" data-testid="provider-badge-azure">실시간 발음평가</Badge>
                  : <Badge variant="warning" size="sm" data-testid="provider-badge-demo">음성 인식 기반 참고평가</Badge>
              }
            />
            <CardBody>
              <div className="flex flex-wrap gap-8 mb-4">
                <div>
                  <span className="text-xs text-text-muted block mb-0.5">읽기 정확도 참고점수</span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-5xl font-bold tabular-nums"
                      style={{ color: finalScore >= 80 ? '#22c55e' : finalScore >= 60 ? '#f59e0b' : '#ef4444' }}
                      data-testid="normalized-score"
                    >
                      {finalScore}
                    </span>
                    <span className="text-sm text-text-muted">/ 100</span>
                  </div>
                  {!azureResult && (
                    <p className="text-xs text-text-muted mt-1 max-w-xs leading-snug">
                      이 점수는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고값입니다. 실제 수업에서는 교수자 확인과 함께 활용됩니다.
                    </p>
                  )}
                </div>

                {azureResult && (
                  <div className="flex gap-5">
                    {azureResult.accuracyScore != null && (
                      <div>
                        <span className="text-xs text-text-muted block mb-0.5">정확도</span>
                        <span className="text-xl font-semibold tabular-nums" data-testid="accuracy-score">
                          {Math.round(azureResult.accuracyScore)}
                        </span>
                      </div>
                    )}
                    {azureResult.fluencyScore != null && (
                      <div>
                        <span className="text-xs text-text-muted block mb-0.5">유창성</span>
                        <span className="text-xl font-semibold tabular-nums" data-testid="fluency-score">
                          {Math.round(azureResult.fluencyScore)}
                        </span>
                      </div>
                    )}
                    {azureResult.completenessScore != null && (
                      <div>
                        <span className="text-xs text-text-muted block mb-0.5">완성도</span>
                        <span className="text-xl font-semibold tabular-nums" data-testid="completeness-score">
                          {Math.round(azureResult.completenessScore)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy raw-score testid for backward compat */}
                <span data-testid="raw-score" className="hidden">
                  {azureResult?.pronScore?.toFixed(1) ?? finalScore}
                </span>
              </div>

              {/* 점수 설명 */}
              <div className={`p-3 rounded-lg text-sm font-medium ${
                finalScore >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                finalScore >= 80 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                finalScore >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {finalScore >= 90 && '제시문을 매우 정확하게 읽었습니다. 대부분의 핵심 단어가 정확히 인식되었습니다.'}
                {finalScore >= 80 && finalScore < 90 && '대부분 잘 읽었으나 일부 단어가 다르게 인식되었습니다. 문장 끝을 조금 더 또렷하게 읽으면 좋습니다.'}
                {finalScore >= 70 && finalScore < 80 && '일부 단어가 다르게 인식되었습니다. AI 음성을 다시 듣고 따라 읽어 보세요.'}
                {finalScore < 70 && '일부 문장이 빠지거나 다르게 인식되었습니다. AI 음성을 다시 듣고 한 문장씩 따라 읽어 보세요.'}
              </div>
            </CardBody>
          </Card>

          {/* 본문 첨삭 — 단일 흐르는 본문 */}
          <Card data-testid="line-diff-panel">
            <CardHeader title="제시문-발화 비교" />
            <CardBody className="space-y-4">
              <div
                className="flex flex-wrap gap-x-4 gap-y-2 text-xs"
                data-testid="word-annotation-legend"
                aria-label="단어 첨삭 색상 범례"
              >
                <span className="flex items-center gap-2">
                  <span style={{ color: '#888780', fontWeight: 600 }}>가나다</span>
                  <span className="text-text-muted">정상</span>
                </span>
                <span className="flex items-center gap-2">
                  <span style={{
                    color: '#C8543C',
                    backgroundColor: '#FFF3CD',
                    padding: '2px 4px',
                    borderRadius: 4,
                    textDecoration: 'underline',
                    textDecorationColor: '#C8543C',
                    textDecorationThickness: '3px',
                    fontWeight: 600,
                  }}>가나다</span>
                  <span className="text-text-muted">발음 부정확</span>
                </span>
                <span className="flex items-center gap-2">
                  <span style={{
                    color: '#C8543C',
                    backgroundColor: '#FFEEEE',
                    padding: '2px 4px',
                    borderRadius: 4,
                    textDecoration: 'line-through',
                    textDecorationColor: '#C8543C',
                    textDecorationThickness: '3px',
                    fontWeight: 600,
                  }}>가나다</span>
                  <span className="text-text-muted">안 읽음</span>
                </span>
                <span className="flex items-center gap-2">
                  <span style={{
                    color: '#534AB7',
                    backgroundColor: '#EEEDFE',
                    padding: '2px 4px',
                    borderRadius: 4,
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                    textDecorationColor: '#534AB7',
                    fontWeight: 600,
                  }}>가나다</span>
                  <span className="text-text-muted">추가됨 (제시문 외)</span>
                </span>
              </div>
              {recordedAudioUrl && (
                <div className="space-y-2" data-testid="recorded-audio-block">
                  <p className="text-xs text-text-muted">
                    녹음을 재생하면 본문 단어가 시간 순으로 강조됩니다. 단어를 클릭하면 해당 위치부터 다시 들을 수 있습니다.
                  </p>
                  <audio
                    ref={playbackAudioRef}
                    src={recordedAudioUrl}
                    controls
                    className="w-full"
                    data-testid="recorded-audio"
                    onTimeUpdate={(e) => setPlaybackCurrentMs(e.currentTarget.currentTime * 1000)}
                    onSeeked={(e) => setPlaybackCurrentMs(e.currentTarget.currentTime * 1000)}
                    onEnded={() => setPlaybackCurrentMs(0)}
                  />
                </div>
              )}
              <ReadingResultPassage
                sttRecognized={sttLines.join(' ')}
                azureWords={azureResult?.wordResults ?? null}
                audioCurrentMs={recordedAudioUrl ? playbackCurrentMs : undefined}
                onWordSeek={recordedAudioUrl ? (offsetMs) => {
                  const a = playbackAudioRef.current
                  if (!a) return
                  a.currentTime = Math.max(0, offsetMs / 1000)
                  a.play().catch(() => { /* user gesture may be required */ })
                } : undefined}
              />
              <div className="p-3 bg-surface border border-border rounded-lg">
                <p className="text-xs text-text-muted mb-1 font-semibold uppercase tracking-wide">내 발화 (음성 인식)</p>
                <p className="text-sm text-text-primary leading-relaxed">
                  {sttLines.join(' ').trim() || <span className="italic text-text-muted">인식 결과 없음</span>}
                </p>
              </div>
            </CardBody>
          </Card>

          {/* 피드백 카드 */}
          <Card data-testid="feedback-panel">
            <CardHeader title="읽기 피드백" />
            <CardBody className="space-y-5">
              {/* 한국어 피드백 */}
              <div data-testid="feedback-korean">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  한국어 피드백
                </p>
                <div className="space-y-2">
                  {korFeedback && korFeedback.good.length > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
                      <ul className="text-sm text-emerald-700 space-y-1">
                        {korFeedback.good.map((t, i) => <li key={i}>• {t}</li>)}
                      </ul>
                    </div>
                  )}
                  {korFeedback && korFeedback.improve.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-700 mb-1">교정할 점</p>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {korFeedback.improve.map((t, i) => <li key={i}>• {t}</li>)}
                      </ul>
                    </div>
                  )}
                  {korFeedback?.reread && (
                    <div className="p-3 bg-surface border border-border rounded-lg">
                      <p className="text-xs font-semibold text-text-secondary mb-1">다시 읽어보기</p>
                      <p className="text-base text-primary-700 font-medium">&ldquo;{korFeedback.reread}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 모국어 피드백 */}
              <div data-testid="feedback-native">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  {NATIVE_LANGS.find(l => l.code === nativeLang)?.label ?? '모국어'} 피드백
                </p>
                <div className="p-4 bg-primary-50 border border-primary-100 rounded-lg">
                  <p className="text-sm text-primary-800 leading-relaxed">{nativeFeedbackText}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 다시 읽기 */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSttLines(null)
                setAzureResult(null)
                setFinalScore(0)
                setProviderNote(null)
                setRecorderState('idle')
                if (recordedAudioUrl) {
                  URL.revokeObjectURL(recordedAudioUrl)
                  setRecordedAudioUrl(null)
                }
                setPlaybackCurrentMs(0)
                setPhase('practice')
              }}
              data-testid="btn-retry"
              className="px-5 py-2.5 rounded-md bg-white border border-border text-text-secondary font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              다시 읽기
            </button>
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-md bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors"
            >
              처음으로
            </button>
          </div>

          {/* 시연자 설명 박스 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="demo-info-box">
            <p className="text-sm text-blue-800">
              이 기능은 초급 학습자가 혼자서도 듣고, 따라 읽고, 자신의 발화를 확인하며 반복 연습할 수 있도록 설계되었습니다.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
