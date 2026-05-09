import { Badge } from '@/src/components/ui'

// ── 샘플 데이터 ──────────────────────────────────────────────────────────────

const SUMMARY_METRICS = [
  { label: '전체 학습자 수', value: '128명', sub: '등록 기준' },
  { label: '평균 말하기 점수', value: '92점', sub: 'q1~q4 종합' },
  { label: '평균 발음/낭독 참고점수', value: '91점', sub: '음성 인식 기반' },
  { label: '평균 과제 수행률', value: '88%', sub: '전체 문항 기준' },
  { label: '재학습 추천 인원', value: '23명', sub: '80점 미만 기준' },
  { label: '교수자 검토 대기', value: '12건', sub: '미확정 평가' },
]

const COUNTRY_DATA = [
  {
    country: '베트남',
    flag: '🇻🇳',
    learners: 32,
    speakingScore: 93,
    pronounceScore: 91,
    weaknesses: ['종성 발음', '조사 사용', '문장 끝 억양'],
    guide: '문장 끝 또렷하게 읽기, 조사 반복 연습',
  },
  {
    country: '몽골',
    flag: '🇲🇳',
    learners: 18,
    speakingScore: 89,
    pronounceScore: 87,
    weaknesses: ['받침 발음', '긴 문장 유창성', '어순'],
    guide: '짧은 문장 단위 낭독, 받침 대비 연습',
  },
  {
    country: '우즈베키스탄',
    flag: '🇺🇿',
    learners: 15,
    speakingScore: 88,
    pronounceScore: 86,
    weaknesses: ['모음 구별', '속도 조절', '어휘 다양성'],
    guide: '느린 속도 섀도잉, 핵심 표현 반복',
  },
  {
    country: '태국',
    flag: '🇹🇭',
    learners: 14,
    speakingScore: 90,
    pronounceScore: 88,
    weaknesses: ['받침 발음', '높임 표현', '조사 사용'],
    guide: '받침 반복 낭독, 기본 문형 확장',
  },
  {
    country: '라오스',
    flag: '🇱🇦',
    learners: 12,
    speakingScore: 89,
    pronounceScore: 87,
    weaknesses: ['종성 발음', '문장 연결', '어휘 다양성'],
    guide: '짧은 대화 반복, 읽기연습 병행',
  },
  {
    country: '중국',
    flag: '🇨🇳',
    learners: 17,
    speakingScore: 92,
    pronounceScore: 90,
    weaknesses: ['억양', '자연스러운 연결 표현'],
    guide: '발표연습, 연결어 표현 연습',
  },
  {
    country: '일본',
    flag: '🇯🇵',
    learners: 10,
    speakingScore: 94,
    pronounceScore: 92,
    weaknesses: ['억양', '받침 약화', '문장 끝 처리'],
    guide: '문장 끝 또렷하게 읽기, 속도 조절',
  },
  {
    country: '아랍권',
    flag: '🌍',
    learners: 20,
    speakingScore: 87,
    pronounceScore: 85,
    weaknesses: ['모음 구별', '받침 발음', '어순'],
    guide: '음절 단위 낭독, 기본 문형 반복',
  },
]

