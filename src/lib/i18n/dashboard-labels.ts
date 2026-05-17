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
    th: 'จำนวนเซสชันทั้งหมด',
    ms: 'Jumlah sesi',
    km: 'សម័យសរុប',
  } satisfies LabelMap,
  cumulativeTime: {
    ko: '누적 학습 시간',
    en: 'Cumulative time',
    vi: 'Tổng thời gian học',
    ar: 'الوقت التراكمي',
    th: 'เวลาการเรียนรู้สะสม',
    ms: 'Jumlah masa pembelajaran terkumpul',
    km: 'ម៉ោងសិក្សាដែលបានបូកចូល',
  } satisfies LabelMap,
  thisWeek: {
    ko: '이번 주',
    en: 'This week',
    vi: 'Tuần này',
    ar: 'هذا الأسبوع',
    th: 'สัปดาห์นี้',
    ms: 'minggu ini',
    km: 'សប្តាហ៍នេះ',
  } satisfies LabelMap,
  assessmentCount: {
    ko: '평가 횟수',
    en: 'Assessments',
    vi: 'Số lần đánh giá',
    ar: 'عدد التقييمات',
    th: 'จำนวนการประเมิน',
    ms: 'Bilangan penilaian',
    km: 'ចំនួនការប៉ាន់ប្រមាណ',
  } satisfies LabelMap,
} as const

// 차트 헤더
export const CHART_LABELS = {
  modeDistribution: {
    ko: '모드별 사용 분포',
    en: 'Mode distribution',
    vi: 'Phân bố theo chế độ',
    ar: 'توزيع الأنماط',
    th: 'การกระจายการใช้งานตามโหมด',
    ms: 'Pembahagian penggunaan mengikut mod',
    km: 'ការចែកចាយការប្រើប្រាស់តាមម៉ូដ',
  } satisfies LabelMap,
  last7Days: {
    ko: '최근 7일 학습 활동',
    en: 'Last 7 days activity',
    vi: 'Hoạt động 7 ngày qua',
    ar: 'نشاط آخر 7 أيام',
    th: 'กิจกรรมการเรียนรู้ใน 7 วันที่ผ่านมา',
    ms: 'Aktiviti pembelajaran 7 hari yang lalu',
    km: 'សកម្មភាពសិក្សា ៧ ថ្ងៃចុងក្រោយ',
  } satisfies LabelMap,
  scoreTrend: {
    ko: '점수 추이',
    en: 'Score trend',
    vi: 'Xu hướng điểm số',
    ar: 'اتجاه الدرجات',
    th: 'แนวโน้มคะแนน',
    ms: 'Perkembangan Skor',
    km: 'ចំណាត់ថ្នាក់នៃពិន្ទុ',
  } satisfies LabelMap,
  recentSessions: {
    ko: '최근 세션',
    en: 'Recent sessions',
    vi: 'Phiên gần đây',
    ar: 'الجلسات الأخيرة',
    th: 'เซสชันล่าสุด',
    ms: 'Sesi terkini',
    km: 'សេសសន៍ចុងក្រោយ',
  } satisfies LabelMap,
  startLearning: {
    ko: '학습 시작',
    en: 'Start learning',
    vi: 'Bắt đầu học',
    ar: 'ابدأ التعلم',
    th: 'เริ่มการเรียนรู้',
    ms: 'Mula belajar',
    km: 'ចាប់ផ្តើមការសិក្សា',
  } satisfies LabelMap,
} as const

