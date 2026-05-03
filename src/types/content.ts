// 언어권 대분류. 교수자·관리자 대시보드의 필터 기준으로 사용.
export type LanguageGroupCategory =
  | 'korean'
  | 'east-asian'
  | 'southeast-asian'
  | 'arabic'
  | 'european'
  | 'other'

// 텍스트 방향. 아랍어 등 RTL 언어 UI 대응을 위한 메타데이터.
export type TextDirection = 'ltr' | 'rtl'

export type LanguageGroup = {
  id: string
  code: string
  nameKo: string      // 한국어 표기 (예: '베트남어')
  nameNative: string  // 해당 언어 자체 표기 (예: 'Tiếng Việt')
  languageGroup: LanguageGroupCategory
  direction: TextDirection
  isActive: boolean
}

export type QuestionType = {
  id: string
  name: string
  description: string
  icon: string
  isActive: boolean
  createdAt: string
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type Question = {
  id: string
  typeId: string
  title: string
  prompt: string
  imageUrl?: string
  prepTimeSec: number
  responseTimeSec: number
  difficulty: Difficulty
  isActive: boolean
  version: string
  createdAt: string
}

export type QuestionSetItem = {
  questionId: string
  order: number
}

export type QuestionSetPurpose = 'diagnostic' | 'practice' | 'post'

export type QuestionSet = {
  id: string
  name: string
  description: string
  purpose: QuestionSetPurpose
  questions: QuestionSetItem[]
  isActive: boolean
  version: string
  createdAt: string
}

export type RubricItem = {
  id: string
  label: string
  description: string
  maxScore: number
  weight: number
}

export type Rubric = {
  id: string
  name: string
  description: string
  items: RubricItem[]
  isActive: boolean
  version: string
  createdAt: string
}

export type MissionSuccessCriteriaType = 'keyword' | 'intent' | 'all'

export type MissionSuccessCriteria = {
  type: MissionSuccessCriteriaType
  values: string[]
}

export type Scenario = {
  id: string
  personaId: string
  name: string
  situation: string
  location: string
  mission: string
  successCriteria: MissionSuccessCriteria
  maxTurns: number
  difficulty: Difficulty
  isActive: boolean
  version: string
  createdAt: string
}

export type Persona = {
  id: string
  name: string
  role: string
  systemPrompt: string
  greetingMessage: string
  isActive: boolean
  createdAt: string
}

export type FeedbackTemplate = {
  id: string
  errorType: string
  template: string
  example: string
  isActive: boolean
  createdAt: string
}
