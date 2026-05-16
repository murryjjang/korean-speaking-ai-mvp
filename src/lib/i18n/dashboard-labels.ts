// v1.1 단계 18 [C4, C5]: 학습자 대시보드·차트 라벨 i18n (KO/EN/VI/AR).
//
// /research/student/progress 화면 KPI·차트 헤더·모드명을 4언어로 제공한다.
// D8 `switch` 모드(선택한 언어만 표시)로 사용된다 — 한국어 외 언어를 고를 때
// 한국어를 함께 표시하지 않는다.

import type { DisplayLanguage } from './display-language'

type LabelMap = Record<DisplayLanguage, string>

// KPI 라벨
export const KPI_LABELS = {
  totalSessions: {
    ko: '총 세션',
    en: 'Total sessions',
    vi: 'Tổng phiên học',
    ar: 'إجمالي الجلسات',
  } satisfies LabelMap,
  cumulativeTime: {
    ko: '누적 학습 시간',
    en: 'Cumulative time',
    vi: 'Tổng thời gian học',
    ar: 'الوقت التراكمي',
  } satisfies LabelMap,
  thisWeek: {
    ko: '이번 주',
    en: 'This week',
    vi: 'Tuần này',
    ar: 'هذا الأسبوع',
  } satisfies LabelMap,
  assessmentCount: {
    ko: '평가 횟수',
    en: 'Assessments',
    vi: 'Số lần đánh giá',
    ar: 'عدد التقييمات',
  } satisfies LabelMap,
} as const

// 차트 헤더
export const CHART_LABELS = {
  modeDistribution: {
    ko: '모드별 사용 분포',
    en: 'Mode distribution',
    vi: 'Phân bố theo chế độ',
    ar: 'توزيع الأنماط',
  } satisfies LabelMap,
  last7Days: {
    ko: '최근 7일 학습 활동',
    en: 'Last 7 days activity',
    vi: 'Hoạt động 7 ngày qua',
    ar: 'نشاط آخر 7 أيام',
  } satisfies LabelMap,
  scoreTrend: {
    ko: '점수 추이',
    en: 'Score trend',
    vi: 'Xu hướng điểm số',
    ar: 'اتجاه الدرجات',
  } satisfies LabelMap,
  recentSessions: {
    ko: '최근 세션',
    en: 'Recent sessions',
    vi: 'Phiên gần đây',
    ar: 'الجلسات الأخيرة',
  } satisfies LabelMap,
  startLearning: {
    ko: '학습 시작',
    en: 'Start learning',
    vi: 'Bắt đầu học',
    ar: 'ابدأ التعلم',
  } satisfies LabelMap,
} as const

// 모드 이름
export const MODE_LABELS = {
  free_conversation: {
    ko: '자유 대화',
    en: 'Free conversation',
    vi: 'Hội thoại tự do',
    ar: 'محادثة حرة',
  } satisfies LabelMap,
  q1_repeat: {
    ko: 'q1 낭독',
    en: 'q1 Reading aloud',
    vi: 'q1 Đọc to',
    ar: 'q1 القراءة بصوت عال',
  } satisfies LabelMap,
  q2_describe: {
    ko: 'q2 설명',
    en: 'q2 Description',
    vi: 'q2 Mô tả',
    ar: 'q2 الوصف',
  } satisfies LabelMap,
  q3_picture: {
    ko: 'q3 그림',
    en: 'q3 Picture',
    vi: 'q3 Hình ảnh',
    ar: 'q3 الصورة',
  } satisfies LabelMap,
  q4_dialogue: {
    ko: 'q4 대화',
    en: 'q4 Dialogue',
    vi: 'q4 Đối thoại',
    ar: 'q4 الحوار',
  } satisfies LabelMap,
  presentation: {
    ko: '발표',
    en: 'Presentation',
    vi: 'Thuyết trình',
    ar: 'العرض',
  } satisfies LabelMap,
  reading: {
    ko: '읽기',
    en: 'Reading',
    vi: 'Đọc',
    ar: 'القراءة',
  } satisfies LabelMap,
} as const

