// v1.1 단계 10-2: 참여자 목록·신규 발급 페이지.

import { isResearchRepoConfigured, listParticipants } from '@/src/lib/research/repository'

import { createParticipantAction } from './actions'

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
        <form action={createParticipantAction} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="form-create-participant">
          <label className="block sm:col-span-2">
            <span className="text-xs text-text-muted">참여자 코드 (비우면 자동 발급, 예: P001)</span>
            <input name="participantCode" type="text" placeholder="자동 발급" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm" data-testid="input-new-code" />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">이름 (선택)</span>
            <input name="name" type="text" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm" data-testid="input-new-name" />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">국적 (선택)</span>
            <input name="nationality" type="text" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm" data-testid="input-new-nationality" />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">한국어 수준 (선택, 예: TOPIK 2)</span>
            <input name="koreanLevel" type="text" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm" data-testid="input-new-level" />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">모국어 (선택)</span>
            <input name="motherTongue" type="text" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm" data-testid="input-new-mother-tongue" />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">PIN (선택, 4자리)</span>
            <input name="pin" type="text" inputMode="numeric" maxLength={4} placeholder="없으면 비워두기" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm" data-testid="input-new-pin" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-text-muted">메모 (선택)</span>
            <textarea name="notes" rows={2} className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm resize-none" data-testid="input-new-notes" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-primary-600 text-white text-sm font-medium px-4 py-2 hover:bg-primary-700" data-testid="btn-create-participant">
              발급
            </button>
          </div>
        </form>
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
                    <td className="px-3 py-2 font-mono text-xs">{p.participantCode}</td>
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
