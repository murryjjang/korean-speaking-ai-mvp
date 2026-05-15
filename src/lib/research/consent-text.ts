// v1.1 단계 10-3 / 16-10-6: 동의서 본문 (한국어·영어·베트남어·아랍어).
//
// 본문이 바뀌면 CONSENT_VERSION을 올린다. 본문 해시(sha256)로 저장 — 운영자가
// 어느 버전 본문에 동의했는지 감사 가능. KO/EN은 법적 정본, VI/AR은 학습자
// 편의용 번역(필요 시 영어/한국어 정본을 함께 확인 안내).

export const CONSENT_TEXT_KO = `한국어 말하기 학습 시험운영 참여 동의서

본 시험운영은 한국어 말하기 학습 시스템(KDLI Korean MVP)의 효용성을 확인하기 위한 목적으로 진행됩니다. 학술 연구 및 KDLI 보고에 활용됩니다.

[수집 데이터]
- 학습 활동 기록: 학습 모드·세션 시작·종료 시간
- 발화 데이터: 말하기 음성·음성 인식 텍스트·NPC 응답 텍스트
- 평가 점수: 발음·유창성·문법·어휘 등 항목별 점수와 피드백
- 도구 호출 기록: 검색·날씨·주소 등 시스템 도구 사용 내역
- 기술 정보: 동의 시점의 IP 주소(앞 24비트만 익명화 저장)와 사용자 에이전트

[데이터 활용 범위]
- 학술 연구(논문·학회 발표)
- KDLI 보고
- 시스템 개선

[보관 기간]
연구 종료 후 2년 보관. 보관 기간 종료 시 모든 식별 가능 정보는 삭제됩니다.

[익명화 처리]
보고서·논문에 인용되는 모든 데이터는 참여자 식별이 불가능한 형태로 가공됩니다. 참여자 코드(예: P001)로만 표기하며, 이름·국적·연락처 등은 공개되지 않습니다.

[참여자 권리]
- 언제든 참여를 철회할 수 있습니다 (운영자에게 연락).
- 본인 데이터 열람·삭제 요청이 가능합니다.

[연구자 연락처]
운영자에게 직접 문의해 주세요.

위 내용을 충분히 이해했으며, 시험운영에 참여하는 것에 동의합니다.`

export const CONSENT_TEXT_EN = `Pilot Study Consent for Korean Speaking AI

This pilot is conducted to validate the effectiveness of the Korean Speaking AI system (KDLI Korean MVP). Data collected will be used for academic research and KDLI reporting.

[Data Collected]
- Learning activity: practice mode, session start/end times
- Speech data: audio recordings, transcribed text, NPC responses
- Assessment scores: pronunciation/fluency/grammar/vocabulary scores and feedback
- Tool-use logs: system tool usage (search, weather, address)
- Technical info: IP address at consent time (anonymized — first /24 prefix only) and user agent

[Use of Data]
- Academic research (papers, presentations)
- KDLI reporting
- System improvement

[Retention]
Data retained for 2 years after the study ends. All identifying information is deleted at the end of the retention period.

[Anonymization]
All published data uses participant codes (e.g., P001) only. Names, nationality, and contact info are never disclosed.

[Participant Rights]
- You may withdraw at any time (contact the operator).
- You may request access to or deletion of your own data.

[Researcher Contact]
Please contact the operator directly.

I have understood the above and consent to participating in this pilot study.`

