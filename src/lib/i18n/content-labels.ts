// v1.1 단계 19.10 [페이즈3]: 콘텐츠 본문 라벨 다국어 번역.
//
// questions.json/question-sets.json/question-types.json의 한국어 콘텐츠는
// 그대로 두고, UI 표시 시 보조 표기를 위해 id 기반으로 다국어 텍스트를 조회한다.
// JSON 콘텐츠는 백엔드 평가·LLM 프롬프트에서도 사용되므로 한국어 단일 진실원을
// 유지하고 i18n은 UI 레이어에서만 적용한다.

import type { DisplayLanguage } from './display-language'

type LabelMap = Record<DisplayLanguage, string>

// --- 평가 세트 이름 ---
export const QUESTION_SET_NAMES: Record<string, LabelMap> = {
  'beginner-set-1': {
    ko: '초급 평가세트',
    en: 'Beginner Assessment Set',
    vi: 'Bộ đánh giá sơ cấp',
    ar: 'مجموعة تقييم المبتدئين',
    th: 'ชุดการประเมินระดับเริ่มต้น',
    ms: 'Set Penilaian Asas',
    km: 'សំណុំការវាយតម្លៃកម្រិតដំបូង',
  },
  'intermediate-set-1': {
    ko: '중급 평가세트',
    en: 'Intermediate Assessment Set',
    vi: 'Bộ đánh giá trung cấp',
    ar: 'مجموعة التقييم المتوسطة',
    th: 'ชุดการประเมินระดับกลาง',
    ms: 'Set Penilaian Pertengahan',
    km: 'សំណុំការវាយតម្លៃកម្រិតមធ្យម',
  },
  'advanced-set-1': {
    ko: '고급 평가세트',
    en: 'Advanced Assessment Set',
    vi: 'Bộ đánh giá nâng cao',
    ar: 'مجموعة التقييم المتقدمة',
    th: 'ชุดการประเมินระดับสูง',
    ms: 'Set Penilaian Lanjutan',
    km: 'សំណុំការវាយតម្លៃកម្រិតខ្ពស់',
  },
}

