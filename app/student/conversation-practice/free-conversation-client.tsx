'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardBody, Badge } from '@/src/components/ui'
import { useLanguageHelper } from '@/src/hooks/use-language-helper'
import { type FeedbackLanguage } from '@/src/lib/feedback-language'
import { PersonaAvatar } from '@/src/components/ui/persona-avatar'
import { BilingualText, BilingualListItem } from '@/src/components/ui/bilingual-text'
import { Localized } from '@/src/components/ui/localized'
import { RECOMMENDED_TOPIC_LABELS } from '@/src/lib/i18n/content-labels'
import { ToolResultCards } from '@/src/components/tool-result-cards'
import { PdfDownloadButton } from '@/src/components/pdf-download-button'
import { getPersona } from '@/src/lib/personas'
import {
  endResearchSession,
  logAssessment,
  logUtterance,
  startResearchSession,
} from '@/src/lib/research/client-logger'
import { sanitizeForTTS } from '@/src/lib/text-utils/sanitize-for-tts'

// 추천 주제 9개 (페르소나 메타데이터 없음 — 페르소나는 별도 단계에서 선택)
const RECOMMENDED_TOPICS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'weekend-place', label: '주말에 가볼 만한 명소 추천' },
  { id: 'korean-food', label: '한국 음식 추천' },
  { id: 'movies', label: '좋아하는 영화 이야기' },
  { id: 'korea-trip', label: '한국 여행 계획' },
  { id: 'family', label: '가족 이야기' },
  { id: 'weather-today', label: '오늘 날씨와 외출 계획' },
  { id: 'find-cafe', label: '맛집·카페 찾기' },
  { id: 'find-address', label: '주소 찾기·길안내' },
  { id: 'find-facility', label: '편의시설(약국·병원) 찾기' },
]

// 선택 가능한 페르소나 (v1.1 단계 9: 4명 — 친구·도우미 × 여·남).
// id는 src/lib/personas.ts의 personaId와 일치. UI 라벨은 캐릭터 이름(수아·재현·서연·영석)을
// 전면에 노출하고 짧은 묘사로 보조한다 (성별 표시 폐기 — 13b).
const AVAILABLE_PERSONAS: ReadonlyArray<{ id: string; label: string; description: string; emoji: string }> = [
  {
    id: 'friend_casual',
    label: '수아',
    description: '활발한 친구',
    emoji: '😊',
  },
  {
    id: 'friend_casual_male',
    label: '재현',
    description: '농담 잘하는 친구',
    emoji: '🙂',
  },
  {
    id: 'korean_life_helper',
    label: '서연',
    description: '친근한 안내자',
    emoji: '👋',
  },
  {
    id: 'korean_life_helper_male',
    label: '영석',
    description: '꼼꼼한 안내자',
    emoji: '🧑‍💼',
  },
]

const DEFAULT_PERSONA_ID = 'friend_casual'

function personaMeta(id: string): { id: string; label: string; description: string; emoji: string } {
  return AVAILABLE_PERSONAS.find((p) => p.id === id) ?? AVAILABLE_PERSONAS[0]
}

// 23-h A-4: 시연용 3분 (이전 10분에서 단축)
const TOTAL_SECONDS = 180 // 3분
const WARNING_AT = 150 // 2:30 (남은 30초 경고)

// 23-h A-3: 발음 평가 토글 localStorage 키
const PRON_EVAL_TOGGLE_KEY = 'kspai:free-conv:pron-eval'

type ToolResultItem = { name: string; args: Record<string, unknown>; result: unknown }

// v1.1 단계 19 [D7]: LLM이 reason을 string 또는 { ko, en, vi, ar } 객체로 반환.
// 외국어 학습자에게는 다국어 객체로 응답하도록 가이드되어 있어 두 형태 모두 허용.
type CorrectionReason = string | { ko: string; en?: string; vi?: string; ar?: string }

type ChatTurn = {
  id: string
  role: 'ai' | 'student'
  text: string
  correction?: { original: string; corrected: string; reason: CorrectionReason }
  pronScore?: number // 23-h A-3: 토글 ON 시 학습자 발화의 Azure PA 점수
  // v1.1 25-2: NPC 응답이 사용한 도구 결과 (시각 카드용). AI 턴에만 첨부.
  toolResults?: ToolResultItem[]
}

type Stage = 'start' | 'chat' | 'end'

