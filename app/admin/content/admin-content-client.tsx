'use client'

// 콘텐츠 관리 클라이언트 (Task 1.7, MVP) — questions 목록 + 생성 + 비활성화 + 수동 태깅.
import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, Badge } from '@/src/components/ui'

type Question = {
  id: string
  type_id: string | null
  title: string
  prompt: string
  difficulty: string | null
  is_active: boolean
  is_tagged: boolean
}

const EMPTY = { id: '', type_id: '', title: '', prompt: '', difficulty: 'beginner' }

export function AdminContentClient() {
  const [rows, setRows] = useState<Question[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/content')
      if (!r.ok) {
        setError(r.status === 403 ? '관리자 권한이 필요합니다.' : `목록 로드 실패 (${r.status})`)
        setRows([])
        return
      }
      const d = await r.json()
      setRows(d.questions ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed')
      setRows([])
    }
  }, [])

  // React 19 set-state-in-effect 룰 회피: 마이크로태스크로 미뤄 cascading render 방지.
  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  const create = useCallback(async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) setMsg(`생성 실패: ${d.error ?? r.status}`)
      else {
        setMsg(`생성됨: ${d.id}`)
        setForm({ ...EMPTY })
        await load()
      }
    } finally {
      setBusy(false)
    }
  }, [form, load])

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      })
      await load()
    },
    [load],
  )

  const tag = useCallback(
    async (id: string) => {
      setMsg(`태깅 중: ${id}…`)
      const r = await fetch('/api/admin/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: id }),
      })
      const d = await r.json()
      if (!r.ok) setMsg(`태깅 실패(${id}): ${d.error ?? r.status}`)
      else {
        const detail =
          d.verdict === 'pass'
            ? '통과 → 적용됨'
            : `${d.verdict}: ${[...(d.quant_failures ?? []), ...((d.peer?.failures as string[]) ?? [])].join(' | ') || '검토 필요'}`
        setMsg(`태깅 결과(${id}): ${detail}`)
      }
      await load()
    },
    [load],
  )

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="새 문항 추가" description="id·제목·지시문은 필수. 추가 후 ‘태깅’으로 메타데이터를 생성하세요." />
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="border border-border rounded px-2 py-1 text-sm" placeholder="id (예: q-010)" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
            <input className="border border-border rounded px-2 py-1 text-sm" placeholder="type_id (예: qt-reading)" value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })} />
            <input className="border border-border rounded px-2 py-1 text-sm sm:col-span-2" placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="border border-border rounded px-2 py-1 text-sm sm:col-span-2" placeholder="지시문(prompt)" rows={3} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
            <select className="border border-border rounded px-2 py-1 text-sm" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              <option value="beginner">beginner</option>
              <option value="intermediate">intermediate</option>
              <option value="advanced">advanced</option>
            </select>
          </div>
          <button type="button" disabled={busy} onClick={create} className="mt-3 px-4 py-2 text-sm rounded bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 disabled:opacity-50">
            추가
          </button>
          {msg && <p className="mt-2 text-xs text-text-muted">{msg}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="문항 목록" description={rows ? `${rows.length}개` : ''} />
        <CardBody>
          {error && <p className="text-sm text-text-muted">{error}</p>}
          {!rows ? (
            <p className="text-sm text-text-muted">불러오는 중…</p>
          ) : rows.length === 0 && !error ? (
            <p className="text-sm text-text-muted">문항이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-none">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {q.title} <span className="text-xs text-text-muted">({q.id})</span>
                    </p>
                    <div className="flex gap-1 mt-1">
                      {q.type_id && <Badge>{q.type_id}</Badge>}
                      <Badge variant={q.is_active ? 'success' : 'default'}>{q.is_active ? 'active' : 'inactive'}</Badge>
                      <Badge variant={q.is_tagged ? 'info' : 'warning'}>{q.is_tagged ? 'tagged' : 'untagged'}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => tag(q.id)} className="px-2 py-1 text-xs rounded border border-primary-100 bg-primary-50 text-primary-700">
                      태깅
                    </button>
                    <button type="button" onClick={() => patch(q.id, { is_active: !q.is_active })} className="px-2 py-1 text-xs rounded border border-border-strong bg-surface">
                      {q.is_active ? '비활성화' : '활성화'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
