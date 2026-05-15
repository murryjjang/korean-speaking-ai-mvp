// v1.1 단계 10-2: 참여자 목록·신규 발급 페이지.

import Link from 'next/link'

import { isResearchRepoConfigured, listParticipants } from '@/src/lib/research/repository'

import { CreateParticipantForm } from './create-participant-form'

export default async function ParticipantsPage() {
  const configured = isResearchRepoConfigured()
  const participants = configured ? await listParticipants() : []

  return (
    <main className="max-w-4xl mx-auto px-4 py-8" data-testid="research-admin-participants">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">참여자 관리</h1>
          <p className="text-sm text-text-secondary mt-1">사전 발급 코드를 생성하고 목록을 확인합니다.</p>
        </div>
        <a href="/research/admin" className="text-sm text-primary-600 hover:underline">← 대시보드</a>
      </header>

      {!configured ? (
        <div className="mt-6 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900" data-testid="not-configured-warning">
          Supabase가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 .env.local에 설정하세요.
        </div>
      ) : null}

      <section className="mt-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-primary">신규 참여자 발급</h2>
        <CreateParticipantForm />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3">목록 ({participants.length})</h2>
        {participants.length === 0 ? (
          <p className="text-sm text-text-muted" data-testid="participants-empty">아직 등록된 참여자가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-border rounded-md" data-testid="participants-table">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">코드</th>
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">국적</th>
                  <th className="px-3 py-2 font-medium">한국어 수준</th>
                  <th className="px-3 py-2 font-medium">동의</th>
                  <th className="px-3 py-2 font-medium">등록일</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-t border-border" data-testid={`participant-row-${p.participantCode}`}>
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={`/research/admin/participants/${p.id}`} className="text-primary-600 hover:underline">
                        {p.participantCode}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{p.name ?? '-'}</td>
                    <td className="px-3 py-2">{p.nationality ?? '-'}</td>
                    <td className="px-3 py-2">{p.koreanLevel ?? '-'}</td>
                    <td className="px-3 py-2">
                      {p.consentStatus ? (
                        <span className="text-green-600">완료</span>
                      ) : (
                        <span className="text-text-muted">미완료</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-text-muted">{new Date(p.enrolledAt).toLocaleString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
