// v1.1 단계 10-6: CSV 내보내기 화면 — 4종 다운로드 링크.

const EXPORTS: { type: 'sessions' | 'utterances' | 'assessments' | 'summary'; title: string; description: string }[] = [
  {
    type: 'summary',
    title: 'summary.csv',
    description: '분석용 wide format — 참여자 1행, 모드별 세션 수·평균 점수·발화 수 누적.',
  },
  {
    type: 'sessions',
    title: 'sessions.csv',
    description: '세션 메타 — 참여자, 모드, 시작·종료 시각, 지속 시간(초), meta_json.',
  },
  {
    type: 'utterances',
    title: 'utterances.csv',
    description: '발화 전체 — 학습자/NPC, 텍스트, 응답 시간(ms), 도구 호출, meta_json.',
  },
  {
    type: 'assessments',
    title: 'assessments.csv',
    description: '평가 점수 — 모드별 점수·세부 항목·피드백·발음 평가 raw.',
  },
]

export default function ExportPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8" data-testid="research-admin-export">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">CSV 내보내기</h1>
          <p className="text-sm text-text-secondary mt-1">
            아래 링크를 클릭하면 즉시 다운로드됩니다. 분석 도구(Python·R·Excel)에서 바로 열 수 있는 UTF-8 BOM 포함 CSV.
          </p>
        </div>
        <a href="/research/admin" className="text-sm text-primary-600 hover:underline">← 대시보드</a>
      </header>

      <ul className="mt-6 space-y-3" data-testid="export-list">
        {EXPORTS.map((e) => (
          <li key={e.type} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">{e.title}</p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{e.description}</p>
              </div>
              <a
                href={`/api/research/admin/export?type=${e.type}`}
                download
                className="shrink-0 rounded-md bg-primary-600 text-white text-sm font-medium px-4 py-2 hover:bg-primary-700"
                data-testid={`btn-download-${e.type}`}
              >
                다운로드
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-text-muted leading-relaxed">
        ※ 모든 데이터는 UTF-8 BOM이 포함된 CSV(RFC 4180)입니다. 한국어가 정상 표시되며,
        쉼표·줄바꿈을 포함한 값은 큰따옴표로 감싸집니다. 분석 목적 외 외부 공유는 익명화 정책에
        따릅니다.
      </p>
    </main>
  )
}
