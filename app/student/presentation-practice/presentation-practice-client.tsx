'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardBody, Badge } from '@/src/components/ui'

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

// ── 목표 시간 ────────────────────────────────────────────────────────────────
const TIME_OPTIONS = [
  { label: '30초', sec: 30 },
  { label: '1분', sec: 60 },
  { label: '2분', sec: 120 },
  { label: '3분', sec: 180 },
  { label: '5분', sec: 300 },
]

// ── 샘플 원고 ────────────────────────────────────────────────────────────────
const SAMPLE_TOPIC = '효과적인 한국어 공부 방법'
const SAMPLE_SCRIPT =
  '안녕하세요. 저는 오늘 한국어 공부 방법에 대해 발표하겠습니다. 한국어를 잘하려면 매일 듣고 말하는 연습이 중요합니다. 그리고 새로운 단어를 많이 외워야 합니다.'
const SAMPLE_CORRECTED =
  '안녕하세요. 저는 오늘 효과적인 한국어 공부 방법에 대해 발표하겠습니다. 한국어 실력을 높이기 위해서는 매일 듣기와 말하기를 꾸준히 연습하는 것이 중요합니다. 또한 새로운 단어를 반복해서 익히는 것도 큰 도움이 됩니다.'

interface CorrectionPoint {
  original: string
  corrected: string
  koExplain: string
}

const SAMPLE_CORRECTIONS: CorrectionPoint[] = [
  {
    original: '한국어를 잘하려면',
    corrected: '한국어 실력을 높이기 위해서는',
    koExplain: "'잘하려면'도 자연스럽지만, 발표에서는 '실력을 높이기 위해서는'이 더 공식적인 표현입니다.",
  },
  {
    original: '많이 외워야 합니다',
    corrected: '반복해서 익히는 것도 큰 도움이 됩니다',
    koExplain: "'많이 외워야 합니다'보다 '반복해서 익히는 것도 큰 도움이 됩니다'가 더 부드러운 발표 표현입니다.",
  },
]

const NATIVE_CORRECTION_NOTE: Record<string, string> = {
  vi: 'Những từ và cụm từ được đề xuất giúp bài phát biểu nghe tự nhiên hơn.',
  en: 'The suggested words and phrases make the presentation sound more natural and formal.',
  th: 'คำและวลีที่แนะนำช่วยให้การนำเสนอฟังดูเป็นทางการและเป็นธรรมชาติมากขึ้น',
  lo: 'ຄໍາແລະປະໂຫຍກທີ່ແນະນໍາຊ່ວຍໃຫ້ການນໍາສະເໜີຟັງດູເປັນທາງການຂຶ້ນ.',
  ar: 'الكلمات والعبارات المقترحة تجعل العرض يبدو أكثر طبيعية ورسمية.',
  zh: '建议使用的词语和短语使演讲更自然、更正式。',
  ja: '提案された語句と表現により、プレゼンテーションがより自然で丁式に聞こえます。',
  mn: 'Санал болгосон үг, хэллэгүүд илтгэлийг илүү байгалийн бөгөөд албан ёсны болгодог.',
  ru: 'Предложенные слова и фразы делают презентацию более естественной и официальной.',
  uz: 'Tavsiya etilgan so\'z va iboralar taqdimotni yanada tabiiy va rasmiy qiladi.',
}

