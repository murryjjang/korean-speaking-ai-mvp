export type DialogueMode = 'assessment' | 'practice'

export type DialogueTurnRole = 'ai' | 'student' | 'system'
export type DialogueTurnStatus = 'completed' | 'error'

export type DialogueTurnIntent = 'language_question' | 'mission_response' | 'other'

export type DialogueTurn = {
  id: string
  role: DialogueTurnRole
  text: string
  audioUrl?: string | null
  audioDurationSec?: number | null
  createdAt: string
  status: DialogueTurnStatus
  providerName?: string
  confidence?: number | null
  // Client-only intent tag — set when adding student turns.
  // language_question turns are excluded from mission evidence.
  // Not persisted to DB (no schema change).
  intent?: DialogueTurnIntent
  // TTS playback tracking — client-state only, not persisted to DB
  // TODO: TTS_PROVIDER=azure일 때 Azure Speech TTS 연결
  // TODO: AI dialogue turn별 generated audio URL 저장
  ttsStatus?: 'idle' | 'playing' | 'error'
  ttsProvider?: 'browser' | 'mock' | 'azure' | 'openai'
  ttsAudioUrl?: string | null
  // 23-h D-6: 학습자 발화 turn의 Azure PA 점수 (0-100). q4 결과 화면 평균 산출용.
  pronScore?: number
  // v1.1 15-2 / 16-10-2: NPC가 반환한 학습자 발화 교정 안내. 학습자 모국어가 외국어면
  // 다국어 객체로 도착할 수 있다. 학습자 turn에만 부착.
  grammarNote?: string | { ko?: string; en?: string; vi?: string; ar?: string }
}

export type MissionGoalResult = {
  goalIndex: number
  labelKo: string
  achieved: boolean
  evidence?: string[]
}

export type DialogueMissionPanelStatus =
  | 'idle'
  | 'ready'
  | 'recording'
  | 'recorded'
  | 'processing'
  | 'completed'
  | 'submitting'

// Panel config — passed from parent to control dialogue behavior
export type DialoguePanelConfig = {
  mode: DialogueMode
  personaId?: string
  maxTurns?: number
}
