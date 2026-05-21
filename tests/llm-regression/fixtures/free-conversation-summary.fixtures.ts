// M3-a — 자유대화 요약 LLM 회귀 fixture (#15)
//
// on×5 / partial×5 / off×5 = 15건. bucket 내 ko·en·vi 균형 분포.
//   - lang 'ko' → motherTongue 'ko' + helperLang 'en'  → 비multilingual 경로(ko + l1)
//   - lang 'en' → motherTongue 'en'                     → multilingual 4언어(ko·en·vi·ar)
//   - lang 'vi' → motherTongue 'vi'                     → multilingual 4언어
//   - ar/th/ms/km 확장: TODO (motherTongue 'ar' 도 multilingual, th/ms/km 은
//     비multilingual 경로 — helperLang 은 en/vi/ar 만 유효하므로 추후 매핑 정의 필요).
//
// 대화는 항상 한국어(학습자/NPC). lang 은 "피드백 출력 언어/경로" 차원이다.
// turns 는 mock·real 양쪽 공용. expected.topic_adherence 는:
//   - mock: passthrough 검증의 기대값(라우트가 LLM 출력을 보존하는지)
//   - real: LLM 분류 정확도 실측 기대값(#15)

export type FixtureLang = 'ko' | 'en' | 'vi'

export interface SummaryFixture {
  id: string
  lang: FixtureLang
  motherTongue: string
  helperLang: 'en' | 'vi' | 'ar'
  topic: string
  /** partial 케이스의 경계 의도 한 줄 메모 (왜 partial 인가). */
  intent?: string
  turns: Array<{ role: 'student' | 'ai'; text: string }>
  expected: { topic_adherence: 'on' | 'partial' | 'off' }
}

export const ON_FIXTURES: SummaryFixture[] = [
  {
    id: 'on-ko-1',
    lang: 'ko',
    motherTongue: 'ko',
    helperLang: 'en',
    topic: '맛집·카페 찾기',
    turns: [
      { role: 'ai', text: '안녕하세요! 요즘 어떤 카페 찾고 계세요?' },
      { role: 'student', text: '강남에서 조용한 카페를 찾고 있어요. 공부하기 좋은 곳이요.' },
      { role: 'ai', text: '공부하기 좋은 카페요? 어떤 분위기를 좋아하세요?' },
      { role: 'student', text: '책상이 넓고 콘센트가 많은 곳이 좋아요. 커피도 맛있으면 좋겠어요.' },
    ],
    expected: { topic_adherence: 'on' },
  },
  {
    id: 'on-en-1',
    lang: 'en',
    motherTongue: 'en',
    helperLang: 'en',
    topic: '주말 계획',
    turns: [
      { role: 'ai', text: '이번 주말에 뭐 할 거예요?' },
      { role: 'student', text: '친구랑 한강에서 자전거를 타기로 했어요.' },
      { role: 'ai', text: '한강 자전거 좋죠! 또 다른 계획도 있어요?' },
      { role: 'student', text: '저녁에는 영화를 보러 갈 거예요. 요즘 보고 싶은 게 많아요.' },
    ],
    expected: { topic_adherence: 'on' },
  },
  {
    id: 'on-vi-1',
    lang: 'vi',
    motherTongue: 'vi',
    helperLang: 'vi',
    topic: '한국 음식',
    turns: [
      { role: 'ai', text: '한국 음식 중에서 뭘 제일 좋아하세요?' },
      { role: 'student', text: '저는 김치찌개를 정말 좋아해요. 매운 음식을 잘 먹어요.' },
      { role: 'ai', text: '매운 음식 좋아하시는군요! 다른 음식도 드셔봤어요?' },
      { role: 'student', text: '네, 불고기랑 비빔밥도 자주 먹어요. 둘 다 맛있어요.' },
    ],
    expected: { topic_adherence: 'on' },
  },
  {
    id: 'on-ko-2',
    lang: 'ko',
    motherTongue: 'ko',
    helperLang: 'en',
    topic: '취미',
    turns: [
      { role: 'ai', text: '평소에 어떤 취미가 있으세요?' },
      { role: 'student', text: '저는 사진 찍는 걸 좋아해요. 주말마다 카메라를 들고 나가요.' },
      { role: 'ai', text: '사진이요! 주로 뭘 찍으세요?' },
      { role: 'student', text: '풍경이랑 길거리 사진을 많이 찍어요. 빛이 예쁜 시간을 기다려요.' },
    ],
    expected: { topic_adherence: 'on' },
  },
  {
    id: 'on-en-2',
    lang: 'en',
    motherTongue: 'en',
    helperLang: 'en',
    topic: '여행',
    turns: [
      { role: 'ai', text: '가 보고 싶은 여행지가 있어요?' },
      { role: 'student', text: '제주도에 가 보고 싶어요. 바다가 아름답다고 들었어요.' },
      { role: 'ai', text: '제주도 좋죠! 거기서 뭘 하고 싶어요?' },
      { role: 'student', text: '한라산에 올라가고, 해변을 걷고 싶어요. 사진도 많이 찍을 거예요.' },
    ],
    expected: { topic_adherence: 'on' },
  },
]