// --- 평가 세트 설명 ---
export const QUESTION_SET_DESCRIPTIONS: Record<string, LabelMap> = {
  'beginner-set-1': {
    ko: '초급 학습자를 위한 정식 말하기 평가 세트. 낭독 15점 + 자료 설명 25점 + 듣고 답하기 25점 + 대화 미션 35점 = 100점.',
    en: 'Official speaking assessment set for beginner learners. Reading aloud 15 + Material description 25 + Listening response 25 + Dialogue mission 35 = 100 pts.',
    vi: 'Bộ đánh giá nói chính thức cho người mới học. Đọc to 15 + Mô tả tài liệu 25 + Nghe và trả lời 25 + Nhiệm vụ hội thoại 35 = 100 điểm.',
    ar: 'مجموعة التقييم الرسمية للمتعلمين المبتدئين. القراءة الجهرية 15 + وصف المادة 25 + الاستماع والإجابة 25 + مهمة المحادثة 35 = 100 نقطة.',
    th: 'ชุดประเมินการพูดอย่างเป็นทางการสำหรับผู้เริ่มต้น อ่านออกเสียง 15 + อธิบายข้อมูล 25 + ฟังและตอบ 25 + ภารกิจสนทนา 35 = 100 คะแนน',
    ms: 'Set penilaian bercakap rasmi untuk pelajar asas. Bacaan kuat 15 + Penerangan bahan 25 + Dengar dan jawab 25 + Misi perbualan 35 = 100 mata.',
    km: 'សំណុំការវាយតម្លៃនិយាយផ្លូវការសម្រាប់សិស្សដំបូង។ ការអានឲ្យឮ 15 + ការពិពណ៌នាសម្ភារៈ 25 + ការស្តាប់និងឆ្លើយ 25 + បេសកកម្មសន្ទនា 35 = 100 ពិន្ទុ។',
  },
  'intermediate-set-1': {
    ko: '중급 학습자를 위한 정식 말하기 평가 세트. 낭독 15점 + 자료 설명 25점 + 듣고 답하기 25점 + 대화 미션 35점 = 100점.',
    en: 'Official speaking assessment set for intermediate learners. Reading aloud 15 + Material description 25 + Listening response 25 + Dialogue mission 35 = 100 pts.',
    vi: 'Bộ đánh giá nói chính thức cho người học trung cấp. Đọc to 15 + Mô tả tài liệu 25 + Nghe và trả lời 25 + Nhiệm vụ hội thoại 35 = 100 điểm.',
    ar: 'مجموعة التقييم الرسمية للمتعلمين المتوسطين. القراءة الجهرية 15 + وصف المادة 25 + الاستماع والإجابة 25 + مهمة المحادثة 35 = 100 نقطة.',
    th: 'ชุดประเมินการพูดอย่างเป็นทางการสำหรับระดับกลาง อ่านออกเสียง 15 + อธิบายข้อมูล 25 + ฟังและตอบ 25 + ภารกิจสนทนา 35 = 100 คะแนน',
    ms: 'Set penilaian bercakap rasmi untuk pelajar pertengahan. Bacaan kuat 15 + Penerangan bahan 25 + Dengar dan jawab 25 + Misi perbualan 35 = 100 mata.',
    km: 'សំណុំការវាយតម្លៃនិយាយផ្លូវការសម្រាប់សិស្សកម្រិតមធ្យម។ ការអានឲ្យឮ 15 + ការពិពណ៌នាសម្ភារៈ 25 + ការស្តាប់និងឆ្លើយ 25 + បេសកកម្មសន្ទនា 35 = 100 ពិន្ទុ។',
  },
  'advanced-set-1': {
    ko: '고급 학습자를 위한 정식 말하기 평가 세트. 낭독 15점 + 자료 설명 25점 + 듣고 답하기 25점 + 대화 미션 35점 = 100점.',
    en: 'Official speaking assessment set for advanced learners. Reading aloud 15 + Material description 25 + Listening response 25 + Dialogue mission 35 = 100 pts.',
    vi: 'Bộ đánh giá nói chính thức cho người học nâng cao. Đọc to 15 + Mô tả tài liệu 25 + Nghe và trả lời 25 + Nhiệm vụ hội thoại 35 = 100 điểm.',
    ar: 'مجموعة التقييم الرسمية للمتعلمين المتقدمين. القراءة الجهرية 15 + وصف المادة 25 + الاستماع والإجابة 25 + مهمة المحادثة 35 = 100 نقطة.',
    th: 'ชุดประเมินการพูดอย่างเป็นทางการสำหรับระดับสูง อ่านออกเสียง 15 + อธิบายข้อมูล 25 + ฟังและตอบ 25 + ภารกิจสนทนา 35 = 100 คะแนน',
    ms: 'Set penilaian bercakap rasmi untuk pelajar lanjutan. Bacaan kuat 15 + Penerangan bahan 25 + Dengar dan jawab 25 + Misi perbualan 35 = 100 mata.',
    km: 'សំណុំការវាយតម្លៃនិយាយផ្លូវការសម្រាប់សិស្សកម្រិតខ្ពស់។ ការអានឲ្យឮ 15 + ការពិពណ៌នាសម្ភារៈ 25 + ការស្តាប់និងឆ្លើយ 25 + បេសកកម្មសន្ទនា 35 = 100 ពិន្ទុ។',
  },
}