const LANGUAGE_GROUP_DATA = [
  {
    group: '베트남어권',
    errors: ['종성 발음', '조사 사용', '문장 끝 억양'],
    grammar: ['격조사 혼용', '서술어 위치'],
    fluency: '문장 끝 흐림, 속도 불균일',
    supplement: '낭독 + 조사 반복 연습',
  },
  {
    group: '몽골어권',
    errors: ['받침 발음', '긴 문장 유창성'],
    grammar: ['어순 오류', '조사 누락'],
    fluency: '긴 문장에서 속도 저하',
    supplement: '문장 단위 끊어 읽기',
  },
  {
    group: '태국어권',
    errors: ['받침 발음', '높임 표현 오류'],
    grammar: ['경어 미사용', '조사 혼용'],
    fluency: '단음절 집중, 연결 약화',
    supplement: '기본 문형 확장 연습',
  },
  {
    group: '라오어권',
    errors: ['종성 발음', '문장 연결'],
    grammar: ['연결어 누락'],
    fluency: '짧은 문장 위주, 연결 부족',
    supplement: '대화 반복 + 읽기 병행',
  },
  {
    group: '중국어권',
    errors: ['억양', '연결 표현'],
    grammar: ['연결어 선택 오류'],
    fluency: '억양 평탄화',
    supplement: '발표 원고 교정 + 섀도잉',
  },
  {
    group: '일본어권',
    errors: ['억양', '받침 약화'],
    grammar: ['어미 처리'],
    fluency: '문장 끝 처리 약함',
    supplement: '문장 끝 또렷하게 낭독',
  },
  {
    group: '아랍어권',
    errors: ['모음 구별', '받침 발음'],
    grammar: ['어순 혼용', '어휘 선택'],
    fluency: '모음 혼동으로 속도 저하',
    supplement: '음절 단위 낭독 반복',
  },
  {
    group: '러시아어권',
    errors: ['연음 규칙', '모음 구별'],
    grammar: ['격 오류'],
    fluency: '자음군 처리 미숙',
    supplement: '음절 단위 + 연음 연습',
  },
  {
    group: '우즈베크어권',
    errors: ['모음 구별', '속도 조절'],
    grammar: ['어휘 다양성 부족'],
    fluency: '속도 불균일',
    supplement: '느린 속도 섀도잉',
  },
]

const COURSE_DATA = [
  {
    level: '초급',
    strengths: ['기본 문장 따라 읽기', '짧은 응답'],
    weaknesses: ['듣고 답하기', '대화형 미션'],
    improvement: '짧은 응답 문형 반복, 읽기 정확도 강화',
  },
  {
    level: '중급',
    strengths: ['상황 설명', '기본 발표'],
    weaknesses: ['연결 표현', '발표 구성'],
    improvement: '발표 원고 교정, 섀도잉, 상황별 대화연습',
  },
  {
    level: '고급',
    strengths: ['복합 문장 사용', '주제 설명'],
    weaknesses: ['논리적 발표', '근거 제시', '토론 표현'],
    improvement: '발표연습, 토론형 생성 대화, 고급 읽기자료 활용',
  },
]