export const PARTIAL_FIXTURES: SummaryFixture[] = [
  {
    id: 'partial-ko-1',
    lang: 'ko',
    motherTongue: 'ko',
    helperLang: 'en',
    topic: '주말 계획',
    intent: '후반 화제 이탈 — 주말 계획으로 시작했다가 회사 불만으로 샘',
    turns: [
      { role: 'ai', text: '주말에 뭐 할 계획이에요?' },
      { role: 'student', text: '토요일에 등산을 갈 거예요.' },
      { role: 'ai', text: '등산 좋네요! 어디로 가세요?' },
      { role: 'student', text: '근데 요즘 회사가 너무 힘들어요. 상사가 일을 너무 많이 줘요. 매일 야근이에요.' },
    ],
    expected: { topic_adherence: 'partial' },
  },
  {
    id: 'partial-en-1',
    lang: 'en',
    motherTongue: 'en',
    helperLang: 'en',
    topic: '한국 음식',
    intent: '단어만 연결 — 음식 단어는 나오나 문장·맥락 없이 나열만',
    turns: [
      { role: 'ai', text: '어떤 한국 음식을 좋아하세요?' },
      { role: 'student', text: '김치. 불고기. 음... 비빔밥.' },
      { role: 'ai', text: '그 중에 제일 좋아하는 건요?' },
      { role: 'student', text: '몰라요. 다.' },
    ],
    expected: { topic_adherence: 'partial' },
  },
  {
    id: 'partial-vi-1',
    lang: 'vi',
    motherTongue: 'vi',
    helperLang: 'vi',
    topic: '취미',
    intent: '직접 언급 없으나 관련 맥락 — 취미라는 단어 없이 주말에 하는 활동을 말함',
    turns: [
      { role: 'ai', text: '취미가 어떻게 되세요?' },
      { role: 'student', text: '음... 주말에는 보통 집에서 그림을 그려요.' },
      { role: 'ai', text: '그림이요! 어떤 그림을 그리세요?' },
      { role: 'student', text: '그냥 손이 가는 대로요. 그리고 가끔 음악도 들어요.' },
    ],
    expected: { topic_adherence: 'partial' },
  },
  {
    id: 'partial-ko-2',
    lang: 'ko',
    motherTongue: 'ko',
    helperLang: 'en',
    topic: '여행',
    intent: '절반-절반 — 여행 얘기와 무관한 시험 걱정이 비슷한 비중으로 섞임',
    turns: [
      { role: 'ai', text: '여행 가 보고 싶은 곳 있어요?' },
      { role: 'student', text: '일본에 가 보고 싶어요. 근데 다음 주에 시험이 있어서 걱정돼요.' },
      { role: 'ai', text: '시험요? 여행은 시험 끝나고 가면 되겠네요.' },
      { role: 'student', text: '맞아요. 시험 공부를 아직 하나도 못 했어요. 일본은 벚꽃 필 때 가고 싶어요.' },
    ],
    expected: { topic_adherence: 'partial' },
  },
  {
    id: 'partial-en-2',
    lang: 'en',
    motherTongue: 'en',
    helperLang: 'en',
    topic: '맛집·카페 찾기',
    intent: '살짝 빗나감 — 카페 얘기를 하다 본인 다이어트 고민으로 미세하게 벗어남',
    turns: [
      { role: 'ai', text: '요즘 가 본 카페 중에 좋았던 곳 있어요?' },
      { role: 'student', text: '집 근처 카페가 괜찮았어요. 근데 요즘 살을 빼려고 디저트를 참고 있어요.' },
      { role: 'ai', text: '다이어트 중이시군요. 그래도 음료는 드시죠?' },
      { role: 'student', text: '네, 아메리카노만 마셔요. 케이크는 너무 먹고 싶지만요.' },
    ],
    expected: { topic_adherence: 'partial' },
  },
]