// 모드 카드 (학습 시작 영역)
export const MODE_CARD_LABELS = {
  freeConvTitle: {
    ko: '생성형 자유 대화',
    en: 'Free Conversation',
    vi: 'Trò chuyện tự do',
    ar: 'محادثة حرة',
  } satisfies LabelMap,
  freeConvSubtitle: {
    ko: '페르소나 4명 중 선택해 일상 대화 연습',
    en: 'Pick a persona to practice daily conversation',
    vi: 'Chọn nhân vật để luyện hội thoại hằng ngày',
    ar: 'اختر شخصية لممارسة المحادثة اليومية',
  } satisfies LabelMap,
  speakingTitle: {
    ko: '말하기 평가 (q1~q4)',
    en: 'Speaking Assessment (Q1~Q4)',
    vi: 'Đánh giá nói (Q1~Q4)',
    ar: 'تقييم المحادثة (Q1~Q4)',
  } satisfies LabelMap,
  speakingSubtitle: {
    ko: '따라 읽기·묘사·그림 설명·대화',
    en: 'Read aloud, describe, picture, dialogue',
    vi: 'Đọc to · Mô tả · Hình ảnh · Hội thoại',
    ar: 'القراءة بصوت عال · الوصف · الصور · الحوار',
  } satisfies LabelMap,
  presentationTitle: {
    ko: '발표 연습',
    en: 'Presentation Practice',
    vi: 'Luyện thuyết trình',
    ar: 'تدريب العرض',
  } satisfies LabelMap,
  presentationSubtitle: {
    ko: '주제 발표 연습 + 즉시 피드백',
    en: 'Topic presentation with instant feedback',
    vi: 'Thuyết trình chủ đề với phản hồi tức thì',
    ar: 'عرض الموضوع مع ملاحظات فورية',
  } satisfies LabelMap,
  readingTitle: {
    ko: '읽기 연습',
    en: 'Reading Practice',
    vi: 'Luyện đọc',
    ar: 'تدريب القراءة',
  } satisfies LabelMap,
  readingSubtitle: {
    ko: '한국어 본문 읽기 + 발음 점수',
    en: 'Read Korean texts with pronunciation score',
    vi: 'Đọc văn bản tiếng Hàn + điểm phát âm',
    ar: 'قراءة النصوص الكورية مع درجة النطق',
  } satisfies LabelMap,
} as const

// 데이터 다운로드 섹션
export const DATA_DOWNLOAD_LABELS = {
  sectionTitle: {
    ko: '내 데이터 다운로드',
    en: 'My Data Download',
    vi: 'Tải dữ liệu của tôi',
    ar: 'تنزيل بياناتي',
  } satisfies LabelMap,
  sectionDescription: {
    ko: '참여자 본인의 누적 세션·발화·평가 기록을 CSV로 다운로드합니다 (개인정보 보호 차원).',
    en: 'Download your own accumulated session, utterance, and assessment records as CSV (for data privacy).',
    vi: 'Tải xuống các bản ghi phiên học, lời nói và đánh giá của bạn dưới dạng CSV (vì quyền riêng tư).',
    ar: 'قم بتنزيل سجلات الجلسات والكلام والتقييمات الخاصة بك بصيغة CSV (لحماية الخصوصية).',
  } satisfies LabelMap,
} as const

// 점수 단위 (X점 / X points)
export const SCORE_UNIT_LABELS = {
  scorePoints: {
    ko: '점',
    en: 'pts',
    vi: 'điểm',
    ar: 'نقطة',
  } satisfies LabelMap,
} as const

