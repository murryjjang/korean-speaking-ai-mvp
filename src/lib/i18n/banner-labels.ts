// ============================================================
// 대시보드 배너 다국어 라벨 (Task 1.6)
//
// 배너 3종: progress(오늘 진도) · vocab(새 단어/복습) · model_answer(모범답안 알림).
// 7언어(en/vi/ar/ko/th/ms/km). body 의 {n} 은 렌더 시 수치로 치환.
// ⚠️ 기본 문안 — 본인 wording 검토 대상(위치·종류·디스미스는 default).
// ============================================================

export const BANNER_TYPES = ['progress', 'vocab', 'model_answer'] as const
export type BannerType = (typeof BANNER_TYPES)[number]

export const BANNER_LANGS = ['en', 'vi', 'ar', 'ko', 'th', 'ms', 'km'] as const
export type BannerLang = (typeof BANNER_LANGS)[number]

export type BannerLabel = { title: string; body: string }

export const BANNER_LABELS: Record<BannerLang, Record<BannerType, BannerLabel>> = {
  ko: {
    progress: { title: '오늘의 학습', body: '오늘도 한국어 말하기를 연습해 보세요.' },
    vocab: { title: '단어 복습', body: '복습할 단어가 {n}개 있어요.' },
    model_answer: { title: '모범답안', body: '모범답안을 듣고 내 답변과 비교해 보세요.' },
  },
  en: {
    progress: { title: "Today's learning", body: 'Practice your Korean speaking today.' },
    vocab: { title: 'Vocabulary review', body: 'You have {n} words to review.' },
    model_answer: { title: 'Model answers', body: 'Listen to model answers and compare with yours.' },
  },
  vi: {
    progress: { title: 'Học hôm nay', body: 'Hãy luyện nói tiếng Hàn hôm nay.' },
    vocab: { title: 'Ôn từ vựng', body: 'Bạn có {n} từ cần ôn tập.' },
    model_answer: { title: 'Câu trả lời mẫu', body: 'Nghe câu trả lời mẫu và so sánh với bạn.' },
  },
  ar: {
    progress: { title: 'تعلُّم اليوم', body: 'تدرّب على التحدث بالكورية اليوم.' },
    vocab: { title: 'مراجعة المفردات', body: 'لديك {n} كلمة للمراجعة.' },
    model_answer: { title: 'إجابات نموذجية', body: 'استمع إلى الإجابات النموذجية وقارنها بإجابتك.' },
  },
  th: {
    progress: { title: 'การเรียนวันนี้', body: 'มาฝึกพูดภาษาเกาหลีกันวันนี้' },
    vocab: { title: 'ทบทวนคำศัพท์', body: 'คุณมีคำศัพท์ {n} คำที่ต้องทบทวน' },
    model_answer: { title: 'คำตอบตัวอย่าง', body: 'ฟังคำตอบตัวอย่างและเปรียบเทียบกับของคุณ' },
  },
  ms: {
    progress: { title: 'Pembelajaran hari ini', body: 'Berlatih bertutur bahasa Korea hari ini.' },
    vocab: { title: 'Ulang kaji kosa kata', body: 'Anda mempunyai {n} perkataan untuk diulang kaji.' },
    model_answer: { title: 'Jawapan model', body: 'Dengar jawapan model dan bandingkan dengan anda.' },
  },
  km: {
    progress: { title: 'ការសិក្សាថ្ងៃនេះ', body: 'សូមអនុវត្តការនិយាយភាសាកូរ៉េនៅថ្ងៃនេះ។' },
    vocab: { title: 'ពិនិត្យវាក្យសព្ទឡើងវិញ', body: 'អ្នកមានពាក្យ {n} ត្រូវពិនិត្យឡើងវិញ។' },
    model_answer: { title: 'ចម្លើយគំរូ', body: 'ស្តាប់ចម្លើយគំរូ ហើយប្រៀបធៀបនឹងចម្លើយរបស់អ្នក។' },
  },
}

export function isBannerLang(v: unknown): v is BannerLang {
  return typeof v === 'string' && (BANNER_LANGS as readonly string[]).includes(v)
}

/** body {n} 치환. */
export function bannerBody(label: BannerLabel, n?: number): string {
  return label.body.replace('{n}', String(n ?? 0))
}

/** 일자별 디스미스 키 — banner:<type>:<YYYY-MM-DD>. (default 정책) */
export function dismissKey(type: BannerType, date: Date = new Date()): string {
  const d = date.toISOString().slice(0, 10)
  return `banner:${type}:${d}`
}