// 모드 이름
export const MODE_LABELS = {
  free_conversation: {
    ko: '자유 대화',
    en: 'Free conversation',
    vi: 'Hội thoại tự do',
    ar: 'محادثة حرة',
    th: 'การสนทนาอย่างอิสระ',
    ms: 'Perbualan bebas',
    km: 'ការសន្ទនាដោយសេរី',
  } satisfies LabelMap,
  q1_repeat: {
    ko: 'q1 낭독',
    en: 'q1 Reading aloud',
    vi: 'q1 Đọc to',
    ar: 'q1 القراءة بصوت عال',
    th: 'q1 การอ่านออกเสียง',
    ms: 'q1 pembacaan',
    km: 'q1 ការអាន',
  } satisfies LabelMap,
  q2_describe: {
    ko: 'q2 설명',
    en: 'q2 Description',
    vi: 'q2 Mô tả',
    ar: 'q2 الوصف',
    th: 'q2 อธิบาย',
    ms: 'q2 penerangan',
    km: 'q2 ពន្យល់',
  } satisfies LabelMap,
  q3_picture: {
    ko: 'q3 그림',
    en: 'q3 Picture',
    vi: 'q3 Hình ảnh',
    ar: 'q3 الصورة',
    th: 'q3 รูปภาพ',
    ms: 'q3 gambar',
    km: 'q3 រូបភាព',
  } satisfies LabelMap,
  q4_dialogue: {
    ko: 'q4 대화',
    en: 'q4 Dialogue',
    vi: 'q4 Đối thoại',
    ar: 'q4 الحوار',
    th: 'q4 การสนทนา',
    ms: 'q4 perbualan',
    km: 'q4 សន្ទនា',
  } satisfies LabelMap,
  presentation: {
    ko: '발표',
    en: 'Presentation',
    vi: 'Thuyết trình',
    ar: 'العرض',
    th: 'การนำเสนอ',
    ms: 'Pembentangan',
    km: 'ការបង្ហាញ',
  } satisfies LabelMap,
  reading: {
    ko: '읽기',
    en: 'Reading',
    vi: 'Đọc',
    ar: 'القراءة',
    th: 'การอ่าน',
    ms: 'Membaca',
    km: 'អាន',
  } satisfies LabelMap,
} as const

// 모드 카드 (학습 시작 영역)
export const MODE_CARD_LABELS = {
  freeConvTitle: {
    ko: '생성형 자유 대화',
    en: 'Free Conversation',
    vi: 'Trò chuyện tự do',
    ar: 'محادثة حرة',
    th: 'การสนทนาแบบเสรีที่สร้างสรรค์',
    ms: 'Perbualan bebas generatif',
    km: 'ការសន្ទនាដោយសេរីប្រភេទបង្កើត',
  } satisfies LabelMap,
  freeConvSubtitle: {
    ko: '페르소나 4명 중 선택해 일상 대화 연습',
    en: 'Pick a persona to practice daily conversation',
    vi: 'Chọn nhân vật để luyện hội thoại hằng ngày',
    ar: 'اختر شخصية لممارسة المحادثة اليومية',
    th: 'เลือกตัวละครจาก Persona 4 เพื่อฝึกสนทนาในชีวิตประจำวัน',
    ms: 'Pilih salah satu daripada 4 watak untuk latihan perbualan harian.',
    km: 'ជ្រើសរើសពីតួអង្គ ៤ នាក់សម្រាប់ហ្វឹកហាត់ការសន្ទនាប្រចាំថ្ងៃ',
  } satisfies LabelMap,
  speakingTitle: {
    ko: '말하기 평가 (q1~q4)',
    en: 'Speaking Assessment (Q1~Q4)',
    vi: 'Đánh giá nói (Q1~Q4)',
    ar: 'تقييم المحادثة (Q1~Q4)',
    th: 'การประเมินการพูด (q1~q4)',
    ms: 'Penilaian bercakap (q1~q4)',
    km: 'ការប៉ាន់ប្រមាណការនិយាយ (q1~q4)',
  } satisfies LabelMap,
  speakingSubtitle: {
    ko: '따라 읽기·묘사·그림 설명·대화',
    en: 'Read aloud, describe, picture, dialogue',
    vi: 'Đọc to · Mô tả · Hình ảnh · Hội thoại',
    ar: 'القراءة بصوت عال · الوصف · الصور · الحوار',
    th: 'การอ่านตาม·การบรรยาย·การอธิบายภาพ·การสนทนา',
    ms: 'Membaca bersama·Penerangan·Huraian gambar·Perbualan',
    km: 'អានតាម·ពិពណ៌នា·ការពិពណ៌នារូបភាព·ការសន្ទនា',
  } satisfies LabelMap,
  presentationTitle: {
    ko: '발표 연습',
    en: 'Presentation Practice',
    vi: 'Luyện thuyết trình',
    ar: 'تدريب العرض',
    th: 'การฝึกซ้อมการนำเสนอ',
    ms: 'Latihan pembentangan',
    km: 'ការអនុវត្តន៍ការបង្ហាញ',
  } satisfies LabelMap,
  presentationSubtitle: {
    ko: '주제 발표 연습 + 즉시 피드백',
    en: 'Topic presentation with instant feedback',
    vi: 'Thuyết trình chủ đề với phản hồi tức thì',
    ar: 'عرض الموضوع مع ملاحظات فورية',
    th: 'การฝึกนำเสนอหัวข้อ + ข้อเสนอแนะแบบทันที',
    ms: 'Latihan pembentangan tema + maklum balas segera',
    km: 'ការអនុវត្តន៍ការបង្ហាញប្រធានបទ + មតិយោបល់ភ្លាមៗ',
  } satisfies LabelMap,
  readingTitle: {
    ko: '읽기 연습',
    en: 'Reading Practice',
    vi: 'Luyện đọc',
    ar: 'تدريب القراءة',
    th: 'การฝึกอ่าน',
    ms: 'Latihan Membaca',
    km: 'ការអនុវត្តអាន',
  } satisfies LabelMap,
  readingSubtitle: {
    ko: '한국어 본문 읽기 + 발음 점수',
    en: 'Read Korean texts with pronunciation score',
    vi: 'Đọc văn bản tiếng Hàn + điểm phát âm',
    ar: 'قراءة النصوص الكورية مع درجة النطق',
    th: 'การอ่านเนื้อหาภาษาเกาหลี + คะแนนการออกเสียง',
    ms: 'Membaca teks dalam bahasa Korea + Skor sebutan',
    km: 'អានអត្ថបទកូរ៉េ + ពិន្ទុសំឡេង',
  } satisfies LabelMap,
} as const