type SummaryFeedback = { strengths: string[]; next_steps: string[] }
type SummaryResult = {
  source: 'llm' | 'mock'
  summary_ko: string
  summary_l1: string
  feedback_ko: SummaryFeedback
  feedback_l1: SummaryFeedback
  // v1.1 16-10-3: 다국어 응답이 동봉되면 토글로 즉시 전환 가능.
  summary?: { ko: string; en?: string; vi?: string; ar?: string }
  feedback?: { ko: SummaryFeedback; en?: SummaryFeedback; vi?: SummaryFeedback; ar?: SummaryFeedback }
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function buildOpener(topic: string, personaId: string): string {
  // v1.1 단계 9: 페르소나 politenessLevel 기반으로 분기 — 자유 대화 4명 모두 자연스럽게 처리.
  const persona = getPersona(personaId)
  if (persona?.politenessLevel === 'polite' || persona?.politenessLevel === 'formal') {
    return `안녕하세요! "${topic}" 관련해서 편하게 물어보세요. 무엇이 궁금하세요?`
  }
  return `"${topic}" 얘기해볼까? 편하게 시작해 봐!`
}

// 폴백 — /api/conversation/free/summary 첫 호출 실패 시 최소 안내. 보조 언어 토글
// 재호출이 실패한 경우에는 폴백을 적용하지 않고 기존 summary를 그대로 유지한다.
const FALLBACK_SUMMARY_L1: Record<FeedbackLanguage, { summary: string; strengths: string[]; next_steps: string[] }> = {
  vi: {
    summary: 'Cuộc trò chuyện đã kết thúc.',
    strengths: ['Bạn đã tham gia cuộc trò chuyện đến cuối.'],
    next_steps: ['Lần sau hãy thử dùng nhiều cách diễn đạt hơn.'],
  },
  en: {
    summary: 'The conversation has ended.',
    strengths: ['You stayed engaged through the whole chat.'],
    next_steps: ['Next time try a wider variety of expressions.'],
  },
  ar: {
    summary: 'انتهت المحادثة.',
    strengths: ['لقد شاركت في المحادثة حتى النهاية.'],
    next_steps: ['في المرة القادمة، جرّب استخدام تعبيرات أكثر تنوعًا.'],
  },
}

function fallbackSummaryFor(lang: FeedbackLanguage): SummaryResult {
  const fb = FALLBACK_SUMMARY_L1[lang]
  return {
    source: 'mock',
    summary_ko: '대화가 종료되었습니다.',
    summary_l1: fb.summary,
    feedback_ko: { strengths: ['대화에 끝까지 참여했습니다.'], next_steps: ['다음에 더 다양한 표현을 시도해 보세요.'] },
    feedback_l1: { strengths: fb.strengths, next_steps: fb.next_steps },
  }
}

// 23-h A-2: 단어 단위 LCS 기반 inline diff. 교정 표시 시 전체 삭선이 아니라
// 변경된 단어만 강조해서 학습자 시선이 차이점에 집중되도록 한다.
type DiffSeg = { type: 'same' | 'del' | 'add'; text: string }
function diffWordsInline(original: string, corrected: string): DiffSeg[] {
  const a = original.trim().split(/\s+/).filter(Boolean)
  const b = corrected.trim().split(/\s+/).filter(Boolean)
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const segs: DiffSeg[] = []
  let i = 0, j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) { segs.push({ type: 'same', text: a[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { segs.push({ type: 'del', text: a[i++] }) }
    else { segs.push({ type: 'add', text: b[j++] }) }
  }
  while (i < m) segs.push({ type: 'del', text: a[i++] })
  while (j < n) segs.push({ type: 'add', text: b[j++] })
  return segs
}

export function FreeConversationClient({ motherTongue = null }: { motherTongue?: string | null }) {
  // v1.1 단계 19.7 [아키텍처]: motherTongue 단독 결정. LLM 요약 fetch는 en/vi/ar이 필요하므로
  // ko/매칭 실패면 디폴트 'en'으로 fetch만 진행 (보조 카드는 BilingualText가 ko면 자동 숨김).
  const { lang: helperLangRaw } = useLanguageHelper(motherTongue)
  const helperLang = helperLangRaw ?? 'en'

  const [stage, setStage] = useState<Stage>('start')
  const [topic, setTopic] = useState('')
  const [customTopic, setCustomTopic] = useState('')

  // v1.1: 2단계 시작 화면 — (1) 주제 선택 (2) 페르소나 선택
  const [startSubstep, setStartSubstep] = useState<'select-topic' | 'select-persona'>('select-topic')
  const [selectedCardLabel, setSelectedCardLabel] = useState<string | null>(null)
  const [pendingTopic, setPendingTopic] = useState('')
  const [pendingPersonaId, setPendingPersonaId] = useState<string>(DEFAULT_PERSONA_ID)
  // 현재 대화 중인 페르소나 (chat 단계에서 확정)
  const [personaId, setPersonaId] = useState<string>(DEFAULT_PERSONA_ID)

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  // v1.1 26-2: PDF 다운로드용 ref — 종료 화면 내용물 컨테이너 캡처.
  const pdfSectionRef = useRef<HTMLDivElement | null>(null)

  // v1.1 단계 10-4: 시험운영 데이터 로깅 — 현재 대화의 research_sessions.id.
  // null이면 미로깅 모드 (참여자 미로그인·Supabase 미설정 등). fail-silent.
  const researchSessionIdRef = useRef<string | null>(null)
  const researchTurnCounterRef = useRef<number>(0)
  const lastStudentSendAtRef = useRef<number>(0)

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef(0)
  const [warned, setWarned] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [timeUp, setTimeUp] = useState(false)

  // Summary
  const [summary, setSummary] = useState<SummaryResult | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  // 보조 언어 토글로 재호출이 실패한 경우 노출하는 inline 알림.
  const [summaryReloadError, setSummaryReloadError] = useState<string | null>(null)
  // 진행 중 fetch를 abort해 helperLang을 빠르게 전환해도 race가 없도록 한다.
  const summaryAbortRef = useRef<AbortController | null>(null)
  // 첫 fetch 식별 — 첫 호출 실패에서만 폴백을 채우고, 재호출 실패에서는 기존 데이터를 보존한다.
  const summaryFetchedRef = useRef(false)

  // Phase C: 음성 입력 (q4·발표 STT 패턴 재사용)
  type VoiceState = 'idle' | 'recording' | 'processing'
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [voiceElapsed, setVoiceElapsed] = useState(0)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const voiceTickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 텍스트 입력 (Enter 전송, Shift+Enter 줄바꿈, IME 조합 중 Enter 무시)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // v1.1 8-3: NPC 음성 출력 — 서버 Azure TTS(/api/tts)로 페르소나별 음성 재생.
  // 합성 실패·미설정 시 음성 없이 텍스트만으로 진행한다(브라우저 speechSynthesis 미사용).
  const [ttsAutoPlay, setTtsAutoPlay] = useState(true)
  const [speakingTurnIdx, setSpeakingTurnIdx] = useState<number | null>(null)
  const npcAudioRef = useRef<HTMLAudioElement | null>(null)
  // 진행 중 합성/재생을 무효화하기 위한 시퀀스 카운터 (빠른 연속 재생·중지 race 방지).
  const ttsSeqRef = useRef(0)

  // 23-i 보정-1: 발음 평가 토글 기본값 ON (시연·운영). localStorage 미설정 시 ON.
  // React 19 set-state-in-effect 룰 회피: useEffect 본체에서 직접 setState 대신
  // queueMicrotask로 마이크로태스크 큐에 미루어 cascading render를 방지한다.
  const [pronEvalEnabled, setPronEvalEnabled] = useState(true)
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(PRON_EVAL_TOGGLE_KEY)
      // 명시적 OFF만 false로 반영 — null(미설정)은 기본값 ON 유지.
      if (v === '0') queueMicrotask(() => setPronEvalEnabled(false))
    } catch { /* noop */ }
  }, [])
  const togglePronEval = useCallback((enabled: boolean) => {
    setPronEvalEnabled(enabled)
    try {
      window.localStorage.setItem(PRON_EVAL_TOGGLE_KEY, enabled ? '1' : '0')
    } catch { /* noop */ }
  }, [])

  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll on new turn
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [turns])

  // Timer (only during chat stage)
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // ── 요약 fetch: 첫 진입 + helperLang 토글 시 공통 진입점 ────────────────
  // 이전 호출은 AbortController로 무효화한다. 토글을 빠르게 연속해 누르더라도
  // 마지막 helperLang에 대한 응답만 반영된다.
  const fetchSummary = useCallback(async (
    currentTurns: ChatTurn[],
    currentTopic: string,
    currentPersonaId: string,
    lang: FeedbackLanguage,
  ) => {
    summaryAbortRef.current?.abort()
    const controller = new AbortController()
    summaryAbortRef.current = controller
    const isRefresh = summaryFetchedRef.current

    setSummaryLoading(true)
    setSummaryReloadError(null)
    try {
      const apiTurns = currentTurns.map((t) => ({ role: t.role, text: t.text }))
      const res = await fetch('/api/conversation/free/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: currentTopic,
          personaId: currentPersonaId,
          turns: apiTurns,
          helperLang: lang,
          // v1.1 16-10-3: 학습자 모국어 전달 — 외국어면 다국어 응답 4개 전체 받음.
          motherTongue,
        }),
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (!res.ok) throw new Error(`status_${res.status}`)
      const data = (await res.json()) as SummaryResult
      if (controller.signal.aborted) return
      setSummary(data)
      summaryFetchedRef.current = true
      // v1.1 단계 10-4: 종료 요약·피드백을 research_assessments에 기록 (fail-silent).
      // 첫 호출(isRefresh=false)에서만 저장 — helperLang 토글 재호출은 표시용이므로 skip.
      if (!isRefresh) {
        const sessionId = researchSessionIdRef.current
        if (sessionId) {
          void logAssessment({
            sessionId,
            mode: 'free_conversation',
            feedbackText: data.summary_ko,
            scoresDetail: {
              feedback_ko: data.feedback_ko,
              feedback_l1: data.feedback_l1,
              summary_l1: data.summary_l1,
              helper_lang: lang,
            },
          })
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return
      if ((err as { name?: string })?.name === 'AbortError') return
      console.error('[free-conversation] summary error', err)
      if (isRefresh) {
        // 보조 언어 토글 재호출 실패 — 기존 summary는 그대로 두고 알림만.
        setSummaryReloadError('보조 언어 새로고침에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      } else {
        // 최초 호출 실패 — 폴백 데이터로 화면을 채운다.
        setSummary(fallbackSummaryFor(lang))
        summaryFetchedRef.current = true
      }
    } finally {
      if (summaryAbortRef.current === controller) {
        summaryAbortRef.current = null
        setSummaryLoading(false)
      }
    }
  }, [motherTongue])

  // ── 종료 버튼: 타이머만 멈추고 end 단계로 전환 ────────────────────────────
  // 실제 fetch는 아래 useEffect가 stage/helperLang 변화에 따라 일괄 처리한다.
  const endConversation = useCallback(() => {
    stopTimer()
    setStage('end')
    // v1.1 단계 10-4: research 세션 종료 — session_ended_at 기록 (fail-silent).
    const sessionId = researchSessionIdRef.current
    if (sessionId) {
      void endResearchSession(sessionId)
    }
  }, [stopTimer])

  // v1.1 단계 19.6 [성능]: stage === 'end' 진입 시점에만 1회 fetch. 보조 언어 토글로
  // 인한 재요청 제거(예전 helperLang 의존 → 토글 마다 LLM 재호출 → 5초+ 지연 원인).
  // 새 모델은 multilingual 응답(summary.{ko,en,vi,ar} + feedback.{ko,en,vi,ar})으로
  // 4개 언어를 한 번에 받아 BilingualText가 즉시 전환한다 (네트워크 호출 없음).
  useEffect(() => {
    if (stage !== 'end') {
      summaryFetchedRef.current = false
      summaryAbortRef.current?.abort()
      summaryAbortRef.current = null
      return
    }
    if (turns.length === 0) return
    queueMicrotask(() => {
      void fetchSummary(turns, topic, personaId, helperLang)
    })
    return () => {
      summaryAbortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  useEffect(() => {
    if (stage !== 'chat') return
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
      if (elapsedRef.current === WARNING_AT) {
        setWarned(true)
      }
      if (elapsedRef.current >= TOTAL_SECONDS) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setTimeUp(true)
      }
    }, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [stage])

  // 컴포넌트 언마운트 시 음성 녹음 인터벌 + NPC 오디오 + research 세션 정리
  useEffect(() => {
    return () => {
      if (voiceTickRef.current) {
        clearInterval(voiceTickRef.current)
        voiceTickRef.current = null
      }
      const mr = mediaRecorderRef.current
      if (mr && mr.state === 'recording') {
        try { mr.stop() } catch { /* noop */ }
      }
      const a = npcAudioRef.current
      if (a) {
        try { a.pause() } catch { /* noop */ }
        a.src = ''
        npcAudioRef.current = null
      }
      // v1.1 14-3: 미명시 종료(언마운트/탭 닫기/네비게이션)에서도 세션을 종료해 진행 중 상태 방지.
      const sid = researchSessionIdRef.current
      if (sid) {
        researchSessionIdRef.current = null
        void endResearchSession(sid)
      }
    }
  }, [])

  // 최신 sendMessageWithText 참조를 ref로 보관해 STT onstop 클로저에서 호출.
  // (text는 클로저로 캡처하므로 stale X — ref는 함수 참조 자체만 최신화.)
  const sendMessageWithTextRef = useRef<((text: string, studentTurnId?: string) => Promise<string | null>) | null>(null)

  // ── NPC TTS (v1.1 8-3): 서버 Azure TTS ───────────────────────────────────
  // 학습자 녹음 중에는 자동 재생 안 함 (충돌 방지). 종료 화면(stage='end')에서도 재생 안 함.
  const stopNpcAudio = useCallback(() => {
    // 진행 중인 합성/재생을 무효화한다.
    ttsSeqRef.current += 1
    const a = npcAudioRef.current
    if (a) {
      try { a.pause() } catch { /* noop */ }
      a.src = ''
      npcAudioRef.current = null
    }
    setSpeakingTurnIdx(null)
  }, [])

  // 텍스트를 평문으로 정제 → /api/tts(페르소나 음성)로 합성 → 재생.
  // 합성 실패·미설정(audioBase64 없음)이면 음성 없이 텍스트만으로 조용히 진행한다.
  const playNpcTts = useCallback(async (rawText: string, turnIdx: number) => {
    const text = sanitizeForTTS(rawText)
    if (!text) return
    stopNpcAudio()
    const seq = ++ttsSeqRef.current
    setSpeakingTurnIdx(turnIdx)
    const clear = () => setSpeakingTurnIdx((cur) => (cur === turnIdx ? null : cur))
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, personaId, purpose: 'free_conversation', questionId: 'free-conversation' }),
      })
      if (seq !== ttsSeqRef.current) return
      const data = (await res.json().catch(() => null)) as { audioBase64?: string; mimeType?: string } | null
      if (seq !== ttsSeqRef.current) return
      if (!data?.audioBase64) {
        // mock/fallback/오류 — 음성 없이 진행.
        clear()
        return
      }
      // canplaythrough 대기 후 재생 — 초반 ~100-200ms 잘림 방지 (v1.1 13a-2 + 14-1-1).
      const audio = new Audio()
      audio.preload = 'auto'
      npcAudioRef.current = audio
      audio.onended = () => { if (seq === ttsSeqRef.current) { npcAudioRef.current = null; clear() } }
      audio.onerror = () => { if (seq === ttsSeqRef.current) { npcAudioRef.current = null; clear() } }
      audio.src = `data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}`
      await new Promise<void>((resolve) => {
        if (audio.readyState >= 4) return resolve()
        const onReady = () => resolve()
        audio.addEventListener('canplaythrough', onReady, { once: true })
        // 안전장치 — 일부 환경에서 canplaythrough가 발생하지 않을 수 있음.
        setTimeout(onReady, 1500)
      })
      if (seq !== ttsSeqRef.current) return
      await audio.play().catch(() => {
        if (seq === ttsSeqRef.current) { npcAudioRef.current = null; clear() }
      })
    } catch {
      if (seq === ttsSeqRef.current) clear()
    }
  }, [stopNpcAudio, personaId])

  // 새 NPC 응답(opener + LLM 응답)을 자동 재생. 가장 최근 ai 턴 인덱스를 ref Set으로
  // 추적해 메시지당 한 번만 재생한다. 녹음·STT 처리 중에는 재생하지 않고, voiceState가
  // idle로 돌아오면 이 effect가 재실행되어 미재생 메시지를 재생한다.
  const playedAiTurnIdxsRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (stage !== 'chat') {
      // 다음 세션에서 다시 자동 재생되도록 리셋.
      playedAiTurnIdxsRef.current = new Set()
      return
    }
    if (!ttsAutoPlay) return
    if (voiceState !== 'idle') return
    let lastAiIdx = -1
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === 'ai') {
        lastAiIdx = i
        break
      }
    }
    if (lastAiIdx === -1) return
    if (playedAiTurnIdxsRef.current.has(lastAiIdx)) return
    playedAiTurnIdxsRef.current.add(lastAiIdx)
    // effect 본체에서의 setState 회피(React 19 set-state-in-effect 룰) — playNpcTts가
    // 내부에서 setSpeakingTurnIdx를 호출하므로 마이크로태스크로 미룬다.
    queueMicrotask(() => { void playNpcTts(turns[lastAiIdx].text, lastAiIdx) })
  }, [stage, ttsAutoPlay, voiceState, turns, playNpcTts])

  // ── 시작 ──────────────────────────────────────────────────────────────────
  const startConversation = useCallback((selectedTopic: string, selectedPersonaId: string) => {
    const t = selectedTopic.trim()
    if (!t) return
    const pid = AVAILABLE_PERSONAS.some((p) => p.id === selectedPersonaId) ? selectedPersonaId : DEFAULT_PERSONA_ID
    setTopic(t)
    setPersonaId(pid)
    const opener = buildOpener(t, pid)
    setTurns([{ id: crypto.randomUUID(), role: 'ai', text: opener }])
    elapsedRef.current = 0
    setElapsed(0)
    setWarned(false)
    setTimeUp(false)
    setSummary(null)
    setChatError(null)
    setStage('chat')
    // v1.1 단계 10-4: research 세션 시작 (fail-silent). 참여자 미로그인이면 sessionId=null로
    // 모든 후속 로깅이 자동 skip된다.
    researchSessionIdRef.current = null
    researchTurnCounterRef.current = 0
    void (async () => {
      const sessionId = await startResearchSession('free_conversation', { topic: t, personaId: pid })
      if (!sessionId) return
      researchSessionIdRef.current = sessionId
      researchTurnCounterRef.current = 1
      // opener는 turn 1 (npc) 로 기록.
      await logUtterance({
        sessionId,
        turnNumber: 1,
        speaker: 'npc',
        text: opener,
        metaJson: { kind: 'opener' },
      })
    })()
  }, [])

  // 주제 선택 → 페르소나 선택 단계로 전환
  const goToPersonaSelect = useCallback((chosenTopic: string) => {
    const t = chosenTopic.trim()
    if (!t) return
    setPendingTopic(t)
    setStartSubstep('select-persona')
  }, [])

  // ── 발화 전송 ─────────────────────────────────────────────────────────────
  // 23-h A-3: studentTurnId 옵션 추가 — STT 경로에서 발화한 학습자 turn 식별 후
  // Azure PA 응답이 도착하면 해당 turn에 pronScore를 비동기로 부착할 수 있게 함.
  const sendMessageWithText = useCallback(async (rawText: string, studentTurnId?: string): Promise<string | null> => {
    const trimmed = rawText.trim()
    if (!trimmed || sending) return null
    if (trimmed.length > 1000) {
      setChatError('한 번에 1000자까지만 입력할 수 있어요.')
      return null
    }
    setChatError(null)
    setSending(true)

    const studentTurn: ChatTurn = {
      id: studentTurnId ?? crypto.randomUUID(),
      role: 'student',
      text: trimmed,
    }
    const nextTurns = [...turns, studentTurn]
    setTurns(nextTurns)

    try {
      const apiTurns = turns.map((t) => ({ role: t.role, text: t.text }))
      const startAt = Date.now()
      lastStudentSendAtRef.current = startAt
      const res = await fetch('/api/conversation/free/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          personaId,
          turns: apiTurns,
          latestStudentText: trimmed,
        }),
      })
      if (!res.ok) throw new Error(`status_${res.status}`)
      const data = await res.json() as {
        source: 'llm' | 'mock'
        npc_response: string
        tools_used?: string[]
        tool_results?: ToolResultItem[]
        learner_correction?: { original: string; corrected: string; reason: CorrectionReason }
      }
      const elapsedMs = Date.now() - startAt
      // setState updater: PA 응답이 먼저 도착해 pronScore가 set됐을 수 있으므로,
      // 직접 turns로 finalTurns를 구성하지 말고 함수형 업데이터로 병합한다.
      setTurns((prev) =>
        prev
          .map((t) =>
            t.id === studentTurn.id
              ? { ...t, correction: data.learner_correction }
              : t,
          )
          .concat({
            id: crypto.randomUUID(),
            role: 'ai',
            text: data.npc_response,
            // v1.1 25-2: NPC 응답에 사용된 도구 결과를 턴에 첨부 → 시각 카드 렌더.
            toolResults: Array.isArray(data.tool_results) && data.tool_results.length > 0
              ? data.tool_results
              : undefined,
          }),
      )
      // NPC 응답 자동 재생은 23-g Phase A 통합 effect(playedAiTurnIdxsRef)에서 처리.

      // v1.1 단계 10-4: 학습자·NPC 발화 로깅 (fail-silent).
      const sessionId = researchSessionIdRef.current
      if (sessionId) {
        const studentTurnNum = researchTurnCounterRef.current + 1
        const npcTurnNum = researchTurnCounterRef.current + 2
        researchTurnCounterRef.current = npcTurnNum
        const toolCalls = Array.isArray(data.tools_used) && data.tools_used.length > 0
          ? data.tools_used.map((name) => ({ name }))
          : null
        void logUtterance({
          sessionId,
          turnNumber: studentTurnNum,
          speaker: 'learner',
          text: trimmed,
          metaJson: data.learner_correction ? { correction: data.learner_correction } : null,
        })
        void logUtterance({
          sessionId,
          turnNumber: npcTurnNum,
          speaker: 'npc',
          text: data.npc_response,
          responseTimeMs: elapsedMs,
          toolCalls,
          metaJson: { source: data.source },
        })
      }
    } catch (err) {
      console.error('[free-conversation] respond error', err)
      setChatError('잠시 후 다시 시도해주세요.')
      setTurns((prev) => prev.concat({
        id: crypto.randomUUID(),
        role: 'ai',
        text: '죄송해요, 잠시 연결이 어려웠어요. 다시 한 번 말씀해 주실래요?',
      }))
    } finally {
      setSending(false)
    }
    return studentTurn.id
  }, [sending, turns, topic, personaId])

  // 최신 sendMessageWithText를 ref에 동기화 — STT onstop 클로저에서 호출.
  useEffect(() => {
    sendMessageWithTextRef.current = sendMessageWithText
  }, [sendMessageWithText])

  // ── 음성 입력 (Phase C) ──────────────────────────────────────────────────
  // q4·발표 STT 패턴과 동일: MediaRecorder → Blob → POST /api/stt → transcript.
  // 인식 결과는 즉시 sendMessageWithText로 전송한다 (텍스트 입력 워크플로 폐기).
  const stopVoiceTick = useCallback(() => {
    if (voiceTickRef.current) {
      clearInterval(voiceTickRef.current)
      voiceTickRef.current = null
    }
  }, [])

  const startVoiceRecording = useCallback(async () => {
    if (voiceState !== 'idle' || sending) return
    setVoiceError(null)
    // 녹음과 NPC 음성 충돌 방지: 재생 중이면 즉시 중단
    stopNpcAudio()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        stopVoiceTick()
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size < 3000) {
          setVoiceState('idle')
          setVoiceElapsed(0)
          setVoiceError('녹음이 너무 짧습니다. 마이크에 가까이 대고 다시 말씀해 주세요.')
          return
        }
        setVoiceState('processing')
        try {
          const form = new FormData()
          form.append('audio', blob, 'recording.webm')
          form.append('questionId', 'free-conversation')
          const res = await fetch('/api/stt', { method: 'POST', body: form })
          const data = await res.json()
          const transcript = typeof data?.transcript === 'string' ? data.transcript.trim() : ''
          if (!transcript) {
            setVoiceError('음성을 인식하지 못했습니다. 다시 한 번 말씀해 주세요.')
          } else {
            // 23-f: STT 결과 도착 즉시 전송 (카운트다운 없음).
            const fn = sendMessageWithTextRef.current
            // 23-h A-3: 발음 평가 토글 ON 시, Azure PA를 병렬 호출하고 응답이
            // 도착하면 해당 student turn에 pronScore를 부착한다. transcript를
            // referenceText로 사용 (자유 대화는 정답 스크립트가 없으므로 자기 발화 기준).
            if (fn) {
              const studentTurnId = crypto.randomUUID()
              void fn(transcript, studentTurnId)
              if (pronEvalEnabled) {
                void (async () => {
                  try {
                    const fd = new FormData()
                    fd.append('audio', blob, 'recording.webm')
                    fd.append('referenceText', transcript)
                    const paRes = await fetch('/api/pronunciation-azure', { method: 'POST', body: fd })
                    if (!paRes.ok) return
                    const paData = await paRes.json()
                    const score = typeof paData?.pronScore === 'number'
                      ? paData.pronScore
                      : typeof paData?.normalizedScore === 'number'
                        ? paData.normalizedScore
                        : null
                    if (score == null) return
                    const rounded = Math.round(score)
                    setTurns((prev) => prev.map((t) =>
                      t.id === studentTurnId ? { ...t, pronScore: rounded } : t,
                    ))
                    // v1.1 14-4: 자유 대화도 발화별 발음 점수를 research_assessments에 누적 기록.
                    const sid = researchSessionIdRef.current
                    if (sid) {
                      void logAssessment({
                        sessionId: sid,
                        mode: 'free_conversation',
                        scoreTotal: rounded,
                        scoresDetail: {
                          type: 'pronunciation_turn',
                          pronScore: rounded,
                          accuracyScore: typeof paData?.accuracyScore === 'number' ? paData.accuracyScore : null,
                          fluencyScore: typeof paData?.fluencyScore === 'number' ? paData.fluencyScore : null,
                          completenessScore: typeof paData?.completenessScore === 'number' ? paData.completenessScore : null,
                        },
                        pronunciationData: {
                          referenceText: transcript,
                          recognizedText: typeof paData?.recognizedText === 'string' ? paData.recognizedText : null,
                          wordResults: Array.isArray(paData?.wordResults) ? paData.wordResults : null,
                        },
                      })
                    }
                  } catch (err) {
                    console.warn('[free-conversation] pron eval error', err)
                  }
                })()
              }
            }
          }
        } catch (err) {
          console.error('[free-conversation] STT error', err)
          setVoiceError('음성 인식 중 오류가 발생했습니다. 다시 시도해 주세요.')
        } finally {
          setVoiceState('idle')
          setVoiceElapsed(0)
        }
      }
      mediaRecorderRef.current = mr
      mr.start()
      setVoiceState('recording')
      setVoiceElapsed(0)
      voiceTickRef.current = setInterval(() => {
        setVoiceElapsed((p) => p + 1)
      }, 1000)
    } catch (err) {
      console.error('[free-conversation] mic error', err)
      setVoiceError('마이크 권한이 필요합니다. 브라우저 권한을 확인해 주세요.')
      setVoiceState('idle')
    }
  }, [voiceState, sending, stopVoiceTick, stopNpcAudio, pronEvalEnabled])

  const stopVoiceRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state === 'recording') {
      mr.stop()
      mediaRecorderRef.current = null
    }
  }, [])

  // ── 단계별 렌더 ───────────────────────────────────────────────────────────

  if (stage === 'start') {
    // ── 1단계: 주제 선택 ────────────────────────────────────────────────────
    if (startSubstep === 'select-topic') {
      return (
        <div className="max-w-2xl mx-auto space-y-6 px-4 py-6" data-testid="free-conversation-start">
          <div>
            {/* v1.1 단계 19.9 [페이즈5]: page 제목 mother_tongue 보조 표기 통일. */}
            <h1 className="text-xl font-bold text-text-primary leading-tight" lang="ko">생성형 대화 연습</h1>
            <div className="mt-0.5">
              <Localized
                spec={{ kind: 'page', key: 'freeConversationPractice' }}
                motherTongueHint={motherTongue}
                supplementOnly
                className="text-xs text-text-muted"
              />
            </div>
            {/* v1.1 단계 19.10 [페이즈3/#4]: 단계 진행도 분수형(1/2) → "단계 1 / 총 2단계" + mother_tongue 보조. */}
            <p className="mt-1 text-sm text-text-secondary">
              먼저 대화 주제를 고르세요. 추천 주제 중에서 선택하거나 직접 입력할 수 있습니다.{' '}
              <span className="text-xs text-text-muted">
                (<Localized
                  spec={{ kind: 'practice', key: 'progress_step1of2' }}
                  motherTongueHint={motherTongue}
                  inline
                />)
              </span>
            </p>
          </div>

          <Card>
            <CardHeader
              title={
                <Localized
                  spec={{ kind: 'practice', key: 'topic_recommended' }}
                  motherTongueHint={motherTongue}
                  inline
                />
              }
            />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="topic-cards">
                {RECOMMENDED_TOPICS.map((t) => {
                  const selected = selectedCardLabel === t.label
                  const topicMultilingual = RECOMMENDED_TOPIC_LABELS[t.id]
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedCardLabel(t.label)
                        setCustomTopic('')
                      }}
                      className={[
                        'text-left rounded-lg border p-4 transition-colors',
                        selected
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-300'
                          : 'border-border bg-surface hover:bg-slate-50',
                      ].join(' ')}
                      data-testid={`topic-card-${t.id}`}
                      aria-pressed={selected}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="text-sm font-semibold text-text-primary">
                          <BilingualText
                            ko={t.label}
                            multilingual={topicMultilingual}
                            motherTongueHint={motherTongue}
                            supplementClassName="text-[11px]"
                          />
                        </div>
                        {selected && <span className="text-primary-600 text-sm" aria-hidden>✓</span>}
                      </div>
                      <div className="text-xs text-text-muted">
                        <Localized
                          spec={{
                            kind: 'practice',
                            key: selected ? 'topic_selected' : 'topic_selectThis',
                          }}
                          motherTongueHint={motherTongue}
                          inline
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
              <div>
                <button
                  onClick={() => { if (selectedCardLabel) goToPersonaSelect(selectedCardLabel) }}
                  disabled={!selectedCardLabel}
                  className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="btn-next-to-persona"
                >
                  <Localized
                    spec={{ kind: 'practice', key: 'action_next' }}
                    motherTongueHint={motherTongue}
                    inline
                  /> →
                </button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <Localized
                  spec={{ kind: 'practice', key: 'topic_custom' }}
                  motherTongueHint={motherTongue}
                  inline
                />
              }
            />
            <CardBody className="space-y-3">
              <textarea
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value)
                  if (e.target.value.trim()) setSelectedCardLabel(null)
                }}
                rows={2}
                placeholder="예: 어제 본 드라마 이야기"
                className="w-full rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                data-testid="custom-topic-input"
              />
              <div>
                <button
                  onClick={() => goToPersonaSelect(customTopic)}
                  disabled={customTopic.trim().length === 0}
                  className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="btn-start-custom"
                >
                  <Localized
                    spec={{ kind: 'practice', key: 'action_next' }}
                    motherTongueHint={motherTongue}
                    inline
                  /> →
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      )
    }

    // ── 2단계: 페르소나 선택 ────────────────────────────────────────────────
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-6" data-testid="free-conversation-persona-select">
        <div>
          <h1 className="text-xl font-bold text-text-primary" lang="ko">대화 상대 선택</h1>
          <div className="mt-0.5">
            <Localized
              spec={{ kind: 'page', key: 'chooseConversationPartner' }}
              motherTongueHint={motherTongue}
              supplementOnly
              className="text-xs text-text-muted"
            />
          </div>
          <p className="text-sm text-text-secondary mt-1">
            누구와 이야기할지 골라보세요.{' '}
            <span className="text-xs text-text-muted">
              (<Localized
                spec={{ kind: 'practice', key: 'progress_step2of2' }}
                motherTongueHint={motherTongue}
                inline
              />)
            </span>
          </p>
          <p className="text-xs text-text-muted mt-1" data-testid="pending-topic">
            <Localized
              spec={{ kind: 'practice', key: 'field_topic' }}
              motherTongueHint={motherTongue}
              inline
            />
            : <span className="font-medium text-text-secondary">{pendingTopic}</span>
          </p>
        </div>

        <Card>
          <CardHeader
            title={
              <Localized
                spec={{ kind: 'practice', key: 'field_partner' }}
                motherTongueHint={motherTongue}
                inline
              />
            }
          />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="persona-cards">
              {AVAILABLE_PERSONAS.map((p) => {
                const selected = pendingPersonaId === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setPendingPersonaId(p.id)}
                    className={[
                      'text-left rounded-lg border p-4 transition-colors',
                      selected
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-300'
                        : 'border-border bg-surface hover:bg-slate-50',
                    ].join(' ')}
                    data-testid={`persona-card-${p.id}`}
                    aria-pressed={selected}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {/* v1.1 25-1: DiceBear 아바타 — 페르소나별 시드 고정 */}
                      <PersonaAvatar personaId={p.id} size={48} alt={p.label} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{p.label}</p>
                      </div>
                      {selected && <span className="text-primary-600 text-sm" aria-hidden>✓</span>}
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">{p.description}</p>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStartSubstep('select-topic')}
                className="px-4 py-2 rounded-md border border-border bg-surface text-text-secondary text-sm font-medium hover:bg-slate-50 transition-colors"
                data-testid="btn-back-to-topic"
              >
                ← <Localized
                  spec={{ kind: 'practice', key: 'action_back' }}
                  motherTongueHint={motherTongue}
                  inline
                />
              </button>
              <button
                onClick={() => startConversation(pendingTopic, pendingPersonaId)}
                disabled={!pendingTopic.trim()}
                className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="btn-start-chat"
              >
                시작하기
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (stage === 'chat') {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-6 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }} data-testid="free-conversation-chat">
        {/* Sticky 상단 */}
        <div
          className="sticky top-0 z-20 -mx-4 px-4 py-3 flex flex-wrap items-center gap-3"
          style={{
            backgroundColor: 'var(--color-background-primary, #FAF9F5)',
            borderBottom: '0.5px solid var(--border)',
          }}
          data-testid="conversation-header"
        >
          <PersonaAvatar personaId={personaId} size={40} alt={personaMeta(personaId).label} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted">
              <Localized
                spec={{ kind: 'practice', key: 'field_topic' }}
                motherTongueHint={motherTongue}
                inline
              />
            </p>
            <p className="text-sm font-semibold text-text-primary truncate" data-testid="conversation-topic">
              {topic}
            </p>
            <p className="text-[11px] text-text-muted truncate mt-0.5" data-testid="conversation-persona">
              {personaMeta(personaId).label} ({personaMeta(personaId).description})와 대화 중
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">
              <Localized
                spec={{ kind: 'practice', key: 'field_elapsed' }}
                motherTongueHint={motherTongue}
                inline
              />
            </p>
            <p className="text-sm font-mono tabular-nums text-text-primary" data-testid="conversation-elapsed">
              {formatTime(elapsed)} / {formatTime(TOTAL_SECONDS)}
            </p>
          </div>
          <button
            onClick={() => {
              stopNpcAudio()
              endConversation()
            }}
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
            data-testid="btn-end-conversation"
          >
            <Localized
              spec={{ kind: 'practice', key: 'action_endConversation' }}
              motherTongueHint={motherTongue}
              inline
            />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5" data-testid="tts-toggle-row">
          <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ttsAutoPlay}
              onChange={(e) => {
                setTtsAutoPlay(e.target.checked)
                if (!e.target.checked) stopNpcAudio()
              }}
              className="rounded border-border"
              data-testid="tts-autoplay-toggle"
            />
            <span>
              <Localized
                spec={{ kind: 'practice', key: 'meta_npcAutoPlay' }}
                motherTongueHint={motherTongue}
                inline
              />
            </span>
          </label>
          {/* 23-h A-3: 발음 평가 토글 (기본 OFF, 비용 절약) */}
          <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pronEvalEnabled}
              onChange={(e) => togglePronEval(e.target.checked)}
              className="rounded border-border"
              data-testid="pron-eval-toggle"
            />
            <span>
              <Localized
                spec={{ kind: 'practice', key: 'meta_pronunciationAzure' }}
                motherTongueHint={motherTongue}
                inline
              />
            </span>
          </label>
          {speakingTurnIdx !== null && (
            <button
              onClick={() => stopNpcAudio()}
              className="text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
              data-testid="tts-stop-button"
            >
              ⏸ 중지
            </button>
          )}
        </div>

        {warned && !timeUp && (
          <div
            className="mt-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800"
            data-testid="time-warning"
          >
            남은 시간 30초입니다. 마무리 발화를 준비해보세요.
          </div>
        )}
        {timeUp && (
          <div
            className="mt-3 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-800"
            data-testid="time-up"
          >
            시간이 종료되었습니다. 위의 “대화 종료” 버튼을 눌러 결과를 확인하세요.
          </div>
        )}

        {/* 대화 영역 */}
        <div
          ref={chatScrollRef}
          className="flex-1 mt-4 overflow-y-auto space-y-3 pb-4"
          data-testid="conversation-history"
        >
          {turns.map((t, i) => (
            <div
              key={t.id}
              className={t.role === 'ai' ? 'flex justify-start' : 'flex justify-end'}
              data-testid={`turn-${i}`}
            >
              <div
                className={[
                  'rounded-2xl px-4 py-2 max-w-[80%] text-sm leading-relaxed',
                  t.role === 'ai' ? 'border border-border' : '',
                ].join(' ')}
                style={
                  t.role === 'ai'
                    // 23-h A-1: NPC 말풍선 — 크림색 배경 + 다크 네이비 텍스트로 페이지/학습자 말풍선과 명확히 구분.
                    ? { backgroundColor: '#FBF8F3', color: '#1F2D3D' }
                    : { backgroundColor: '#1F2D3D', color: '#FFFFFF' }
                }
              >
                <p className="whitespace-pre-wrap">{t.text}</p>
                {/* v1.1 25-2: 도구 호출 결과 시각 카드 — AI 응답에만 표시 */}
                {t.role === 'ai' && t.toolResults && t.toolResults.length > 0 && (
                  <ToolResultCards toolResults={t.toolResults} />
                )}
                {/* 23-h A-3: 발음 평가 점수 (토글 ON 시 학습자 발화에만 표시) */}
                {t.role === 'student' && typeof t.pronScore === 'number' && (
                  <div className="mt-1 flex justify-end" data-testid={`pron-score-${i}`}>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/20 text-white font-medium">
                      발음 정확도 {t.pronScore}/100
                    </span>
                  </div>
                )}
                {t.role === 'ai' && (
                  <div className="mt-1.5 -mb-0.5 flex justify-end">
                    {speakingTurnIdx === i ? (
                      <button
                        onClick={() => stopNpcAudio()}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 inline-flex items-center gap-0.5"
                        data-testid={`tts-stop-${i}`}
                        title="음성 중지"
                      >
                        <span aria-hidden>⏸</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => { void playNpcTts(t.text, i) }}
                        disabled={voiceState === 'recording'}
                        className="text-[11px] px-1.5 py-0.5 rounded border border-border text-text-muted hover:bg-slate-50 inline-flex items-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid={`tts-play-${i}`}
                        title="다시 듣기"
                      >
                        <span aria-hidden>🔊</span>
                      </button>
                    )}
                  </div>
                )}
                {t.role === 'student' && t.correction && t.correction.corrected.trim() !== t.correction.original.trim() && (
                  <div className="mt-2 pt-2 border-t border-white/30 text-xs">
                    {/* 23-h A-2 / 16-7: 변경 부분만 강조 — LCS 기반 단어 단위 diff.
                        칭찬(corrected==original)일 때는 아래 ✓ 블록만 노출하고 취소선 없음. */}
                    <p className="leading-relaxed">
                      <span className="opacity-80 mr-1">✏️</span>
                      {diffWordsInline(t.correction.original, t.correction.corrected).map((seg, k) => {
                        if (seg.type === 'same') {
                          return <span key={k}>{seg.text} </span>
                        }
                        if (seg.type === 'del') {
                          return (
                            <span
                              key={k}
                              className="line-through opacity-60 mr-1"
                              style={{ textDecorationColor: '#FECACA' }}
                            >
                              {seg.text}
                            </span>
                          )
                        }
                        // add
                        return (
                          <span
                            key={k}
                            className="font-semibold mr-1 px-1 rounded"
                            style={{ backgroundColor: 'rgba(254, 240, 138, 0.35)' }}
                          >
                            {seg.text}
                          </span>
                        )
                      })}
                    </p>
                    {/* v1.1 단계 19.6 [D7]: 한국어 본문 + (보조 언어 != ko이고
                        다국어 reason이 있으면) 작은 글씨 보조. */}
                    {(() => {
                      const r = t.correction.reason
                      if (typeof r === 'string') {
                        return <p className="opacity-80 mt-0.5">{r}</p>
                      }
                      const ko = (r.ko ?? '').trim()
                      if (!ko) return null
                      return (
                        <BilingualText
                          ko={ko}
                          multilingual={r}
                          motherTongueHint={motherTongue}
                          className="opacity-80 mt-0.5"
                        />
                      )
                    })()}
                  </div>
                )}
                {t.role === 'student' && t.correction && t.correction.corrected.trim() === t.correction.original.trim() && (() => {
                  const r = t.correction.reason
                  if (typeof r === 'string') {
                    return <p className="mt-1 text-xs opacity-80">✓ {r}</p>
                  }
                  const ko = (r.ko ?? '').trim()
                  if (!ko) return null
                  return (
                    <div className="mt-1 text-xs opacity-80">
                      ✓{' '}
                      <BilingualText
                        ko={ko}
                        multilingual={r}
                        motherTongueHint={motherTongue}
                        inline
                        className="inline-block align-middle"
                      />
                    </div>
                  )
                })()}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start" data-testid="sending-indicator">
              <div className="rounded-2xl px-4 py-2 bg-surface border border-border text-text-secondary text-sm flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                {/* v1.1 25-3: 도구 호출 가능성을 안내하는 짧은 메시지 + 점 펄스. */}
                <span className="text-xs">응답을 준비하는 중입니다…</span>
                <span className="inline-flex gap-1 ml-1" aria-hidden>
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" style={{ animationDelay: '0.3s' }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 입력 영역 — 좌측 텍스트(Enter 전송) + 우측 녹음 버튼 */}
        <div className="sticky bottom-0 -mx-4 px-4 py-4 bg-surface-raised border-t border-border" data-testid="conversation-input-area">
          {chatError && (
            <p className="text-xs text-red-600 mb-2 text-center" data-testid="conversation-error">{chatError}</p>
          )}
          {voiceError && (
            <p className="text-xs text-amber-700 mb-2 text-center" data-testid="voice-error">{voiceError}</p>
          )}
          <div className="flex items-center gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // 한글 IME 조합 중 Enter는 글자 확정용 — 전송 금지.
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  const text = input.trim()
                  if (!text || sending || timeUp) return
                  if (voiceState !== 'idle') return
                  setInput('')
                  void sendMessageWithText(text)
                }
              }}
              disabled={sending || timeUp || voiceState !== 'idle'}
              rows={1}
              placeholder="한국어로 입력하거나 🎤 버튼으로 말하세요 (Enter로 전송)"
              className="flex-1 resize-none rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: 44, maxHeight: 128 }}
              data-testid="conversation-text-input"
            />
            {voiceState === 'idle' && (
              <button
                onClick={() => void startVoiceRecording()}
                disabled={sending || timeUp}
                title={timeUp ? '시간이 종료되어 녹음할 수 없습니다.' : '음성으로 발화하기'}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
                data-testid="btn-voice-start"
              >
                <span aria-hidden className="text-lg">🎤</span>
              </button>
            )}
            {voiceState === 'recording' && (
              <button
                onClick={() => stopVoiceRecording()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm shrink-0"
                data-testid="btn-voice-stop"
                title="녹음 중지"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" aria-hidden />
                <span className="font-mono tabular-nums">{formatTime(voiceElapsed)}</span>
              </button>
            )}
            {voiceState === 'processing' && (
              <span
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface border border-border text-text-secondary text-sm font-medium shrink-0"
                data-testid="voice-processing"
              >
                <span className="inline-block w-3.5 h-3.5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                <span>인식 중...</span>
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // stage === 'end'
  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-6" data-testid="free-conversation-end">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text-primary">대화 요약 + 학습 피드백</h1>
          <p className="text-sm text-text-secondary mt-1">주제: {topic}</p>
        </div>
        {/* v1.1 26-2: 종료 화면 전체를 PDF로 다운로드 */}
        <PdfDownloadButton
          targetRef={pdfSectionRef}
          fileName={`자유대화_${new Date().toISOString().slice(0,10)}_${topic.replace(/\s+/g,'-')}.pdf`}
          label="대화 요약 PDF"
        />
      </div>
      {/* v1.1 단계 19.5 [P.2]: 한국어 대화 본문은 ar 토글에서도 LTR 유지.
          내부 다국어 라벨은 자체 dir 속성으로 RTL 회복. */}
      <div ref={pdfSectionRef} className="space-y-6" data-keep-ltr dir="ltr">

      {summaryLoading && !summary && (
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary" data-testid="summary-loading">
              대화를 정리하는 중입니다...
            </p>
          </CardBody>
        </Card>
      )}

      {summary && (
        <>
          {summaryReloadError && (
            <div
              className="px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800"
              data-testid="summary-reload-error"
            >
              {summaryReloadError}
            </div>
          )}
          <Card data-testid="conversation-summary">
            <CardHeader
              title="대화 요약"
              action={
                <div className="flex items-center gap-2">
                  {/* 단계 18 [D8]: 본문 인라인 토글 제거 — 헤더 단일 토글로 통일. */}
                  <Badge variant="info" size="sm">
                    {summary.source === 'llm' ? 'AI 요약' : '샘플 요약'}
                  </Badge>
                </div>
              }
            />
            <CardBody className="space-y-3">
              {/* v1.1 단계 19.6 [BiText, 자유대화]: 한국어 본문 + (보조 언어 != ko이고
                  다국어 응답이 있으면) 작은 보조 텍스트. ko 선택 시 보조 DOM 미존재. */}
              <BilingualText
                ko={summary.summary_ko}
                multilingual={summary.summary ?? null}
                motherTongueHint={motherTongue}
                testId="summary-ko"
                className={summaryLoading ? 'opacity-70 transition-opacity' : 'transition-opacity'}
              />
              {summaryLoading && (
                <span
                  className="inline-block w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin"
                  data-testid="summary-l1-spinner"
                  aria-hidden="true"
                />
              )}
            </CardBody>
          </Card>

          <Card data-testid="conversation-feedback">
            <CardHeader title="학습 피드백" />
            <CardBody className="space-y-4">
              {/* v1.1 단계 19.6 [D10-피드백]: 한국어 본문 리스트 + (보조 언어 != ko이고
                  다국어 feedback 응답이 있으면) 각 항목 아래 작은 보조 텍스트. ko 선택
                  시 보조 DOM 미존재. */}
              {summary.feedback_ko.strengths.length > 0 && (
                <div data-testid="feedback-korean" data-section="strengths">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
                  <ul className="text-sm text-text-primary space-y-1.5 list-disc list-inside">
                    {summary.feedback_ko.strengths.map((s, i) => (
                      <BilingualListItem
                        key={i}
                        ko={s}
                        multilingual={
                          summary.feedback
                            ? {
                                ko: s,
                                en: summary.feedback.en?.strengths[i],
                                vi: summary.feedback.vi?.strengths[i],
                                ar: summary.feedback.ar?.strengths[i],
                              }
                            : null
                        }
                        motherTongueHint={motherTongue}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {summary.feedback_ko.next_steps.length > 0 && (
                <div data-testid="feedback-next-steps" data-section="next-steps">
                  <p className="text-xs font-semibold text-amber-700 mb-1">다음 연습 시</p>
                  <ul className="text-sm text-text-primary space-y-1.5 list-disc list-inside">
                    {summary.feedback_ko.next_steps.map((s, i) => (
                      <BilingualListItem
                        key={i}
                        ko={s}
                        multilingual={
                          summary.feedback
                            ? {
                                ko: s,
                                en: summary.feedback.en?.next_steps[i],
                                vi: summary.feedback.vi?.next_steps[i],
                                ar: summary.feedback.ar?.next_steps[i],
                              }
                            : null
                        }
                        motherTongueHint={motherTongue}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          <Card data-testid="conversation-history-recap">
            <CardHeader title="대화 히스토리" />
            <CardBody>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {turns.map((t, i) => (
                  <div key={i} className="text-sm">
                    <span className={t.role === 'ai' ? 'text-text-muted' : 'text-primary-700 font-semibold'}>
                      {t.role === 'ai' ? 'AI: ' : '나: '}
                    </span>
                    <span className="text-text-primary">{t.text}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
      </div>{/* /pdfSectionRef wrapper */}

      <div>
        <button
          onClick={() => {
            stopNpcAudio()
            setStage('start')
            setStartSubstep('select-topic')
            setSelectedCardLabel(null)
            setPendingTopic('')
            setPendingPersonaId(DEFAULT_PERSONA_ID)
            setPersonaId(DEFAULT_PERSONA_ID)
            setTopic('')
            setCustomTopic('')
            setTurns([])
            setSummary(null)
            setSummaryReloadError(null)
            elapsedRef.current = 0
            setElapsed(0)
            setWarned(false)
          }}
          className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          data-testid="btn-restart"
        >
          다시 대화하기
        </button>
      </div>
    </div>
  )
}
