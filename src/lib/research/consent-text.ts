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

[임시본 안내 / Provisional Translation Notice]
Bản dịch này là bản tạm thời và sẽ được áp dụng bản dịch chính thức sau khi hệ thống được cải thiện. Nếu nội dung đồng ý không rõ ràng, vui lòng tham khảo tài liệu đồng ý bằng tiếng Hàn hoặc tiếng Anh, hoặc liên hệ với quản trị viên.`

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

[임시본 안내 / Provisional Translation Notice]
هذه الترجمة مؤقتة وسيتم تطبيق الترجمة الرسمية بعد تحسين النظام. إذا كانت محتويات الموافقة غير واضحة، يرجى الرجوع إلى وثيقة الموافقة باللغة الكورية أو الإنجليزية أو الاتصال بالمدير.`



export const CONSENT_TEXT_TH = `แบบฟอร์มยินยอมเข้าร่วมการดำเนินการทดสอบการเรียนรู้การพูดภาษาเกาหลี

การดำเนินการทดสอบนี้จัดทำขึ้นเพื่อยืนยันประสิทธิภาพของระบบการเรียนรู้การพูดภาษาเกาหลี (KDLI Korean MVP) โดยจะนำไปใช้ในการวิจัยทางวิชาการและรายงาน KDLI

[ข้อมูลที่เก็บรวบรวม]
- บันทึกกิจกรรมการเรียนรู้: โหมดการเรียนรู้·เวลาเริ่ม·เวลาสิ้นสุดเซสชัน
- ข้อมูลการพูด: เสียงพูด·ข้อความที่รู้จำเสียง·ข้อความตอบกลับ NPC
- คะแนนการประเมิน: คะแนนและข้อเสนอแนะแยกตามหมวดหมู่ เช่น การออกเสียง·ความคล่องแคล่ว·ไวยากรณ์·คำศัพท์
- บันทึกการเรียกใช้เครื่องมือ: ประวัติการใช้เครื่องมือของระบบ เช่น การค้นหา·สภาพอากาศ·ที่อยู่
- ข้อมูลทางเทคนิค: ที่อยู่ IP ณ เวลายินยอม (เก็บเป็นข้อมูลที่ไม่ระบุชื่อเฉพาะ 24 บิตแรก) และผู้ใช้เอเจนต์

[ขอบเขตการใช้ข้อมูล]
- การวิจัยทางวิชาการ (เอกสาร·การนำเสนอในการประชุม)
- รายงาน KDLI
- การปรับปรุงระบบ

[ระยะเวลาการเก็บรักษา]
เก็บรักษาเป็นเวลา 2 ปีหลังจากสิ้นสุดการวิจัย เมื่อสิ้นสุดระยะเวลาการเก็บรักษาข้อมูลที่สามารถระบุตัวตนได้ทั้งหมดจะถูกลบออก

[การประมวลผลแบบไม่ระบุชื่อ]
ข้อมูลทั้งหมดที่ถูกอ้างอิงในรายงาน·เอกสารจะถูกประมวลผลในรูปแบบที่ไม่สามารถระบุตัวตนของผู้เข้าร่วมได้ โดยจะระบุเพียงรหัสผู้เข้าร่วม (เช่น P001) เท่านั้น ชื่อ·สัญชาติ·ข้อมูลติดต่อ ฯลฯ จะไม่ถูกเปิดเผย

[สิทธิของผู้เข้าร่วม]
- สามารถถอนตัวจากการเข้าร่วมได้ทุกเมื่อ (ติดต่อผู้ดำเนินการ)
- สามารถขอดูหรือลบข้อมูลของตนได้

[ข้อมูลติดต่อของนักวิจัย]
กรุณาติดต่อผู้ดำเนินการโดยตรง

ข้าพเจ้าเข้าใจเนื้อหาข้างต้นอย่างเพียงพอ และยินยอมเข้าร่วมการดำเนินการทดสอบนี้.

[임시본 안내 / Provisional Translation Notice]
การแปลนี้เป็นฉบับชั่วคราวและจะมีการนำไปใช้เป็นการแปลอย่างเป็นทางการหลังจากการปรับปรุงระบบ หากเนื้อหาการยินยอมไม่ชัดเจน โปรดดูเอกสารการยินยอมภาษาเกาหลีหรือภาษาอังกฤษ หรือสอบถามผู้ดูแลระบบ`

