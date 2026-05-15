// v1.1 단계 10-3 stub / 10-7 본격 구현 — 학습자 진척 페이지.
// 동의 완료 직후 도착하는 화면. 10-7에서 누적 시간·모드 분포·점수 추이 추가.

import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getCurrentParticipant } from '@/src/lib/research/session'

import { logoutAction } from '../actions'

export default async function StudentProgressPage() {
  const participant = await getCurrentParticipant()
  if (!participant) redirect('/research/login')
  if (!participant.consentStatus) redirect('/research/consent')

  return (
    <main className="max-w-2xl mx-auto px-4 py-8" data-testid="research-student-progress">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">학습 진척 상황</h1>
          <p className="text-sm text-text-secondary mt-1">
            참여자 코드: <span className="font-mono">{participant.participantCode}</span>
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-secondary hover:bg-slate-50"
            data-testid="btn-participant-logout"
          >
            로그아웃
          </button>
        </form>
      </header>

      <p className="mt-6 text-sm text-text-secondary" data-testid="progress-placeholder">
        학습 활동을 시작하려면 아래 모드 중 하나를 선택하세요. 누적 통계는 추후 표시됩니다.
      </p>

      <nav className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/student/conversation-practice"
          className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
          data-testid="nav-free-conversation"
        >
          <p className="text-sm font-semibold text-text-primary">생성형 자유 대화</p>
          <p className="text-xs text-text-muted mt-1">페르소나 4명 중 선택해 일상 대화 연습</p>
        </Link>
        <Link
          href="/student/speaking"
          className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
          data-testid="nav-speaking"
        >
          <p className="text-sm font-semibold text-text-primary">말하기 평가 (q1~q4)</p>
          <p className="text-xs text-text-muted mt-1">따라 읽기·묘사·그림 설명·대화</p>
        </Link>
        <Link
          href="/student/presentation-practice"
          className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
          data-testid="nav-presentation"
        >
          <p className="text-sm font-semibold text-text-primary">발표 연습</p>
        </Link>
        <Link
          href="/student/reading-practice"
          className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
          data-testid="nav-reading"
        >
          <p className="text-sm font-semibold text-text-primary">읽기 연습</p>
        </Link>
      </nav>
    </main>
  )
}