const QUESTION_DATA = [
  {
    id: 'q1',
    label: 'q1 낭독',
    avgScore: 94,
    weakness: ['문장 끝 흐림', '받침 발음'],
    checkNeeded: '90점 미만 학습자 낭독 재확인',
    suggestion: '속도 조절 듣기 + 반복 낭독',
  },
  {
    id: 'q2',
    label: 'q2 사진 설명',
    avgScore: 91,
    weakness: ['배경 요소 누락', '사람 행동 설명 부족'],
    checkNeeded: '핵심 요소 2개 이하 학습자',
    suggestion: '장소-사람-행동-배경 순서 말하기',
  },
  {
    id: 'q3',
    label: 'q3 듣고 답하기',
    avgScore: 92,
    weakness: ['시간/장소 정보 누락'],
    checkNeeded: '핵심 정보 누락 학습자',
    suggestion: '핵심 정보 메모 후 답변',
  },
  {
    id: 'q4',
    label: 'q4 대화 미션',
    avgScore: 93,
    weakness: ['결제 방법', '포장/매장 표현'],
    checkNeeded: '미션 달성률 50% 미만',
    suggestion: '실제 상황 문형 반복',
  },
  {
    id: 'reading',
    label: '읽기연습',
    avgScore: 91,
    weakness: ['문장 끝 발음', '속도 조절'],
    checkNeeded: '점수 80 미만 반복 학습자',
    suggestion: '느린 속도 듣기 후 따라 읽기',
  },
  {
    id: 'presentation',
    label: '발표연습',
    avgScore: 90,
    weakness: ['발표 구성', '연결 표현', '시간 관리'],
    checkNeeded: '목표 시간 초과 학습자',
    suggestion: '원고 교정 후 섀도잉 및 타이머 발표',
  },
]

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100)
  const color = pct >= 90 ? '#22c55e' : pct >= 80 ? '#3b82f6' : pct >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">

      {/* 헤더 */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-text-primary">AI 한국어 교육 데이터 분석</h1>
          <Badge variant="warning" size="sm" data-testid="demo-data-badge">시연용 샘플 데이터</Badge>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">
          본 화면은 1차 시연용 샘플 데이터 기반 분석 화면입니다. 실제 운영 시 개인별·어권별·과정별 학습 데이터를 축적하여
          맞춤형 교육 설계와 교수자 지원에 활용합니다.
        </p>
      </div>

      {/* 핵심 원칙 */}
      <div className="p-5 bg-primary-50 border border-primary-200 rounded-xl" data-testid="purpose-statement">
        <p className="text-sm font-semibold text-primary-800 mb-3">AI 교육 분석의 목적</p>
        <p className="text-sm text-primary-700 leading-relaxed mb-3">
          본 분석 화면의 목적은 교수자 감원이나 비용절감이 아니라, 반복 평가와 기초 피드백 부담을 줄이고,
          학습자별·어권별·과정별 데이터를 바탕으로 맞춤형 교육을 제공하여 교육의 질을 높이는 것입니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            'AI는 교수자를 대체하지 않습니다.',
            '반복 평가와 기초 피드백을 보조합니다.',
            '교수자의 교육적 판단을 지원합니다.',
            '데이터 기반 맞춤형 교육을 제공합니다.',
            '교육의 질 향상을 목표로 합니다.',
          ].map((p, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-primary-100">
              <span className="text-primary-500 font-bold mt-0.5 shrink-0">✓</span>
              <span className="text-xs text-primary-700">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 요약 지표 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4">요약 지표</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" data-testid="summary-metrics">
          {SUMMARY_METRICS.map((m) => (
            <div key={m.label} className="p-4 bg-surface border border-border rounded-xl">
              <p className="text-xs text-text-muted mb-1">{m.label}</p>
              <p className="text-3xl font-bold text-text-primary tabular-nums">{m.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 국가별 분석 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4" data-testid="country-section-title">국가별 분석</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="country-cards">
          {COUNTRY_DATA.map((c) => (
            <div key={c.country} className="p-5 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{c.flag}</span>
                <div>
                  <p className="text-base font-bold text-text-primary">{c.country}</p>
                  <p className="text-xs text-text-muted">학습자 {c.learners}명</p>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div>
                  <p className="text-xs text-text-muted mb-1">평균 말하기 점수</p>
                  <ScoreBar score={c.speakingScore} />
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">평균 발음/낭독 참고점수</p>
                  <ScoreBar score={c.pronounceScore} />
                </div>
              </div>
              <div className="mb-2">
                <p className="text-xs font-semibold text-warning-700 mb-1">주요 취약점</p>
                <div className="flex flex-wrap gap-1">
                  {c.weaknesses.map((w) => (
                    <span key={w} className="text-xs bg-warning-50 text-warning-700 border border-warning-200 rounded-full px-2 py-0.5">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-text-secondary bg-primary-50 border border-primary-100 rounded-md p-2">
                <span className="font-semibold text-primary-700">추천 지도: </span>
                {c.guide}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 어권별 분석 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4" data-testid="language-group-section-title">어권별 분석</h2>
        <div className="overflow-x-auto" data-testid="language-group-cards">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide">어권</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide">공통 발음 오류</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide">자주 틀리는 문법</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-text-muted uppercase tracking-wide">유창성 특징</th>
                <th className="text-left py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">추천 보충학습</th>
              </tr>
            </thead>
            <tbody>
              {LANGUAGE_GROUP_DATA.map((g, i) => (
                <tr key={g.group} className={`border-b border-border ${i % 2 === 0 ? 'bg-surface' : ''}`}>
                  <td className="py-2.5 pr-4 font-semibold text-text-primary whitespace-nowrap">{g.group}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {g.errors.map((e) => (
                        <span key={e} className="text-xs bg-danger-50 text-danger-700 border border-danger-100 rounded-full px-1.5 py-0.5">{e}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {g.grammar.map((g2) => (
                        <span key={g2} className="text-xs bg-warning-50 text-warning-700 border border-warning-100 rounded-full px-1.5 py-0.5">{g2}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-text-secondary">{g.fluency}</td>
                  <td className="py-2.5 text-xs text-primary-700 font-medium">{g.supplement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 과정별 분석 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4" data-testid="course-section-title">과정별 분석</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="course-cards">
          {COURSE_DATA.map((c) => (
            <div key={c.level} className="p-5 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  c.level === '초급' ? 'bg-success-100 text-success-700' :
                  c.level === '중급' ? 'bg-primary-100 text-primary-700' :
                  'bg-purple-100 text-purple-700'
                }`}>{c.level}</span>
              </div>
              <div className="mb-3">
                <p className="text-xs font-semibold text-success-700 mb-1">강점</p>
                <ul className="space-y-0.5">
                  {c.strengths.map((s) => (
                    <li key={s} className="text-xs text-text-secondary flex items-center gap-1.5">
                      <span className="text-success-500">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-3">
                <p className="text-xs font-semibold text-warning-700 mb-1">취약점</p>
                <ul className="space-y-0.5">
                  {c.weaknesses.map((w) => (
                    <li key={w} className="text-xs text-text-secondary flex items-center gap-1.5">
                      <span className="text-warning-500">△</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-md p-2">
                <span className="font-semibold">개선 방향: </span>{c.improvement}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 문항별 분석 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4" data-testid="question-section-title">문항별 분석</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="question-cards">
          {QUESTION_DATA.map((q) => (
            <div key={q.id} className="p-5 bg-surface border border-border rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-base font-bold text-text-primary">{q.label}</p>
                <div className="text-right">
                  <p className="text-xs text-text-muted">평균 점수</p>
                  <p className={`text-2xl font-bold tabular-nums ${
                    q.avgScore >= 90 ? 'text-success-600' : q.avgScore >= 80 ? 'text-primary-600' : 'text-warning-600'
                  }`}>{q.avgScore}</p>
                </div>
              </div>
              <ScoreBar score={q.avgScore} />
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-warning-700 mb-1">자주 취약한 부분</p>
                  <div className="flex flex-wrap gap-1">
                    {q.weakness.map((w) => (
                      <span key={w} className="text-xs bg-warning-50 text-warning-700 border border-warning-200 rounded-full px-2 py-0.5">{w}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-muted">교수자 확인 필요: <span className="text-text-secondary">{q.checkNeeded}</span></p>
                </div>
                <p className="text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-md p-2">
                  <span className="font-semibold">개선 제안: </span>{q.suggestion}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 하단 안내 */}
      <div className="p-4 bg-surface border border-border rounded-xl text-xs text-text-secondary space-y-1">
        <p className="font-semibold text-text-primary">Known Issues (개발자 참고)</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>현재 분석 화면은 1차 시연용 샘플 데이터 기반 — 실제 운영 후 Supabase 평가 결과와 연결 예정</li>
          <li>학습자 식별자는 개인정보 보호를 위해 익명화 필요</li>
          <li>국가별/어권별 분석은 실제 누적 데이터 확보 후 보정 필요</li>
          <li>Azure Pronunciation Assessment actual: demo fallback 가능 — 후속 안정화 필요</li>
        </ul>
      </div>
    </div>
  )
}
