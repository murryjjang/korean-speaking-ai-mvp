'use client'

import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from 'react'
import { Card, CardHeader, CardBody, Badge } from '@/src/components/ui'
import { useKaraokeTracking } from '@/src/hooks/useKaraokeTracking'

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
  { code: 'uz', label: "우즈베크어 (O'zbek)" },
]

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
const DEMO_TRANSCRIPT =
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
const NATIVE_CORRECTION_NOTE: Record<string, string> = {
  vi:
    '• "카페에 갔습니다" và "아이스 아메리카노를 마셨습니다" được nối bằng "-아서/어서", nên câu tự nhiên hơn.\n• Thay vì lặp lại "그리고", dùng "그 후" sẽ giúp bài nói mạch lạc hơn.\n• Thêm "매우" giúp diễn đạt cảm xúc rõ hơn.\n• Bài nói này phù hợp với trình độ sơ cấp và có thể dùng để luyện nói.',
  en:
    '• Connect "카페에 갔습니다" and "아이스 아메리카노를 마셨습니다" with "-아서/어서" for a more natural flow.\n• Use "그 후" instead of repeating "그리고" to smooth the presentation.\n• Adding "매우" makes the feeling more expressive.\n• Overall, this is appropriate for a beginner-level presentation.',
  th:
    '• เชื่อม "카페에 갔습니다" และ "아이스 아메리카노를 마셨습니다" ด้วย "-아서/어서" เพื่อให้ประโยคเป็นธรรมชาติขึ้น\n• ใช้ "그 후" แทนการซ้ำ "그리고" เพื่อให้การนำเสนอราบรื่น\n• เพิ่ม "매우" เพื่อแสดงความรู้สึกชัดเจนขึ้น',
  lo:
    '• ເຊື່ອມ "카페에 갔습니다" ກັບ "아이스 아메리카노를 마셨습니다" ດ້ວຍ "-아서/어서" ໃຫ້ປະໂຫຍກເປັນທຳມະຊາດ\n• ໃຊ້ "그 후" ແທນ "그리고" ໃຫ້ການສະເໜີດຳເນີນໄດ້ດີ',
  ar:
    '• ربط "카페에 갔습니다" و"아이스 아메리카노를 마셨습니다" باستخدام "-아서/어서" يجعل الجملة أكثر طبيعية\n• استخدم "그 후" بدلاً من تكرار "그리고" لتحسين تدفق العرض\n• إضافة "매우" تجعل التعبير عن المشاعر أوضح',
  zh:
    '• 用"-아서/어서"连接"카페에 갔습니다"和"아이스 아메리카노를 마셨습니다"，句子更自然\n• 用"그 후"代替重复的"그리고"，发表更流畅\n• 加上"매우"能更清楚地表达感受',
  ja:
    '• "카페에 갔습니다"と"아이스 아메리카노를 마셨습니다"を"-아서/어서"でつなぐと自然な文になります\n• "그리고"を繰り返すより"그 후"を使うと発表の流れがスムーズになります\n• "매우"を加えると感情がより明確に伝わります',
  mn:
    '• "카페에 갔습니다"-г "-아서/어서"-аар "아이스 아메리카노를 마셨습니다"-тай холбоход илүү байгалийн өгүүлбэр болно\n• "그리고"-г давтахын оронд "그 후"-г ашиглаарай\n• "매우"-г нэмснээр мэдрэмжийг тодорхой илэрхийлнэ',
  ru:
    '• Соединив "카페에 갔습니다" и "아이스 아메리카노를 마셨습니다" с "-아서/어서", предложение станет более естественным\n• Используйте "그 후" вместо повтора "그리고" для плавного изложения\n• Добавление "매우" делает выражение чувств более выразительным',
  uz:
    "• \"카페에 갔습니다\" va \"아이스 아메리카노를 마셨습니다\"ni \"-아서/어서\" bilan bog'lash jumlani tabiiylroq qiladi\n• \"그리고\"ni takrorlash o'rniga \"그 후\"dan foydalanish nutqni ravonroq qiladi\n• \"매우\" qo'shish hissiyotni aniqroq ifodalaydi",
}