export const CONSENT_TEXT_VI = `Đồng ý tham gia Thử nghiệm AI Học Nói Tiếng Hàn

Thử nghiệm này nhằm xác minh hiệu quả của hệ thống AI học nói tiếng Hàn (KDLI Korean MVP). Dữ liệu thu thập sẽ được sử dụng cho nghiên cứu học thuật và báo cáo KDLI.

[Dữ liệu được thu thập]
- Hoạt động học tập: chế độ luyện tập, thời gian bắt đầu/kết thúc phiên
- Dữ liệu lời nói: bản ghi âm, văn bản đã chuyển từ giọng nói, phản hồi của NPC
- Điểm đánh giá: điểm phát âm/độ trôi chảy/ngữ pháp/từ vựng và phản hồi
- Nhật ký công cụ: việc sử dụng công cụ hệ thống (tìm kiếm, thời tiết, địa chỉ)
- Thông tin kỹ thuật: địa chỉ IP tại thời điểm đồng ý (ẩn danh hóa — chỉ giữ tiền tố /24) và user agent

[Sử dụng dữ liệu]
- Nghiên cứu học thuật (bài báo, hội nghị)
- Báo cáo KDLI
- Cải thiện hệ thống

[Thời gian lưu giữ]
Dữ liệu được lưu giữ trong 2 năm sau khi nghiên cứu kết thúc. Tất cả thông tin định danh sẽ bị xóa khi hết thời gian lưu giữ.

[Ẩn danh hóa]
Tất cả dữ liệu được công bố chỉ sử dụng mã người tham gia (ví dụ: P001). Tên, quốc tịch và thông tin liên hệ không bao giờ được tiết lộ.

[Quyền của người tham gia]
- Bạn có thể rút lui bất cứ lúc nào (liên hệ người vận hành).
- Bạn có thể yêu cầu xem hoặc xóa dữ liệu của chính mình.

[Liên hệ nhà nghiên cứu]
Vui lòng liên hệ trực tiếp với người vận hành.

Tôi đã hiểu các nội dung trên và đồng ý tham gia thử nghiệm này.

(Bản tiếng Hàn và tiếng Anh là bản chính thức. Bản dịch này nhằm hỗ trợ hiểu nội dung.)`

export const CONSENT_TEXT_AR = `موافقة المشاركة في تجربة الذكاء الاصطناعي لتعلم محادثة اللغة الكورية

تُجرى هذه التجربة للتحقق من فاعلية نظام الذكاء الاصطناعي لتعلم محادثة اللغة الكورية (KDLI Korean MVP). ستُستخدم البيانات المُجمَّعة لأغراض البحث الأكاديمي وتقارير KDLI.

[البيانات التي يتم جمعها]
- نشاط التعلم: وضع التدريب، أوقات بدء/انتهاء الجلسة
- بيانات الكلام: تسجيلات صوتية، نصوص محوّلة من الصوت، ردود NPC
- درجات التقييم: درجات النطق/الطلاقة/القواعد/المفردات والملاحظات
- سجلات استخدام الأدوات: استخدام أدوات النظام (البحث، الطقس، العنوان)
- معلومات تقنية: عنوان IP وقت الموافقة (مُجهَّل — يُحتفظ بأول 24 بت فقط) ونوع المتصفح

[استخدام البيانات]
- البحث الأكاديمي (الأوراق العلمية، المؤتمرات)
- تقارير KDLI
- تحسين النظام

[مدة الاحتفاظ]
يتم الاحتفاظ بالبيانات لمدة عامين بعد انتهاء الدراسة. تُحذف جميع المعلومات المحدِّدة للهوية في نهاية فترة الاحتفاظ.

[إخفاء الهوية]
تستخدم جميع البيانات المنشورة رموز المشاركين فقط (مثل P001). لا يتم الإفصاح عن الأسماء أو الجنسيات أو معلومات الاتصال.

[حقوق المشاركين]
- يمكنك الانسحاب في أي وقت (تواصل مع المشغّل).
- يمكنك طلب الوصول إلى بياناتك الشخصية أو حذفها.

[التواصل مع الباحث]
يرجى التواصل مع المشغّل مباشرةً.

أقرّ بأنني قد فهمت ما سبق وأوافق على المشاركة في هذه التجربة.

(النسخة الكورية والإنجليزية هما النسختان الرسميتان. هذه الترجمة لتسهيل الفهم.)`

export type ConsentLocale = 'ko' | 'en' | 'vi' | 'ar'

export const CONSENT_TEXTS: Record<ConsentLocale, string> = {
  ko: CONSENT_TEXT_KO,
  en: CONSENT_TEXT_EN,
  vi: CONSENT_TEXT_VI,
  ar: CONSENT_TEXT_AR,
}
