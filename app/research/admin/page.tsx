// v1.1 단계 10-2 (대시보드 일부) / 10-6 (대시보드 본격) — 관리자 진입 페이지.
//
// 10-2 단계에서는 최소 진입 화면 + 로그아웃만 제공. 10-6에서 통계 차트·CSV 링크 추가.

import { clearAdminSessionAction } from './actions'

export default function AdminHomePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8" data-testid="research-admin-home">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">시험운영 관리자</h1>
          <p className="text-sm text-text-secondary mt-1">참여자·세션·CSV 내보내기를 관리합니다.</p>
        </div>
        <form action={clearAdminSessionAction}>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-secondary hover:bg-slate-50"
            data-testid="btn-admin-logout"
          >
            로그아웃
          </button>
        </form>
      </header>

      <nav className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="/research/admin/participants"
          className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
          data-testid="nav-participants"
        >
          <p className="text-sm font-semibold text-text-primary">참여자 관리</p>
          <p className="text-xs text-text-muted mt-1">신규 발급·목록·동의 상태</p>
        </a>
        <a
          href="/research/admin/export"
          className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
          data-testid="nav-export"
        >
          <p className="text-sm font-semibold text-text-primary">CSV 내보내기</p>
          <p className="text-xs text-text-muted mt-1">세션·발화·평가·요약 (분석용)</p>
        </a>
      </nav>
    </main>
  )
}
