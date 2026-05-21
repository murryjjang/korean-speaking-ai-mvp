'use client'

// 모범답안 side-by-side 패널 (Task 1.5) — CEFR 수준별 답안 + 발음 재생(useTTS).
import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, Badge } from '@/src/components/ui'
import { useTTS } from '@/src/hooks/use-tts'

type Answer = { cefr: string; answer_text: string | null }

export function ModelAnswerPanel({ contentId }: { contentId: string }) {
  const [data, setData] = useState<{ title?: string; answers: Answer[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { play, state: ttsState } = useTTS()
  const [playingCefr, setPlayingCefr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/model-answer?content_id=${encodeURIComponent(contentId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => alive && setData({ title: d.title, answers: d.answers ?? [] }))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'load_failed'))
    return () => {
      alive = false
    }
  }, [contentId])

  if (error) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-text-muted">모범답안을 불러오지 못했어요 ({error}). 로그인 상태를 확인해 주세요.</p>
        </CardBody>
      </Card>
    )
  }
  if (!data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-text-muted">모범답안 준비 중…</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.answers.length === 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-text-muted">이 콘텐츠의 모범답안이 아직 없습니다.</p>
          </CardBody>
        </Card>
      )}
      {data.answers.map((a) => (
        <Card key={a.cefr}>
          <CardHeader
            title={`${a.cefr} 수준 모범답안`}
            description={a.cefr === data.answers[0]?.cefr ? '목표 수준' : '도전 수준'}
          />
          <CardBody>
            <div className="flex items-start justify-between gap-2">
              <Badge variant="info">{a.cefr}</Badge>
              {a.answer_text && (
                <button
                  type="button"
                  onClick={() => {
                    setPlayingCefr(a.cefr)
                    void play(a.answer_text as string)
                  }}
                  aria-label="모범답안 듣기"
                  className="px-2 py-1 text-sm rounded border border-border-strong bg-surface hover:bg-surface-raised"
                >
                  {ttsState === 'playing' && playingCefr === a.cefr ? '🔊…' : '🔊 듣기'}
                </button>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-primary whitespace-pre-line">
              {a.answer_text ?? '모범답안 준비 중입니다.'}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