export const CONSENT_TEXT_MS = `Persetujuan untuk Penyertaan dalam Ujian Operasi Pembelajaran Berbicara dalam Bahasa Korea

Ujian operasi ini dijalankan untuk mengesahkan keberkesanan sistem pembelajaran berbicara dalam bahasa Korea (KDLI Korean MVP). Ia akan digunakan untuk penyelidikan akademik dan laporan KDLI.

[Data yang Dikumpul]
- Rekod aktiviti pembelajaran: Mod pembelajaran·Masa mula·Masa tamat sesi
- Data ucapan: Suara berbicara·Teks pengenalan suara·Teks respons NPC
- Skor penilaian: Skor dan maklum balas mengikut item seperti sebutan·Kelancaran·Tatabahasa·Kosa kata
- Rekod panggilan alat: Sejarah penggunaan alat sistem seperti carian·Cuaca·Alamat
- Maklumat teknikal: Alamat IP pada masa persetujuan (hanya 24 bit pertama disimpan secara tanpa nama) dan agen pengguna

[Skop Penggunaan Data]
- Penyelidikan akademik (kertas kerja·Pembentangan persidangan)
- Laporan KDLI
- Penambahbaikan sistem

[Tempoh Penyimpanan]
Disimpan selama 2 tahun selepas tamat penyelidikan. Semua maklumat yang boleh dikenalpasti akan dipadamkan selepas tempoh penyimpanan tamat.

[Proses Tanpa Nama]
Semua data yang dipetik dalam laporan·kertas kerja akan diproses dalam bentuk yang tidak membolehkan pengenalan peserta. Hanya ditandakan dengan kod peserta (contoh: P001), dan nama·kewarganegaraan·maklumat hubungan tidak akan didedahkan.

[Hak Peserta]
- Boleh menarik diri pada bila-bila masa (hubungi pengendali).
- Permintaan untuk melihat·memadam data sendiri adalah dibenarkan.

[Hubungi Penyelidik]
Sila hubungi pengendali secara langsung.

Saya telah memahami sepenuhnya kandungan di atas dan bersetuju untuk menyertai ujian operasi.

[임시본 안내 / Provisional Translation Notice]
Terjemahan ini adalah versi sementara dan akan diterapkan terjemahan rasmi setelah peningkatan sistem. Jika isi persetujuan tidak jelas, sila rujuk kepada surat persetujuan dalam bahasa Korea atau Inggeris, atau hubungi pentadbir.`