// 페이지 헤더
export const PAGE_LABELS = {
  progressTitle: {
    ko: '학습 진척 상황',
    en: 'Learning Progress',
    vi: 'Tiến độ học tập',
    ar: 'تقدم التعلم',
  } satisfies LabelMap,
  participantCode: {
    ko: '참여자 코드',
    en: 'Participant code',
    vi: 'Mã người tham gia',
    ar: 'رمز المشارك',
  } satisfies LabelMap,
  noSessionsMsg: {
    ko: '아직 세션이 없습니다. 아래 학습 모드 중 하나를 선택해 시작하세요.',
    en: 'No sessions yet. Choose a learning mode below to start.',
    vi: 'Chưa có phiên học. Hãy chọn một chế độ học bên dưới để bắt đầu.',
    ar: 'لا توجد جلسات بعد. اختر وضع تعلم أدناه للبدء.',
  } satisfies LabelMap,
  inProgress: {
    ko: '진행 중',
    en: 'In progress',
    vi: 'Đang tiến hành',
    ar: 'قيد التقدم',
  } satisfies LabelMap,
  completed: {
    ko: '완료',
    en: 'Completed',
    vi: 'Hoàn thành',
    ar: 'مكتمل',
  } satisfies LabelMap,
  logout: {
    ko: '로그아웃',
    en: 'Log out',
    vi: 'Đăng xuất',
    ar: 'تسجيل الخروج',
  } satisfies LabelMap,
  downloadOwnData: {
    ko: '내 데이터 CSV 다운로드',
    en: 'Download my data (CSV)',
    vi: 'Tải dữ liệu của tôi (CSV)',
    ar: 'تنزيل بياناتي (CSV)',
  } satisfies LabelMap,
} as const

// 시간 단위
export const TIME_UNITS = {
  seconds: {
    ko: '초',
    en: 's',
    vi: 'giây',
    ar: 'ث',
  } satisfies LabelMap,
  minutes: {
    ko: '분',
    en: 'min',
    vi: 'phút',
    ar: 'د',
  } satisfies LabelMap,
} as const

export type DashboardLabelKey =
  | { kind: 'kpi'; key: keyof typeof KPI_LABELS }
  | { kind: 'chart'; key: keyof typeof CHART_LABELS }
  | { kind: 'mode'; key: keyof typeof MODE_LABELS }
  | { kind: 'modeCard'; key: keyof typeof MODE_CARD_LABELS }
  | { kind: 'dataDownload'; key: keyof typeof DATA_DOWNLOAD_LABELS }
  | { kind: 'scoreUnit'; key: keyof typeof SCORE_UNIT_LABELS }
  | { kind: 'page'; key: keyof typeof PAGE_LABELS }
  | { kind: 'time'; key: keyof typeof TIME_UNITS }

export function getLabel(spec: DashboardLabelKey, lang: DisplayLanguage): string {
  switch (spec.kind) {
    case 'kpi':
      return KPI_LABELS[spec.key][lang]
    case 'chart':
      return CHART_LABELS[spec.key][lang]
    case 'mode':
      return MODE_LABELS[spec.key][lang]
    case 'modeCard':
      return MODE_CARD_LABELS[spec.key][lang]
    case 'dataDownload':
      return DATA_DOWNLOAD_LABELS[spec.key][lang]
    case 'scoreUnit':
      return SCORE_UNIT_LABELS[spec.key][lang]
    case 'page':
      return PAGE_LABELS[spec.key][lang]
    case 'time':
      return TIME_UNITS[spec.key][lang]
  }
}

export function fmtDuration(
  totalSeconds: number,
  lang: DisplayLanguage,
): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}${getLabel({ kind: 'time', key: 'seconds' }, lang)}`
  }
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  const minUnit = getLabel({ kind: 'time', key: 'minutes' }, lang)
  const secUnit = getLabel({ kind: 'time', key: 'seconds' }, lang)
  return s === 0 ? `${m}${minUnit}` : `${m}${minUnit} ${s}${secUnit}`
}