// --- 문항 제목 (active 12개) ---
export const QUESTION_TITLES: Record<string, LabelMap> = {
  'beginner-q1-reading': {
    ko: '낭독',
    en: 'Reading Aloud',
    vi: 'Đọc to',
    ar: 'القراءة بصوت عالٍ',
    th: 'การอ่านออกเสียง',
    ms: 'Bacaan kuat',
    km: 'ការអាន',
  },
  'beginner-q2-material-description': {
    ko: '카페에서 주문하는 장면 설명하기',
    en: 'Describe a Cafe Ordering Scene',
    vi: 'Mô tả cảnh gọi món tại quán cà phê',
    ar: 'وصف مشهد طلب في المقهى',
    th: 'อธิบายภาพการสั่งในร้านกาแฟ',
    ms: 'Terangkan adegan memesan di kafe',
    km: 'ពិពណ៌នាសាកសណ្ឋានកម្ម៉ង់ក្នុងហាងកាហ្វេ',
  },
  'beginner-q3-listening-response': {
    ko: '듣고 답하기',
    en: 'Listening Response',
    vi: 'Nghe và trả lời',
    ar: 'الاستماع والإجابة',
    th: 'ฟังและตอบ',
    ms: 'Dengar dan jawab',
    km: 'ស្តាប់និងឆ្លើយ',
  },
  'beginner-q4-dialogue-mission': {
    ko: '카페에서 음료 주문하기',
    en: 'Order a Drink at a Cafe',
    vi: 'Gọi đồ uống ở quán cà phê',
    ar: 'طلب مشروب في المقهى',
    th: 'สั่งเครื่องดื่มที่ร้านกาแฟ',
    ms: 'Pesan minuman di kafe',
    km: 'កម្ម៉ង់ភេសជ្ជៈនៅហាងកាហ្វេ',
  },
  'intermediate-q1-reading': {
    ko: '안내문 낭독',
    en: 'Reading a Notice',
    vi: 'Đọc thông báo',
    ar: 'قراءة الإشعار',
    th: 'อ่านประกาศ',
    ms: 'Membaca notis',
    km: 'អានសេចក្តីជូនដំណឹង',
  },
  'intermediate-q2-material-description': {
    ko: '조사 결과 설명하기',
    en: 'Describe Survey Results',
    vi: 'Mô tả kết quả khảo sát',
    ar: 'وصف نتائج الاستطلاع',
    th: 'อธิบายผลการสำรวจ',
    ms: 'Terangkan hasil tinjauan',
    km: 'ពិពណ៌នាលទ្ធផលការស្ទង់មតិ',
  },
  'intermediate-q3-listening-response': {
    ko: '일정 변경 듣고 답하기',
    en: 'Listen to a Schedule Change and Respond',
    vi: 'Nghe thay đổi lịch và trả lời',
    ar: 'الاستماع لتغيير الجدول والإجابة',
    th: 'ฟังการเปลี่ยนตารางและตอบ',
    ms: 'Dengar perubahan jadual dan jawab',
    km: 'ស្តាប់ការផ្លាស់ប្តូរកាលវិភាគនិងឆ្លើយ',
  },
  'intermediate-q4-dialogue-mission': {
    ko: '행정실에 수업 관련 문의하기',
    en: 'Inquire About Class at the Admin Office',
    vi: 'Hỏi thăm lớp tại phòng hành chính',
    ar: 'الاستفسار عن الفصل في مكتب الإدارة',
    th: 'สอบถามเรื่องเรียนที่ฝ่ายธุรการ',
    ms: 'Bertanya tentang kelas di pejabat pentadbiran',
    km: 'សួរអំពីថ្នាក់នៅការិយាល័យរដ្ឋបាល',
  },
  'advanced-q1-reading': {
    ko: '설명문 낭독',
    en: 'Reading an Expository Text',
    vi: 'Đọc văn bản giải thích',
    ar: 'قراءة نص توضيحي',
    th: 'อ่านบทอธิบาย',
    ms: 'Membaca teks ekspositori',
    km: 'អានអត្ថបទពន្យល់',
  },
  'advanced-q2-material-description': {
    ko: '그래프 설명하기',
    en: 'Describe a Graph',
    vi: 'Mô tả biểu đồ',
    ar: 'وصف الرسم البياني',
    th: 'อธิบายกราฟ',
    ms: 'Terangkan graf',
    km: 'ពិពណ៌នាក្រាហ្វ',
  },
  'advanced-q3-listening-response': {
    ko: '설명 듣고 요약하기',
    en: 'Listen and Summarize',
    vi: 'Nghe và tóm tắt',
    ar: 'الاستماع والتلخيص',
    th: 'ฟังและสรุป',
    ms: 'Dengar dan ringkaskan',
    km: 'ស្តាប់និងសង្ខេប',
  },
  'advanced-q4-dialogue-mission': {
    ko: '공동 행사 협의하기',
    en: 'Negotiate a Joint Event',
    vi: 'Thỏa thuận sự kiện chung',
    ar: 'التفاوض على فعالية مشتركة',
    th: 'หารือเกี่ยวกับกิจกรรมร่วม',
    ms: 'Berunding acara bersama',
    km: 'ពិភាក្សាព្រឹត្តិការណ៍រួម',
  },
}

// --- 문항 유형 이름 (active 4 + legacy) ---
export const QUESTION_TYPE_NAMES: Record<string, LabelMap> = {
  'qt-reading': {
    ko: '낭독',
    en: 'Reading Aloud',
    vi: 'Đọc to',
    ar: 'القراءة بصوت عالٍ',
    th: 'การอ่านออกเสียง',
    ms: 'Bacaan kuat',
    km: 'ការអាន',
  },
  'qt-material-desc': {
    ko: '자료 설명',
    en: 'Material Description',
    vi: 'Mô tả tài liệu',
    ar: 'وصف المادة',
    th: 'อธิบายข้อมูล',
    ms: 'Penerangan bahan',
    km: 'ការពិពណ៌នាសម្ភារៈ',
  },
  'qt-listening-resp': {
    ko: '듣고 답하기',
    en: 'Listening Response',
    vi: 'Nghe và trả lời',
    ar: 'الاستماع والإجابة',
    th: 'ฟังและตอบ',
    ms: 'Dengar dan jawab',
    km: 'ស្តាប់និងឆ្លើយ',
  },
  'qt-dialogue-mission': {
    ko: '대화에서 미션 달성하기',
    en: 'Complete a Dialogue Mission',
    vi: 'Hoàn thành nhiệm vụ hội thoại',
    ar: 'إنجاز مهمة محادثة',
    th: 'ทำภารกิจสนทนาให้สำเร็จ',
    ms: 'Selesaikan misi perbualan',
    km: 'បំពេញបេសកកម្មសន្ទនា',
  },
}

