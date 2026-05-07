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
  /** TTS fallback script for audio assets when src is empty.
   *  Used for browser/Azure TTS playback only — text is NOT displayed to the student. */
  ttsScript?: string
}

type OfficialAsset = StudentVisibleAsset & {
  teacherOnlyNote: string
  replacementRequiredBeforePilot: boolean
}

const OFFICIAL_ASSETS: OfficialAsset[] = [
  // beginner q2: 카페 주문 장면 (PNG — 시연용 제공 이미지)
  // SVG fallback: public/images/official/beginner-restaurant-scene.svg
  {
    assetId: 'beginner-cafe-order-image',
    questionId: 'beginner-q2-material-description',
    assetType: 'image',
    displayTitle: '카페에서 음료를 주문하는 장면',
    studentVisibleDescription: '카페에서 손님이 음료를 주문하는 장면을 보고 설명하세요.',
    src: '/images/official/beginner-cafe-order-scene.png',
    alt: '카페에서 손님이 아이스 아메리카노를 주문하는 장면',
    status: 'ready',
    teacherOnlyNote:
      '시연용 제공 PNG 사용 중. 파일럿 전 저작권 확인 필요. fallback SVG: public/images/official/beginner-restaurant-scene.svg.',
    replacementRequiredBeforePilot: false,
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
    // TTS fallback: played via browser/Azure TTS when src is empty. Text is NOT shown to student.
    ttsScript: '여러분, 내일 한국어 수업은 오전 10시에 시작합니다. 수업은 2층 203호에서 합니다. 학생들은 교재와 필기구를 꼭 가져오세요.',
    status: 'placeholder',
    teacherOnlyNote:
      '파일럿 전 실제 mp3 등록 필요. 경로: /public/audio/official/beginner-korean-class-announcement.mp3. ttsScript는 실제 mp3 등록 시 제거 가능.',
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
    ttsScript: '다음 주 발표 수업 일정이 변경되었습니다. 원래 수요일에 진행될 예정이었지만, 금요일 오후 1시로 변경되었습니다. 장소는 본관 203호입니다. 학생들은 발표 자료를 목요일 오후 6시까지 이메일로 제출해야 합니다.',
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
    ttsScript: '최근 많은 교육기관에서 대면 수업과 온라인 수업을 함께 운영하는 혼합형 수업 방식을 도입하고 있습니다. 이 방식의 장점은 학습자가 시간과 장소의 제약을 줄일 수 있고, 온라인 자료를 반복해서 복습할 수 있다는 점입니다. 하지만 학습자의 자기 관리 능력이 부족하면 학습 효과가 떨어질 수 있습니다. 따라서 혼합형 수업을 운영할 때는 정기적인 피드백과 출석 관리가 함께 이루어져야 합니다.',
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