// ── 모국어 피드백 ─────────────────────────────────────────────────────────────
interface NativeFeedback {
  good: string[]
  improve: string[]
}

const NATIVE_FEEDBACK: Record<string, NativeFeedback> = {
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
  th: {
    good: [
      'หัวข้อการนำเสนอชัดเจน',
      'คุณเล่าเรื่องที่ทำในวันหยุดตามลำดับเวลา',
      'เนื้อหาที่พูดใกล้เคียงกับฉบับที่แก้ไขแล้ว',
    ],
    improve: ['ครั้งหน้าลองออกเสียงประโยคสุดท้ายให้ชัดขึ้นอีกนิด'],
  },
}

function getNativeFeedback(code: string): NativeFeedback {
  return NATIVE_FEEDBACK[code] ?? NATIVE_FEEDBACK['en']
}

const PRESENTATION_FEEDBACK_LANGS: { code: 'vi' | 'en'; label: string }[] = [
  { code: 'vi', label: '베트남어 (Tiếng Việt)' },
  { code: 'en', label: '영어 (English)' },
]

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
          background: '#FAF9F5',
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
            baseStyle = { color: '#1F2D3D', fontWeight: 700, backgroundColor: '#FDE68A' }
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
                transition: 'background 0.2s, color 0.2s',
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
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
        <div
          style={{
            width: `${widthPct}%`,
            height: '100%',
            background: color,
            borderRadius: 2,
            transition: 'width 0.5s ease-out, background 0.2s',
          }}
        />
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function PresentationPracticeClient() {
  const [nativeLang, setNativeLang] = useState('vi')
  const [level, setLevel] = useState<(typeof LEVEL_OPTIONS)[number]>('초급')
  const [topic, setTopic] = useState(DEFAULT_TOPIC)
  const [script, setScript] = useState(DEFAULT_SCRIPT)
  const [speed, setSpeed] = useState<SpeedOption>(1.0)
  const [showCorrection, setShowCorrection] = useState(false)
  const [targetSec, setTargetSec] = useState(60)
  // Feedback source mirrors q4's dialogueEvalSource pattern: 'llm' when a real
  // LLM response is shown, 'mock' for the demo/fallback content. Today the
  // presentation feedback is always mock; the badge below stays informative
  // until a real LLM hookup flips this to 'llm'.
  const [feedbackSource] = useState<'llm' | 'mock'>('mock')
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
  const referenceText = (showCorrection ? DEFAULT_CORRECTED : (script || DEFAULT_SCRIPT)).trim()
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
      setTranscript(data.transcript || DEMO_TRANSCRIPT)
    } catch {
      setTranscript(DEMO_TRANSCRIPT)
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
      // Mic unavailable (headless/denied) → show demo transcript and run a
      // brief timer tick so the timer-feedback area still has a value.
      setRecordingState('recording')
      startTickingTimer()
      setTimeout(() => {
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
        setRecordingElapsedAtStop(prev => prev || 1)
        setTranscript(DEMO_TRANSCRIPT)
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
      setTranscript(DEMO_TRANSCRIPT)
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

  const nativeCorrectionNote = NATIVE_CORRECTION_NOTE[nativeLang] ?? NATIVE_CORRECTION_NOTE['en']

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
          background: 'var(--color-background-primary, #FAF9F5)',
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
          <Badge variant="warning" size="sm">시연용 데모</Badge>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
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
          <div className="flex gap-2">
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
              onClick={() => setShowCorrection(true)}
              className="px-3 py-1.5 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
              data-testid="btn-ai-correction"
            >
              AI 원고 교정하기
            </button>
          </div>
        </CardBody>
      </Card>

      {/* AI 교정 결과 */}
      {showCorrection && (
        <Card data-testid="correction-card">
          <CardHeader
            title="AI 원고 교정 결과"
            action={<Badge variant="info" size="sm">시연용 샘플</Badge>}
          />
          <CardBody className="space-y-4">
            <p className="text-xs text-text-muted">
              아래 교정문은 {level} 학습자가 발표하기 쉽도록 문장을 자연스럽게 연결한 예시입니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  원문
                </p>
                <div className="p-3 bg-surface border border-border rounded-lg text-sm text-text-primary leading-relaxed">
                  {script || DEFAULT_SCRIPT}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  교정문
                </p>
                <div
                  className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 leading-relaxed"
                  data-testid="corrected-text"
                >
                  {DEFAULT_CORRECTED}
                </div>
              </div>
            </div>

            <div className="p-3 bg-surface border border-border rounded-lg">
              <p className="text-xs font-semibold text-text-muted mb-2">핵심 수정 포인트</p>
              <ul className="text-xs text-text-secondary space-y-1">
                <li>• 문장 연결 개선 (-아서/어서 활용)</li>
                <li>• 연결어 개선 (그리고 → 그 후)</li>
                <li>• 감정 표현 강화 (매우 추가)</li>
                <li>• 발표 흐름 자연화</li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                한국어 설명
              </p>
              <div className="space-y-2" data-testid="correction-ko-explain">
                {DEMO_CORRECTIONS.map((c, i) => (
                  <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex flex-wrap gap-2 items-center mb-1 text-xs">
                      <span className="line-through text-text-muted">{c.original}</span>
                      <span className="text-amber-600">→</span>
                      <span className="font-semibold text-amber-700">{c.corrected}</span>
                    </div>
                    <p className="text-xs text-amber-800">{c.koExplain}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                {NATIVE_LANGS.find(l => l.code === nativeLang)?.label ?? '모국어'} 설명
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
          <CardHeader
            title="내 발표 내용"
            action={<Badge variant="info" size="sm">음성 인식 기반 참고평가</Badge>}
          />
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
          <CardHeader
            title="교정문-발화 비교"
            action={<Badge variant="info" size="sm">음성 인식 기반 참고 피드백</Badge>}
          />
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

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-700 mb-1">다시 연습할 문장</p>
              <p className="text-sm text-amber-800 font-medium">{DEMO_COMPARISON.practice}</p>
            </div>
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
                시연용 참고 피드백
              </Badge>
            ) : (
              <Badge variant="success" size="sm" data-testid="ai-feedback-badge">
                AI 피드백
              </Badge>
            )
          }
        />
        <CardBody className="space-y-4">
          <div data-testid="feedback-korean">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              한국어 피드백
            </p>
            <div className="space-y-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
                <ul className="text-sm text-emerald-700 space-y-1">
                  <li>• 발표 주제가 분명합니다.</li>
                  <li>• 지난 주말에 한 일을 시간 순서대로 말했습니다.</li>
                  <li>• 교정문과 실제 발화가 대부분 일치합니다.</li>
                </ul>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 mb-1">다음 목표</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• 다음에는 마지막 문장을 조금 더 또렷하게 말해 보세요.</li>
                </ul>
              </div>
            </div>
          </div>

          {PRESENTATION_FEEDBACK_LANGS.map(({ code, label }, idx) => {
            const fb = getNativeFeedback(code)
            // Keep original "feedback-native" testid on the first (Vietnamese)
            // block so existing smoke tests continue to find Vietnamese text.
            const testId = idx === 0 ? 'feedback-native' : `feedback-${code}`
            return (
              <div key={code} data-testid={testId}>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  {label} 피드백
                </p>
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
                    <ul className="text-sm text-emerald-700 space-y-1">
                      {fb.good.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 mb-1">다음 목표</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {fb.improve.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}

          <p className="text-xs text-text-muted italic" data-testid="pronunciation-upgrade-notice">
            ※ 발음 세부 평가는 Azure 연동 안정화 후 2차 시연에서 고도화할 예정입니다.
          </p>
          <div
            className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
            data-testid="demo-feedback-notice"
          >
            <p className="text-xs text-amber-800">
              현재 발표 피드백은 음성 인식 결과와 교정문 비교를 바탕으로 한 참고자료입니다.
              발음 세부 평가는 Azure 연동 안정화 후 2차 시연에서 고도화할 예정입니다.
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