// 데이터 다운로드 섹션
export const DATA_DOWNLOAD_LABELS = {
  sectionTitle: {
    ko: '내 데이터 다운로드',
    en: 'My Data Download',
    vi: 'Tải dữ liệu của tôi',
    ar: 'تنزيل بياناتي',
    th: 'ดาวน์โหลดข้อมูลของฉัน',
    ms: 'Muat turun data saya',
    km: 'ទាញយកទិន្នន័យរបស់ខ្ញុំ',
  } satisfies LabelMap,
  sectionDescription: {
    ko: '참여자 본인의 누적 세션·발화·평가 기록을 CSV로 다운로드합니다 (개인정보 보호 차원).',
    en: 'Download your own accumulated session, utterance, and assessment records as CSV (for data privacy).',
    vi: 'Tải xuống các bản ghi phiên học, lời nói và đánh giá của bạn dưới dạng CSV (vì quyền riêng tư).',
    ar: 'قم بتنزيل سجلات الجلسات والكلام والتقييمات الخاصة بك بصيغة CSV (لحماية الخصوصية).',
    th: 'ดาวน์โหลดบันทึกเซสชัน, การพูด, และการประเมินผลสะสมของผู้เข้าร่วมในรูปแบบ CSV (เพื่อความเป็นส่วนตัว).',
    ms: 'Peserta boleh memuat turun rekod sesi, ucapan, dan penilaian terkumpul mereka dalam format CSV (dari segi perlindungan data peribadi).',
    km: 'អ្នកអាចទាញយកកំណត់ត្រាសម័យ·ការបញ្ចេញមតិ·ការវាយតម្លៃរបស់អ្នកដោយប្រើ CSV (ដើម្បីការពារព័ត៌មានផ្ទាល់ខ្លួន)។',
  } satisfies LabelMap,
} as const

// 점수 단위 (X점 / X points)
export const SCORE_UNIT_LABELS = {
  scorePoints: {
    ko: '점',
    en: 'pts',
    vi: 'điểm',
    ar: 'نقطة',
    th: 'จุด',
    ms: 'titik',
    km: 'ពិន្ទុ',
  } satisfies LabelMap,
} as const

// v1.1 단계 19.5 [L.1]: OPIc/TOPIK 식 종합 점수 박스 라벨
export const OVERALL_SCORE_LABELS = {
  title: {
    ko: '종합 점수',
    en: 'Overall Score',
    vi: 'Điểm tổng',
    ar: 'النتيجة الإجمالية',
    th: 'คะแนนรวม',
    ms: 'Jumlah skor',
    km: 'ពិន្ទុសរុប',
  } satisfies LabelMap,
  level: {
    ko: '수준',
    en: 'Level',
    vi: 'Cấp độ',
    ar: 'المستوى',
    th: 'ระดับ',
    ms: 'tahap',
    km: 'កម្រិត',
  } satisfies LabelMap,
  basedOn: {
    ko: '평가 누적',
    en: 'Based on',
    vi: 'Dựa trên',
    ar: 'بناءً على',
    th: 'การสะสมการประเมิน',
    ms: 'Penilaian terkumpul',
    km: 'ការប្រមូលផ្តុំការវាយតម្លៃ',
  } satisfies LabelMap,
  assessmentsUnit: {
    ko: '건',
    en: 'assessments',
    vi: 'lần đánh giá',
    ar: 'تقييمات',
    th: 'การ',
    ms: '건',
    km: 'កាន់',
  } satisfies LabelMap,
  insufficient: {
    ko: '평가 데이터 5건 이상 누적 시 표시됩니다.',
    en: 'Displayed once 5 or more assessments are accumulated.',
    vi: 'Hiển thị khi tích lũy đủ 5 lần đánh giá trở lên.',
    ar: 'سيتم العرض عند تجميع 5 تقييمات أو أكثر.',
    th: 'จะแสดงเมื่อมีการสะสมข้อมูลการประเมินมากกว่า 5 รายการ.',
    ms: 'Ia akan dipaparkan apabila data penilaian terkumpul melebihi 5.',
    km: 'បង្ហាញនៅពេលមានទិន្នន័យការវាយតម្លៃចំនួន ៥ ករណីឡើងទៅ។',
  } satisfies LabelMap,
} as const

