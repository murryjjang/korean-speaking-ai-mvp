export type AssetStatus = 'placeholder' | 'ready'
export type AssetType = 'image' | 'chart' | 'audio' | 'dialogue_profile' | 'none'

export type StudentVisibleAsset = {
  assetId: string
  questionId: string
  assetType: AssetType
  displayTitle: string
  studentVisibleDescription: string
  src: string
  alt?: string
  status: AssetStatus
}

type OfficialAsset = StudentVisibleAsset & {
  teacherOnlyNote: string
  replacementRequiredBeforePilot: boolean
}

const OFFICIAL_ASSETS: OfficialAsset[] = [
  // beginner q2: 식당 사진 (placeholder — 파일럿 전 실제 사진 교체 필요)
  {
    assetId: 'beginner-restaurant-image',
    questionId: 'beginner-q2-material-description',
    assetType: 'image',
    displayTitle: '식당 안 모습',
    studentVisibleDescription: '식당에서 손님이 음식을 주문하는 장면을 보고 설명하세요.',
    src: '',
    alt: '식당 안 모습 — 손님이 주문하는 장면',
    status: 'placeholder',
    teacherOnlyNote:
      '파일럿 전 실제 사진 교체 필요. 권장 파일명: /public/images/official/beginner-restaurant-scene.jpg. 직접 촬영 또는 CC0 라이선스 이미지 사용.',
    replacementRequiredBeforePilot: true,
  },
  // intermediate q2: 수업 방식 선호도 차트 (앱 내부 렌더링)
  {
    assetId: 'intermediate-class-format-chart',
    questionId: 'intermediate-q2-material-description',
    assetType: 'chart',
    displayTitle: '한국어 수업 방식 선호도 조사',
    studentVisibleDescription: '한국어 수업 방식에 대한 선호도 조사 결과입니다.',
    src: '',
    status: 'ready',
    teacherOnlyNote: '앱 내부 가로 바 차트로 렌더링. 외부 이미지 파일 불필요.',
    replacementRequiredBeforePilot: false,
  },
  // advanced q2: 등록 인원 변화 차트 (앱 내부 렌더링)
  {
    assetId: 'advanced-enrollment-chart',
    questionId: 'advanced-q2-material-description',
    assetType: 'chart',
    displayTitle: '한국어 프로그램 등록 인원 변화 (2024–2026)',
    studentVisibleDescription: '최근 3년간 한국어 프로그램 등록 인원 변화를 나타낸 자료입니다.',
    src: '',
    status: 'ready',
    teacherOnlyNote: '앱 내부 가로 바 차트로 렌더링. 외부 이미지 파일 불필요.',
    replacementRequiredBeforePilot: false,
  },
  // beginner q3: 한국어 수업 안내 음원 (placeholder — 파일럿 전 mp3 등록 필요)
  {
    assetId: 'beginner-korean-class-audio',
    questionId: 'beginner-q3-listening-response',
    assetType: 'audio',
    displayTitle: '한국어 수업 안내',
    studentVisibleDescription: '한국어 수업에 대한 안내 방송입니다.',
    src: '',
    status: 'placeholder',
    teacherOnlyNote:
      '파일럿 전 실제 mp3 등록 필요. 경로: /public/audio/official/beginner-korean-class-announcement.mp3',
    replacementRequiredBeforePilot: true,
  },
  // intermediate q3: 발표 수업 일정 변경 안내 음원 (placeholder)
  {
    assetId: 'intermediate-presentation-change-audio',
    questionId: 'intermediate-q3-listening-response',
    assetType: 'audio',
    displayTitle: '발표 수업 일정 변경 안내',
    studentVisibleDescription: '발표 수업 일정 변경에 대한 안내입니다.',
    src: '',
    status: 'placeholder',
    teacherOnlyNote:
      '파일럿 전 실제 mp3 등록 필요. 경로: /public/audio/official/intermediate-presentation-class-change.mp3',
    replacementRequiredBeforePilot: true,
  },
  // advanced q3: 혼합형 수업 장단점 음원 (placeholder)
  {
    assetId: 'advanced-hybrid-class-audio',
    questionId: 'advanced-q3-listening-response',
    assetType: 'audio',
    displayTitle: '혼합형 수업 장단점 설명',
    studentVisibleDescription: '혼합형 수업의 장단점에 대한 설명입니다.',
    src: '',
    status: 'placeholder',
    teacherOnlyNote:
      '파일럿 전 실제 mp3 등록 필요. 경로: /public/audio/official/advanced-hybrid-class-analysis.mp3',
    replacementRequiredBeforePilot: true,
  },
  // dialogue profiles — 10-E-5에서 실제 대화 UI 구현 예정
  {
    assetId: 'beginner-dialogue-profile',
    questionId: 'beginner-q4-dialogue-mission',
    assetType: 'dialogue_profile',
    displayTitle: 'AI 카페 직원',
    studentVisibleDescription: 'AI 카페 직원과 대화하며 미션을 완료하세요.',
    src: '',
    status: 'ready',
    teacherOnlyNote: 'AI role: 카페 직원. 10-E-5에서 실제 대화 UI 구현 예정.',
    replacementRequiredBeforePilot: false,
  },
  {
    assetId: 'intermediate-dialogue-profile',
    questionId: 'intermediate-q4-dialogue-mission',
    assetType: 'dialogue_profile',
    displayTitle: 'AI 교수자',
    studentVisibleDescription: 'AI 교수자와 대화하며 미션을 완료하세요.',
    src: '',
    status: 'ready',
    teacherOnlyNote: 'AI role: 교수자. 10-E-5에서 실제 대화 UI 구현 예정.',
    replacementRequiredBeforePilot: false,
  },
  {
    assetId: 'advanced-dialogue-profile',
    questionId: 'advanced-q4-dialogue-mission',
    assetType: 'dialogue_profile',
    displayTitle: 'AI 동료',
    studentVisibleDescription: 'AI 동료와 대화하며 미션을 완료하세요.',
    src: '',
    status: 'ready',
    teacherOnlyNote: 'AI role: 동료/팀원. 10-E-5에서 실제 대화 UI 구현 예정.',
    replacementRequiredBeforePilot: false,
  },
]

export function getStudentVisibleAsset(questionId: string): StudentVisibleAsset | undefined {
  const found = OFFICIAL_ASSETS.find((a) => a.questionId === questionId)
  if (!found) return undefined
  // teacherOnlyNote와 replacementRequiredBeforePilot은 학습자 화면에 절대 전달하지 않음
  const { teacherOnlyNote: _t, replacementRequiredBeforePilot: _r, ...visible } = found
  return visible
}
