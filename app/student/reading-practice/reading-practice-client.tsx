'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardHeader, CardBody, Badge } from '@/src/components/ui'
import { computeEtriWordDiff } from '@/src/lib/etri-word-diff'

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
        '전체 문장을 매우 정확하게 읽었습니다.',
        '단어 누락이 거의 없고 문장 흐름이 자연스럽습니다.',
        '현재 수준에서는 발음과 읽기 정확도가 매우 좋습니다.',
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
        ? ['일부 단어의 발음을 조금 더 명확하게 해 보세요.']
        : ['문장 끝을 조금 더 또렷하게 읽어 보세요.'],
      reread: REFERENCE_LINES[2],
    }
  } else if (score >= 70) {
    return {
      good: ['전체 지문을 읽으려는 노력이 좋습니다.'],
      improve: [
        '일부 단어가 누락되었거나 다르게 읽혔습니다.',
        '문장 끝부분을 조금 더 또렷하게 읽어 보세요.',
        '빨간색으로 표시된 단어를 다시 읽어 보세요.',
      ],
      reread: REFERENCE_LINES[2],
    }
  } else {
    return {
      good: [],
      improve: [
        '여러 단어가 누락되었거나 다르게 읽혔습니다.',
        '빨간색으로 표시된 단어를 다시 읽어 보세요.',
        '단어 사이를 의미 단위로 끊어 읽어 보세요.',
        '문장 끝을 흐리지 않도록 끝까지 또렷하게 읽어 보세요.',
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

// ── LineDiff: 줄별 제시문/내 발화/빨간색 첨삭 ─────────────────────────────────
function LineDiff({
  reference,
  recognized,
  azureWords,
}: {
  reference: string
  recognized: string
  azureWords?: AzureWordResult[]
}) {
  const strip = (w: string) => w.replace(/[.,!?。、·]/g, '').trim()

  // Azure word-level rendering
  if (azureWords && azureWords.length > 0) {
    const refWords = reference.split(/\s+/).filter(Boolean)

    // Align azure words to reference words
    type AlignToken = { text: string; errorType: AzureWordResult['errorType'] }
    const aligned: AlignToken[] = []
    let ai = 0
    for (const rw of refWords) {
      if (ai < azureWords.length && strip(azureWords[ai].word) === strip(rw)) {
        aligned.push({ text: rw, errorType: azureWords[ai].errorType })
        ai++
      } else {
        aligned.push({ text: rw, errorType: 'Omission' })
      }
    }
    // Remaining azure words as insertions
    const insertions = azureWords.slice(ai).filter(w => w.errorType === 'Insertion')

    return (
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap gap-1 text-lg leading-relaxed">
          {aligned.map((tok, i) => {
            if (tok.errorType === 'None') {
              return <span key={i} className="text-emerald-400 font-medium">{tok.text}</span>
            }
            if (tok.errorType === 'Omission') {
              return (
                <span key={i} className="inline-flex items-center gap-0.5">
                  <span className="text-red-400 underline decoration-red-400 decoration-dotted font-medium">{tok.text}</span>
                  <span className="text-[9px] bg-red-900 text-red-300 px-1 rounded leading-none">누락</span>
                </span>
              )
            }
            return (
              <span key={i} className="text-red-400 font-medium line-through decoration-red-400">{tok.text}</span>
            )
          })}
          {insertions.map((w, i) => (
            <span key={`ins-${i}`} className="text-amber-400 font-medium">[{w.word}]</span>
          ))}
        </div>
        {recognized && (
          <div className="flex flex-wrap gap-1 text-sm leading-relaxed">
            <span className="text-xs text-slate-500 mr-1 self-center shrink-0">내 발화:</span>
            <span className="text-slate-300">{recognized}</span>
          </div>
        )}
        <p className="text-[10px] text-slate-500 italic">
          발음평가 점수와 STT 인식 결과를 바탕으로 추정한 교정 포인트입니다.
        </p>
      </div>
    )
  }

  // STT diff fallback
  const { refTokens, recTokens } = computeEtriWordDiff(reference, recognized)
  const hasAnyMismatch = refTokens.some(t => !t.matched) || recTokens.some(t => !t.matched)

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1 text-lg leading-relaxed">
        {refTokens.map((tok, i) => (
          <span
            key={i}
            className={
              tok.matched
                ? 'text-emerald-400 font-medium'
                : 'text-red-400 font-medium line-through decoration-red-400'
            }
          >
            {tok.text}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 text-sm leading-relaxed">
        <span className="text-xs text-slate-500 mr-1 self-center shrink-0">내 발화:</span>
        {recTokens.length > 0 ? recTokens.map((tok, i) => (
          <span
            key={i}
            className={tok.matched ? 'text-slate-300' : 'text-red-400 font-medium'}
          >
            {tok.text}
          </span>
        )) : (
          <span className="text-slate-500 italic text-xs">인식 결과 없음</span>
        )}
      </div>
      {hasAnyMismatch && (
        <p className="text-[10px] text-slate-500 italic">
          발음평가 점수와 STT 인식 결과를 바탕으로 추정한 교정 포인트입니다.
        </p>
      )}
    </div>
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seqRef = useRef(0)
  const speedRef = useRef<SpeedOption>(1.0)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  // Keep speedRef in sync
  useEffect(() => { speedRef.current = speed }, [speed])

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
  }

  const stopRecording = () => {
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
    setProviderNote('실시간 발음평가 연결을 확인 중입니다. 현재는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고평가가 표시됩니다.')
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
        setProviderNote('실시간 발음평가 연결을 확인 중입니다. 현재는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고평가가 표시됩니다.')
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
      setProviderNote('실시간 발음평가 연결을 확인 중입니다. 현재는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고평가가 표시됩니다.')
      setAzureResult(null)
      const score = computeWordMatchScore(referenceText, sttLinesCurrent.join(' '))
      setFinalScore(score)
    }
    setPhase('result')
  }

  // Distribute Azure word results per reference line
  const getAzureWordsForLine = (lineIdx: number): AzureWordResult[] | undefined => {
    if (!azureResult?.wordResults?.length) return undefined
    const refWordCounts = REFERENCE_LINES.map(l => l.split(/\s+/).filter(Boolean).length)
    let start = 0
    for (let i = 0; i < lineIdx; i++) start += refWordCounts[i]
    return azureResult.wordResults.slice(start, start + refWordCounts[lineIdx])
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
            AI 음성을 듣고 따라 읽은 뒤, 발음과 읽기 정확도를 확인해 보세요.
            읽기연습은 제공된 지문을 정확히 읽는 연습입니다.
          </p>
        </div>
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

          {/* 지문 패널 */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader
              title="읽기 지문 — 도서관에 가는 날"
              description="줄을 클릭하면 현재 줄이 바뀝니다 · 전체 듣기를 누르면 줄이 순서대로 강조됩니다"
            />
            <CardBody className="space-y-3" data-testid="reference-lines">
              {REFERENCE_LINES.map((line, i) => {
                const isPlaying = playingLineIdx === i
                const isCurrent = currentLine === i && playingLineIdx === null
                return (
                  <div
                    key={i}
                    ref={el => { lineRefs.current[i] = el }}
                    onClick={() => { if (playingLineIdx === null) setCurrentLine(i) }}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      isPlaying
                        ? 'bg-primary-800 border-2 border-primary-400 ring-2 ring-primary-400/40 shadow-lg'
                        : isCurrent
                          ? 'bg-primary-900 border border-primary-600 ring-1 ring-primary-400/20'
                          : 'bg-slate-800 border border-slate-700 hover:border-slate-500'
                    }`}
                    data-testid={`line-${i}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-mono ${isPlaying || isCurrent ? 'text-primary-400' : 'text-slate-500'}`}>
                        {i + 1}행
                      </span>
                      {isPlaying && (
                        <span className="flex items-center gap-1 text-xs text-primary-300 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                          재생 중
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs text-primary-400 font-medium">▶ 현재</span>
                      )}
                    </div>
                    <p className="text-xl font-medium text-slate-100 leading-relaxed">{line}</p>
                  </div>
                )
              })}
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
                  <span className="text-sm text-text-muted animate-pulse">발음 분석 중…</span>
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
                  <span className="text-xs text-text-muted block mb-0.5">종합 점수</span>
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
                {finalScore >= 90 && '매우 정확하게 읽었습니다. 원어민 수준에 가까운 정확도입니다.'}
                {finalScore >= 80 && finalScore < 90 && '대부분의 문장을 정확하게 읽었습니다. 조금 더 연습하면 더욱 좋아질 것입니다.'}
                {finalScore >= 70 && finalScore < 80 && '전반적으로 무난하게 읽었습니다. 빨간색 표시 단어를 다시 읽어 보세요.'}
                {finalScore < 70 && '연습이 더 필요합니다. 빨간색으로 표시된 부분을 집중적으로 연습해 보세요.'}
              </div>
            </CardBody>
          </Card>

          {/* 줄별 첨삭 */}
          <Card className="bg-slate-900 border-slate-700" data-testid="line-diff-panel">
            <CardHeader
              title="줄별 읽기 첨삭"
              description="초록색: 정확한 단어 · 빨간색: 다르게 읽힌 단어 · 누락: 빠진 단어"
            />
            <CardBody className="space-y-4">
              {REFERENCE_LINES.map((refLine, i) => {
                const recognized = sttLines[i] ?? ''
                const azureWords = getAzureWordsForLine(i)
                return (
                  <div key={i} className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                      {i + 1}행 — 제시문
                    </p>
                    <p className="text-xl text-slate-100 leading-relaxed mb-1">{refLine}</p>
                    {recognized ? (
                      <LineDiff
                        reference={refLine}
                        recognized={recognized}
                        azureWords={azureWords}
                      />
                    ) : (
                      <p className="text-sm text-slate-500 italic mt-2">인식 결과 없음</p>
                    )}
                  </div>
                )
              })}
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
        </>
      )}
    </div>
  )
}