// OPIc/TOPIK 식 등급 — 점수 비율에 따라 분류.
// 80% 이상 = 상급(Advanced), 65-79% = 중상급(Intermediate High),
// 50-64% = 중급(Intermediate), 35-49% = 초급(Novice High), 그 외 Novice.
export const SCORE_LEVEL_LABELS = {
  advanced: {
    ko: '상급 (Advanced)',
    en: 'Advanced',
    vi: 'Cao cấp',
    ar: 'متقدم',
    th: 'ระดับสูง (Advanced)',
    ms: 'Tinggi (Advanced)',
    km: 'កម្រិតខ្ពស់ (Advanced)',
  } satisfies LabelMap,
  intermediateHigh: {
    ko: '중상급 (Intermediate High)',
    en: 'Intermediate High',
    vi: 'Trung cao',
    ar: 'متوسط مرتفع',
    th: 'ระดับกลางสูง (Intermediate High)',
    ms: 'Pertengahan Tinggi (Intermediate High)',
    km: 'មធ្យមខ្ពស់ (Intermediate High)',
  } satisfies LabelMap,
  intermediate: {
    ko: '중급 (Intermediate)',
    en: 'Intermediate',
    vi: 'Trung cấp',
    ar: 'متوسط',
    th: 'ระดับกลาง (Intermediate)',
    ms: 'Pertengahan (Intermediate)',
    km: 'មធ្យម (Intermediate)',
  } satisfies LabelMap,
  noviceHigh: {
    ko: '초상급 (Novice High)',
    en: 'Novice High',
    vi: 'Sơ cao',
    ar: 'مبتدئ مرتفع',
    th: 'ระดับเริ่มต้นสูง (Novice High)',
    ms: 'Tahap Permulaan Tinggi (Novice High)',
    km: 'កម្រិតដំបូង (Novice High)',
  } satisfies LabelMap,
  novice: {
    ko: '초급 (Novice)',
    en: 'Novice',
    vi: 'Sơ cấp',
    ar: 'مبتدئ',
    th: 'ระดับเริ่มต้น (Novice)',
    ms: 'Pemula (Novice)',
    km: 'កម្រិតដំបូង (Novice)',
  } satisfies LabelMap,
} as const

/** 점수 비율(0~1)에서 등급 키 산출. */
export function scoreLevelKey(ratio: number): keyof typeof SCORE_LEVEL_LABELS {
  if (ratio >= 0.8) return 'advanced'
  if (ratio >= 0.65) return 'intermediateHigh'
  if (ratio >= 0.5) return 'intermediate'
  if (ratio >= 0.35) return 'noviceHigh'
  return 'novice'
}

