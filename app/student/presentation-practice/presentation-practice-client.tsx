'use client'

import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from 'react'
import { Card, CardHeader, CardBody, Badge } from '@/src/components/ui'
import { useKaraokeTracking } from '@/src/hooks/useKaraokeTracking'
import { useLanguageHelper } from '@/src/hooks/use-language-helper'
import { isRTL, L1_LABEL_KO, type FeedbackLanguage } from '@/src/lib/feedback-language'
import { logSingleTurnSession } from '@/src/lib/research/client-logger'

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

const SPEED_OPTIONS = [0.75, 0.9, 1.0, 1.1, 1.25] as const
type SpeedOption = (typeof SPEED_OPTIONS)[number]

const TIME_OPTIONS = [
  { label: '30초', sec: 30 },
  { label: '1분', sec: 60 },
  { label: '2분', sec: 120 },
  { label: '3분', sec: 180 },
  { label: '5분', sec: 300 },
]

const LEVEL_OPTIONS = ['초급', '중급', '고급'] as const

// ── 기본 예문 ("지난 주말에 한 일") ─────────────────────────────────────────
const DEFAULT_TOPIC = '지난 주말에 한 일'
const DEFAULT_SCRIPT =
  '지난 주말에 저는 친구를 만났습니다. 우리는 카페에 갔습니다. 저는 아이스 아메리카노를 마셨습니다. 그리고 공원에서 산책했습니다. 날씨가 좋아서 기분이 좋았습니다. 저녁에는 집에서 가족과 함께 영화를 봤습니다.'

const DEFAULT_CORRECTED =
  '지난 주말에 저는 친구를 만났습니다. 우리는 카페에 가서 아이스 아메리카노를 마셨습니다. 그 후 공원에서 산책했습니다. 날씨가 좋아서 기분이 매우 좋았습니다. 저녁에는 집으로 돌아와 가족과 함께 영화를 보며 즐거운 시간을 보냈습니다.'
const FALLBACK_TRANSCRIPT =
  '지난 주말에 저는 친구를 만났습니다. 우리는 카페에 가서 아이스 아메리카노를 마셨습니다. 그 후 공원에서 산책했습니다. 날씨가 좋아서 기분이 매우 좋았습니다. 저녁에는 집으로 돌아와 가족과 함께 영화를 보며 즐거운 시간을 보냈습니다.'

// ── 교정 포인트 ─────────────────────────────────────────────────────────────
interface CorrectionPoint {
  original: string
  corrected: string
  koExplain: string
}

const DEMO_CORRECTIONS: CorrectionPoint[] = [
  {
    original: '"카페에 갔습니다. 저는 아이스 아메리카노를 마셨습니다."',
    corrected: '"카페에 가서 아이스 아메리카노를 마셨습니다."',
    koExplain:
      '"-아서/어서"를 사용해 두 문장을 연결하면 더 자연스럽습니다. "카페에 가서 아이스 아메리카노를 마셨습니다."처럼 이어 쓰면 발표가 부드러워집니다.',
  },
  {
    original: '"그리고"',
    corrected: '"그 후"',
    koExplain: '"그리고"를 반복하기보다 "그 후"를 사용하면 발표 흐름이 더 부드럽습니다.',
  },
  {
    original: '"기분이 좋았습니다"',
    corrected: '"기분이 매우 좋았습니다"',
    koExplain:
      '"기분이 좋았습니다" 앞에 "매우"를 넣으면 느낌을 조금 더 분명하게 표현할 수 있습니다.',
  },
  {
    original: '(전체 원고)',
    corrected: '(적절한 수준)',
    koExplain: '전체적으로 초급 학습자가 말하기에 적절한 길이와 표현입니다.',
  },
]

// ── 모국어 교정 설명 ─────────────────────────────────────────────────────────
// helperLang(ar/en/vi) 기준. 페이지 상단 LanguageHelperToggle이 단일 소스.
const NATIVE_CORRECTION_NOTE: Record<FeedbackLanguage, string> = {
  vi:
    '• "카페에 갔습니다" và "아이스 아메리카노를 마셨습니다" được nối bằng "-아서/어서", nên câu tự nhiên hơn.\n• Thay vì lặp lại "그리고", dùng "그 후" sẽ giúp bài nói mạch lạc hơn.\n• Thêm "매우" giúp diễn đạt cảm xúc rõ hơn.\n• Bài nói này phù hợp với trình độ sơ cấp và có thể dùng để luyện nói.',
  en:
    '• Connect "카페에 갔습니다" and "아이스 아메리카노를 마셨습니다" with "-아서/어서" for a more natural flow.\n• Use "그 후" instead of repeating "그리고" to smooth the presentation.\n• Adding "매우" makes the feeling more expressive.\n• Overall, this is appropriate for a beginner-level presentation.',
  ar:
    '• ربط "카페에 갔습니다" و"아이스 아메리카노를 마셨습니다" باستخدام "-아서/어서" يجعل الجملة أكثر طبيعية\n• استخدم "그 후" بدلاً من تكرار "그리고" لتحسين تدفق العرض\n• إضافة "매우" تجعل التعبير عن المشاعر أوضح',
}

// ── 모국어 피드백 ─────────────────────────────────────────────────────────────
interface NativeFeedback {
  good: string[]
  improve: string[]
}

const NATIVE_FEEDBACK: Record<FeedbackLanguage, NativeFeedback> = {
  vi: {
    good: [
      'Chủ đề bài nói rõ ràng.',
      'Bạn đã trình bày các việc đã làm cuối tuần theo thứ tự thời gian.',
      'Nội dung bạn nói gần giống với bản đã chỉnh sửa.',
    ],
    improve: ['Lần sau, hãy đọc câu cuối rõ hơn một chút.'],
  },
  en: {
    good: [
      'The topic of the presentation is clear.',
      'You described your weekend activities in chronological order.',
      'Your speech closely matched the corrected version.',
    ],
    improve: ['Next time, try to pronounce the last sentence a bit more clearly.'],
  },
  ar: {
    good: [
      'موضوع العرض واضح.',
      'لقد عرضت أنشطة عطلة نهاية الأسبوع بترتيب زمني.',
      'كان كلامك مطابقًا تقريبًا للنص المُصحَّح.',
    ],
    improve: ['في المرة القادمة، حاول نطق الجملة الأخيرة بوضوح أكبر.'],
  },
}

function getNativeFeedback(code: FeedbackLanguage): NativeFeedback {
  return NATIVE_FEEDBACK[code] ?? NATIVE_FEEDBACK['en']
}

// ── 비교 결과 (demo) ─────────────────────────────────────────────────────────
const DEMO_COMPARISON = {
  included: [
    '친구를 만난 내용',
    '카페에 간 내용',
    '아이스 아메리카노를 마신 내용',
    '공원에서 산책한 내용',
    '날씨와 기분 표현',
  ],
  missing: [] as string[],
  different: [] as string[],
  practice: '우리는 카페에 가서 아이스 아메리카노를 마셨습니다.',
}