// --- 자유대화 추천 주제 9개 ---
export const RECOMMENDED_TOPIC_LABELS: Record<string, LabelMap> = {
  'weekend-place': {
    ko: '주말에 가볼 만한 명소 추천',
    en: 'Recommend a place to visit on the weekend',
    vi: 'Gợi ý địa điểm nên đi cuối tuần',
    ar: 'اقترح مكانًا للزيارة في عطلة نهاية الأسبوع',
    th: 'แนะนำสถานที่ที่ควรไปในวันหยุดสุดสัปดาห์',
    ms: 'Cadangkan tempat untuk dilawati hujung minggu',
    km: 'ណែនាំទីកន្លែងដែលគួរទៅលេងពេលចុងសប្តាហ៍',
  },
  'korean-food': {
    ko: '한국 음식 추천',
    en: 'Recommend Korean food',
    vi: 'Gợi ý món ăn Hàn Quốc',
    ar: 'اقترح طعامًا كوريًا',
    th: 'แนะนำอาหารเกาหลี',
    ms: 'Cadangkan makanan Korea',
    km: 'ណែនាំម្ហូបកូរ៉េ',
  },
  movies: {
    ko: '좋아하는 영화 이야기',
    en: 'Talk about favorite movies',
    vi: 'Nói về bộ phim yêu thích',
    ar: 'تحدث عن الأفلام المفضلة',
    th: 'พูดคุยเกี่ยวกับภาพยนตร์ที่ชอบ',
    ms: 'Bualkan filem kegemaran',
    km: 'និយាយអំពីខ្សែភាពយន្តដែលចូលចិត្ត',
  },
  'korea-trip': {
    ko: '한국 여행 계획',
    en: 'Plan a trip to Korea',
    vi: 'Kế hoạch du lịch Hàn Quốc',
    ar: 'تخطيط رحلة إلى كوريا',
    th: 'วางแผนเที่ยวเกาหลี',
    ms: 'Rancang perjalanan ke Korea',
    km: 'រៀបចំផែនការដំណើរទៅកូរ៉េ',
  },
  family: {
    ko: '가족 이야기',
    en: 'Talk about family',
    vi: 'Nói về gia đình',
    ar: 'تحدث عن العائلة',
    th: 'พูดคุยเรื่องครอบครัว',
    ms: 'Bualkan keluarga',
    km: 'និយាយអំពីគ្រួសារ',
  },
  'weather-today': {
    ko: '오늘 날씨와 외출 계획',
    en: "Today's weather and outing plans",
    vi: 'Thời tiết hôm nay và kế hoạch ra ngoài',
    ar: 'طقس اليوم وخطط الخروج',
    th: 'อากาศวันนี้และแผนออกไปข้างนอก',
    ms: 'Cuaca hari ini dan rancangan keluar',
    km: 'អាកាសធាតុថ្ងៃនេះនិងផែនការចេញក្រៅ',
  },
  'find-cafe': {
    ko: '맛집·카페 찾기',
    en: 'Find restaurants and cafes',
    vi: 'Tìm quán ăn và quán cà phê',
    ar: 'إيجاد المطاعم والمقاهي',
    th: 'หาร้านอาหารและคาเฟ่',
    ms: 'Cari restoran dan kafe',
    km: 'ស្វែងរកភោជនីយដ្ឋាននិងហាងកាហ្វេ',
  },
  'find-address': {
    ko: '주소 찾기·길안내',
    en: 'Find an address and directions',
    vi: 'Tìm địa chỉ và chỉ đường',
    ar: 'إيجاد عنوان والاتجاهات',
    th: 'หาที่อยู่และเส้นทาง',
    ms: 'Cari alamat dan arah',
    km: 'ស្វែងរកអាស័យដ្ឋាននិងផ្លូវ',
  },
  'find-facility': {
    ko: '편의시설(약국·병원) 찾기',
    en: 'Find facilities (pharmacy, hospital)',
    vi: 'Tìm tiện ích (hiệu thuốc, bệnh viện)',
    ar: 'إيجاد المرافق (الصيدلية، المستشفى)',
    th: 'หาสิ่งอำนวยความสะดวก (ร้านยา โรงพยาบาล)',
    ms: 'Cari kemudahan (farmasi, hospital)',
    km: 'ស្វែងរកសេវាកម្ម (ឱសថស្ថាន មន្ទីរពេទ្យ)',
  },
}

/** id 기반으로 MultilingualText 반환. id 미등록 시 ko만 채워진 객체. */
export function getContentLabel(
  map: Record<string, LabelMap>,
  id: string,
  fallbackKo: string,
): LabelMap | { ko: string } {
  return map[id] ?? { ko: fallbackKo }
}