// v1.1 단계 19.8 [UI보조]: 학습자 사이드바 메뉴 5개 — Korean + mother_tongue 보조.
// Sidebar는 navItems의 href와 매칭해 라벨을 결정. 키는 의미 단위로 안정 (i18n 표준).
export const SIDEBAR_LABELS = {
  studentProgress: {
    ko: '내 학습 현황',
    en: 'My Progress',
    vi: 'Tiến độ học tập',
    ar: 'تقدم التعلم',
    th: 'สถานะการเรียนรู้ของฉัน',
    ms: 'Status pembelajaran saya',
    km: 'ស្ថានភាពការសិក្សារបស់ខ្ញុំ',
  } satisfies LabelMap,
  studentSpeaking: {
    ko: '말하기 평가',
    en: 'Speaking Assessment',
    vi: 'Đánh giá nói',
    ar: 'تقييم التحدث',
    th: 'การประเมินการพูด',
    ms: 'Penilaian bercakap',
    km: 'ការប៉ាន់ប្រមាណការនិយាយ',
  } satisfies LabelMap,
  studentReading: {
    ko: '읽기연습',
    en: 'Reading Practice',
    vi: 'Luyện đọc',
    ar: 'تدريب القراءة',
    th: 'การฝึกอ่าน',
    ms: 'Latihan Membaca',
    km: 'ការអនុវត្តអាន',
  } satisfies LabelMap,
  studentPresentation: {
    ko: '발표연습',
    en: 'Presentation Practice',
    vi: 'Luyện thuyết trình',
    ar: 'تدريب العرض',
    th: 'การฝึกซ้อมการนำเสนอ',
    ms: 'Latihan Pembentangan',
    km: 'ការអនុវត្តន៍ការបង្ហាញ',
  } satisfies LabelMap,
  studentConversation: {
    ko: '생성형 대화',
    en: 'Free Conversation',
    vi: 'Trò chuyện tự do',
    ar: 'محادثة حرة',
    th: 'การสนทนาที่สร้างสรรค์',
    ms: 'Perbualan generatif',
    km: 'ការសន្ទនាបង្កើត',
  } satisfies LabelMap,
} as const

// 페이지 헤더
export const PAGE_LABELS = {
  progressTitle: {
    ko: '학습 진척 상황',
    en: 'Learning Progress',
    vi: 'Tiến độ học tập',
    ar: 'حالة التقدم في التعلم',
    th: 'สถานการณ์ความก้าวหน้าของการเรียนรู้',
    ms: 'Kemajuan pembelajaran',
    km: 'ស្ថានភាពការរីកចម្រើននៃការសិក្សា',
  } satisfies LabelMap,
  // v1.1 단계 19.8 [UI보조]: 다음 페이지 제목들도 mother_tongue 보조 표기.
  evaluationResult: {
    ko: '평가 결과',
    en: 'Assessment Result',
    vi: 'Kết quả đánh giá',
    ar: 'نتيجة التقييم',
    th: 'ผลการประเมิน',
    ms: 'Keputusan penilaian',
    km: 'លទ្ធផលការវាយតម្លៃ',
  } satisfies LabelMap,
  freeConversationPractice: {
    ko: '생성형 대화 연습',
    en: 'Free Conversation Practice',
    vi: 'Luyện trò chuyện tự do',
    ar: 'تدريب المحادثة الحرة',
    th: 'การฝึกสนทนาเชิงสร้างสรรค์',
    ms: 'Latihan perbualan generatif',
    km: 'ការអនុវត្តន៍សន្ទនាបង្កើត',
  } satisfies LabelMap,
  chooseConversationPartner: {
    ko: '대화 상대 선택',
    en: 'Choose Conversation Partner',
    vi: 'Chọn người trò chuyện',
    ar: 'اختر شريك المحادثة',
    th: 'เลือกคู่สนทนา',
    ms: 'Pilih rakan perbualan',
    km: 'ជ្រើសរើសអ្នកនិយាយ',
  } satisfies LabelMap,
  participantCode: {
    ko: '참여자 코드',
    en: 'Participant code',
    vi: 'Mã người tham gia',
    ar: 'رمز المشارك',
    th: 'รหัสผู้เข้าร่วม',
    ms: 'Kod peserta',
    km: 'កូដអ្នកចូលរួម',
  } satisfies LabelMap,
  noSessionsMsg: {
    ko: '아직 세션이 없습니다. 아래 학습 모드 중 하나를 선택해 시작하세요.',
    en: 'No sessions yet. Choose a learning mode below to start.',
    vi: 'Chưa có phiên học. Hãy chọn một chế độ học bên dưới để bắt đầu.',
    ar: 'لا توجد جلسات بعد. اختر وضع تعلم أدناه للبدء.',
    th: 'ยังไม่มีเซสชัน กรุณาเลือกโหมดการเรียนรู้หนึ่งในด้านล่างเพื่อเริ่มต้น',
    ms: 'Belum ada sesi. Sila pilih salah satu mod pembelajaran di bawah untuk memulakan.',
    km: 'មិនមានសេសស្យនណាមួយទេ។ សូមជ្រើសរើសមូដសិក្សាមួយនៅខាងក្រោមដើម្បីចាប់ផ្តើម។',
  } satisfies LabelMap,
  inProgress: {
    ko: '진행 중',
    en: 'In progress',
    vi: 'Đang tiến hành',
    ar: 'قيد التقدم',
    th: 'กำลังดำเนินการอยู่',
    ms: 'Sedang berlangsung',
    km: 'កំពុងដំណើរការ',
  } satisfies LabelMap,
  completed: {
    ko: '완료',
    en: 'Completed',
    vi: 'Hoàn thành',
    ar: 'مكتمل',
    th: 'เสร็จสิ้น',
    ms: 'Selesai',
    km: 'បានបញ្ចប់',
  } satisfies LabelMap,
  logout: {
    ko: '로그아웃',
    en: 'Log out',
    vi: 'Đăng xuất',
    ar: 'تسجيل الخروج',
    th: 'ออกจากระบบ',
    ms: 'Log Keluar',
    km: 'ចេញពីប្រព័ន្ធ',
  } satisfies LabelMap,
  downloadOwnData: {
    ko: '내 데이터 CSV 다운로드',
    en: 'Download my data (CSV)',
    vi: 'Tải dữ liệu của tôi (CSV)',
    ar: 'تنزيل بياناتي (CSV)',
    th: 'ดาวน์โหลด CSV ข้อมูลของฉัน',
    ms: 'Muat turun CSV data saya',
    km: 'ទាញយក CSV ទិន្នន័យរបស់ខ្ញុំ',
  } satisfies LabelMap,
} as const