// ── 타이머 유틸 ──────────────────────────────────────────────────────────────
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── 발표 피드백 샘플 ─────────────────────────────────────────────────────────
const DEMO_FEEDBACK = {
  pronunciation: 82,
  speed: 78,
  intonation: 75,
  phrasing: 80,
  delivery: 77,
  content: 85,
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function PresentationPracticeClient() {
  const [nativeLang, setNativeLang] = useState('vi')
  const [topic, setTopic] = useState('')
  const [script, setScript] = useState('')
  const [speed, setSpeed] = useState<SpeedOption>(1.0)
  const [showCorrection, setShowCorrection] = useState(false)
  const [targetSec, setTargetSec] = useState(60)
  const [customSec, setCustomSec] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [timerFinished, setTimerFinished] = useState(false)
  const [alert30, setAlert30] = useState(false)
  const [alert10, setAlert10] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // TTS
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seqRef = useRef(0)
  const speedRef = useRef<SpeedOption>(1.0)

  // Result
  const [showResult, setShowResult] = useState(false)
  const [elapsedAtEnd, setElapsedAtEnd] = useState(0)

  useEffect(() => { speedRef.current = speed }, [speed])

  const effectiveTarget = useCustom ? (parseInt(customSec, 10) || 60) : targetSec

  // ── Timer logic ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerActive) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1
          const remaining = effectiveTarget - next
          if (remaining === 30) setAlert30(true)
          if (remaining === 10) setAlert10(true)
          if (next >= effectiveTarget) {
            setTimerFinished(true)
            setTimerActive(false)
          }
          return next
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerActive, effectiveTarget])

  const startTimer = () => {
    setElapsed(0)
    setAlert30(false)
    setAlert10(false)
    setTimerFinished(false)
    setTimerActive(true)
  }

  const stopTimer = () => {
    setTimerActive(false)
    setElapsedAtEnd(elapsed)
    setShowResult(true)
  }

  const resetTimer = () => {
    setTimerActive(false)
    setElapsed(0)
    setAlert30(false)
    setAlert10(false)
    setTimerFinished(false)
    setShowResult(false)
  }

  // ── TTS ────────────────────────────────────────────────────────────────────
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

  const playTTS = useCallback(async (text: string) => {
    stopAudio()
    const seq = ++seqRef.current
    setTtsStatus('loading')
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
        const audio = new Audio(`data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}`)
        audio.playbackRate = speedRef.current
        audioRef.current = audio
        audio.onended = () => { if (seq === seqRef.current) setTtsStatus('idle') }
        audio.onerror = () => { if (seq === seqRef.current) setTtsStatus('idle') }
        setTtsStatus('playing')
        await audio.play()
        return
      }

      const utter = new SpeechSynthesisUtterance(data.fallbackText ?? text)
      utter.lang = 'ko-KR'
      utter.rate = (data.fallbackRate ?? 0.9) * speedRef.current
      utter.onend = () => { if (seq === seqRef.current) setTtsStatus('idle') }
      utter.onerror = () => { if (seq === seqRef.current) setTtsStatus('idle') }
      setTtsStatus('playing')
      window.speechSynthesis?.speak(utter)
    } catch {
      if (seq === seqRef.current) setTtsStatus('idle')
    }
  }, [stopAudio])

  const scriptToPlay = showCorrection ? SAMPLE_CORRECTED : (script || SAMPLE_SCRIPT)

  // ── Timer feedback ────────────────────────────────────────────────────────
  function getTimerFeedback(elapsed: number, target: number): string {
    const ratio = elapsed / target
    if (ratio < 0.7) return `목표 시간 ${formatTime(target)} 중 ${formatTime(elapsed)} 발표했습니다. 예시를 한 문장 더 추가하면 좋습니다.`
    if (ratio <= 0.9) return `목표 시간 ${formatTime(target)} 중 ${formatTime(elapsed)} 발표했습니다. 발표 시간이 적절합니다.`
    if (ratio <= 1.1) return `목표 시간 ${formatTime(target)}에 딱 맞게 발표했습니다. 매우 좋습니다.`
    return `목표 시간 ${formatTime(target)}을 초과했습니다 (${formatTime(elapsed)} 발표). 두 번째 문단을 조금 줄여 보세요.`
  }

  const nativeCorrectionNote = NATIVE_CORRECTION_NOTE[nativeLang] ?? NATIVE_CORRECTION_NOTE['en']

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-bold text-text-primary">발표연습</h1>
          <Badge variant="warning" size="sm">시연용 데모</Badge>
        </div>
        <p className="text-sm text-text-secondary">
          발표 원고를 입력하면 AI가 표현을 다듬고, 학습자 모국어와 한국어로 설명한 뒤 섀도잉과 타이머 발표 연습을 지원합니다.
        </p>
      </div>

      {/* 발표 연습 흐름 안내 */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1" data-testid="practice-flow">
        {[
          { step: '1', label: '설정', sub: '주제·언어·시간' },
          { step: '2', label: '원고 교정', sub: 'AI가 다듬어 줘요' },
          { step: '3', label: '설명', sub: '한국어+모국어' },
          { step: '4', label: '섀도잉', sub: 'AI 음성 듣기' },
          { step: '5', label: '타이머 발표', sub: '시간 맞춰 읽기' },
        ].map((s, i) => (
          <div key={s.step} className="flex items-center shrink-0">
            <div className="flex flex-col items-center px-3 py-2 text-center" data-testid={`practice-step-${s.step}`}>
              <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                {s.step}
              </span>
              <span className="text-xs font-semibold text-text-primary whitespace-nowrap">{s.label}</span>
              <span className="text-[10px] text-text-muted whitespace-nowrap">{s.sub}</span>
            </div>
            {i < 4 && <span className="text-slate-300 text-sm mx-0.5">›</span>}
          </div>
        ))}
      </div>

      {/* 발표 설정 카드 */}
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
              placeholder={`예: ${SAMPLE_TOPIC}`}
              className="w-full rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
              data-testid="topic-input"
            />
          </div>

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
              목표 발표 시간
            </label>
            <div className="flex flex-wrap gap-2" data-testid="time-options">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t.sec}
                  onClick={() => { setTargetSec(t.sec); setUseCustom(false) }}
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

      {/* 원고 입력 카드 */}
      <Card>
        <CardHeader title="발표 원고" description="발표할 내용을 한국어로 직접 입력하세요" />
        <CardBody className="space-y-3">
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder={SAMPLE_SCRIPT}
            rows={4}
            className="w-full rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            data-testid="script-input"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setScript(SAMPLE_SCRIPT); setTopic(SAMPLE_TOPIC) }}
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
              AI 원고 교정
            </button>
          </div>
        </CardBody>
      </Card>

      {/* AI 교정 결과 카드 */}
      {showCorrection && (
        <Card data-testid="correction-card">
          <CardHeader
            title="AI 원고 교정 결과"
            action={<Badge variant="info" size="sm">시연용 샘플</Badge>}
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">원문</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-text-primary leading-relaxed">
                  {script || SAMPLE_SCRIPT}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">교정문</p>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 leading-relaxed">
                  {SAMPLE_CORRECTED}
                </div>
              </div>
            </div>

            {/* 수정 이유 */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                한국어 설명
              </p>
              <div className="space-y-2" data-testid="correction-ko-explain">
                {SAMPLE_CORRECTIONS.map((c, i) => (
                  <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex flex-wrap gap-2 items-center mb-1 text-xs">
                      <span className="line-through text-slate-500">{c.original}</span>
                      <span className="text-amber-600">→</span>
                      <span className="font-semibold text-amber-700">{c.corrected}</span>
                    </div>
                    <p className="text-xs text-amber-800">{c.koExplain}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 모국어 설명 */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                {NATIVE_LANGS.find(l => l.code === nativeLang)?.label ?? '모국어'} 설명
              </p>
              <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg" data-testid="correction-native-explain">
                <p className="text-sm text-primary-800">{nativeCorrectionNote}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 섀도잉 연습 카드 */}
      <Card data-testid="shadowing-card">
        <CardHeader
          title="섀도잉 연습"
          description="AI 음성을 들으며 따라 읽어보세요"
          action={
            ttsStatus === 'playing' ? <Badge variant="success" size="sm">재생 중</Badge> : null
          }
        />
        <CardBody className="space-y-3">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
            <p className="text-base text-slate-100 leading-relaxed">
              {showCorrection ? SAMPLE_CORRECTED : (script || SAMPLE_SCRIPT)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => playTTS(scriptToPlay)}
              disabled={ttsStatus === 'loading' || ttsStatus === 'playing'}
              data-testid="btn-play-script"
              className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              원고 듣기
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
              AI 음성 속도
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
          <p className="text-xs text-text-muted">
            ※ 섀도잉 음성 파일 저장 기능은 후속 단계에서 제공될 예정입니다.
          </p>
        </CardBody>
      </Card>

      {/* 발표 타이머 카드 */}
      <Card data-testid="timer-card">
        <CardHeader title="발표 타이머" description="목표 시간에 맞춰 발표를 연습해 보세요" />
        <CardBody className="space-y-4">
          {/* 타이머 디스플레이 */}
          <div className={`flex flex-col items-center py-6 rounded-xl border-2 ${
            timerFinished
              ? 'bg-red-50 border-red-300'
              : alert10
                ? 'bg-amber-50 border-amber-300 animate-pulse'
                : alert30
                  ? 'bg-amber-50 border-amber-200'
                  : timerActive
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-surface border-border'
          }`}>
            {/* 경과 시간 */}
            <p className="text-xs text-text-muted mb-1">경과 시간 (스톱워치)</p>
            <p className="text-6xl font-bold tabular-nums font-mono text-text-primary" data-testid="timer-display">
              {formatTime(elapsed)}
            </p>
            {/* 남은 시간 */}
            <p className="text-sm text-text-secondary mt-2">
              목표: {formatTime(effectiveTarget)} |
              남은 시간: <span className={effectiveTarget - elapsed <= 10 ? 'text-red-600 font-bold' : ''}>
                {formatTime(Math.max(0, effectiveTarget - elapsed))}
              </span>
            </p>

            {/* 알림 배지 */}
            {timerFinished && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-300 rounded-full" data-testid="alert-time-over">
                <span className="text-red-700 font-semibold text-sm">시간 종료!</span>
              </div>
            )}
            {!timerFinished && alert10 && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-300 rounded-full" data-testid="alert-10sec">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-700 font-semibold text-sm">10초 전!</span>
              </div>
            )}
            {!timerFinished && !alert10 && alert30 && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-100 border border-amber-300 rounded-full" data-testid="alert-30sec">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-700 font-semibold text-sm">30초 전</span>
              </div>
            )}
          </div>

          {/* 타이머 컨트롤 */}
          <div className="flex flex-wrap gap-2">
            {!timerActive && !timerFinished && (
              <button
                onClick={startTimer}
                data-testid="btn-start-timer"
                className="px-5 py-2.5 rounded-md bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
              >
                발표 시작
              </button>
            )}
            {timerActive && (
              <button
                onClick={stopTimer}
                data-testid="btn-stop-timer"
                className="px-5 py-2.5 rounded-md bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors"
              >
                발표 종료
              </button>
            )}
            {(timerFinished || showResult) && (
              <button
                onClick={resetTimer}
                data-testid="btn-reset-timer"
                className="px-5 py-2.5 rounded-md bg-white border border-border text-text-secondary font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                다시 시작
              </button>
            )}
          </div>

          {/* 타이머 피드백 */}
          {(showResult || timerFinished) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg" data-testid="timer-feedback">
              <p className="text-sm text-blue-800">
                {getTimerFeedback(timerFinished ? elapsed : elapsedAtEnd, effectiveTarget)}
              </p>
            </div>
          )}

          <p className="text-xs text-text-muted">
            ※ 발표 녹음 기능은 후속 단계에서 제공될 예정입니다.
          </p>
        </CardBody>
      </Card>

      {/* 발표 피드백 카드 */}
      <Card data-testid="feedback-panel">
        <CardHeader
          title="발표 피드백"
          action={<Badge variant="warning" size="sm" data-testid="sample-feedback-badge">시연용 샘플 피드백</Badge>}
        />
        <CardBody className="space-y-4">
          {/* 점수 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: '발음', score: DEMO_FEEDBACK.pronunciation },
              { label: '속도', score: DEMO_FEEDBACK.speed },
              { label: '억양', score: DEMO_FEEDBACK.intonation },
              { label: '끊어 읽기', score: DEMO_FEEDBACK.phrasing },
              { label: '전달력', score: DEMO_FEEDBACK.delivery },
              { label: '내용 구성', score: DEMO_FEEDBACK.content },
            ].map(({ label, score }) => (
              <div key={label} className="p-3 bg-surface border border-border rounded-lg text-center">
                <p className="text-xs text-text-muted mb-1">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${
                  score >= 80 ? 'text-emerald-600' : score >= 70 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {score}
                </p>
                <p className="text-xs text-text-muted">/ 100</p>
              </div>
            ))}
          </div>

          {/* 한국어 피드백 */}
          <div data-testid="feedback-korean">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              한국어 피드백
            </p>
            <div className="space-y-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
                <ul className="text-sm text-emerald-700 space-y-1">
                  <li>• 발표 주제를 명확하게 제시했습니다.</li>
                  <li>• 문장 구조가 전반적으로 자연스럽습니다.</li>
                </ul>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 mb-1">교정할 점</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• 핵심 문장 뒤에 잠깐 쉬어 강조해 보세요.</li>
                  <li>• 발표 속도를 조금 더 일정하게 유지해 보세요.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 모국어 피드백 */}
          <div data-testid="feedback-native">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              {NATIVE_LANGS.find(l => l.code === nativeLang)?.label ?? '모국어'} 피드백
            </p>
            <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg">
              <p className="text-sm text-primary-800">{nativeCorrectionNote}</p>
            </div>
          </div>

          <p className="text-xs text-text-muted italic" data-testid="pronunciation-upgrade-notice">
            ※ 발음 세부 평가는 Azure 연동 안정화 후 고도화 예정입니다. 위 점수는 시연용 샘플 피드백입니다.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg" data-testid="demo-feedback-notice">
            <p className="text-xs text-amber-800">
              현재 발표 피드백은 시연용 샘플 피드백입니다. 실제 운영 시 발표 녹음과 교수자 검토 데이터를 바탕으로 고도화할 예정입니다.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* 시연자 설명 박스 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="demo-info-box">
        <p className="text-sm text-blue-800">
          이 기능은 발표 원고 작성 부담을 줄이고, 교수자가 발표 내용과 전달력을 지도하는 데 필요한 기초 자료를 제공합니다.
        </p>
      </div>
    </div>
  )
}
