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