// 시간 단위
export const TIME_UNITS = {
  seconds: {
    ko: '초',
    en: 's',
    vi: 'giây',
    ar: 'ث',
    th: 'เริ่มต้น',
    ms: '초',
    km: 'ចូរ',
  } satisfies LabelMap,
  minutes: {
    ko: '분',
    en: 'min',
    vi: 'phút',
    ar: 'د',
    th: 'หน่วย',
    ms: 'bahagian',
    km: 'ភាគ',
  } satisfies LabelMap,
} as const

export type DashboardLabelKey =
  | { kind: 'kpi'; key: keyof typeof KPI_LABELS }
  | { kind: 'chart'; key: keyof typeof CHART_LABELS }
  | { kind: 'mode'; key: keyof typeof MODE_LABELS }
  | { kind: 'modeCard'; key: keyof typeof MODE_CARD_LABELS }
  | { kind: 'dataDownload'; key: keyof typeof DATA_DOWNLOAD_LABELS }
  | { kind: 'scoreUnit'; key: keyof typeof SCORE_UNIT_LABELS }
  | { kind: 'overallScore'; key: keyof typeof OVERALL_SCORE_LABELS }
  | { kind: 'scoreLevel'; key: keyof typeof SCORE_LEVEL_LABELS }
  | { kind: 'sidebar'; key: keyof typeof SIDEBAR_LABELS }
  | { kind: 'page'; key: keyof typeof PAGE_LABELS }
  | { kind: 'time'; key: keyof typeof TIME_UNITS }
  | { kind: 'practice'; key: keyof typeof PRACTICE_LABELS }

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
    case 'overallScore':
      return OVERALL_SCORE_LABELS[spec.key][lang]
    case 'scoreLevel':
      return SCORE_LEVEL_LABELS[spec.key][lang]
    case 'sidebar':
      return SIDEBAR_LABELS[spec.key][lang]
    case 'page':
      return PAGE_LABELS[spec.key][lang]
    case 'time':
      return TIME_UNITS[spec.key][lang]
    case 'practice':
      return PRACTICE_LABELS[spec.key][lang]
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