export const OFF_FIXTURES: SummaryFixture[] = [
  {
    id: 'off-ko-1',
    lang: 'ko',
    motherTongue: 'ko',
    helperLang: 'en',
    topic: '맛집·카페 찾기',
    turns: [
      { role: 'ai', text: '어떤 카페를 찾고 계세요?' },
      { role: 'student', text: '어제 축구 경기 봤어요? 우리 팀이 이겼어요!' },
      { role: 'ai', text: '아, 카페 얘기를 해 볼까요?' },
      { role: 'student', text: '손흥민이 골을 두 개나 넣었어요. 진짜 대단했어요.' },
    ],
    expected: { topic_adherence: 'off' },
  },
  {
    id: 'off-en-1',
    lang: 'en',
    motherTongue: 'en',
    helperLang: 'en',
    topic: '주말 계획',
    turns: [
      { role: 'ai', text: '주말 계획이 어떻게 되세요?' },
      { role: 'student', text: '제 강아지 이름은 초코예요.' },
      { role: 'ai', text: '귀엽네요! 주말에 강아지랑 산책 가세요?' },
      { role: 'student', text: '저는 빨간색을 제일 좋아해요.' },
    ],
    expected: { topic_adherence: 'off' },
  },
  {
    id: 'off-vi-1',
    lang: 'vi',
    motherTongue: 'vi',
    helperLang: 'vi',
    topic: '한국 음식',
    turns: [
      { role: 'ai', text: '한국 음식 중에 뭘 좋아하세요?' },
      { role: 'student', text: '네.' },
      { role: 'ai', text: '어떤 음식을 자주 드세요?' },
      { role: 'student', text: '음.' },
    ],
    expected: { topic_adherence: 'off' },
  },
  {
    id: 'off-ko-2',
    lang: 'ko',
    motherTongue: 'ko',
    helperLang: 'en',
    topic: '취미',
    turns: [
      { role: 'ai', text: '취미가 뭐예요?' },
      { role: 'student', text: '오늘 날씨가 너무 추워요. 눈이 올 것 같아요.' },
      { role: 'ai', text: '날씨가 춥죠. 그런데 취미는 어떤 게 있으세요?' },
      { role: 'student', text: '내일 아침에 비가 온대요. 우산을 가져가야겠어요.' },
    ],
    expected: { topic_adherence: 'off' },
  },
  {
    id: 'off-vi-2',
    lang: 'vi',
    motherTongue: 'vi',
    helperLang: 'vi',
    topic: '여행',
    turns: [
      { role: 'ai', text: '여행 가 보고 싶은 곳이 있어요?' },
      { role: 'student', text: '제 휴대폰이 고장 났어요.' },
      { role: 'ai', text: '저런, 여행 얘기를 해 볼까요?' },
      { role: 'student', text: '수리비가 십만 원이래요. 너무 비싸요.' },
    ],
    expected: { topic_adherence: 'off' },
  },
]

export const ALL_FIXTURES: SummaryFixture[] = [
  ...ON_FIXTURES,
  ...PARTIAL_FIXTURES,
  ...OFF_FIXTURES,
]