// ── 타이머 유틸 ──────────────────────────────────────────────────────────────
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function getTimerFeedback(elapsed: number, target: number): string {
  const ratio = elapsed / target
  if (ratio < 0.7)
    return `목표 시간 ${formatTime(target)} 중 ${formatTime(elapsed)} 발표했습니다. 예시를 한 문장 더 추가하면 좋습니다.`
  if (ratio <= 0.9)
    return `목표 시간 ${formatTime(target)} 중 ${formatTime(elapsed)} 발표했습니다. 발표 시간이 적절합니다.`
  if (ratio <= 1.1)
    return `목표 시간 ${formatTime(target)}에 딱 맞게 발표했습니다. 매우 좋습니다.`
  return `목표 시간 ${formatTime(target)}을 초과했습니다 (${formatTime(elapsed)} 발표). 두 번째 문단을 조금 줄여 보세요.`
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'done'

// Mirrors PresentationScriptDisplay's azureMap reclassification: returns true
// when the trailing run of unrecognized ref words is long enough to attribute
// to STT cut-off rather than a deliberate omission by the speaker.
function hasTrailingNotRecognizedPresentation(
  azureWords: AzureWordResult[] | null,
  refWords: string[],
): boolean {
  if (!azureWords || azureWords.length === 0) return false
  const strip = (w: string) => w.replace(/[.,!?。、·]/g, '').trim()
  let ai = 0
  let lastRecognized = -1
  for (let i = 0; i < refWords.length; i++) {
    if (ai < azureWords.length && strip(azureWords[ai].word) === strip(refWords[i])) {
      ai++
      lastRecognized = i
    }
  }
  return refWords.length - 1 - lastRecognized >= 2
}

// ── 23-a 인라인 차이점 보기 ──────────────────────────────────────────────────
// LLM이 반환한 corrections 배열을 학습자 원본 텍스트 위에 splice하여
// 취소선(원본) + 주황 강조(교정)을 인라인으로 표시한다.
// 매칭에 실패한 항목은 건너뛰고, 모든 항목이 실패하면 안내 메시지를 보인다.
function stripQuotes(s: string): string {
  return s.replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '').trim()
}

function CorrectionInlineView({
  originalScript,
  corrections,
}: {
  originalScript: string
  corrections: Array<{ original: string; corrected: string; reason: string }>
}) {
  type Segment =
    | { kind: 'plain'; text: string }
    | { kind: 'diff'; original: string; corrected: string; reason: string; idx: number }

  const segments: Segment[] = []
  let cursor = 0
  let diffIndex = 0
  for (const c of corrections) {
    const cleanOrig = stripQuotes(c.original)
    const cleanCorr = stripQuotes(c.corrected)
    if (!cleanOrig || cleanOrig.length < 2) continue
    const idx = originalScript.indexOf(cleanOrig, cursor)
    if (idx === -1) continue
    if (idx > cursor) {
      segments.push({ kind: 'plain', text: originalScript.slice(cursor, idx) })
    }
    segments.push({
      kind: 'diff',
      original: cleanOrig,
      corrected: cleanCorr,
      reason: c.reason,
      idx: diffIndex++,
    })
    cursor = idx + cleanOrig.length
  }
  if (cursor < originalScript.length) {
    segments.push({ kind: 'plain', text: originalScript.slice(cursor) })
  }

  const matchedAny = segments.some(s => s.kind === 'diff')

  return (
    <div data-testid="correction-inline-view" className="space-y-2">
      <div className="p-3 bg-surface border border-border rounded-lg text-sm leading-relaxed">
        {matchedAny ? (
          segments.map((s, i) =>
            s.kind === 'plain' ? (
              <span key={i}>{s.text}</span>
            ) : (
              <span
                key={i}
                title={s.reason}
                data-testid={`inline-diff-${s.idx}`}
                className="inline-flex items-baseline gap-1 mx-0.5"
              >
                <span className="line-through" style={{ color: '#888780' }}>
                  {s.original}
                </span>
                <span className="font-semibold" style={{ color: '#C8543C' }}>
                  {s.corrected}
                </span>
              </span>
            ),
          )
        ) : (
          <p className="text-xs text-text-muted">
            인라인 매칭 가능한 차이점이 없습니다. 분리 보기 탭에서 차이점을 확인해보세요.
          </p>
        )}
      </div>
      <p className="text-[11px] text-text-muted">
        취소선 = 원본, 주황색 = 교정. 호버하면 교정 이유가 보입니다.
      </p>
    </div>
  )
}