export const CONSENT_TEXT_KM = `ការព្រមព្រៀងចូលរួមក្នុងការប្រឡងសិក្សាភាសាកូរ

ការប្រឡងនេះត្រូវបានអនុវត្តដើម្បីបញ្ជាក់ពីប្រសិទ្ធភាពនៃប្រព័ន្ធសិក្សាភាសាកូរ(KDLI Korean MVP)។ វានឹងត្រូវបានប្រើសម្រាប់ការស្រាវជ្រាវវិទ្យាសាស្ត្រ និងរបាយការណ៍ KDLI។

[ទិន្នន័យដែលត្រូវបានប្រមូល]
- ការកត់ត្រាសកម្មភាពសិក្សា: របៀបសិក្សា·ពេលវេលាដើម·ពេលវេលាបញ្ចប់
- ទិន្នន័យសំឡេង: សំឡេងនិយាយ·អត្ថបទស្គាល់សំឡេង·អត្ថបទឆ្លើយតប NPC
- ពិន្ទុវាយតម្លៃ: ពិន្ទុសំឡេង·ភាពរលូន·វេយ្យាករណ៍·ពាក្យសព្ទ និងមតិយោបល់តាមប្រភេទ
- ការកត់ត្រាការហៅឧបករណ៍: ការស្វែងរក·អាកាសធាតុ·អាសយដ្ឋាន និងប្រវត្តិការប្រើប្រាស់ឧបករណ៍ប្រព័ន្ធ
- ព័ត៌មានបច្ចេកវិទ្យា: អាសយដ្ឋាន IP នៅពេលដែលបានយល់ព្រម(រក្សាទុកតែ 24 ប៊ីតដំបូង) និងអ្នកប្រើប្រាស់

[វិសាលភាពនៃការប្រើប្រាស់ទិន្នន័យ]
- ការស្រាវជ្រាវវិទ្យាសាស្ត្រ(អត្ថបទ·ការបង្ហាញសន្និសីទ)
- របាយការណ៍ KDLI
- ការកែលម្អប្រព័ន្ធ

[រយៈពេលរក្សាទុក]
រក្សាទុករយៈពេល 2 ឆ្នាំបន្ទាប់ពីការស្រាវជ្រាវបញ្ចប់។ នៅពេលដែលរយៈពេលរក្សាទុកបញ្ចប់ ទិន្នន័យដែលអាចកំណត់អត្តសញ្ញាណបានទាំងអស់នឹងត្រូវលុបចោល។

[ការបំភ្លឺអត្តសញ្ញាណ]
ទិន្នន័យទាំងអស់ដែលត្រូវបានយោងក្នុងរបាយការណ៍·អត្ថបទនឹងត្រូវបានកែប្រែជារូបរាងដែលមិនអាចកំណត់អត្តសញ្ញាណអ្នកចូលរួមបាន។ វានឹងត្រូវបានសរសេរដោយកូដអ្នកចូលរួម(ឧ. P001) ប៉ុណ្ណោះ ហើយឈ្មោះ·សញ្ជាតិ·លេខទំនាក់ទំនងនឹងមិនត្រូវបានបង្ហាញ។

[សិទ្ធិរបស់អ្នកចូលរួម]
- អ្នកអាចដកចេញពីការចូលរួមបានគ្រប់ពេល(ទំនាក់ទំនងទៅអ្នកប្រតិបត្តិការ)។
- អ្នកអាចស្នើសុំមើល·លុបទិន្នន័យរបស់ខ្លួន។

[ទំនាក់ទំនងអ្នកស្រាវជ្រាវ]
សូមទំនាក់ទំនងទៅអ្នកប្រតិបត្តិការ។

ខ្ញុំបានយល់ដឹងអំពីមាតិកានេះយ៉ាងគ្រប់គ្រាន់ ហើយខ្ញុំយល់ព្រមចូលរួមក្នុងការប្រឡង។

[임시본 안내 / Provisional Translation Notice]
ការបកប្រែនេះគឺជាការបកប្រែបណ្តោះអាសន្ន ហើយនឹងត្រូវបានអនុវត្តន៍ការបកប្រែជាផ្លូវការបន្ទាប់ពីការកែលម្អប្រព័ន្ធ។ ប្រសិនបើមាតិកានៃការយល់ព្រមមិនច្បាស់ សូមយោងទៅកាន់ឯកសារយល់ព្រមជាភាសាកូរ៉េឬភាសាអង់គ្លេស ឬសូមទំនាក់ទំនងអ្នកគ្រប់គ្រង។`

export type ConsentLocale = 'ko' | 'en' | 'vi' | 'ar' | 'th' | 'ms' | 'km'

export const CONSENT_TEXTS: Record<ConsentLocale, string> = {
  ko: CONSENT_TEXT_KO,
  en: CONSENT_TEXT_EN,
  vi: CONSENT_TEXT_VI,
  ar: CONSENT_TEXT_AR,
  th: CONSENT_TEXT_TH,
  ms: CONSENT_TEXT_MS,
  km: CONSENT_TEXT_KM,
}