// v1.1 단계 19.9 [페이즈4]: 학습 모드 페이지 본문 라벨 (Q2=a 본문 라벨 보조 표기).
// 19.8까지는 사이드바·모드 카드·페이지 제목만 보조 표기됐고, 페이지 본문 내부
// 라벨(난이도 배지·primary 액션·필드명·상태)은 한국어 단독이었다. 19.9에서
// 본 영역까지 확장 — 모든 라벨에 mother_tongue 보조 작은 글씨 추가.
export const PRACTICE_LABELS = {
  diff_beginner: {
    ko: "초급",
    en: "Beginner",
    vi: "Cơ bản",
    ar: "مبتدئ",
    th: "ระดับเริ่มต้น",
    ms: "Asas",
    km: "កម្រិតដំបូង",
  } satisfies LabelMap,
  diff_intermediate: {
    ko: "중급",
    en: "Intermediate",
    vi: "Trung cấp",
    ar: "متوسط",
    th: "ระดับกลาง",
    ms: "Pertengahan",
    km: "មធ្យម",
  } satisfies LabelMap,
  diff_advanced: {
    ko: "고급",
    en: "Advanced",
    vi: "Nâng cao",
    ar: "متقدم",
    th: "ระดับสูง",
    ms: "Tinggi",
    km: "កម្រិតខ្ពស់",
  } satisfies LabelMap,
  purpose_official: {
    ko: "정식 평가",
    en: "Formal Assessment",
    vi: "Đánh giá chính thức",
    ar: "تقييم رسمي",
    th: "การประเมินอย่างเป็นทางการ",
    ms: "Penilaian Rasmi",
    km: "ការប៉ាន់ប្រមាណយ៉ាងផ្លូវការនៅក្នុងការសិក្សា",
  } satisfies LabelMap,
  purpose_diagnostic: {
    ko: "진단평가",
    en: "Diagnostic Assessment",
    vi: "Đánh giá chẩn đoán",
    ar: "تقييم تشخيصي",
    th: "การประเมินผลการวินิจฉัย",
    ms: "Penilaian Diagnostik",
    km: "ការវាយតម្លៃជំនាញ",
  } satisfies LabelMap,
  purpose_practice: {
    ko: "연습평가",
    en: "Practice Assessment",
    vi: "Đánh giá thực hành",
    ar: "تقييم الممارسة",
    th: "การประเมินผลการฝึกฝน",
    ms: "Penilaian Latihan",
    km: "ការប៉ាន់ប្រមាណអនុវត្ត",
  } satisfies LabelMap,
  action_startInOrder: {
    ko: "1번부터 순서대로 응시하기",
    en: "Take the exam in order starting from 1.",
    vi: "Tham gia từ câu 1 theo thứ tự.",
    ar: "ابدأ من الرقم 1 بالترتيب",
    th: "ทำการสอบตามลำดับตั้งแต่ข้อที่ 1",
    ms: "Ambil ujian secara berurutan dari nombor 1.",
    km: "ចាប់ផ្តើមពីលេខ ១ តាមលំដាប់",
  } satisfies LabelMap,
  action_start: {
    ko: "시작하기",
    en: "Get Started",
    vi: "Bắt đầu",
    ar: "ابدأ",
    th: "เริ่มต้น",
    ms: "Mulakan",
    km: "ចាប់ផ្តើម",
  } satisfies LabelMap,
  action_recordPresentation: {
    ko: "발표 녹음 시작",
    en: "Start recording presentation",
    vi: "Bắt đầu ghi âm bài thuyết trình",
    ar: "بدء تسجيل العرض",
    th: "เริ่มบันทึกการนำเสนอ",
    ms: "Mulakan rakaman pembentangan",
    km: "ចាប់ផ្តើមកំណត់សំឡេងការបង្ហាញ",
  } satisfies LabelMap,
  action_endConversation: {
    ko: "대화 종료",
    en: "End conversation",
    vi: "Kết thúc cuộc trò chuyện",
    ar: "إنهاء المحادثة",
    th: "สิ้นสุดการสนทนา",
    ms: "Akhiri perbualan",
    km: "បញ្ចប់ការសន្ទនា",
  } satisfies LabelMap,
  action_tryNow: {
    ko: "체험하기",
    en: "Experience",
    vi: "Trải nghiệm",
    ar: "تجربة",
    th: "ลองใช้งาน",
    ms: "Cuba Sekarang",
    km: "សាកល្បង",
  } satisfies LabelMap,
  field_topic: {
    ko: "주제",
    en: "Topic",
    vi: "Chủ đề",
    ar: "موضوع",
    th: "หัวข้อ",
    ms: "Tajuk",
    km: "ប្រធានបទ",
  } satisfies LabelMap,
  field_elapsed: {
    ko: "경과",
    en: "Elapsed",
    vi: "Tiến trình",
    ar: "المدة",
    th: "ระยะเวลา",
    ms: "Perjalanan",
    km: "កំណត់",
  } satisfies LabelMap,
  field_presentationTopic: {
    ko: "발표 주제",
    en: "Presentation Topic",
    vi: "Chủ đề thuyết trình",
    ar: "موضوع العرض",
    th: "หัวข้อการนำเสนอ",
    ms: "Tajuk Pembentangan",
    km: "ប្រធានបទនៃការបង្ហាញ",
  } satisfies LabelMap,
  field_presentationLevel: {
    ko: "발표 수준",
    en: "Presentation Level",
    vi: "Cấp độ thuyết trình",
    ar: "مستوى العرض",
    th: "ระดับการนำเสนอ",
    ms: "Tahap Pembentangan",
    km: "កម្រិតការបង្ហាញ",
  } satisfies LabelMap,
  field_targetTime: {
    ko: "목표 발표 시간",
    en: "Goal Presentation Time",
    vi: "Thời gian công bố mục tiêu",
    ar: "وقت عرض الهدف",
    th: "เวลานำเสนอเป้าหมาย",
    ms: "Masa Pembentangan Matlamat",
    km: "ពេលវេលាផ្សាយគោលបំណង",
  } satisfies LabelMap,
  field_presentationScript: {
    ko: "발표 원고",
    en: "Presentation script",
    vi: "Bài phát biểu",
    ar: "نص العرض",
    th: "เอกสารการนำเสนอ",
    ms: "Draf Pembentangan",
    km: "អត្ថបទសម្តែង",
  } satisfies LabelMap,
  setting_learningSetup: {
    ko: "학습 설정",
    en: "Learning Settings",
    vi: "Cài đặt học tập",
    ar: "إعدادات التعلم",
    th: "การตั้งค่าการเรียนรู้",
    ms: "Tetapan Pembelajaran",
    km: "ការកំណត់ការសិក្សា",
  } satisfies LabelMap,
  setting_presentationSetup: {
    ko: "발표 설정",
    en: "Presentation Settings",
    vi: "Cài đặt bài thuyết trình",
    ar: "إعداد العرض",
    th: "การตั้งค่าการนำเสนอ",
    ms: "Tetapan Pembentangan",
    km: "ការកំណត់ការបង្ហាញ",
  } satisfies LabelMap,
  state_inProgress: {
    ko: "진행 중",
    en: "In Progress",
    vi: "Đang tiến hành",
    ar: "جاري التنفيذ",
    th: "กำลังดำเนินการ",
    ms: "Sedang berlangsung",
    km: "កំពុងដំណើរការ",
  } satisfies LabelMap,
  state_completed: {
    ko: "완료",
    en: "Completed",
    vi: "Hoàn thành",
    ar: "تم الانتهاء",
    th: "เสร็จสิ้น",
    ms: "Selesai",
    km: "បានបញ្ចប់",
  } satisfies LabelMap,
  state_ready: {
    ko: "체험 가능",
    en: "Available for trial",
    vi: "Có thể trải nghiệm",
    ar: "تجربة متاحة",
    th: "ทดลองใช้งานได้",
    ms: "Boleh dicuba",
    km: "អាចសាកល្បងបាន",
  } satisfies LabelMap,
  state_preparing: {
    ko: "준비 중",
    en: "Preparing",
    vi: "Đang chuẩn bị",
    ar: "قيد التحضير",
    th: "กำลังเตรียมการ",
    ms: "Sedang bersiap",
    km: "កំពុងរៀបចំ",
  } satisfies LabelMap,
  meta_pronunciationAzure: {
    ko: "발음 평가 (Azure)",
    en: "Pronunciation Assessment (Azure)",
    vi: "Đánh giá phát âm (Azure)",
    ar: "تقييم النطق (Azure)",
    th: "การประเมินการออกเสียง (Azure)",
    ms: "Penilaian Sebutan (Azure)",
    km: "ការប៉ាន់ប្រមាណសំឡេង (Azure)",
  } satisfies LabelMap,
  meta_npcAutoPlay: {
    ko: "NPC 음성 자동 재생",
    en: "NPC Voice Auto Play",
    vi: "Tự động phát giọng NPC",
    ar: "تشغيل صوت NPC تلقائيًا",
    th: "การเล่นเสียง NPC อัตโนมัติ",
    ms: "Pemain NPC suara automatik",
    km: "ការបញ្ចេញសំឡេង NPC ធ្វើឡើងដោយស្វ័យប្រវត្តិ",
  } satisfies LabelMap,
  meta_prepTime: {
    ko: "준비",
    en: "Ready",
    vi: "Chuẩn bị",
    ar: "استعداد",
    th: "เตรียมพร้อม",
    ms: "Sedia",
    km: "រៀបចំ",
  } satisfies LabelMap,
  meta_answerTime: {
    ko: "답변",
    en: "Answer",
    vi: "Câu trả lời",
    ar: "إجابة",
    th: "คำตอบ",
    ms: "Jawapan",
    km: "ចម្លើយ",
  } satisfies LabelMap,
} as const