// ── 발표 스크립트 표시 (카라오케 + Azure 동기화 통합) ─────────────────────────
function PresentationScriptDisplay({
  words,
  karaokeCurrentIdx,
  karaokePassedIdx,
  karaokeActive,
  karaokeSupported,
  azureWords,
  audioCurrentMs,
  onWordSeek,
}: {
  words: string[]
  karaokeCurrentIdx: number | null
  karaokePassedIdx: number
  karaokeActive: boolean
  karaokeSupported: boolean | null
  azureWords: AzureWordResult[] | null
  audioCurrentMs?: number
  onWordSeek?: (offsetMs: number) => void
}) {
  // Map Azure word results to reference words by sequential alignment.
  // 'NotRecognized' is a UX-layer state for the trailing block STT cut off.
  type PresErrorType = AzureWordResult['errorType'] | 'NotRecognized'
  type AzureMap = {
    errorType?: PresErrorType
    accuracyScore?: number
    offsetMs?: number
    durationMs?: number
  }
  const azureMap: AzureMap[] = useMemo(() => {
    if (!azureWords || azureWords.length === 0) return words.map(() => ({}))
    const strip = (w: string) => w.replace(/[.,!?。、·]/g, '').trim()
    let ai = 0
    const map: AzureMap[] = words.map(w => {
      if (ai < azureWords.length && strip(azureWords[ai].word) === strip(w)) {
        const a = azureWords[ai]
        ai++
        return {
          errorType: a.errorType,
          accuracyScore: a.accuracyScore,
          offsetMs: a.offsetMs,
          durationMs: a.durationMs,
        }
      }
      return { errorType: 'Omission' as const }
    })
    // Reclassify trailing run of unrecognized words (≥ 2) as NotRecognized so
    // the user sees a softer "STT cut off" cue instead of harsh omission red.
    let lastRecognized = -1
    for (let i = map.length - 1; i >= 0; i--) {
      const m = map[i]
      if ((m.errorType && m.errorType !== 'Omission') || typeof m.accuracyScore === 'number') {
        lastRecognized = i
        break
      }
    }
    if (map.length - 1 - lastRecognized >= 2) {
      for (let i = lastRecognized + 1; i < map.length; i++) {
        map[i] = { ...map[i], errorType: 'NotRecognized' }
      }
    }
    return map
  }, [azureWords, words])

  // Currently playing word index from audio currentTime.
  let currentPlaybackIdx: number | null = null
  if (typeof audioCurrentMs === 'number') {
    for (let i = 0; i < azureMap.length; i++) {
      const a = azureMap[i]
      if (a.offsetMs == null) continue
      const end = a.offsetMs + (a.durationMs ?? 0) + 50
      if (audioCurrentMs >= a.offsetMs && audioCurrentMs <= end) {
        currentPlaybackIdx = i
        break
      }
    }
  }

  return (
    <div className="space-y-2">
      {karaokeActive && karaokeSupported === false && (
        <p className="text-[11px] text-text-muted italic" data-testid="karaoke-unsupported-note">
          ※ 현재 브라우저는 실시간 카라오케가 지원되지 않습니다. 녹음 후 단어 동기화 결과는 정상 표시됩니다.
        </p>
      )}
      <div
        data-testid="presentation-script"
        className="mx-auto"
        style={{
          maxWidth: '720px',
          padding: '24px 40px',
          backgroundColor: '#FAF9F5',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          fontSize: '1.25rem',
          lineHeight: 2.0,
          wordBreak: 'keep-all',
          color: 'var(--text-primary)',
        }}
      >
        {words.map((w, i) => {
          const isPassed = karaokeActive && i <= karaokePassedIdx
          const isKaraokeCurrent = karaokeActive && karaokeCurrentIdx === i
          const isPlaybackCurrent = currentPlaybackIdx === i
          const a = azureMap[i] ?? {}
          const seekable = a.offsetMs != null && onWordSeek != null

          let baseStyle: CSSProperties = { color: '#888780' }
          if (azureWords && azureWords.length > 0) {
            if (a.errorType === 'NotRecognized') {
              baseStyle = {
                color: '#888780',
                backgroundColor: '#F5F5F5',
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textDecorationColor: '#888780',
                textDecorationThickness: '2px',
              }
            } else if (a.errorType === 'Omission') {
              baseStyle = {
                color: '#C8543C',
                backgroundColor: '#FFEEEE',
                textDecoration: 'line-through',
                textDecorationColor: '#C8543C',
                textDecorationThickness: '3px',
                fontWeight: 600,
              }
            } else if (a.errorType === 'Mispronunciation' || (typeof a.accuracyScore === 'number' && a.accuracyScore < 80)) {
              baseStyle = {
                color: '#C8543C',
                backgroundColor: '#FFF3CD',
                textDecoration: 'underline',
                textDecorationColor: '#C8543C',
                textDecorationThickness: '3px',
                fontWeight: 600,
              }
            }
          } else if (isKaraokeCurrent) {
            baseStyle = { color: '#1F2D3D', fontWeight: 600, backgroundColor: '#FFF3CD' }
          } else if (isPassed) {
            baseStyle = { color: 'var(--text-primary)' }
          }

          if (isPlaybackCurrent) {
            baseStyle = { ...baseStyle, backgroundColor: '#FDE68A', color: '#1F2D3D' }
          }

          const tooltip = a.errorType === 'NotRecognized'
            ? '음성 인식이 끝까지 닿지 않았습니다'
            : a.errorType === 'Omission'
              ? '이 단어를 안 읽었습니다'
              : a.errorType === 'Mispronunciation'
                ? (typeof a.accuracyScore === 'number' ? `발음 점수 ${Math.round(a.accuracyScore)}/100` : '발음이 정확하지 않습니다')
                : (typeof a.accuracyScore === 'number' && a.accuracyScore < 80 ? `발음 점수 ${Math.round(a.accuracyScore)}/100` : undefined)
          const title = seekable ? (tooltip ? `${tooltip} · 클릭하면 이 단어부터 다시 듣기` : '이 단어부터 다시 듣기') : tooltip

          return (
            <span
              key={i}
              data-word-index={i}
              style={{
                ...baseStyle,
                padding: '2px 4px',
                borderRadius: 4,
                cursor: seekable ? 'pointer' : 'default',
                transition: 'background-color 0.2s, color 0.2s',
              }}
              onClick={() => seekable && onWordSeek?.(a.offsetMs!)}
              title={title}
            >
              {w}{i < words.length - 1 ? ' ' : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function PresentationTimeGuide({ elapsedSec, targetSec }: { elapsedSec: number; targetSec: number }) {
  const ratio = targetSec > 0 ? elapsedSec / targetSec : 0
  const widthPct = Math.min(100, Math.round(ratio * 100))
  const color = ratio <= 0.8 ? '#C49B4B' : ratio <= 1.0 ? '#D97706' : '#DC2626'
  const overShoot = ratio > 1.0
  return (
    <div className="mx-auto mt-2" style={{ maxWidth: '720px' }} data-testid="presentation-time-guide">
      <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
        <span>목표 시간 {formatTime(targetSec)} / 경과 {formatTime(elapsedSec)}</span>
        {overShoot && (
          <span style={{ color: '#DC2626', fontWeight: 500 }}>목표 시간 초과</span>
        )}
      </div>
      <div style={{ height: 4, backgroundColor: 'var(--border)', borderRadius: 2 }}>
        <div
          style={{
            width: `${widthPct}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 2,
            transition: 'width 0.5s ease-out, background-color 0.2s',
          }}
        />
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
// v1.1 단계 19.7 [아키텍처]: motherTongue prop을 RSC에서 받아 보조 언어 단독 결정.
export function PresentationPracticeClient({ motherTongue }: { motherTongue?: string | null } = {}) {
  const { lang: helperLangRaw } = useLanguageHelper(motherTongue)
  const helperLang = helperLangRaw ?? 'en'
  const showSupplement = helperLangRaw !== null
  const [level, setLevel] = useState<(typeof LEVEL_OPTIONS)[number]>('초급')
  const [topic, setTopic] = useState(DEFAULT_TOPIC)
  const [script, setScript] = useState(DEFAULT_SCRIPT)
  const [speed, setSpeed] = useState<SpeedOption>(1.0)
  const [showCorrection, setShowCorrection] = useState(false)
  // 23: AI 교정 결과 (LLM 또는 mock fallback)
  type CorrectionItem = { original: string; corrected: string; reason: string }
  type CorrectionResult = {
    source: 'llm' | 'mock'
    corrected_text: string
    corrections: CorrectionItem[]
  }
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult | null>(null)
  const [correctionLoading, setCorrectionLoading] = useState(false)
  const [correctionError, setCorrectionError] = useState<string | null>(null)
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  // 23-a: 교정 톤 선택 (formal/general/casual)
  type CorrectionTone = 'formal' | 'general' | 'casual'
  const [correctionTone, setCorrectionTone] = useState<CorrectionTone>('formal')
  // 23-a: 차이점 보기 모드 (separate/inline)
  const [correctionViewMode, setCorrectionViewMode] = useState<'separate' | 'inline'>('separate')
  const [targetSec, setTargetSec] = useState(60)
  // LLM 발표 평가. 한국어 + 선택 언어 1개만 출력 (helperLang으로 결정).
  type LangFeedback = { strengths: string[]; next_steps: string[] }
  type EvaluateResult = {
    source: 'llm' | 'mock'
    feedback_ko: LangFeedback
    feedback_l1: LangFeedback
  }
  const [evaluateResult, setEvaluateResult] = useState<EvaluateResult | null>(null)
  // 보조 언어 토글 재호출 진행 중 표시 + 실패 알림 — 응답 대기 동안 이전 언어
  // 텍스트가 그대로 노출되어 "토글했는데 안 바뀐다"는 인상을 주는 문제를 막는다.
  const [evaluateLoading, setEvaluateLoading] = useState(false)
  const [evaluateReloadError, setEvaluateReloadError] = useState<string | null>(null)
  const evaluateAbortRef = useRef<AbortController | null>(null)
  const feedbackSource: 'llm' | 'mock' = evaluateResult?.source ?? 'mock'
  const [customSec, setCustomSec] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  // TTS
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [ttsNotice, setTtsNotice] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seqRef = useRef(0)
  const speedRef = useRef<SpeedOption>(1.0)

  // Recording + STT (single source of truth for timer alerts and feedback)
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [recordingElapsedAtStop, setRecordingElapsedAtStop] = useState(0)
  const [alert30, setAlert30] = useState(false)
  const [alert10, setAlert10] = useState(false)
  const [targetReached, setTargetReached] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Word-synced playback (Azure)
  const [azureResult, setAzureResult] = useState<AzureResult | null>(null)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const [playbackCurrentMs, setPlaybackCurrentMs] = useState(0)
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null)

  // Reference text used as both karaoke target and Azure pronunciation reference
  // 교정 결과가 있으면 그 corrected_text를, 없으면 demo, 그것도 없으면 학습자 입력 사용
  const correctionDisplayText = correctionResult?.corrected_text ?? DEFAULT_CORRECTED
  const referenceText = (showCorrection ? correctionDisplayText : (script || DEFAULT_SCRIPT)).trim()
  const referenceWords = useMemo(
    () => referenceText.split(/\s+/).filter(Boolean),
    [referenceText],
  )

  // Karaoke real-time tracking (only while recording)
  const karaoke = useKaraokeTracking(referenceWords, recordingState === 'recording')

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const effectiveTarget = useCustom ? parseInt(customSec, 10) || 60 : targetSec

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    seqRef.current++
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    window.speechSynthesis?.cancel()
    setTtsStatus('idle')
  }, [])

  const playTTS = useCallback(
    async (text: string, playSpeed?: number) => {
      stopAudio()
      const seq = ++seqRef.current
      setTtsStatus('loading')
      setTtsNotice('')
      const rate = playSpeed ?? speedRef.current
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (seq !== seqRef.current) return
        const data = await res.json()
        if (seq !== seqRef.current) return

        if (data.audioBase64) {
          const audio = new Audio(
            `data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}`,
          )
          audio.playbackRate = rate
          audioRef.current = audio
          audio.onended = () => {
            if (seq === seqRef.current) setTtsStatus('idle')
          }
          audio.onerror = () => {
            if (seq === seqRef.current) setTtsStatus('idle')
          }
          setTtsStatus('playing')
          await audio.play()
          return
        }

        if (window.speechSynthesis) {
          const utter = new SpeechSynthesisUtterance(data.fallbackText ?? text)
          utter.lang = 'ko-KR'
          utter.rate = (data.fallbackRate ?? 0.9) * rate
          utter.onend = () => {
            if (seq === seqRef.current) setTtsStatus('idle')
          }
          utter.onerror = () => {
            if (seq === seqRef.current) setTtsStatus('idle')
          }
          setTtsStatus('playing')
          window.speechSynthesis.speak(utter)
          return
        }

        if (seq === seqRef.current) {
          setTtsStatus('idle')
          setTtsNotice('현재 음성 재생을 준비 중입니다. 교정문을 보며 직접 읽어 보세요.')
        }
      } catch {
        if (seq === seqRef.current) {
          setTtsStatus('idle')
          setTtsNotice('현재 음성 재생을 준비 중입니다. 교정문을 보며 직접 읽어 보세요.')
        }
      }
    },
    [stopAudio],
  )

  // ── Recording + STT ──────────────────────────────────────────────────────────
  async function runSTT(audioBlob: Blob) {
    try {
      const form = new FormData()
      form.append('audio', audioBlob, 'recording.webm')
      form.append('questionId', 'presentation-practice')
      const res = await fetch('/api/stt', { method: 'POST', body: form })
      const data = await res.json()
      setTranscript(data.transcript || FALLBACK_TRANSCRIPT)
    } catch {
      setTranscript(FALLBACK_TRANSCRIPT)
    }
  }

  async function runAzurePronunciation(audioBlob: Blob, refText: string) {
    try {
      const fd = new FormData()
      fd.append('audio', audioBlob, 'recording.webm')
      fd.append('referenceText', refText)
      const res = await fetch('/api/pronunciation-azure', { method: 'POST', body: fd })
      const data = (await res.json()) as AzureResult
      if (!data.fallbackReason) setAzureResult(data)
      else setAzureResult(null)
    } catch {
      setAzureResult(null)
    }
  }

  // 명세 23-c Phase 2: STT 결과(또는 fallback transcript)가 도착하면 LLM 평가 호출.
  // recordingState === 'done' && transcript !== null 일 때 한 번 호출하고,
  // 호출 실패 시 mock 폴백을 받아 화면을 채운다. helperLang 토글 시에는 AbortController로
  // 진행 중 요청을 무효화한 뒤 새 언어로 재요청하고, 응답 대기 동안 보조 언어 영역을 dim 처리한다.
  const evaluateRequestedRef = useRef<string | null>(null)
  useEffect(() => {
    if (recordingState !== 'done') {
      evaluateRequestedRef.current = null
      return
    }
    if (transcript === null) return
    const sig = `${helperLang}:${transcript.length}:${(script || '').length}`
    if (evaluateRequestedRef.current === sig) return
    const isRefresh = evaluateRequestedRef.current !== null
    evaluateRequestedRef.current = sig

    const controller = new AbortController()
    evaluateAbortRef.current = controller
    // setState 동기 호출은 react-hooks/set-state-in-effect 룰 위반 → 마이크로태스크로 미룬다.
    queueMicrotask(() => {
      setEvaluateLoading(true)
      setEvaluateReloadError(null)
    })

    const correctedScript = correctionResult?.corrected_text ?? DEFAULT_CORRECTED
    const originalScript = (script || DEFAULT_SCRIPT).trim()
    ;(async () => {
      try {
        const res = await fetch('/api/presentation/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.trim(),
            originalScript,
            correctedScript,
            transcript,
            helperLang,
          }),
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (!res.ok) throw new Error(`status_${res.status}`)
        const data = (await res.json()) as EvaluateResult
        if (!data || !data.feedback_ko || !data.feedback_l1) {
          throw new Error('invalid_shape')
        }
        if (controller.signal.aborted) return
        setEvaluateResult(data)
        // v1.1 단계 10-5: 발표 모드 시험운영 로깅 — 단일 턴(발화 전체) + 평가 (fail-silent).
        // isRefresh=true(helperLang 토글 재호출)는 로깅하지 않음 — 첫 평가만 기록.
        if (!isRefresh) {
          void logSingleTurnSession({
            mode: 'presentation',
            metaJson: { topic: topic.trim(), helperLang },
            learnerText: transcript,
            scoresDetail: {
              feedback_ko: data.feedback_ko,
              feedback_l1: data.feedback_l1,
              originalScript,
              correctedScript,
              helperLang,
            },
          })
        }
      } catch (err) {
        if (controller.signal.aborted) return
        if ((err as { name?: string })?.name === 'AbortError') return
        console.error('[presentation/evaluate] error, keeping local fallback', err)
        if (isRefresh) {
          // 보조 언어 토글 재호출 실패 — 기존 evaluateResult는 그대로 두고 인라인 알림.
          setEvaluateReloadError('보조 언어 새로고침에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } else {
          // 최초 평가 실패 — 한국어 + 보조 언어 1개 폴백.
          const native = getNativeFeedback(helperLang)
          setEvaluateResult({
            source: 'mock',
            feedback_ko: {
              strengths: [
                '발표 주제가 분명합니다.',
                '내용을 시간 순서대로 말했습니다.',
                '교정문과 실제 발화가 대부분 일치합니다.',
              ],
              next_steps: ['다음에는 마지막 문장을 조금 더 또렷하게 말해 보세요.'],
            },
            feedback_l1: { strengths: native.good, next_steps: native.improve },
          })
        }
      } finally {
        if (evaluateAbortRef.current === controller) {
          evaluateAbortRef.current = null
          setEvaluateLoading(false)
        }
      }
    })()
    return () => {
      controller.abort()
    }
  // 의존성: transcript, recordingState, helperLang. helperLang이 바뀌면 새 언어로 재평가.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingState, transcript, helperLang])

  function startTickingTimer() {
    recordingIntervalRef.current = setInterval(() => {
      setRecordingElapsed(prev => {
        const next = prev + 1
        const remaining = effectiveTarget - next
        if (remaining === 30) setAlert30(true)
        if (remaining === 10) setAlert10(true)
        if (next >= effectiveTarget) setTargetReached(true)
        return next
      })
    }, 1000)
  }

  async function startRecording() {
    setRecordingElapsed(0)
    setRecordingElapsedAtStop(0)
    setAlert30(false)
    setAlert10(false)
    setTargetReached(false)
    setTranscript(null)
    setAzureResult(null)
    setEvaluateResult(null)
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl)
      setRecordedAudioUrl(null)
    }
    setPlaybackCurrentMs(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setRecordedAudioUrl(URL.createObjectURL(audioBlob))
        setRecordingState('processing')
        await Promise.all([
          runSTT(audioBlob),
          runAzurePronunciation(audioBlob, referenceText),
        ])
        setRecordingState('done')
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecordingState('recording')
      startTickingTimer()
    } catch {
      // Mic unavailable (headless/denied) → show fallback transcript and run a
      // brief timer tick so the timer-feedback area still has a value.
      setRecordingState('recording')
      startTickingTimer()
      setTimeout(() => {
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
        setRecordingElapsedAtStop(prev => prev || 1)
        setTranscript(FALLBACK_TRANSCRIPT)
        setRecordingState('done')
      }, 100)
    }
  }

  function stopRecording() {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    setRecordingElapsedAtStop(recordingElapsed)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    } else {
      setTranscript(FALLBACK_TRANSCRIPT)
      setRecordingState('done')
    }
  }

  function resetRecording() {
    setRecordingState('idle')
    setTranscript(null)
    setRecordingElapsed(0)
    setRecordingElapsedAtStop(0)
    setAlert30(false)
    setAlert10(false)
    setTargetReached(false)
    setAzureResult(null)
    setEvaluateResult(null)
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl)
      setRecordedAudioUrl(null)
    }
    setPlaybackCurrentMs(0)
    audioChunksRef.current = []
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
  }

  const nativeCorrectionNote = NATIVE_CORRECTION_NOTE[helperLang] ?? NATIVE_CORRECTION_NOTE['en']

  const recordingDone = recordingState === 'done'
  const showTimerFeedback = recordingDone && recordingElapsedAtStop > 0
  const elapsedForFeedback = recordingDone ? recordingElapsedAtStop : recordingElapsed

  return (
    <div className="max-w-3xl mx-auto pb-12">

      {/* Sticky 녹음 컨트롤 — 페이지 최상단 */}
      <div
        data-testid="recording-controls"
        className="sticky top-0 z-20 -mx-4 px-4 py-3 mb-6"
        style={{
          backgroundColor: 'var(--color-background-primary, #FAF9F5)',
          borderBottom: '0.5px solid var(--border)',
          backdropFilter: 'saturate(180%) blur(6px)',
        }}
      >
        <div
          data-testid="timer-card"
          className="flex flex-wrap items-center gap-4"
        >
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold tabular-nums font-mono text-text-primary"
              data-testid="timer-display"
            >
              {formatTime(elapsedForFeedback)}
            </span>
            <span className="text-xs text-text-muted">
              / {formatTime(effectiveTarget)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {recordingState === 'idle' && (
              <button
                onClick={startRecording}
                data-testid="btn-start-recording"
                className="px-5 py-2.5 rounded-md bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors"
              >
                발표 녹음 시작
              </button>
            )}
            {recordingState === 'recording' && (
              <>
                <span className="flex items-center gap-2 text-xs font-medium text-rose-600">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  녹음 중
                </span>
                <button
                  onClick={stopRecording}
                  data-testid="btn-stop-recording"
                  className="px-5 py-2.5 rounded-md bg-slate-700 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
                >
                  발표 종료
                </button>
              </>
            )}
            {recordingState === 'processing' && (
              <span className="text-sm text-text-secondary">음성 인식 중…</span>
            )}
            {recordingDone && (
              <button
                onClick={resetRecording}
                data-testid="btn-retry-recording"
                className="px-4 py-2 rounded-md bg-surface border border-border text-text-secondary text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                다시 녹음
              </button>
            )}
          </div>
        </div>

        {/* 알림 — 녹음 중 목표 시간 임박 */}
        {recordingState === 'recording' && targetReached && (
          <div
            className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-300"
            data-testid="alert-time-over"
          >
            <span className="text-red-700 font-semibold text-xs">목표 시간 도달</span>
          </div>
        )}
        {recordingState === 'recording' && !targetReached && alert10 && (
          <div
            className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-300"
            data-testid="alert-10sec"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-700 font-semibold text-xs">10초 전</span>
          </div>
        )}
        {recordingState === 'recording' && !targetReached && !alert10 && alert30 && (
          <div
            className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300"
            data-testid="alert-30sec"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-amber-700 font-semibold text-xs">30초 전</span>
          </div>
        )}
      </div>

      <div className="space-y-6">

      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-bold text-text-primary">발표연습</h1>
        </div>
        <p className="text-sm text-text-secondary">
          발표 원고를 입력하면 AI가 자연스러운 한국어로 다듬고, 수정 이유를 한국어와 학습자
          모국어로 설명합니다. 이후 교정문을 들으며 섀도잉 연습을 하고, 직접 발표한 내용을
          음성 인식으로 확인할 수 있습니다.
        </p>
      </div>

      {/* 연습 흐름 */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1" data-testid="practice-flow">
        {[
          { step: '1', label: '설정', sub: '주제·언어·수준' },
          { step: '2', label: '원고 교정', sub: 'AI가 다듬어 줘요' },
          { step: '3', label: '설명', sub: '한국어+모국어' },
          { step: '4', label: '섀도잉', sub: 'AI 음성 듣기' },
          { step: '5', label: '타이머 발표', sub: '시간 맞춰 읽기' },
          { step: '6', label: '발표 녹음', sub: 'STT 비교 피드백' },
        ].map((s, i) => (
          <div key={s.step} className="flex items-center shrink-0">
            <div
              className="flex flex-col items-center px-3 py-2 text-center"
              data-testid={`practice-step-${s.step}`}
            >
              <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                {s.step}
              </span>
              <span className="text-xs font-semibold text-text-primary whitespace-nowrap">
                {s.label}
              </span>
              <span className="text-[10px] text-text-muted whitespace-nowrap">{s.sub}</span>
            </div>
            {i < 5 && <span className="text-slate-300 text-sm mx-0.5">›</span>}
          </div>
        ))}
      </div>

      {/* 발표 설정 */}
      <Card>
        <CardHeader title="발표 설정" />
        <CardBody className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              발표 주제
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="예: 지난 주말에 한 일"
              className="w-full rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
              data-testid="topic-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              발표 수준
            </label>
            <div className="flex gap-2" data-testid="level-options">
              {LEVEL_OPTIONS.map(lv => (
                <button
                  key={lv}
                  onClick={() => setLevel(lv)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    level === lv
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-surface text-text-secondary border-border hover:border-primary-400'
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              목표 발표 시간
            </label>
            <div className="flex flex-wrap gap-2" data-testid="time-options">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t.sec}
                  onClick={() => {
                    setTargetSec(t.sec)
                    setUseCustom(false)
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    !useCustom && targetSec === t.sec
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-surface text-text-secondary border-border hover:border-primary-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  useCustom
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-surface text-text-secondary border-border hover:border-primary-400'
                }`}
              >
                직접 입력
              </button>
            </div>
            {useCustom && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={customSec}
                  onChange={e => setCustomSec(e.target.value)}
                  placeholder="초 단위 입력 (예: 90)"
                  className="w-40 rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  data-testid="custom-time-input"
                />
                <span className="text-xs text-text-muted">초</span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 원고 입력 */}
      <Card>
        <CardHeader title="발표 원고" description="발표할 내용을 한국어로 입력하세요" />
        <CardBody className="space-y-3">
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            data-testid="script-input"
          />
          <div className="flex flex-wrap items-end gap-3" data-testid="correction-tone-row">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              <span className="font-medium">교정 톤</span>
              <select
                value={correctionTone}
                onChange={e => setCorrectionTone(e.target.value as CorrectionTone)}
                className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                data-testid="correction-tone-select"
                disabled={correctionLoading}
              >
                <option value="formal">격식체 (-습니다, -입니다)</option>
                <option value="general">일반체 (-요, -아·어요)</option>
                <option value="casual">친근체 (반말)</option>
              </select>
            </label>
            {correctionTone === 'casual' && (
              <p className="text-xs text-amber-700 max-w-xs" data-testid="correction-tone-hint">
                친근체는 친구·가족 사이 톤입니다. 공식 발표엔 격식체를 권장합니다.
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => {
                setScript(DEFAULT_SCRIPT)
                setTopic(DEFAULT_TOPIC)
              }}
              className="px-3 py-1.5 rounded-md bg-surface border border-border text-text-secondary text-xs font-medium hover:bg-slate-50 transition-colors"
              data-testid="btn-load-sample"
            >
              샘플 원고 불러오기
            </button>
            <button
              onClick={async () => {
                const trimmed = (script || '').trim()
                if (trimmed.length < 5) {
                  setCorrectionError('원고를 먼저 작성해주세요 (5자 이상).')
                  return
                }
                if (trimmed.length > 5000) {
                  setCorrectionError('원고가 너무 깁니다. 5000자 이내로 작성해주세요.')
                  return
                }
                setCorrectionError(null)
                setCorrectionLoading(true)
                try {
                  const res = await fetch('/api/presentation/correct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ script: trimmed, tone: correctionTone }),
                  })
                  if (!res.ok) {
                    throw new Error(`status_${res.status}`)
                  }
                  const data = await res.json()
                  if (typeof data?.corrected_text !== 'string' || !Array.isArray(data?.corrections)) {
                    throw new Error('invalid_shape')
                  }
                  setCorrectionResult({
                    source: data.source === 'llm' ? 'llm' : 'mock',
                    corrected_text: data.corrected_text,
                    corrections: data.corrections,
                  })
                  setShowCorrection(true)
                } catch (err) {
                  console.error('[presentation correct] error', err)
                  setCorrectionError('교정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
                  // 폴백: 네트워크/LLM 실패 시 샘플 결과를 보여준다
                  setCorrectionResult({
                    source: 'mock',
                    corrected_text: DEFAULT_CORRECTED,
                    corrections: DEMO_CORRECTIONS.map(c => ({
                      original: c.original,
                      corrected: c.corrected,
                      reason: c.koExplain,
                    })),
                  })
                  setShowCorrection(true)
                } finally {
                  setCorrectionLoading(false)
                }
              }}
              disabled={correctionLoading}
              className="px-3 py-1.5 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5"
              data-testid="btn-ai-correction"
            >
              {correctionLoading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>교정 중...</span>
                </>
              ) : (
                <span>AI 원고 교정하기</span>
              )}
            </button>
          </div>
          {correctionError && (
            <p className="text-xs text-red-600" data-testid="correction-error">
              {correctionError}
            </p>
          )}
        </CardBody>
      </Card>

      {/* AI 교정 결과 */}
      {showCorrection && correctionResult && (
        <Card data-testid="correction-card">
          <CardHeader
            title="AI 원고 교정 결과"
            action={
              <Badge variant="info" size="sm">
                {correctionResult.source === 'llm' ? 'AI 교정' : '샘플 교정'}
              </Badge>
            }
          />
          <CardBody className="space-y-4">
            <p className="text-xs text-text-muted">
              아래 교정문은 {level} 학습자가{' '}
              {correctionTone === 'formal'
                ? '격식체'
                : correctionTone === 'general'
                  ? '일반체'
                  : '친근체'}
              로 발표·발화하기 쉽도록 다듬은 결과입니다.
            </p>

            {/* 23-a: 보기 모드 탭 */}
            <div
              className="inline-flex rounded-md border border-border overflow-hidden"
              data-testid="correction-view-tabs"
            >
              {(['separate', 'inline'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setCorrectionViewMode(mode)}
                  className={[
                    'px-3 py-1.5 text-xs font-medium transition-colors',
                    correctionViewMode === mode
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface text-text-secondary hover:bg-slate-50',
                  ].join(' ')}
                  data-testid={`tab-view-${mode}`}
                  aria-pressed={correctionViewMode === mode}
                >
                  {mode === 'separate' ? '분리 보기' : '인라인 보기'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  내가 쓴 원고
                </p>
                <div className="p-3 bg-surface border border-border rounded-lg text-sm text-text-primary leading-relaxed">
                  {script || DEFAULT_SCRIPT}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  AI 교정
                </p>
                <div
                  className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 leading-relaxed"
                  data-testid="corrected-text"
                >
                  {correctionResult.corrected_text}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowReplaceConfirm(true)}
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                data-testid="btn-replace-with-correction"
              >
                교정본으로 교체
              </button>
            </div>

            {showReplaceConfirm && (
              <div
                className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2"
                data-testid="replace-confirm"
              >
                <p className="text-xs text-amber-900">
                  교정본으로 교체하면 위 입력 영역의 내 원고가 사라집니다. 진행하시겠어요?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setScript(correctionResult.corrected_text)
                      setShowReplaceConfirm(false)
                    }}
                    className="px-3 py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                    data-testid="btn-replace-confirm"
                  >
                    네, 교체할게요
                  </button>
                  <button
                    onClick={() => setShowReplaceConfirm(false)}
                    className="px-3 py-1 rounded-md bg-surface border border-border text-text-secondary text-xs font-medium hover:bg-slate-50 transition-colors"
                    data-testid="btn-replace-cancel"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                차이점
              </p>
              {correctionViewMode === 'separate' ? (
                <div className="space-y-2" data-testid="correction-ko-explain">
                  {correctionResult.corrections.length === 0 ? (
                    <p className="text-xs text-text-muted">큰 차이 없이 자연스럽게 작성되었습니다.</p>
                  ) : (
                    correctionResult.corrections.map((c, i) => (
                      <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex flex-wrap gap-2 items-center mb-1 text-xs">
                          <span className="line-through text-text-muted">{c.original}</span>
                          <span className="text-amber-600">→</span>
                          <span className="font-semibold text-amber-700">{c.corrected}</span>
                        </div>
                        <p className="text-xs text-amber-800">{c.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <CorrectionInlineView
                  originalScript={script || DEFAULT_SCRIPT}
                  corrections={correctionResult.corrections}
                />
              )}
            </div>

            {correctionResult.source === 'mock' && showSupplement && (
              <div
                dir={isRTL(helperLang) ? 'rtl' : 'ltr'}
                lang={helperLang}
                style={isRTL(helperLang) ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
              >
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2" dir="ltr">
                  {L1_LABEL_KO[helperLang]} 설명
                </p>
                <div
                  className="p-3 bg-primary-50 border border-primary-100 rounded-lg"
                  data-testid="correction-native-explain"
                >
                  <pre className="text-sm text-primary-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {nativeCorrectionNote}
                  </pre>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* 교정문 섀도잉 */}
      <Card data-testid="shadowing-card">
        <CardHeader
          title="교정문 섀도잉"
          description="교정된 발표문을 들으며 억양과 속도를 따라 연습해 보세요."
          action={ttsStatus === 'playing' ? <Badge variant="success" size="sm">재생 중</Badge> : null}
        />
        <CardBody className="space-y-3">
          <PresentationScriptDisplay
            words={referenceWords}
            karaokeCurrentIdx={karaoke.currentWordIdx}
            karaokePassedIdx={karaoke.passedThroughIdx}
            karaokeActive={recordingState === 'recording'}
            karaokeSupported={karaoke.supported}
            azureWords={recordingState === 'done' ? azureResult?.wordResults ?? null : null}
            audioCurrentMs={recordingState === 'done' && recordedAudioUrl ? playbackCurrentMs : undefined}
            onWordSeek={recordingState === 'done' && recordedAudioUrl ? (offsetMs) => {
              const a = playbackAudioRef.current
              if (!a) return
              a.currentTime = Math.max(0, offsetMs / 1000)
              a.play().catch(() => { /* user gesture may be required */ })
            } : undefined}
          />

          {/* 23-h C-1: 색상 범례 — 녹음 후 Azure 결과 도착 시 표시. 읽기 연습 범례 패턴 일관. */}
          {recordingState === 'done' && azureResult?.wordResults && azureResult.wordResults.length > 0 && (
            <div
              className="flex flex-wrap gap-x-4 gap-y-2 text-xs"
              data-testid="shadowing-color-legend"
              aria-label="섀도잉 색상 범례"
            >
              <span className="flex items-center gap-2">
                <span style={{ color: '#888780', fontWeight: 600 }}>가나다</span>
                <span className="text-text-muted">그대로 발화</span>
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
                <span className="text-text-muted">발화 안 함</span>
              </span>
            </div>
          )}

          {/* 시간 가이드 — 녹음 중 진행률 (읽기 패턴) */}
          {recordingState === 'recording' && (
            <PresentationTimeGuide
              elapsedSec={recordingElapsed}
              targetSec={effectiveTarget}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => playTTS(DEFAULT_CORRECTED)}
              disabled={ttsStatus === 'loading' || ttsStatus === 'playing'}
              data-testid="btn-play-corrected"
              className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              교정문 듣기
            </button>
            <button
              onClick={() => playTTS(DEFAULT_CORRECTED, 0.75)}
              disabled={ttsStatus === 'loading' || ttsStatus === 'playing'}
              data-testid="btn-play-slow"
              className="px-3 py-2 rounded-md bg-surface border border-border text-text-secondary text-sm font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              천천히 듣기
            </button>
            <button
              onClick={() => playTTS(DEFAULT_CORRECTED, 1.0)}
              disabled={ttsStatus === 'loading' || ttsStatus === 'playing'}
              data-testid="btn-play-normal"
              className="px-3 py-2 rounded-md bg-surface border border-border text-text-secondary text-sm font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              보통 속도로 듣기
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

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              재생 속도
            </label>
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
          </div>

          {ttsNotice && <p className="text-xs text-text-muted">{ttsNotice}</p>}
          <p className="text-xs text-text-muted">
            ※ 이 단계는 섀도잉 연습입니다. STT 기반 발표 피드백과 함께 활용해 보세요.
          </p>
          {/* 23-h C-2: Azure 출처 명시 — 녹음 후 Azure 결과가 있을 때만 표시 */}
          {recordingState === 'done' && azureResult?.wordResults && azureResult.wordResults.length > 0 && (
            <p className="text-xs text-text-muted" data-testid="azure-attribution">
              Azure Speech 기반 발음 평가
            </p>
          )}
        </CardBody>
      </Card>

      {/* 시간 가이드 — 녹음 후 표시 */}
      {showTimerFeedback && (
        <div
          className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
          data-testid="timer-feedback"
        >
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="info" size="sm">시간 가이드</Badge>
          </div>
          <p className="text-sm text-blue-800">
            {getTimerFeedback(recordingElapsedAtStop, effectiveTarget)}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            발표 속도는 {level} 학습자 기준으로 적절합니다.
          </p>
          <p className="text-xs text-blue-700">핵심 문장 뒤에 짧게 쉬면 더 자연스럽습니다.</p>
        </div>
      )}

      {/* 끝부분 STT 미인식 안내 — 회색 점선 단어가 연속으로 나올 때만 노출 */}
      {recordingState === 'done' && hasTrailingNotRecognizedPresentation(azureResult?.wordResults ?? null, referenceWords) && (
        <div
          className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
          data-testid="trailing-not-recognized-notice"
        >
          <Badge variant="warning" size="sm">끝 부분 인식 안 됨</Badge>
          <p className="text-xs text-amber-800">
            끝 부분이 인식되지 않았습니다. 마이크 가까이서 또렷하게 발화해 보세요. 회색 점선 단어는 빠뜨린 것이 아니라 인식 한계입니다.
          </p>
        </div>
      )}

      {/* 녹음 재생 — Azure 단어 동기화 */}
      {recordingState === 'done' && recordedAudioUrl && (
        <Card data-testid="recorded-playback-card">
          <CardHeader
            title="내 발표 다시 듣기"
            description="재생하면 위 발표 원고의 단어가 시간 순으로 강조됩니다. 단어를 클릭하면 해당 위치부터 다시 들을 수 있습니다."
          />
          <CardBody>
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
          </CardBody>
        </Card>
      )}

      {/* STT 결과 */}
      {recordingState === 'done' && transcript !== null && (
        <Card data-testid="stt-result-card">
          <CardHeader title="내 발표 내용" />
          <CardBody className="space-y-3">
            <div className="p-4 bg-surface border border-border rounded-lg text-sm text-text-primary leading-relaxed">
              {transcript}
            </div>
            <p className="text-xs text-text-muted">
              녹음된 발표를 음성 인식으로 문자화한 결과입니다. 실제 발화와 일부 다를 수 있으므로
              교수자 검토 전 참고자료로 활용합니다.
            </p>
          </CardBody>
        </Card>
      )}

      {/* 교정문-발화 비교 */}
      {recordingState === 'done' && transcript !== null && (
        <Card data-testid="comparison-card">
          <CardHeader title="교정문-발화 비교" />
          <CardBody className="space-y-4">
            <div data-testid="comparison-included">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                포함된 내용
              </p>
              <ul className="space-y-1">
                {DEMO_COMPARISON.included.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-emerald-700">
                    <span className="text-emerald-500">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {(() => {
              // 23-e Phase B (옵션 2): 학습자가 도중에 멈췄을 때 "빠진 내용 없음"이
              // 잘못 표시되는 문제 방지. 부분 발표(< 80%)일 때 빠진 내용 영역을 숨기고,
              // 누락 안내는 발표 피드백의 next_steps에서 처리한다.
              const corrected = (correctionDisplayText || '').trim()
              const transcribed = (transcript ?? '').trim()
              const isPartial =
                corrected.length > 0 && transcribed.length < corrected.length * 0.8
              if (isPartial) return null
              return (
                <div data-testid="comparison-missing">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                    빠진 내용
                  </p>
                  {DEMO_COMPARISON.missing.length === 0 ? (
                    <p className="text-sm text-text-muted">없음</p>
                  ) : (
                    <ul className="space-y-1">
                      {DEMO_COMPARISON.missing.map((item, i) => (
                        <li key={i} className="text-sm text-red-600">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })()}

            <div data-testid="comparison-different">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                다르게 말한 표현
              </p>
              {DEMO_COMPARISON.different.length === 0 ? (
                <p className="text-sm text-text-muted">없음 또는 경미한 차이</p>
              ) : (
                <ul className="space-y-1">
                  {DEMO_COMPARISON.different.map((item, i) => (
                    <li key={i} className="text-sm text-amber-600">
                      • {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {(() => {
              // 23-f Phase B: 정적 "다시 연습할 문장" 영역 숨김 (시연 중 데이터 정리 전 임시 조치).
              return null
            })()}
          </CardBody>
        </Card>
      )}

      {/* 발표 피드백 — 녹음 완료 + STT 결과 도착 후에만 표시 */}
      {recordingState === 'done' && transcript !== null && (
      <Card data-testid="feedback-panel">
        <CardHeader
          title="발표 피드백"
          action={
            feedbackSource === 'mock' ? (
              <Badge variant="warning" size="sm" data-testid="sample-feedback-badge">
                참고 피드백
              </Badge>
            ) : (
              <Badge variant="success" size="sm" data-testid="ai-feedback-badge">
                AI 피드백
              </Badge>
            )
          }
        />
        <CardBody className="space-y-4">
          {evaluateReloadError && (
            <div
              className="px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800"
              data-testid="evaluate-reload-error"
            >
              {evaluateReloadError}
            </div>
          )}
          {(() => {
            // 학습자 발화 기반 LLM 피드백이 도착하면 한국어 + 선택 언어 1개만 표시.
            const koFb = evaluateResult?.feedback_ko ?? {
              strengths: [
                '발표 주제가 분명합니다.',
                '내용을 시간 순서대로 말했습니다.',
                '교정문과 실제 발화가 대부분 일치합니다.',
              ],
              next_steps: ['다음에는 마지막 문장을 조금 더 또렷하게 말해 보세요.'],
            }
            const native = getNativeFeedback(helperLang)
            const l1Fb = evaluateResult?.feedback_l1 ?? {
              strengths: native.good,
              next_steps: native.improve,
            }
            const l1Dir = isRTL(helperLang) ? 'rtl' : 'ltr'
            // v1.1 단계 19.7 [아키텍처]: 모국어 보조 카드는 mother_tongue이 en/vi/ar일 때만.
            const blocks = showSupplement
              ? [
                  { label: '한국어', testId: 'feedback-korean', fb: koFb, dir: 'ltr' as const, code: 'ko', isL1: false },
                  { label: L1_LABEL_KO[helperLang], testId: 'feedback-native', fb: l1Fb, dir: l1Dir, code: helperLang, isL1: true },
                ]
              : [
                  { label: '한국어', testId: 'feedback-korean', fb: koFb, dir: 'ltr' as const, code: 'ko', isL1: false },
                ]
            return blocks.map(({ label, testId, fb, dir, code, isL1 }) => {
              const dimmed = isL1 && evaluateLoading
              return (
                <div
                  key={testId}
                  data-testid={testId}
                  dir={dir}
                  lang={code}
                  style={dir === 'rtl' ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
                  className={dimmed ? 'opacity-50 transition-opacity' : 'transition-opacity'}
                  aria-busy={dimmed || undefined}
                >
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5" dir="ltr">
                    <span>{label} 피드백</span>
                    {dimmed && (
                      <span
                        className="inline-block w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin"
                        data-testid="evaluate-l1-spinner"
                        aria-hidden="true"
                      />
                    )}
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-700 mb-1" dir="ltr">잘한 점</p>
                      <ul className="text-sm text-emerald-700 space-y-1">
                        {fb.strengths.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-700 mb-1" dir="ltr">다음 목표</p>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {fb.next_steps.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })
          })()}

          <p className="text-xs text-text-muted italic" data-testid="pronunciation-upgrade-notice">
            ※ 발음 세부 평가는 Azure 연동 안정화 후 추후 고도화될 예정입니다.
          </p>
          <div
            className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
            data-testid="demo-feedback-notice"
          >
            <p className="text-xs text-amber-800">
              현재 발표 피드백은 음성 인식 결과와 교정문 비교를 바탕으로 한 참고자료입니다.
              발음 세부 평가는 Azure 연동 안정화 후 추후 고도화될 예정입니다.
            </p>
          </div>
        </CardBody>
      </Card>
      )}

      {/* 하단 안내 */}
      <div
        className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
        data-testid="demo-info-box"
      >
        <p className="text-sm text-blue-800">
          이 기능은 발표 원고 작성 부담을 줄이고, 교수자가 발표 내용과 전달력을 지도하는 데
          필요한 기초 자료를 제공합니다.
        </p>
      </div>
      </div>
    </div>
  )
}
